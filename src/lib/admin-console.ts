import type { TKey } from "@/lib/i18n";

/**
 * The /admin console: sections, and the defensive readers for the operator functions of migrations
 * 20261107130000_admin_console.sql (people, to-dos, log) and 20261107140000_admin_subscriptions.sql (Pro access).
 * Both are PREPARED: until applied, the matching blocks say so (isMissingFunction) instead of failing.
 */

export const CONSOLE_SECTIONS = ["overview", "messages", "users", "social", "subscriptions", "payments"] as const;
export type ConsoleSection = (typeof CONSOLE_SECTIONS)[number];

export const SECTION_LABEL: Record<ConsoleSection, TKey> = {
  overview: "ac_overview", messages: "ac_messages", users: "ac_users", social: "sf_adm_title", subscriptions: "ac_subs", payments: "ac_payments",
};

/** Sections shown, in order, given which features are on (the flags of each block). */
export function visibleSections(on: { support: boolean; social: boolean; payments: boolean }): ConsoleSection[] {
  return CONSOLE_SECTIONS.filter((s) => (s !== "messages" || on.support) && (s !== "social" || on.social) && (s !== "payments" || on.payments));
}

/** The function is not in the database yet (migration not applied): PostgREST PGRST202 / Postgres 42883. */
export function isMissingFunction(e: unknown): boolean {
  const o = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
  const code = typeof o["code"] === "string" ? o["code"] : "";
  const msg = typeof o["message"] === "string" ? o["message"] : "";
  return code === "PGRST202" || code === "42883" || /could not find the function/i.test(msg);
}

export function consoleErrorKey(e: unknown): TKey {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("bad_days")) return "ac_err_days";
  if (msg.includes("not_pro")) return "ac_err_not_pro";
  if (msg.includes("not_admin")) return "adm_denied_t";
  return "sf_err_generic";
}

/* ---------- readers ---------- */

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export type ConsoleUser = {
  id: string; name: string; city: string | null; avatarPath: string | null; createdAt: string | null;
  pro: boolean; services: number; requests: number; support: "open" | "closed" | null;
};
export type UserPage = { total: number; items: ConsoleUser[] };

export function parseUsers(raw: unknown): UserPage {
  const o = obj(raw);
  const items = arr(o["items"]).flatMap((r): ConsoleUser[] => {
    const d = obj(r);
    const id = str(d["id"]), name = str(d["name"])?.trim();
    if (!id || !name) return [];
    const support = d["support"] === "open" || d["support"] === "closed" ? d["support"] : null;
    return [{ id, name, city: str(d["city"]), avatarPath: str(d["avatar_url"]), createdAt: date(d["created_at"]), pro: d["pro"] === true,
      services: num(d["services"]), requests: num(d["requests"]), support }];
  });
  return { total: Math.max(num(o["total"]), items.length), items };
}

export type UserDetail = {
  id: string; name: string; city: string | null; area: string | null; title: string | null; avatarPath: string | null;
  createdAt: string | null; lang: string | null; admin: boolean;
  services: { id: string; title: string; status: "published" | "draft"; archived: boolean; city: string | null; createdAt: string | null }[];
  requests: { asClient: number; asPro: number; pending: number; accepted: number };
  portfolio: number; features: number;
  support: { status: "open" | "closed"; lastAt: string | null } | null;
};

export function parseUserDetail(raw: unknown): UserDetail | null {
  const d = obj(raw);
  const id = str(d["id"]), name = str(d["name"]);
  if (!id || !name) return null;
  const r = obj(d["requests"]), s = d["support"] ? obj(d["support"]) : null;
  return {
    id, name, city: str(d["city"]), area: str(d["area"]), title: str(d["title"]), avatarPath: str(d["avatar_url"]),
    createdAt: date(d["created_at"]), lang: str(d["lang"]), admin: d["admin"] === true,
    services: arr(d["services"]).flatMap((x) => {
      const v = obj(x), sid = str(v["id"]), title = str(v["title"]);
      return sid && title ? [{ id: sid, title, status: v["status"] === "draft" ? "draft" as const : "published" as const, archived: v["archived"] === true, city: str(v["city"]), createdAt: date(v["created_at"]) }] : [];
    }),
    requests: { asClient: num(r["as_client"]), asPro: num(r["as_pro"]), pending: num(r["pending"]), accepted: num(r["accepted"]) },
    portfolio: num(d["portfolio"]), features: num(d["features"]),
    support: s ? { status: s["status"] === "closed" ? "closed" : "open", lastAt: date(s["last_message_at"]) } : null,
  };
}

