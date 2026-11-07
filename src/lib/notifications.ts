import type { TKey } from "@/lib/i18n";
import { normalizeFacebook, normalizeInstagram } from "@/lib/social-features";

/**
 * In-app notifications (the bell). Rows are written ONLY by the database (migration 20261106120000_notifications.sql —
 * APPLIED; kinds feature_you / feature_new come with 20261106140000_social_features.sql, APPLIED) from real events; a row holds ids + a kind, and the sentence is written here in the reader's
 * language. Off until VITE_NOTIFICATIONS=on: while off nothing calls the RPCs and no bell is shown.
 */
export const NOTIFICATIONS_ENABLED = import.meta.env["VITE_NOTIFICATIONS"] === "on";

export const NOTIFICATION_KINDS = [
  "welcome", "service_live", "request_new", "request_accepted", "request_declined", "request_cancelled",
  "job_scheduled", "job_on_the_way", "job_started", "job_completed", "review_new", "review_reply",
  "support_new", "support_reply", "feature_you", "feature_new",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
  requestId: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  /** Who acted (only known from a live row or a lookup: my_notifications() does not return it). */
  actorId?: string | null;
  /** Live display name of who acted; "" = deleted account; null = no actor (welcome, service live). */
  actorName: string | null;
  /** feature_*: the SkillLoop post (title + its Instagram / Facebook links + date); null once deleted. */
  featureTitle: string | null;
  featureUrl: string | null;
  featureInstagramUrl: string | null;
  featureFacebookUrl: string | null;
  featurePublishedAt: string | null;
};
export type NotificationFeed = { unread: number; items: AppNotification[] };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : null);
/** Only SkillLoop's own Instagram / Facebook links are ever opened from the bell. */
const safeSocialUrl = (v: unknown) => {
  const s = str(v);
  return s && (normalizeInstagram(s) === s || normalizeFacebook(s) === s) ? s : null;
};
/**
 * The post's links. Both come from 20261107120000_feature_links.sql; before it, only feature_url (Instagram first) — it is
 * then placed on the platform its shape belongs to.
 */
function featureOf(d: Record<string, unknown>) {
  const url = safeSocialUrl(d["feature_url"]);
  const ig = str(d["feature_instagram_url"]), fb = str(d["feature_facebook_url"]);
  const at = str(d["feature_published_at"]);
  return {
    featureTitle: str(d["feature_title"]),
    featureUrl: url,
    featureInstagramUrl: ig && normalizeInstagram(ig) === ig ? ig : url && normalizeInstagram(url) === url ? url : null,
    featureFacebookUrl: fb && normalizeFacebook(fb) === fb ? fb : url && normalizeFacebook(url) === url ? url : null,
    featurePublishedAt: at && !Number.isNaN(Date.parse(at)) ? at : null,
  };
}
const isKind = (v: unknown): v is NotificationKind => typeof v === "string" && (NOTIFICATION_KINDS as readonly string[]).includes(v);

/** Reads public.my_notifications()'s JSON defensively: unknown kinds and malformed rows are dropped. */
export function parseFeed(raw: unknown): NotificationFeed {
  const o = obj(raw);
  const items = (Array.isArray(o["items"]) ? o["items"] : []).flatMap((r): AppNotification[] => {
    const d = obj(r);
    const id = str(d["id"]), createdAt = str(d["created_at"]);
    if (!id || !createdAt || Number.isNaN(Date.parse(createdAt)) || !isKind(d["kind"])) return [];
    return [{
      id, kind: d["kind"], createdAt, read: !!str(d["read_at"]),
      requestId: str(d["request_id"]), serviceId: str(d["service_id"]),
      serviceTitle: str(d["service_title"]), actorName: d["actor_name"] === undefined ? null : str(d["actor_name"]),
      ...featureOf(d),
    }];
  });
  const unread = typeof o["unread"] === "number" && Number.isFinite(o["unread"]) && o["unread"] > 0 ? Math.floor(o["unread"]) : 0;
  return { unread: Math.max(unread, items.filter((i) => !i.read).length), items };
}

export type Tone = "lime" | "sea" | "clay" | "muted";
type Spec = { title: TKey; body: TKey; tone: Tone };

/** Wording + colour role per kind. Every key exists in fr/en/ar (tested). */
export const KIND_SPEC: Record<NotificationKind, Spec> = {
  welcome: { title: "nt_welcome_t", body: "nt_welcome_b", tone: "clay" },
  service_live: { title: "nt_service_live_t", body: "nt_service_live_b", tone: "lime" },
  request_new: { title: "nt_request_new_t", body: "nt_request_new_b", tone: "lime" },
  request_accepted: { title: "nt_request_accepted_t", body: "nt_request_accepted_b", tone: "lime" },
  request_declined: { title: "nt_request_declined_t", body: "nt_request_declined_b", tone: "muted" },
  request_cancelled: { title: "nt_request_cancelled_t", body: "nt_request_cancelled_b", tone: "muted" },
  job_scheduled: { title: "nt_job_scheduled_t", body: "nt_job_scheduled_b", tone: "sea" },
  job_on_the_way: { title: "nt_job_on_the_way_t", body: "nt_job_on_the_way_b", tone: "sea" },
  job_started: { title: "nt_job_started_t", body: "nt_job_started_b", tone: "sea" },
  job_completed: { title: "nt_job_completed_t", body: "nt_job_completed_b", tone: "lime" },
  review_new: { title: "nt_review_new_t", body: "nt_review_new_b", tone: "clay" },
  review_reply: { title: "nt_review_reply_t", body: "nt_review_reply_b", tone: "clay" },
  support_new: { title: "nt_support_new_t", body: "nt_support_new_b", tone: "sea" },
  support_reply: { title: "nt_support_reply_t", body: "nt_support_reply_b", tone: "sea" },
  feature_you: { title: "nt_feature_you_t", body: "nt_feature_you_b", tone: "clay" },
  feature_new: { title: "nt_feature_new_t", body: "nt_feature_new_b", tone: "clay" },
};

