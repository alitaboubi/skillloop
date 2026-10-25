import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rate-limit.server";

describe("rate limiter", () => {
  it("allows up to the limit then blocks with a retry delay", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 10).ok).toBe(true);
    const third = check("a", 20);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
  it("tracks keys independently and frees the window over time", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("b", 0).ok).toBe(true);
    expect(check("a", 500).ok).toBe(false);
    expect(check("a", 1500).ok).toBe(true);
  });
  it("reads the client IP from proxy headers", () => {
    const r = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 9.9.9.9" } });
    expect(clientKey(r)).toBe("1.2.3.4");
  });
});
