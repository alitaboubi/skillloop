import type { TKey } from "./i18n";

/**
 * Suivi d'intervention (migration 20261101120000_request_progress.sql, PREPARED, NOT APPLIED). Off: the progress columns are
 * never selected or written. Steps are the pro's own statements stamped by the database — no location is recorded.
 */
export const REQUEST_PROGRESS_ENABLED = import.meta.env["VITE_REQUEST_PROGRESS"] === "on";

export const PROGRESS_COLUMNS = "scheduled_for, on_the_way_at, started_at, completed_at";

export type Progress = {
  scheduled_for?: string | null | undefined; on_the_way_at?: string | null | undefined;
  started_at?: string | null | undefined; completed_at?: string | null | undefined;
};
export type ProgressStep = "on_the_way" | "started" | "completed";

export const STEP_COLUMN = { on_the_way: "on_the_way_at", started: "started_at", completed: "completed_at" } as const;
export const STEP_KEY: Record<ProgressStep, TKey> = { on_the_way: "pg_on_the_way", started: "pg_started", completed: "pg_completed" };
export const STEP_ACTION_KEY: Record<ProgressStep, TKey> = { on_the_way: "pg_do_on_the_way", started: "pg_do_started", completed: "pg_do_completed" };
export const STEP_CLIENT_KEY: Record<ProgressStep, TKey> = { on_the_way: "pg_client_on_the_way", started: "pg_client_started", completed: "pg_client_completed" };

/** The latest step the pro recorded, or null when only the acceptance happened. */
export function latestStep(p: Progress): ProgressStep | null {
  return p.completed_at ? "completed" : p.started_at ? "started" : p.on_the_way_at ? "on_the_way" : null;
}

/** The one step the pro can record next (same order as the database: no going backwards). Remote jobs have no "en route". */
export function nextStep(p: Progress, remote: boolean): ProgressStep | null {
  if (p.completed_at) return null;
  if (p.started_at) return "completed";
  if (p.on_the_way_at || remote) return "started";
  return "on_the_way";
}

/** Steps shown in the timeline after "accepted": recorded ones with their time, then what's still ahead. */
export function progressChain(p: Progress, remote: boolean): { step: ProgressStep; at: string | undefined }[] {
  const all: ProgressStep[] = remote && !p.on_the_way_at ? ["started", "completed"] : ["on_the_way", "started", "completed"];
  const reached = latestStep(p);
  const lastIdx = reached ? all.indexOf(reached) : -1;
  // A step skipped before the latest recorded one is left out instead of showing as "upcoming" in the past.
  return all
    .map((step) => ({ step, at: p[STEP_COLUMN[step]] ?? undefined }))
    .filter((s, i) => i > lastIdx || !!s.at);
}

/** datetime-local value (the viewer's local time) ⇄ ISO. Empty or invalid input gives null. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Same rule as the database: an appointment must be upcoming (one hour of slack) and within a year. */
export function isValidAppointment(iso: string | null, now = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= now - 3600_000 && t <= now + 365 * 86_400_000;
}
