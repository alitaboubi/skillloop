import { queryOptions } from "@tanstack/react-query";
import web from "@/assets/svc-web.jpg";
import tutor from "@/assets/svc-tutor.jpg";
import repair from "@/assets/svc-repair.jpg";
import hero from "@/assets/hero.jpg";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import type { CategoryId, Service } from "./data";

const FALLBACK: Record<string, string> = { tech: web, design: web, tutoring: tutor, home: repair, care: hero };
const UNIT: Record<string, Service["unit"]> = { fixed: "pm_fixed", from: "pm_from", hourly: "per_hour", quote: "pm_quote" };

type Row = {
  id: string; owner_id: string; title: string; description: string; category: string; price_model: string;
  price: number | null; city: string; remote: boolean; created_at: string; image_url?: string | null; details?: Record<string, unknown> | null;
  profiles?: { display_name: string; title?: string | null; avatar_url?: string | null; accepting?: unknown } | null;
};

export function rowToService(r: Row, signed?: string, avatar?: string): Service {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category as CategoryId,
    price: r.price ?? 0,
    unit: UNIT[r.price_model] ?? "pm_fixed",
    city: r.city,
    remote: r.remote,
    image: signed ?? FALLBACK[r.category] ?? web,
    provider: r.profiles?.display_name || "—",
    profession: r.profiles?.title || undefined,
    delivery: "—",
    languages: "—",
    publishedDaysAgo: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 864e5),
    ownerId: r.owner_id,
    quoteOnly: r.price_model === "quote",
    real: true,
    hasPhoto: !!signed,
    priceMissing: r.price_model !== "quote" && (r.price == null || r.price <= 0),
    details: r.details ?? {},
    providerAvatar: avatar,
    // Declared by the pro in their profile; unknown (no chip) unless it is a real boolean.
    accepting: typeof r.profiles?.accepting === "boolean" ? r.profiles.accepting : undefined,
  };
}

const SELECT = "id, owner_id, title, description, category, price_model, price, city, remote, created_at, image_url, details, profiles(display_name, title, avatar_url, accepting:professional_details->accepting)";

/** Published, non-archived listings (archived must be filtered here too: RLS lets owners read their own archived rows). */
async function loadPublished(db: Db) {
  const { data, error } = await db.from("services").select(SELECT).eq("status", "published").eq("archived", false).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return withImages(data as unknown as Row[], db);
}

export const publishedServicesQuery = queryOptions({
  queryKey: ["services", "published"],
  queryFn: () => loadPublished(supabase),
});

/** Server rendering of /explore: the same list, read without any session. */
export const fetchPublicServices = (db: Db = publicSupabase) => loadPublished(db);

export const serviceQuery = (id: string) =>
  queryOptions({
    queryKey: ["services", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select(SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? (await withImages([data as unknown as Row]))[0] : null;
    },
  });

export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

type Db = typeof supabase;

/**
 * Server rendering of /services/$id: what a logged-out visitor may see, read without any session.
 * Drafts and archived services return null (→ 404); the filters repeat the RLS rule on purpose.
 */
export async function fetchPublicService(id: string, db: Db = publicSupabase): Promise<Service | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db.from("services").select(SELECT).eq("id", id).eq("status", "published").eq("archived", false).maybeSingle();
  if (error) throw error;
  return data ? (await withImages([data as unknown as Row], db))[0] ?? null : null;
}

export const IMAGE_BUCKET = "service-images";

/** Image paths are stored privately; turn them into temporary viewable links. */
/** A provider's published, non-archived services for their server-rendered profile (newest first). */
export async function fetchPublicServicesByOwner(ownerId: string, db: Db = publicSupabase): Promise<Service[]> {
  const { data, error } = await db.from("services").select(SELECT).eq("owner_id", ownerId).eq("status", "published").eq("archived", false).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return withImages((data ?? []) as unknown as Row[], db);
}

export async function signImages(paths: string[], db: Db = supabase): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await db.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  const out: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

async function withImages(rows: Row[], db: Db = supabase) {
  // Service photos and the pros' profile photos are signed in one call (both public once referenced).
  const paths = [...new Set(rows.flatMap((r) => [r.image_url, r.profiles?.avatar_url]).filter((x): x is string => !!x))];
  const urls = await signImages(paths, db);
  return rows.map((r) => rowToService(r, r.image_url ? urls[r.image_url] : undefined, r.profiles?.avatar_url ? urls[r.profiles.avatar_url] : undefined));
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function imageProblem(file: { type: string; size: number }): "err_image_type" | "err_image_size" | null {
  if (!IMAGE_TYPES.includes(file.type)) return "err_image_type";
  if (file.size > MAX_IMAGE_BYTES) return "err_image_size";
  return null;
}

/** Social/website links must be https URLs; empty is allowed. */
export function isValidLink(v: string): boolean {
  if (!v.trim()) return true;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export async function uploadImage(userId: string, file: File, folder: string): Promise<string | null> {
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
  return error ? null : path;
}
