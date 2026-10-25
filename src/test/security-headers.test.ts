import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders, withSecurityHeaders } from "@/lib/security-headers";

const SB = "https://abcdefghijklmnopqrst.supabase.co";
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("content security policy", () => {
  const csp = contentSecurityPolicy({ supabaseUrl: SB, dev: false });
  it("allows exactly the third parties the app uses", () => {
    expect(directive(csp, "connect-src")).toBe(`connect-src 'self' ${SB} wss://abcdefghijklmnopqrst.supabase.co`);
    expect(directive(csp, "img-src")).toBe(`img-src 'self' data: blob: ${SB}`);
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com");
    expect(directive(csp, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
    expect(directive(csp, "style-src")).toContain("https://fonts.googleapis.com");
    expect(directive(csp, "font-src")).toContain("https://fonts.gstatic.com");
  });
  it("blocks framing, plugins and base-tag hijacking, and upgrades http in production", () => {
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests"]) expect(csp).toContain(d);
    expect(csp).not.toMatch(/unsafe-eval/);
  });
  it("in dev allows the HMR websocket and never forces https", () => {
    const dev = contentSecurityPolicy({ supabaseUrl: SB, dev: true });
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
  it("ignores a malformed Supabase URL instead of emitting a broken source", () => {
    const bad = contentSecurityPolicy({ supabaseUrl: "javascript:alert(1)", dev: false });
    expect(directive(bad, "connect-src")).toBe("connect-src 'self'");
  });
});

describe("security headers", () => {
  it("enforces CSP and HSTS in production", () => {
    const h = securityHeaders({ supabaseUrl: SB, dev: false });
    expect(h["Content-Security-Policy"]).toBeDefined();
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(h).toMatchObject({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Cross-Origin-Opener-Policy": "same-origin" });
  });
  it("only reports CSP in dev and sends no HSTS over http", () => {
    const h = securityHeaders({ supabaseUrl: SB, dev: true });
    expect(h["Content-Security-Policy-Report-Only"]).toBeDefined();
    expect(h["Content-Security-Policy"]).toBeUndefined();
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });
  it("keeps the camera/mic/location off but leaves clipboard and share usable", () => {
    const p = securityHeaders({ dev: false })["Permissions-Policy"]!;
    expect(p).toContain("camera=()");
    expect(p).not.toMatch(/clipboard|web-share/);
  });
  it("adds headers without overriding ones a route set, and keeps status and body", async () => {
    const r = withSecurityHeaders(new Response("hi", { status: 302, headers: { "X-Frame-Options": "SAMEORIGIN", location: "/x" } }), securityHeaders({ dev: false }));
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("/x");
    expect(r.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await r.text()).toBe("hi");
  });
});
