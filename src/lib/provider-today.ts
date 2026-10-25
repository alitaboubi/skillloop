/** Provider "Today" rules: only what needs action, from real data (pure, tested). */

/** Requests waiting for this provider's answer, oldest first (the longest wait comes first). */
export function pendingOldestFirst<R extends { provider_id: string; status: string; created_at: string }>(reqs: R[], userId: string): R[] {
  return reqs.filter((r) => r.provider_id === userId && r.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** How long a request has waited, in the largest whole unit (at least 1 minute). */
export function waitDuration(createdAt: string, now = Date.now()): { n: number; unit: "minute" | "hour" | "day" } {
  const mins = Math.max(1, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  if (mins < 60) return { n: mins, unit: "minute" };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { n: hours, unit: "hour" };
  return { n: Math.floor(hours / 24), unit: "day" };
}

/** Localised "2 days" / "2 jours" / Arabic, via the platform's unit formatting. */
export function formatWait(createdAt: string, locale: string, now = Date.now()): string {
  const { n, unit } = waitDuration(createdAt, now);
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(n);
}

/** Unpublished, unarchived services — things to finish. */
export function draftsToFinish<S extends { status: string; archived?: boolean | null }>(services: S[]): S[] {
  return services.filter((s) => s.status === "draft" && !s.archived);
}

/** Drafts first, so unfinished work stands out in service lists. */
export function draftsFirst<S extends { status: string }>(services: S[]): S[] {
  return [...services].sort((a, b) => (a.status === "draft" ? 0 : 1) - (b.status === "draft" ? 0 : 1));
}

/** Nothing waiting: no pending request and no draft. */
export const isCaughtUp = (pending: number, drafts: number) => pending === 0 && drafts === 0;
