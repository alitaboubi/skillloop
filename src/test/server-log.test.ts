import { describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/server-log";

describe("server error log line", () => {
  it("logs method and path only — never the query string", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("ssr_error", new Request("https://x.workers.dev/explore?q=secret-search", { headers: { cookie: "sb=abc" } }), { error: new Error("boom") });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toMatchObject({ kind: "ssr_error", method: "GET", path: "/explore", error: "Error: boom" });
    expect(spy.mock.calls[0]![0]).not.toMatch(/secret-search|sb=abc/);
    spy.mockRestore();
  });
});
