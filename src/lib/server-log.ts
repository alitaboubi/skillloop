/**
 * One JSON line per server error, for Cloudflare Workers Logs (dashboard → Workers → skillloop → Logs; filter
 * `$metadata.level = "error"` or search "ssr_error"). Method + path only: never query strings, headers, cookies or bodies.
 */
export function logServerError(kind: "ssr_error" | "http_5xx", request: Request, detail: { status?: number; error?: unknown } = {}) {
  let path = "?";
  try { path = new URL(request.url).pathname; } catch { /* keep "?" */ }
  const e = detail.error;
  console.error(JSON.stringify({
    kind,
    method: request.method,
    path,
    ...(detail.status ? { status: detail.status } : {}),
    ...(e ? { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), stack: e instanceof Error ? e.stack?.split("\n").slice(0, 6).join("\n") : undefined } : {}),
  }));
}