/** Where a notification leads. `support` opens the support panel instead of navigating. */
export type Target =
  | { kind: "link"; to: "/messages"; search: { r: string } }
  | { kind: "link"; to: "/services/$id"; params: { id: string } }
  | { kind: "link"; to: "/dashboard"; search: { mode?: "provider"; section?: "reviews" } }
  | { kind: "link"; to: "/admin"; search: { section: "messages"; c?: string } }
  | { kind: "support" }
  | { kind: "feature"; sheet: FeatureSheet };

/** The video sheet the bell opens for feature_* (watch on Instagram / Facebook, then « je veux ma vidéo » or « mon profil »). */
export type FeatureSheet = {
  mode: "new" | "you";
  title: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  publishedAt: string | null;
};
type FeatureFields = "featureTitle" | "featureInstagramUrl" | "featureFacebookUrl" | "featurePublishedAt";

export function targetOf(n: Pick<AppNotification, "kind" | "requestId" | "serviceId"> & Partial<Pick<AppNotification, FeatureFields | "actorId">>): Target {
  switch (n.kind) {
    // A deleted post has no link any more: feature_you then leads to « On parle de vous » on the dashboard.
    case "feature_you":
    case "feature_new":
      return n.featureInstagramUrl || n.featureFacebookUrl
        ? { kind: "feature", sheet: {
            mode: n.kind === "feature_you" ? "you" : "new", title: n.featureTitle?.trim() || "SkillLoop",
            instagramUrl: n.featureInstagramUrl ?? null, facebookUrl: n.featureFacebookUrl ?? null, publishedAt: n.featurePublishedAt ?? null } }
        : { kind: "link", to: "/dashboard", search: {} };
    case "support_reply": return { kind: "support" };
    // Straight to that person's conversation (the inbox alone did not say who wrote).
    case "support_new": return { kind: "link", to: "/admin", search: n.actorId ? { section: "messages", c: n.actorId } : { section: "messages" } };
    case "welcome": return { kind: "link", to: "/dashboard", search: {} };
    case "review_new": return { kind: "link", to: "/dashboard", search: { mode: "provider", section: "reviews" } };
    case "service_live":
      return n.serviceId ? { kind: "link", to: "/services/$id", params: { id: n.serviceId } } : { kind: "link", to: "/dashboard", search: {} };
    default:
      return n.requestId ? { kind: "link", to: "/messages", search: { r: n.requestId } } : { kind: "link", to: "/dashboard", search: {} };
  }
}

/** Unicode first-strong isolate: user text (a Latin name in an Arabic sentence, or the reverse) keeps its own direction. */
export const isolate = (s: string) => `\u2068${s}\u2069`;

/** Values for the sentence: {name} = who acted (deleted account → its fixed label), {service} = service title,
 * {title} = the SkillLoop post's title. */
export function vars(n: Pick<AppNotification, "actorName" | "serviceTitle"> & Partial<Pick<AppNotification, "featureTitle">>, deletedLabel: string, someoneLabel: string) {
  const name = n.actorName === null ? someoneLabel : n.actorName.trim() || deletedLabel;
  return { name: isolate(name), service: isolate(n.serviceTitle?.trim() || "SkillLoop"), title: isolate(n.featureTitle?.trim() || "SkillLoop") };
}

export type Group = { key: "today" | "week" | "earlier"; items: AppNotification[] };

/** Today / the last 7 days / earlier, in the viewer's time zone, newest first; empty groups dropped. */
export function groupByAge(items: AppNotification[], now = new Date()): Group[] {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startToday - 6 * 86_400_000;
  const groups: Group[] = [{ key: "today", items: [] }, { key: "week", items: [] }, { key: "earlier", items: [] }];
  for (const n of [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    const t = Date.parse(n.createdAt);
    groups[t >= startToday ? 0 : t >= weekAgo ? 1 : 2]!.items.push(n);
  }
  return groups.filter((g) => g.items.length);
}

/** "à l'instant", "il y a 5 min", "il y a 3 h", then a short date — via Intl, in the UI language. */
export function relativeTime(iso: string, locale: string, now = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (diff < 60_000) return rtf.format(0, "second");
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  if (diff < 7 * 86_400_000) return rtf.format(-Math.floor(diff / 86_400_000), "day");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
}

/** Badge text: 1–9, then "9+". */
export const badgeText = (n: number) => (n > 9 ? "9+" : String(n));
