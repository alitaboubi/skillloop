import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BUCKET } from "./services-db";
import { UPLOAD_LIMIT_ERROR, uploadLimitReached } from "./limits";
import { motionPath, type MotionType } from "./motion";
import type { ContactOp } from "./profile-contacts";

/** Multi-step marketplace writes. The client is a parameter so the step order and cleanup are unit-tested. */
type Db = typeof supabase;
type Result<T> = { data: T; error: null } | { data: null; error: string };

export type RequestInput = { serviceId: string; clientId: string; providerId: string; message: string };

/**
 * Creates a request with exactly one opening message.
 * The `request_initial_message` trigger normally writes it; the client only adds it when none exists,
 * so the result is correct whether or not that trigger is applied on the backend.
 * Once the request row exists the call succeeds, so a failed follow-up never invites a duplicate resubmission.
 */
export async function submitRequest(db: Db, r: RequestInput): Promise<Result<{ id: string }>> {
  const message = r.message.trim();
  const { data, error } = await db.from("requests")
    .insert({ service_id: r.serviceId, client_id: r.clientId, provider_id: r.providerId, message })
    .select("id").single();
  if (error || !data) return { data: null, error: error?.message ?? "insert failed" };
  const { count, error: countErr } = await db.from("messages").select("id", { count: "exact", head: true }).eq("request_id", data.id);
  if (!countErr && count === 0) await db.from("messages").insert({ request_id: data.id, sender_id: r.clientId, body: message });
  return { data: { id: data.id }, error: null };
}

export type ServiceInput = {
  title: string; description: string; category: string; price_model: string; price: number | null; city: string; remote: boolean;
  status?: "published" | "draft"; details?: Record<string, unknown>;
};

/** Uploads the optional photo, then inserts the service; removes the photo again if the insert fails. */
export async function publishService(db: Db, userId: string, s: ServiceInput, file: File | null): Promise<Result<{ id: string }>> {
  let image_url: string | null = null;
  if (file) {
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) return { data: null, error: (await uploadLimitReached(db)) ? UPLOAD_LIMIT_ERROR : "upload" };
    image_url = path;
  }
  const { data, error } = await db.from("services").insert({ ...s, details: (s.details ?? {}) as never, owner_id: userId, image_url }).select("id").single();
  if (error || !data) {
    if (image_url) await db.storage.from(IMAGE_BUCKET).remove([image_url]);
    return { data: null, error: error?.message ?? "insert failed" };
  }
  return { data: { id: data.id }, error: null };
}

/**
 * Updates an owned service. Photo: `file` replaces it, `removePhoto` clears it, otherwise it is kept.
 * A new upload is removed again if the update fails; the previous photo is removed only after a successful save.
 */
export async function updateService(
  db: Db, userId: string, id: string, s: ServiceInput, photo: { file: File | null; removePhoto: boolean; previous: string | null },
): Promise<Result<{ id: string }>> {
  let image_url = photo.removePhoto ? null : photo.previous;
  let uploaded: string | null = null;
  if (photo.file) {
    const ext = photo.file.type === "image/jpeg" ? "jpg" : photo.file.type.split("/")[1];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from(IMAGE_BUCKET).upload(path, photo.file, { contentType: photo.file.type });
    if (up.error) return { data: null, error: (await uploadLimitReached(db)) ? UPLOAD_LIMIT_ERROR : "upload" };
    image_url = uploaded = path;
  }
  const { data, error } = await db.from("services").update({ ...s, details: (s.details ?? {}) as never, image_url }).eq("id", id).select("id").single();
  if (error || !data) {
    if (uploaded) await db.storage.from(IMAGE_BUCKET).remove([uploaded]);
    return { data: null, error: error?.message ?? "update failed" };
  }
  if (photo.previous && photo.previous !== image_url) await db.storage.from(IMAGE_BUCKET).remove([photo.previous]);
  return { data: { id: data.id }, error: null };
}

/** Services are archived, never hard-deleted: requests and messages reference them (FK on delete cascade). */
export async function setServiceArchived(db: Db, id: string, archived: boolean): Promise<string | null> {
  const { error } = await db.from("services").update({ archived }).eq("id", id);
  return error ? error.message : null;
}

export type ProfileInput = {
  display_name: string; title: string; bio: string; city: string; preferred_lang: string;
  accepting: boolean | null; professional_details: Record<string, unknown>;
};

