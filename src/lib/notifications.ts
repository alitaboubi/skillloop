import type { TKey } from "@/lib/i18n";
import { normalizeFacebook, normalizeInstagram } from "@/lib/social-features";

/**
 * In-app notifications (the bell). Rows are written ONLY by the database (migration 20261106120000_notifications.sql —
 * APPLIED; kinds feature_you / feature_new come with 20261106140000_social_features.sql, PREPARED) from real events; a row holds ids + a kind, and the sentence is written here in the reader's
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
  /** Live display name of who acted; "" = deleted account; null = no actor (welcome, service live). */
  actorName: string | null;
  /** feature_*: the SkillLoop post (title + its Instagram / Facebook link); null once deleted. */
  featureTitle: string | null;
  featureUrl: string | null;
};
export type NotificationFeed = { unread: number; items: AppNotification[] };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : null);
/** Only SkillLoop's own Instagram / Facebook links are ever opened from the bell. */
const safeSocialUrl = (v: unknown) => {
  const s = str(v);
  return s && (normalizeInstagram(s) === s || normalizeFacebook(s) === s) ? s : null;
};
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
      featureTitle: str(d["feature_title"]), featureUrl: safeSocialUrl(d["feature_url"]),
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
  | { kind: "link"; to: "/admin"; search: Record<string, never> }
  | { kind: "support" }
  | { kind: "external"; href: string };

export function targetOf(n: Pick<AppNotification, "kind" | "requestId" | "serviceId"> & Partial<Pick<AppNotification, "featureUrl">>): Target {
  switch (n.kind) {
    // « On parle de toi » sits at the top of the dashboard overview (choose to show it on the profile, share it).
    case "feature_you": return { kind: "link", to: "/dashboard", search: {} };
    case "feature_new": return n.featureUrl ? { kind: "external", href: n.featureUrl } : { kind: "link", to: "/dashboard", search: {} };
    case "support_reply": return { kind: "support" };
    case "support_new": return { kind: "link", to: "/admin", search: {} };
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
