/**
 * Security headers for every response the Worker/SSR server produces (applied in src/server.ts).
 *
 * Allowed third parties — exactly what the app uses:
 *   - Supabase project (REST/Auth/Storage over https, Realtime over wss; signed photo URLs are images, signed
 *     portfolio video URLs are media)
 *   - Cloudflare Turnstile (script + iframe on challenges.cloudflare.com)
 *   - Google Fonts (stylesheet on fonts.googleapis.com, files on fonts.gstatic.com)
 * Google sign-in is a full-page redirect to Supabase → Google → back (no popup, no Google script), so it needs
 * no CSP entry; form-action/navigation are not restricted by these sources.
 *
 * Known limitation (phase 1): scripts allow 'unsafe-inline' because the page has inline scripts (theme init,
 * TanStack hydration). External script origins are still locked down. Phase 2 = per-request nonces (router ssr.nonce).
 * Dev: CSP is Report-Only (violations show in the console, nothing breaks) and allows the Vite HMR websocket;
 * no HSTS / upgrade-insecure-requests on http://localhost.
 */
export type HeaderOptions = { supabaseUrl?: string | undefined; dev: boolean };

const TURNSTILE = "https://challenges.cloudflare.com";

function supabaseOrigins(url: string | undefined): { https: string; wss: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return { https: u.origin, wss: u.origin.replace(/^http/, "ws") };
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({ supabaseUrl, dev }: HeaderOptions): string {
  const sb = supabaseOrigins(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", TURNSTILE],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    // blob: = local photo previews before upload; Supabase = signed photo URLs.
    "img-src": ["'self'", "data:", "blob:", ...(sb ? [sb.https] : [])],
    // Portfolio videos: blob: = the upload check reads the picked file (motion.ts probeVideo); Supabase = signed video URLs.
    // Without it media falls back to default-src and every video is refused ("cannot read this video").
    "media-src": ["'self'", "blob:", ...(sb ? [sb.https] : [])],
    "connect-src": ["'self'", ...(sb ? [sb.https, sb.wss] : []), ...(dev ? ["ws:", "wss:"] : [])],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function securityHeaders(opts: HeaderOptions): Record<string, string> {
  const h: Record<string, string> = {
    [opts.dev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"]: contentSecurityPolicy(opts),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Only what the app never uses. Clipboard and Web Share stay allowed (share kit).
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    // Google sign-in is a redirect, not a popup, so same-origin is safe.
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  // HSTS only over https (production). No "preload": that is hard to undo and needs a separate decision.
  if (!opts.dev) h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return h;
}

/** Returns the response with the headers added (never overriding a header the route set itself). */
export function withSecurityHeaders(response: Response, headers: Record<string, string>): Response {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}
