/** Recent palette searches, on this device only (localStorage, at most 5, newest first). */
const RECENT_KEY = "skillloop.recent-searches";

export function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch { return []; }
}
export function rememberSearch(q: string) {
  const v = q.trim().slice(0, 120);
  if (!v) return;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([v, ...readRecent().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 5))); } catch { /* storage off: nothing to remember */ }
}
