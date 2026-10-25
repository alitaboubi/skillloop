import type { TKey } from "./i18n";

/** Conversation-list and thread rules (pure, tested). */

/** First (latest) message per request from a newest-first list. */
export function lastByRequest<M extends { request_id: string; created_at: string }>(rows: M[]): Map<string, M> {
  const out = new Map<string, M>();
  for (const m of rows) {
    const cur = out.get(m.request_id);
    if (!cur || m.created_at > cur.created_at) out.set(m.request_id, m);
  }
  return out;
}

/** Most recent activity first: the latest message, or the request itself when nothing newer exists. */
export function sortByActivity<R extends { id: string; created_at: string }>(reqs: R[], last: Map<string, { created_at: string }>): R[] {
  const at = (r: R) => { const m = last.get(r.id)?.created_at; return m && m > r.created_at ? m : r.created_at; };
  return [...reqs].sort((a, b) => at(b).localeCompare(at(a)));
}

/** Local calendar day, used to place separators between days. */
export const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/** "Today" / "Yesterday" or null (caller formats the date). */
export function relativeDay(iso: string, now = new Date()): "day_today" | "day_yesterday" | null {
  const k = dayKey(iso);
  if (k === dayKey(now.toISOString())) return "day_today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  return k === dayKey(y.toISOString()) ? "day_yesterday" : null;
}

/** Messages with a day header before the first message of each day. */
export function withDaySeparators<M extends { id: string; created_at: string }>(msgs: M[]): ({ kind: "day"; key: string; at: string } | { kind: "msg"; m: M })[] {
  const out: ({ kind: "day"; key: string; at: string } | { kind: "msg"; m: M })[] = [];
  let prev = "";
  for (const m of msgs) {
    const k = dayKey(m.created_at);
    if (k !== prev) { out.push({ kind: "day", key: k, at: m.created_at }); prev = k; }
    out.push({ kind: "msg", m });
  }
  return out;
}

/** What a client should do next on a request card. */
export function clientNextStep(status: string): { key: TKey; action: "chat" | "similar" | null } {
  switch (status) {
    case "accepted": return { key: "trk_accepted", action: "chat" };
    case "declined": return { key: "trk_declined", action: "similar" };
    case "cancelled": return { key: "trk_cancelled", action: "similar" };
    default: return { key: "tl_waiting", action: null };
  }
}

/** Optional prompt line for the request composer; never duplicated, always on its own line. */
export function addPromptLine(message: string, label: string): { value: string; added: boolean } {
  const lines = message.split("\n");
  if (lines.some((l) => l.trimStart().startsWith(label))) return { value: message, added: false };
  const sep = message.trim() === "" ? "" : message.endsWith("\n") ? "" : "\n";
  return { value: `${message.trim() === "" ? "" : message}${sep}${label} `, added: true };
}
