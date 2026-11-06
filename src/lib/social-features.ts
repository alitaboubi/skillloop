import type { TKey } from "@/lib/i18n";

/**
 * « Vu sur SkillLoop »: SkillLoop's Instagram / Facebook posts about real pros and clients. Stored by migration
 * 20261106140000_social_features.sql — PREPARED, not applied. Off until VITE_SOCIAL_FEATURES=on: while off nothing calls
 * the RPCs and nothing is shown. Operators (private.admins) write posts in /admin; each person in a post is alerted and
 * decides whether it shows on their public profile (nothing public without that choice).
 */
export const SOCIAL_FEATURES_ENABLED = import.meta.env["VITE_SOCIAL_FEATURES"] === "on";

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
/** Most people in one post (the database refuses more). */
export const PEOPLE_MAX = 12;

export type Choice = "pending" | "shown" | "hidden";
export type Platform = "instagram" | "facebook";

export type FeaturePerson = { id: string; name: string; city: string | null; avatarPath: string | null; pro: boolean; choice: Choice; notified: boolean };
export type SocialPost = {
  id: string;
  title: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  publishedAt: string | null;
  announcedAt: string | null;
  people: FeaturePerson[];
};
export type MyFeature = Pick<SocialPost, "id" | "title" | "instagramUrl" | "facebookUrl"> & { publishedAt: string; choice: Choice };
export type PublicFeature = Pick<SocialPost, "id" | "title" | "instagramUrl" | "facebookUrl"> & { publishedAt: string };
export type PersonHit = Pick<FeaturePerson, "id" | "name" | "city" | "avatarPath" | "pro">;

/* ---------- Links ---------- */

const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const FB_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);
/** Query parameters a Facebook link needs to point at the post; everything else (tracking: mibextid, rdid, fbclid…) goes. */
const FB_KEEP = ["v", "story_fbid", "id", "fbid"];

const parse = (raw: string): URL | null => {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch { return null; }
};

/**
 * Instagram reel / post / IGTV link → `https://www.instagram.com/<reel|p|tv>/<code>/` (the shape the database accepts),
 * else null. Accepts /reels/, the newer /<account>/reel/<code>/ form, the mobile host and tracking parameters (?igsh=…).
 */
export function normalizeInstagram(raw: string): string | null {
  const u = parse(raw);
  if (!u || !IG_HOSTS.has(u.hostname.toLowerCase())) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((p) => ["reel", "reels", "p", "tv"].includes(p.toLowerCase()));
  const code = at >= 0 ? parts[at + 1] : undefined;
  if (at < 0 || at > 1 || !code || !/^[A-Za-z0-9_-]{5,64}$/.test(code)) return null;
  const kind = parts[at]!.toLowerCase() === "reels" ? "reel" : parts[at]!.toLowerCase();
  return `https://www.instagram.com/${kind}/${code}/`;
}

/**
 * Facebook post / reel / video / share link → `https://www.facebook.com/<path>[?v=…]` or `https://fb.watch/<code>/`,
 * else null. Only the parameters that identify the post are kept.
 */
export function normalizeFacebook(raw: string): string | null {
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (host === "fb.watch") {
    const code = u.pathname.split("/").filter(Boolean)[0];
    return code && /^[A-Za-z0-9_-]+$/.test(code) ? `https://fb.watch/${code}/` : null;
  }
  if (!FB_HOSTS.has(host)) return null;
  const path = u.pathname.replace(/\/{2,}/g, "/");
  if (path === "/" || !/^\/[A-Za-z0-9._/%-]+$/.test(path)) return null;
  const keep = FB_KEEP.flatMap((k) => {
    const v = u.searchParams.get(k);
    return v && /^[A-Za-z0-9._-]+$/.test(v) ? [`${k}=${v}`] : [];
  });
  const out = `https://www.facebook.com${path}${keep.length ? `?${keep.join("&")}` : ""}`;
  return out.length <= 300 ? out : null;
}

/** The link a card opens: Instagram first (that is where the reels live), else Facebook. */
export const primaryUrl = (p: Pick<SocialPost, "instagramUrl" | "facebookUrl">) => p.instagramUrl ?? p.facebookUrl ?? null;
export const platformsOf = (p: Pick<SocialPost, "instagramUrl" | "facebookUrl">): Platform[] =>
  [p.instagramUrl ? "instagram" as const : null, p.facebookUrl ? "facebook" as const : null].filter((x): x is Platform => !!x);

