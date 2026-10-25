/**
 * "Pick up where you left off": the page a signed-out user was on when a sign-in prompt sent them away.
 * Stored per tab (sessionStorage), internal paths only, short-lived, consumed once.
 */
export const RETURN_KEY = "skillloop.returnTo";
export const RETURN_TTL = 30 * 60 * 1000;

/** Only these app areas can be returned to — never an arbitrary or external URL. */
const ALLOWED = [/^\/services\/[0-9a-f-]{36}$/i, /^\/offer$/, /^\/messages$/, /^\/dashboard$/, /^\/profile$/, /^\/pros\/[0-9a-f-]{36}$/i];

/** Returns a safe same-origin path (with its query/hash) or null. Rejects schemes, protocol-relative and backslash tricks. */
export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 400) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || [...raw].some((c) => c.charCodeAt(0) < 32)) return null;
  let url: URL;
  try { url = new URL(raw, "https://skillloop.invalid"); } catch { return null; }
  if (url.origin !== "https://skillloop.invalid") return null;
  if (!ALLOWED.some((re) => re.test(url.pathname))) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

type Stored = { path: string; at: number; oauth?: boolean };

/** Remember a page to come back to after signing in. Invalid paths are ignored. */
export function setReturnTo(path: string, now = Date.now()) {
  const safe = safeReturnPath(path);
  if (!safe) return;
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: safe, at: now } satisfies Stored)); } catch { /* storage unavailable */ }
}

/** Remember the current page (path + query + hash). */
export function rememberCurrentPage() {
  if (typeof window !== "undefined") setReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}

function read(now: number): Stored | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Stored>;
    const path = safeReturnPath(d.path);
    if (!path || typeof d.at !== "number" || now - d.at > RETURN_TTL) { sessionStorage.removeItem(RETURN_KEY); return null; }
    return { path, at: d.at, oauth: d.oauth === true };
  } catch { return null; }
}

export function peekReturnTo(now = Date.now()): string | null {
  return read(now)?.path ?? null;
}

/** Read and forget — a return target is used once. */
export function takeReturnTo(now = Date.now()): string | null {
  const d = read(now);
  clearReturnTo();
  return d?.path ?? null;
}

export function clearReturnTo() {
  try { sessionStorage.removeItem(RETURN_KEY); } catch { /* ignore */ }
}

/** Google sign-in leaves the page; flag the pending target so the app can finish the trip when the session appears. */
export function markOAuthReturn() {
  const d = read(Date.now());
  if (!d) return;
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ ...d, oauth: true })); } catch { /* ignore */ }
}

/** Target waiting for an OAuth round-trip, consumed once. */
export function takeOAuthReturn(now = Date.now()): string | null {
  const d = read(now);
  if (!d?.oauth) return null;
  clearReturnTo();
  return d.path;
}

/** Why the user is on the sign-in page, from the remembered page (or a pending homepage offer draft). */
export function authContext(path: string | null, offerDraftPending: boolean): "request" | "offer" | "messages" | null {
  if (path?.startsWith("/services/")) return "request";
  if (path?.startsWith("/offer") || (!path && offerDraftPending)) return "offer";
  if (path?.startsWith("/messages")) return "messages";
  return null;
}
