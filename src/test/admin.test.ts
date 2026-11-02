import { describe, expect, it } from "vitest";
import { ADMIN_ENABLED, acceptanceRate, parseOverview, proShare } from "@/lib/admin";
import { STATIC_PATHS } from "@/lib/sitemap";

describe("operator space rules", () => {
  it("is off in tests and never in the sitemap", () => {
    expect(ADMIN_ENABLED).toBe(false);
    expect(STATIC_PATHS).not.toContain("/admin");
  });
  it("reads admin_overview() defensively", () => {
    const o = parseOverview(null);
    expect(o.users).toEqual({ total: 0, new: 0, deleted: 0 });
    expect(o.series).toEqual([]);
    expect(o.plans).toBeNull();
    expect(o.notify).toBeNull();
    const p = parseOverview({
      days: 7, since: "2026-10-27", users: { total: 12, new: -3, deleted: "x" },
      requests: { accepted: 3, declined: 1, pending: 2.7 },
      categories: [{ category: "home", count: 4 }, { category: "", count: 9 }, null],
      series: [{ day: "2026-10-27", users: 2 }, { day: "bad", users: 9 }],
      plans: { trial: 3, founders: 3 }, notify: 0,
    });
    expect(p.users).toEqual({ total: 12, new: 0, deleted: 0 });
    expect(p.requests.pending).toBe(2);
    expect(p.categories).toEqual([{ category: "home", count: 4 }]);
    expect(p.series).toEqual([{ day: "2026-10-27", users: 2, services: 0, requests: 0 }]);
    expect(p.plans).toEqual({ trial: 3, active: 0, ended: 0, founders: 3 });
    expect(p.notify).toBe(0);
  });
  it("computes rates only when there is something to divide", () => {
    const o = parseOverview({ users: { total: 8 }, pros: { total: 2 }, requests: { accepted: 3, declined: 1 } });
    expect(acceptanceRate(o.requests)).toBe(75);
    expect(acceptanceRate(parseOverview({}).requests)).toBeNull();
    expect(proShare(o)).toBe(25);
    expect(proShare(parseOverview({}))).toBeNull();
  });
});
