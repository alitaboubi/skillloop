import type { supabase } from "@/integrations/supabase/client";
import type { TKey } from "./i18n";

/**
 * Daily quotas enforced by the database (migration 20261024140000_limits_and_quotas.sql): per account, rolling 24 h.
 * Only new rows count (edits, archive/restore, publishing a draft, status changes don't). Keep in sync with
 * private.daily_cap() in that migration.
 */
export const DAILY_LIMITS = { services: 20, requests: 30, messages: 300, uploads: 40 } as const;
export type LimitKind = keyof typeof DAILY_LIMITS;

const KEYS: Record<LimitKind, TKey> = { services: "limit_services", requests: "limit_requests", messages: "limit_messages", uploads: "limit_uploads" };

/**
 * The quota kind when an error is exactly the database's quota refusal ("daily_limit_reached:<kind>"), else null —
 * so no other error is ever shown as a daily limit.
 */
export function limitKindOf(err: string | { message?: string | undefined } | null | undefined): LimitKind | null {
  const msg = typeof err === "string" ? err : err?.message;
  const m = /^daily_limit_reached:(services|requests|messages|uploads)$/.exec(msg?.trim() ?? "");
  return m ? (m[1] as LimitKind) : null;
}

/**
 * Plan limits enforced by the database (migration 20261029120000_subscriptions.sql): "plan_limit_reached:<kind>" when a
 * free account publishes a 3rd service or adds a 7th portfolio item. Keep the numbers in sync with src/lib/plan.ts.
 */
const PLAN_KEYS = { services: { key: "plan_limit_services", n: 2 }, portfolio: { key: "plan_limit_portfolio", n: 6 } } as const satisfies Record<string, { key: TKey; n: number }>;
export function planLimitKindOf(err: Parameters<typeof limitKindOf>[0]): keyof typeof PLAN_KEYS | null {
  const msg = typeof err === "string" ? err : err?.message;
  const m = /^plan_limit_reached:(services|portfolio)$/.exec(msg?.trim() ?? "");
  return m ? (m[1] as keyof typeof PLAN_KEYS) : null;
}

/**
 * Pro-only tools refused by the database (migration 20261030120000_pro_tools.sql): "plan_required:<kind>" when an
 * account without Pro adds a video, picks a carnet theme or reads statistics.
 */
const PRO_KEYS = { motion: "plan_required_motion", themes: "plan_required_themes", stats: "plan_required_stats" } as const satisfies Record<string, TKey>;
export function planRequiredKindOf(err: Parameters<typeof limitKindOf>[0]): keyof typeof PRO_KEYS | null {
  const msg = typeof err === "string" ? err : err?.message;
  const m = /^plan_required:(motion|themes|stats)$/.exec(msg?.trim() ?? "");
  return m ? (m[1] as keyof typeof PRO_KEYS) : null;
}

/** i18n key + values for a daily-quota, plan-limit or Pro-only refusal, or null for any other error. */
export function limitMessage(err: Parameters<typeof limitKindOf>[0]): { key: TKey; vars: { n: number } } | null {
  const kind = limitKindOf(err);
  if (kind) return { key: KEYS[kind], vars: { n: DAILY_LIMITS[kind] } };
  const plan = planLimitKindOf(err);
  if (plan) return { key: PLAN_KEYS[plan].key, vars: { n: PLAN_KEYS[plan].n } };
  const pro = planRequiredKindOf(err);
  return pro ? { key: PRO_KEYS[pro], vars: { n: 0 } } : null;
}

/**
 * After a FAILED upload only: storage reports an over-quota upload as a generic permission error, so ask the database
 * whether the upload quota is used up. Any doubt (function missing before the migration, network) → false.
 */
export async function uploadLimitReached(db: Pick<typeof supabase, "rpc">): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("upload_quota_left" as never);
    return !error && data === 0;
  } catch {
    return false;
  }
}

export const UPLOAD_LIMIT_ERROR = "daily_limit_reached:uploads";
