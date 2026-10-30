import { queryOptions } from "@tanstack/react-query";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import { PRO_PLAN_ENABLED } from "./plan";

/**
 * SkillLoop Pro, phase 2 — the tools sold on /pricing: portfolio videos (src/lib/motion.ts), carnet themes
 * (src/lib/carnet.ts), statistics (here) and the card + QR (src/lib/pro-card.ts, no database part). Stored by migration
 * 20261030120000_pro_tools.sql — PREPARED, not applied. Off until then: VITE_PRO_TOOLS=on (public build flag, needs
 * VITE_PRO_PLAN=on too). While off, nothing reads or writes the new columns/functions. The card needs only the plan.
 */
export const PRO_TOOLS_ENABLED = PRO_PLAN_ENABLED && import.meta.env["VITE_PRO_TOOLS"] === "on";

/** Whether a profile currently has Pro (public; the profile page applies the pro's carnet theme only then). */
export const hasProQuery = (userId: string) => queryOptions({
  queryKey: ["has-pro", userId],
  enabled: PRO_TOOLS_ENABLED && !!userId,
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data, error } = await publicSupabase.rpc("has_pro" as never, { p_user: userId } as never);
    if (error) throw error;
    return data === true;
  },
});

/* ---------- Statistics ---------- */

export const EVENT_KINDS = ["profile_view", "service_view", "qr_scan", "contact_click", "share"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type StatKind = EventKind | "request";
export const STATS_DAYS = 30;

/** Session key per event and target: a visitor reloading the page counts once per browser session. */
const seenKey = (kind: EventKind, target: string) => `sl-ev:${kind}:${target}`;
/** Repeatable events (a second click on WhatsApp is a second contact) are not de-duplicated. */
const ONCE_PER_SESSION: ReadonlySet<EventKind> = new Set(["profile_view", "service_view", "qr_scan"]);

/**
 * +1 on a pro's counter (fire and forget; failures are ignored — statistics never break a page). The database ignores
 * the pro's own visits and unknown targets. Bots driven by automation (navigator.webdriver) are skipped.
 */
export function recordPageEvent(kind: EventKind, target: string, storage: Pick<Storage, "getItem" | "setItem"> | null = safeSession()): void {
  if (!PRO_TOOLS_ENABLED || typeof window === "undefined" || navigator.webdriver) return;
  if (!shouldRecord(kind, target, storage)) return;
  void supabase.rpc("record_page_event" as never, { p_kind: kind, p_target: target } as never).then(() => {}, () => {});
}

/** De-duplication rule (exported for tests): once per session for views, always for clicks and shares. */
export function shouldRecord(kind: EventKind, target: string, storage: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  if (!ONCE_PER_SESSION.has(kind)) return true;
  try {
    if (!storage) return true;
    if (storage.getItem(seenKey(kind, target))) return false;
    storage.setItem(seenKey(kind, target), "1");
  } catch { /* private mode: count it */ }
  return true;
}

function safeSession(): Storage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}

export type DayPoint = { day: string; views: number };
export type StatsSummary = { since: string; days: number; totals: Record<StatKind, number>; series: DayPoint[]; empty: boolean };

const emptyTotals = (): Record<StatKind, number> => ({ profile_view: 0, service_view: 0, qr_scan: 0, contact_click: 0, share: 0, request: 0 });

/** Adds days to an ISO date (UTC arithmetic on the calendar date only). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Reads public.my_page_stats()'s JSON defensively into totals and a gap-free daily series of page views
 * (profile + service views + QR scans). Unknown kinds and malformed rows are dropped.
 */
export function summarizeStats(raw: unknown): StatsSummary {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const days = typeof o["days"] === "number" && o["days"] >= 1 && o["days"] <= 90 ? Math.floor(o["days"]) : STATS_DAYS;
  const since = typeof o["since"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o["since"]) ? o["since"] : addDays(new Date().toISOString().slice(0, 10), 1 - days);
  const totals = emptyTotals();
  const perDay = new Map<string, number>();
  for (const r of Array.isArray(o["rows"]) ? (o["rows"] as unknown[]) : []) {
    const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const kind = row["kind"], day = row["day"], count = row["count"];
    if (typeof kind !== "string" || !(kind in totals) || typeof day !== "string" || typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
    totals[kind as StatKind] += count;
    if (kind === "profile_view" || kind === "service_view" || kind === "qr_scan") perDay.set(day.slice(0, 10), (perDay.get(day.slice(0, 10)) ?? 0) + count);
  }
  const series = Array.from({ length: days }, (_, i) => { const day = addDays(since, i); return { day, views: perDay.get(day) ?? 0 }; });
  return { since, days, totals, series, empty: Object.values(totals).every((v) => v === 0) };
}

export const myStatsQuery = (userId: string) => queryOptions({
  queryKey: ["page-stats", userId],
  enabled: PRO_TOOLS_ENABLED && !!userId,
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("my_page_stats" as never, { p_days: STATS_DAYS } as never);
    if (error) throw error;
    return summarizeStats(data);
  },
});