/**
 * Saves the editable profile. Photo: `file` uploads a new one, `removePhoto` clears it, otherwise it is kept.
 * A new upload is removed again if the update fails; the previous photo is removed only after a successful save.
 */
export async function saveProfile(
  db: Db, userId: string, p: ProfileInput, photo: { file: File | null; removePhoto: boolean; previous: string | null },
): Promise<Result<{ avatar_url: string | null }>> {
  let avatar_url = photo.removePhoto ? null : photo.previous;
  let uploaded: string | null = null;
  if (photo.file) {
    const ext = photo.file.type === "image/jpeg" ? "jpg" : photo.file.type.split("/")[1];
    const path = `${userId}/avatar/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from(IMAGE_BUCKET).upload(path, photo.file, { contentType: photo.file.type });
    if (up.error) return { data: null, error: (await uploadLimitReached(db)) ? UPLOAD_LIMIT_ERROR : "upload" };
    avatar_url = uploaded = path;
  }
  const { accepting, professional_details, ...fields } = p;
  const details = { ...professional_details };
  if (accepting === null) delete details["accepting"]; else details["accepting"] = accepting;
  const { error } = await db.from("profiles").update({
    ...fields, display_name: fields.display_name.trim(), title: fields.title.trim() || null, bio: fields.bio.trim() || null,
    city: fields.city || null, avatar_url, professional_details: details as never,
  }).eq("id", userId);
  if (error) {
    if (uploaded) await db.storage.from(IMAGE_BUCKET).remove([uploaded]);
    return { data: null, error: error.message };
  }
  if (photo.previous && photo.previous !== avatar_url) await db.storage.from(IMAGE_BUCKET).remove([photo.previous]);
  return { data: { avatar_url }, error: null };
}

/** Saves only professional_details (the carnet editor); the caller merges into the freshly loaded details. */
export async function saveProfessionalDetails(db: Db, userId: string, details: Record<string, unknown>): Promise<string | null> {
  const { error } = await db.from("profiles").update({ professional_details: details as never }).eq("id", userId);
  return error ? error.message : null;
}

/** Field-level validation for the profile form (keys are i18n keys). */
export function validateProfile(p: Pick<ProfileInput, "display_name" | "title" | "bio">): Partial<Record<"display_name" | "title" | "bio", { key: "err_required" | "err_short" | "err_long"; n?: number }>> {
  const e: ReturnType<typeof validateProfile> = {};
  const name = p.display_name.trim();
  if (!name) e.display_name = { key: "err_required" };
  else if (name.length < 2) e.display_name = { key: "err_short", n: 2 };
  else if (name.length > 80) e.display_name = { key: "err_long", n: 80 };
  if (p.title.trim().length > 80) e.title = { key: "err_long", n: 80 };
  if (p.bio.trim().length > 1000) e.bio = { key: "err_long", n: 1000 };
  return e;
}

export type PortfolioInput = { id?: string; title: string; description: string; previousImage: string | null };
/**
 * Optional "before" photo (before/after pairs, only while VITE_BEFORE_AFTER is on): a new file needs `consent`
 * (the database refuses it otherwise and stamps the consent time itself); `remove` clears it; else it is kept.
 */
export type BeforePhoto = { file: File | null; remove: boolean; previous: string | null; consent: boolean };
/**
 * Optional short video (Pro, only while VITE_PRO_TOOLS is on; src/lib/motion.ts): a new `file` is uploaded to the motion
 * folder (its poster frame is the item's image, passed as `file` to savePortfolioItem); `remove` clears it; else kept.
 */
export type MotionVideo = { file: File | null; remove: boolean; previous: string | null };

/** Portfolio validation: the image is required by the schema (image_url not null), title 2–120, description ≤ 1000. */
export function validatePortfolio(p: { title: string; description: string; hasImage: boolean }): Partial<Record<"title" | "description" | "image", { key: "err_required" | "err_short" | "err_long" | "err_image_required"; n?: number }>> {
  const e: ReturnType<typeof validatePortfolio> = {};
  const title = p.title.trim();
  if (!title) e.title = { key: "err_required" };
  else if (title.length < 2) e.title = { key: "err_short", n: 2 };
  else if (title.length > 120) e.title = { key: "err_long", n: 120 };
  if (p.description.trim().length > 1000) e.description = { key: "err_long", n: 1000 };
  if (!p.hasImage) e.image = { key: "err_image_required" };
  return e;
}

/**
 * Creates or updates a portfolio item. A new image is uploaded first and removed again if the write fails;
 * a replaced image is removed only after the row points at the new one.
 */
export async function savePortfolioItem(db: Db, userId: string, p: PortfolioInput, file: File | null, before?: BeforePhoto, video?: MotionVideo): Promise<Result<{ id: string }>> {
  const uploaded: string[] = [];
  const upload = async (f: File) => {
    const ext = f.type === "image/jpeg" ? "jpg" : f.type.split("/")[1];
    const path = `${userId}/portfolio/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from(IMAGE_BUCKET).upload(path, f, { contentType: f.type });
    if (up.error) return null;
    uploaded.push(path);
    return path;
  };
  const failUpload = async (): Promise<Result<{ id: string }>> => {
    if (uploaded.length) await db.storage.from(IMAGE_BUCKET).remove(uploaded);
    return { data: null, error: (await uploadLimitReached(db)) ? UPLOAD_LIMIT_ERROR : "upload" };
  };
  let image_url = p.previousImage;
  if (file) {
    const path = await upload(file);
    if (!path) return failUpload();
    image_url = path;
  }
  if (!image_url) return { data: null, error: "image" };
  const fields: Record<string, unknown> = { title: p.title.trim(), description: p.description.trim() || null, image_url };
  let beforeUrl = before?.previous ?? null;
  if (before) {
    if (before.file) {
      if (!before.consent) { if (uploaded.length) await db.storage.from(IMAGE_BUCKET).remove(uploaded); return { data: null, error: "consent" }; }
      const path = await upload(before.file);
      if (!path) return failUpload();
      beforeUrl = path;
      fields["before_consent_at"] = new Date().toISOString(); // the database replaces it with its own time
    } else if (before.remove) beforeUrl = null;
    fields["before_image_url"] = beforeUrl;
  }
  let videoUrl = video?.previous ?? null;
  if (video) {
    if (video.file) {
      const path = motionPath(userId, video.file.type as MotionType);
      const up = await db.storage.from(IMAGE_BUCKET).upload(path, video.file, { contentType: video.file.type });
      if (up.error) return failUpload();
      uploaded.push(path);
      videoUrl = path;
    } else if (video.remove) videoUrl = null;
    fields["video_url"] = videoUrl;
  }
  const res = p.id
    ? await db.from("portfolio_items").update(fields as never).eq("id", p.id).select("id").single()
    : await db.from("portfolio_items").insert({ ...fields, owner_id: userId } as never).select("id").single();
  if (res.error || !res.data) {
    if (uploaded.length) await db.storage.from(IMAGE_BUCKET).remove(uploaded);
    return { data: null, error: res.error?.message ?? "save failed" };
  }
  const replaced = [
    ...(p.previousImage && p.previousImage !== image_url ? [p.previousImage] : []),
    ...(before?.previous && before.previous !== beforeUrl ? [before.previous] : []),
    ...(video?.previous && video.previous !== videoUrl ? [video.previous] : []),
  ];
  if (replaced.length) await db.storage.from(IMAGE_BUCKET).remove(replaced);
  return { data: { id: res.data.id }, error: null };
}

/** Deletes the row first (so nothing public points at a missing file), then its image. */
export async function deletePortfolioItem(db: Db, item: { id: string; image_url: string; before_image_url?: string | null | undefined; video_url?: string | null | undefined }): Promise<string | null> {
  const { error } = await db.from("portfolio_items").delete().eq("id", item.id);
  if (error) return error.message;
  await db.storage.from(IMAGE_BUCKET).remove([item.image_url, ...(item.before_image_url ? [item.before_image_url] : []), ...(item.video_url ? [item.video_url] : [])]);
  return null;
}

/** Applies contact changes; returns how many writes failed (the caller refetches to show the true state). */
export async function applyContactOps(db: Db, userId: string, ops: ContactOp[]): Promise<number> {
  let failed = 0;
  for (const o of ops) {
    const { error } =
      o.op === "insert" ? await db.from("profile_contacts").insert({ owner_id: userId, kind: o.kind, value: o.value, is_public: o.is_public })
      : o.op === "update" ? await db.from("profile_contacts").update({ value: o.value, is_public: o.is_public }).eq("id", o.id)
      : await db.from("profile_contacts").delete().eq("id", o.id);
    if (error) failed++;
  }
  return failed;
}
