/**
 * Minimal sliding-window rate limiter (in memory).
 * Best-effort: each server instance keeps its own counters. It stops casual abuse
 * and runaway loops; for a hard guarantee use an edge rule or a shared store.
 */
type Hit = number[];

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, Hit>();
  const maxKeys = opts.maxKeys ?? 5000;

  return function check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - opts.windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= opts.limit) {
      hits.set(key, recent);
      return {
        ok: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(((recent[0] ?? now) + opts.windowMs - now) / 1000),
        ),
      };
    }

    recent.push(now);
    hits.delete(key); // re-insert so the oldest keys come first
    hits.set(key, recent);

    if (hits.size > maxKeys) {
      for (const k of hits.keys()) {
        hits.delete(k);
        if (hits.size <= maxKeys) break;
      }
    }
    return { ok: true };
  };
}

export function clientKey(request: Request): string {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return ip.slice(0, 64);
}
