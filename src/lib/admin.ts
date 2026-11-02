import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Operator space (/admin): platform figures, aggregates only. Stored by migration 20261102120000_admin.sql — PREPARED,
 * not applied. Off until then: VITE_ADMIN=on (public build flag). While off, /admin is a 404, nothing calls the RPCs
 * and no admin link is shown. Who is admin lives in private.admins (SQL editor only); the database refuses everyone else.
 */
export const ADMIN_ENABLED = import.meta.env["VITE_ADMIN"] === "on";

export const ADMIN_PERIODS = [7, 30, 90] as const;
export type AdminPeriod = (typeof ADMIN_PERIODS)[number];

export type Pair = { total: number; new: number };
export type AdminDay = { day: string; users: number; services: number; requests: number };
export type AdminOverview = {
  days: number;
  since: string;
  generatedAt: string | null;
  users: Pair & { deleted: number };
  pros: Pair;
  services: { published: number; draft: number; archived: number; new: number };
  requests: Pair & { pending: number; accepted: number; declined: number; cancelled: number };
  messages: Pair;
  portfolio: number;
  categories: { category: string; count: number }[];
  cities: { city: string; count: number }[];
  series: AdminDay[];
  /** Only when the subscriptions migration is applied. */
  plans: { trial: number; active: number; ended: number; founders: number } | null;
  /** Only when the notify_requests migration is applied. */
  notify: number | null;
};

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
const pick = <K extends string>(v: unknown, keys: readonly K[]) => {
  const o = obj(v);
  return Object.fromEntries(keys.map((k) => [k, num(o[k])])) as Record<K, number>;
};

/** Reads public.admin_overview()'s JSON defensively: missing or malformed figures are 0, optional blocks null. */
export function parseOverview(raw: unknown): AdminOverview {
  const o = obj(raw);
  const series = (Array.isArray(o["series"]) ? o["series"] : []).flatMap((r) => {
    const d = obj(r);
    return isDay(d["day"]) ? [{ day: d["day"].slice(0, 10), users: num(d["users"]), services: num(d["services"]), requests: num(d["requests"]) }] : [];
  });
  const ranked = <K extends string>(v: unknown, key: K) => (Array.isArray(v) ? v : []).flatMap((r) => {
    const d = obj(r);
    const name = d[key];
    return typeof name === "string" && name.trim() ? [{ [key]: name, count: num(d["count"]) } as Record<K, string> & { count: number }] : [];
  });
  return {
    days: num(o["days"]) || series.length,
    since: isDay(o["since"]) ? o["since"].slice(0, 10) : series[0]?.day ?? "",
    generatedAt: typeof o["generated_at"] === "string" && !Number.isNaN(Date.parse(o["generated_at"])) ? o["generated_at"] : null,
    users: pick(o["users"], ["total", "new", "deleted"]),
    pros: pick(o["pros"], ["total", "new"]),
    services: pick(o["services"], ["published", "draft", "archived", "new"]),
    requests: pick(o["requests"], ["total", "new", "pending", "accepted", "declined", "cancelled"]),
    messages: pick(o["messages"], ["total", "new"]),
    portfolio: num(o["portfolio"]),
    categories: ranked(o["categories"], "category"),
    cities: ranked(o["cities"], "city"),
    series,
    plans: o["plans"] ? pick(o["plans"], ["trial", "active", "ended", "founders"]) : null,
    notify: o["notify"] === undefined || o["notify"] === null ? null : num(o["notify"]),
  };
}

/** Share of answered requests that were accepted (0–100, rounded); null while nothing has been answered. */
export function acceptanceRate(r: AdminOverview["requests"]): number | null {
  const answered = r.accepted + r.declined;
  return answered ? Math.round((r.accepted / answered) * 100) : null;
}

/** Share of accounts that publish at least one service (0–100, rounded); null without accounts. */
export function proShare(o: Pick<AdminOverview, "users" | "pros">): number | null {
  return o.users.total ? Math.round((Math.min(o.pros.total, o.users.total) / o.users.total) * 100) : null;
}

export const amIAdminQuery = (userId: string) => queryOptions({
  queryKey: ["am-i-admin", userId],
  enabled: ADMIN_ENABLED && !!userId,
  staleTime: 10 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("am_i_admin" as never);
    if (error) throw error;
    return data === true;
  },
});

export const adminOverviewQuery = (days: AdminPeriod) => queryOptions({
  queryKey: ["admin-overview", days],
  enabled: ADMIN_ENABLED,
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_overview" as never, { p_days: days } as never);
    if (error) throw error;
    return parseOverview(data);
  },
});

/** Whether the signed-in user is an operator: false while off, loading or on any error (the database decides anyway). */
export function useIsAdmin(userId: string): boolean {
  const q = useQuery(amIAdminQuery(userId));
  return ADMIN_ENABLED && q.data === true;
}