/* ---------- The operator's form ---------- */

export type PostDraft = { title: string; instagram: string; facebook: string; people: string[] };
export type DraftError = { field: "title" | "instagram" | "facebook" | "links" | "people"; key: TKey };

/** First problem in the form, or null. Links are judged after normalising (what will really be stored). */
export function checkDraft(d: PostDraft): DraftError | null {
  const title = d.title.trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) return { field: "title", key: "sf_err_title" };
  if (d.instagram.trim() && !normalizeInstagram(d.instagram)) return { field: "instagram", key: "sf_err_instagram" };
  if (d.facebook.trim() && !normalizeFacebook(d.facebook)) return { field: "facebook", key: "sf_err_facebook" };
  if (!d.instagram.trim() && !d.facebook.trim()) return { field: "links", key: "sf_err_links" };
  if (new Set(d.people).size > PEOPLE_MAX) return { field: "people", key: "sf_err_people" };
  return null;
}

/** Database errors → a message the operator can act on. */
export function socialErrorKey(e: unknown): TKey {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("announce_too_soon")) return "sf_err_announce_soon";
  if (msg.includes("too_many_people")) return "sf_err_people";
  if (msg.includes("unknown_person")) return "sf_err_unknown_person";
  if (msg.includes("not_admin")) return "adm_denied_t";
  return "sf_err_generic";
}

/* ---------- Reading the database's JSON (defensively: malformed rows are dropped) ---------- */

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const choiceOf = (v: unknown): Choice => (v === "shown" || v === "hidden" ? v : "pending");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
/** Only links of the shape the database stores are ever rendered as links. */
const ig = (v: unknown) => { const s = str(v); return s && normalizeInstagram(s) === s ? s : null; };
const fb = (v: unknown) => { const s = str(v); return s && normalizeFacebook(s) === s ? s : null; };

function hit(r: unknown): PersonHit | null {
  const d = obj(r);
  const id = str(d["id"]), name = typeof d["name"] === "string" ? d["name"].trim() : "";
  return id && name ? { id, name, city: str(d["city"]), avatarPath: str(d["avatar_url"]), pro: d["pro"] === true } : null;
}

export const parsePeopleHits = (raw: unknown): PersonHit[] => arr(raw).flatMap((r) => { const h = hit(r); return h ? [h] : []; });

export function parsePost(raw: unknown): SocialPost | null {
  const d = obj(raw);
  const id = str(d["id"]), title = str(d["title"]);
  const instagramUrl = ig(d["instagram_url"]), facebookUrl = fb(d["facebook_url"]);
  if (!id || !title || (!instagramUrl && !facebookUrl)) return null;
  return {
    id, title, instagramUrl, facebookUrl, publishedAt: date(d["published_at"]), announcedAt: date(d["announced_at"]),
    people: arr(d["people"]).flatMap((r) => {
      const h = hit(r);
      const p = obj(r);
      return h ? [{ ...h, choice: choiceOf(p["choice"]), notified: p["notified"] === true }] : [];
    }),
  };
}
export const parsePosts = (raw: unknown): SocialPost[] => arr(raw).flatMap((r) => { const p = parsePost(r); return p ? [p] : []; });

function published(raw: unknown) {
  const p = parsePost({ ...obj(raw), people: [] });
  const at = date(obj(raw)["published_at"]);
  return p && at ? { id: p.id, title: p.title, instagramUrl: p.instagramUrl, facebookUrl: p.facebookUrl, publishedAt: at } : null;
}
export const parseMyFeatures = (raw: unknown): MyFeature[] =>
  arr(raw).flatMap((r) => { const p = published(r); return p ? [{ ...p, choice: choiceOf(obj(r)["choice"]) }] : []; });
export const parsePublicFeatures = (raw: unknown): PublicFeature[] => arr(raw).flatMap((r) => { const p = published(r); return p ? [p] : []; });

/** For the operator's list: who has answered, and how. */
export function consentSummary(people: FeaturePerson[]) {
  return {
    shown: people.filter((p) => p.choice === "shown").length,
    hidden: people.filter((p) => p.choice === "hidden").length,
    pending: people.filter((p) => p.choice === "pending").length,
  };
}
