import type { TKey } from "./i18n";
import { hasCarnet, readCarnet } from "./carnet";
import { STEP_KEY, progressChain, type Progress } from "./request-progress";

export type TimelineStep = { key: TKey; state: "done" | "current" | "upcoming"; tone: "default" | "positive" | "negative"; at?: string };

/**
 * Statuses: pending, accepted, declined, cancelled. Only the creation time is stored for them. With `progress` (suivi
 * d'intervention on), an accepted request continues with the pro's recorded steps and their database times.
 */
export function timelineSteps(status: string, createdAt: string, progress?: Progress & { remote?: boolean }): TimelineStep[] {
  const sent: TimelineStep = { key: "tl_sent", state: "done", tone: "default", at: createdAt };
  switch (status) {
    case "accepted": {
      if (!progress) return [sent, { key: "st_accepted", state: "current", tone: "positive" }];
      const chain = progressChain(progress, !!progress.remote);
      const anyDone = chain.some((s) => s.at);
      const steps: TimelineStep[] = [sent, { key: "st_accepted", state: anyDone ? "done" : "current", tone: "positive" }];
      const lastDone = chain.map((s) => !!s.at).lastIndexOf(true);
      chain.forEach((s, i) => steps.push({
        key: STEP_KEY[s.step],
        state: i < lastDone ? "done" : i === lastDone ? "current" : "upcoming",
        tone: s.step === "completed" && s.at ? "positive" : "default",
        ...(s.at ? { at: s.at } : {}),
      }));
      return steps;
    }
    case "declined":
      return [sent, { key: "st_declined", state: "current", tone: "negative" }];
    case "cancelled":
      return [sent, { key: "st_cancelled", state: "current", tone: "negative" }];
    default:
      return [sent, { key: "tl_waiting", state: "current", tone: "default" }, { key: "st_accepted", state: "upcoming", tone: "default" }];
  }
}

export type ChecklistInput = { avatar_url?: string | null | undefined; bio?: string | null | undefined; publishedServices: number; professional_details?: unknown };

/** Profile-completeness checklist for providers. Availability counts once "accepting" has been set either way. */
export function profileChecklist(p: ChecklistInput): { key: TKey; done: boolean }[] {
  const pd = (p.professional_details && typeof p.professional_details === "object" ? p.professional_details : {}) as Record<string, unknown>;
  return [
    { key: "db_check_photo", done: !!p.avatar_url },
    { key: "db_check_bio", done: (p.bio ?? "").trim().length >= 20 },
    { key: "db_check_service", done: p.publishedServices > 0 },
    { key: "db_check_availability", done: typeof pd["accepting"] === "boolean" || typeof pd["availability"] === "string" && pd["availability"].trim() !== "" },
    { key: "db_check_carnet", done: hasCarnet(readCarnet(pd)) },
  ];
}

/** Badge tone per request status: pending awaits a reply, accepted is positive, declined/cancelled are closed. */
/** Status tone by meaning: waiting = warning, accepted = success, closed = neutral (the badge always shows the text too). */
export function statusTone(status: string): "badge-warning" | "badge-success" | "badge-muted" {
  return status === "accepted" ? "badge-success" : status === "pending" ? "badge-warning" : "badge-muted";
}

/** /dashboard without ?mode: accounts that already have a service open the provider workspace, everyone else the client side. */
export function resolveDashboardMode(explicit: "client" | "provider" | undefined, serviceCount: number): "client" | "provider" {
  return explicit ?? (serviceCount > 0 ? "provider" : "client");
}

/** Client overview counts from real requests only. */
export function clientRequestSummary(rows: { status: string }[]): { pending: number; accepted: number; closed: number } {
  return {
    pending: rows.filter((r) => r.status === "pending").length,
    accepted: rows.filter((r) => r.status === "accepted").length,
    closed: rows.filter((r) => r.status === "declined" || r.status === "cancelled").length,
  };
}

/**
 * What the service page's request box should show for this visitor, from real data only.
 * An open request (pending or accepted) continues in its conversation instead of starting a duplicate.
 */
export type RequestGate =
  | { kind: "own" }
  | { kind: "open"; requestId: string; status: "pending" | "accepted" }
  | { kind: "not_accepting" }
  | { kind: "can_request" };
export function requestGate(p: {
  userId: string; ownerId: string | undefined; serviceId: string; accepting: unknown;
  myRequests: { id: string; service_id: string; client_id: string; status: string; created_at: string }[];
}): RequestGate {
  if (p.ownerId && p.userId === p.ownerId) return { kind: "own" };
  const open = p.myRequests
    .filter((r) => r.service_id === p.serviceId && r.client_id === p.userId && (r.status === "pending" || r.status === "accepted"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (open) return { kind: "open", requestId: open.id, status: open.status as "pending" | "accepted" };
  if (p.accepting === false) return { kind: "not_accepting" };
  return { kind: "can_request" };
}

/** One honest line per status and side, shown above the conversation. `progress`: suivi d'intervention is on. */
export function threadGuidance(status: string, role: "client" | "provider", progress?: Progress): TKey {
  switch (status) {
    case "accepted": return !progress ? "tg_accepted" : progress.completed_at ? "tg_completed" : "tg_accepted_progress";
    case "declined": return role === "client" ? "tg_declined_client" : "tg_declined_provider";
    case "cancelled": return role === "client" ? "tg_cancelled_client" : "tg_cancelled_provider";
    default: return role === "client" ? "tg_pending_client" : "tg_pending_provider";
  }
}

/** Status changes are final in the database, so each one asks first with its own consequence line. */
export const CONFIRM_STATUS: Record<"accepted" | "declined" | "cancelled", TKey> = {
  accepted: "confirm_accept", declined: "confirm_decline", cancelled: "confirm_cancel",
};
