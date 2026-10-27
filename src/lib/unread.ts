import type { LastMessage } from "@/lib/requests-db";

/**
 * Unread conversations, remembered on THIS device (localStorage) — no database change.
 * A conversation is unread when its newest message comes from the other person and is newer than the moment this
 * device last opened that conversation (or than the moment the feature first ran here, so past history never counts).
 * Limitation: reading on another device doesn't clear it here (would need server-side read markers).
 */
export type ReadState = { since: string; seen: Record<string, string> };

// Browser ISO ("…Z") and Postgres ("…+00:00") formats differ: always compare real timestamps.
const ms = (iso: string | undefined) => (iso ? Date.parse(iso) || 0 : 0);

const KEY = (userId: string) => `skillloop.read.${userId}`;
export const READ_EVENT = "skillloop:read";

export function loadReadState(userId: string, now = new Date()): ReadState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(userId)) ?? "null") as Partial<ReadState> | null;
    if (v && typeof v.since === "string" && v.seen && typeof v.seen === "object") return { since: v.since, seen: v.seen as Record<string, string> };
  } catch { /* unreadable: start fresh */ }
  const fresh = { since: now.toISOString(), seen: {} };
  try { localStorage.setItem(KEY(userId), JSON.stringify(fresh)); } catch { /* storage off */ }
  return fresh;
}

/** Remembers that this conversation was read up to `at` (its newest message time). */
export function markRead(userId: string, requestId: string, at: string) {
  const s = loadReadState(userId);
  if (ms(s.seen[requestId]) >= ms(at)) return;
  s.seen[requestId] = at;
  // Keep the map small: only the 300 most recent read markers.
  const entries = Object.entries(s.seen).sort((a, b) => ms(b[1]) - ms(a[1])).slice(0, 300);
  try { localStorage.setItem(KEY(userId), JSON.stringify({ since: s.since, seen: Object.fromEntries(entries) })); } catch { /* storage off */ }
  window.dispatchEvent(new Event(READ_EVENT));
}

/** Ids of unread conversations. `last` is newest-first (lastMessagesQuery). */
export function unreadThreads(last: readonly LastMessage[], userId: string, state: ReadState): Set<string> {
  const newest = new Map<string, LastMessage>();
  for (const m of last) if (!newest.has(m.request_id)) newest.set(m.request_id, m);
  const out = new Set<string>();
  for (const [id, m] of newest) {
    if (m.sender_id === userId) continue; // I answered last: nothing new for me
    const after = Math.max(ms(state.seen[id]), ms(state.since));
    if (ms(m.created_at) > after) out.add(id);
  }
  return out;
}
