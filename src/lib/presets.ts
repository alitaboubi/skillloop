import { CATEGORIES, type CategoryId } from "./data";

/**
 * Ready-made images a user can pick instead of uploading (SVG, no text; made by scripts/make-presets.mjs):
 * service covers (4:3, 3 per category), profile avatars (1:1) and profile banners. A picked cover/avatar becomes a JPEG uploaded
 * like any photo, so nothing else changes. Covers are illustrations of the service, never shown as the pro's work.
 */
export type Preset = { id: string; src: string };
export type PresetGroup = { category?: CategoryId; items: Preset[] };

const byName = (files: Record<string, string>): Preset[] =>
  Object.entries(files)
    .map(([path, src]) => ({ id: path.split("/").pop()!.replace(/\.svg$/, ""), src }))
    .sort((a, b) => a.id.localeCompare(b.id));

const COVERS = byName(import.meta.glob<string>("../assets/covers/*.svg", { eager: true, query: "?url", import: "default" }));
export const AVATAR_PRESETS = byName(import.meta.glob<string>("../assets/avatars/*.svg", { eager: true, query: "?url", import: "default" }));

export const coversOf = (category: CategoryId): Preset[] => COVERS.filter((c) => c.id.startsWith(`${category}-`));

/** Every category's covers, the service's own category first (then the usual category order). */
export function coverGroups(first?: string): PresetGroup[] {
  const ids = CATEGORIES.map((c) => c.id);
  const ordered = first && ids.includes(first as CategoryId) ? [first as CategoryId, ...ids.filter((id) => id !== first)] : ids;
  return ordered.map((category) => ({ category, items: coversOf(category) })).filter((g) => g.items.length > 0);
}

export const COVER_SIZE = { w: 1200, h: 900 };
export const AVATAR_SIZE = { w: 512, h: 512 };

/** Draws a preset into a JPEG File of the given size (what the upload expects). */
export async function presetFile(p: Preset, size: { w: number; h: number }): Promise<File> {
  const img = new Image();
  img.decoding = "async";
  img.src = p.src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, size.w, size.h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("encode");
  return new File([blob], `${p.id}.jpg`, { type: "image/jpeg" });
}

/** Wide profile banners (public profile header). Chosen by id and kept in professional_details — no upload. */
export const BANNER_PRESETS = byName(import.meta.glob<string>("../assets/banners/*.svg", { eager: true, query: "?url", import: "default" }));

export function readBanner(details: unknown): Preset | null {
  const v = ((details && typeof details === "object" ? details : {}) as Record<string, unknown>)["banner"];
  return BANNER_PRESETS.find((b) => b.id === v) ?? null;
}

/** Sets or clears the banner; other keys are kept. */
export function writeBanner(details: unknown, id: string | null): Record<string, unknown> {
  const next = { ...((details && typeof details === "object" ? details : {}) as Record<string, unknown>) };
  if (id && BANNER_PRESETS.some((b) => b.id === id)) next["banner"] = id; else delete next["banner"];
  return next;
}