export type Todo = {
  supportUnread: number; supportOpen: number; consentPending: number; requestsWaiting: number; newUsers: number;
  /** Only when those migrations are applied. */
  paymentsPending: number | null; trialsEnding: number | null;
};
export function parseTodo(raw: unknown): Todo {
  const o = obj(raw);
  const opt = (k: string) => (k in o ? num(o[k]) : null);
  return {
    supportUnread: num(o["support_unread"]), supportOpen: num(o["support_open"]), consentPending: num(o["consent_pending"]),
    requestsWaiting: num(o["requests_waiting"]), newUsers: num(o["new_users"]), paymentsPending: opt("payments_pending"), trialsEnding: opt("trials_ending"),
  };
}

export type SubStatus = "trial" | "active" | "expired" | "cancelled";
export type SubRow = {
  userId: string; name: string; city: string | null; avatarPath: string | null; status: SubStatus; founder: boolean;
  /** When Pro ends (trial end or paid period end); null = never had a date. */
  until: string | null; pro: boolean;
};
const SUB_STATUS: SubStatus[] = ["trial", "active", "expired", "cancelled"];
export function parseSubs(raw: unknown): SubRow[] {
  return arr(raw).flatMap((r) => {
    const d = obj(r), userId = str(d["user_id"]), name = str(d["name"]);
    const status = SUB_STATUS.find((x) => x === d["status"]);
    return userId && name && status ? [{ userId, name, city: str(d["city"]), avatarPath: str(d["avatar_url"]), status, founder: d["founder"] === true, until: date(d["until"]), pro: d["pro"] === true }] : [];
  });
}

export type LogEntry = { id: number; at: string; action: string; actorName: string; targetId: string | null; targetName: string; detail: { days: number | null; until: string | null; note: string | null } };
export function parseLog(raw: unknown): LogEntry[] {
  return arr(raw).flatMap((r) => {
    const d = obj(r), at = date(d["at"]), action = str(d["action"]);
    const id = typeof d["id"] === "number" ? d["id"] : NaN;
    if (!at || !action || Number.isNaN(id)) return [];
    const x = obj(d["detail"]);
    return [{ id, at, action, actorName: str(d["actor_name"]) ?? "", targetId: str(d["target_id"]), targetName: str(d["target_name"]) ?? "",
      detail: { days: typeof x["days"] === "number" ? x["days"] : null, until: date(x["until"]), note: str(x["note"]) } }];
  });
}

/* ---------- Pro access ---------- */

/** Quick choices in the grant form (days). */
export const GRANT_PRESETS = [30, 90, 365] as const;
export const GRANT_MAX = 730;
export const validDays = (n: number) => Number.isInteger(n) && n >= 1 && n <= GRANT_MAX;

/** Whole days left until `iso` (0 when past or unknown). */
export function daysLeft(iso: string | null, now = Date.now()): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 86_400_000));
}

/** The end date a grant will give: from the later of now / the current end. Mirrors admin_grant_pro. */
export function grantEnd(currentUntil: string | null, days: number, now = Date.now()): Date {
  const base = Math.max(now, currentUntil ? Date.parse(currentUntil) : now);
  return new Date(base + days * 86_400_000);
}

export type SubFilter = "all" | "active" | "trial" | "ended";
export const SUB_FILTERS: SubFilter[] = ["active", "trial", "ended", "all"];
