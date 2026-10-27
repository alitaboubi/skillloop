import type { Lang } from "@/lib/i18n";

/**
 * "Prévenez-moi": a visitor leaves an email to hear when a matching pro/service exists.
 * Stored in public.notify_requests (migration 20261027120000_notify_requests.sql — PREPARED, not applied):
 * insert-only for visitors, rate-limited in the database, readable only by the operator (SQL editor). No automatic
 * emails yet: the operator writes when something relevant is published.
 * Off until that migration is applied: VITE_NOTIFY_ME=on (public build flag), so the form never promises
 * something we can't keep.
 */
export const NOTIFY_ME_ENABLED = import.meta.env["VITE_NOTIFY_ME"] === "on";

export type NotifyPayload = { email: string; query?: string | undefined; category?: string | undefined; city?: string | undefined; lang: Lang };
export type NotifyResult = "ok" | "invalid" | "limited" | "error";
export type NotifyInsert = (row: Record<string, string>) => Promise<{ error: { message?: string; code?: string } | null }>;

export function isEmail(v: string): boolean {
  const s = v.trim();
  return s.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);
}

export async function submitNotify(insert: NotifyInsert, p: NotifyPayload): Promise<NotifyResult> {
  if (!isEmail(p.email)) return "invalid";
  const row: Record<string, string> = { email: p.email.trim().toLowerCase(), lang: p.lang };
  if (p.query?.trim()) row["query"] = p.query.trim().slice(0, 120);
  if (p.category) row["category"] = p.category.slice(0, 40);
  if (p.city) row["city"] = p.city.slice(0, 80);
  const { error } = await insert(row);
  if (!error) return "ok";
  return /notify_limit/.test(error.message ?? "") ? "limited" : "error";
}
