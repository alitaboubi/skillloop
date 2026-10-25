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

/** i18n key + values for the limit message, or null when the error is not a quota refusal. */
export function limitMessage(err: Parameters<typeof limitKindOf>[0]): { key: TKey; vars: { n: number } } | null {
  const kind = limitKindOf(err);
  return kind ? { key: KEYS[kind], vars: { n: DAILY_LIMITS[kind] } } : null;
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
