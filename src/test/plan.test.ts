import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, PRO_PLAN_ENABLED, isPro, parsePlan, trialDaysLeft } from "@/lib/plan";
import { limitMessage, planLimitKindOf } from "@/lib/limits";
import { STATIC_PATHS } from "@/lib/sitemap";

describe("SkillLoop Pro plan rules", () => {
  it("is off in tests (no plan UI, no /pricing in the sitemap)", () => {
    expect(PRO_PLAN_ENABLED).toBe(false);
    expect(STATIC_PATHS).not.toContain("/pricing");
  });
  it("reads my_plan() defensively", () => {
    expect(parsePlan(null)).toEqual({ status: "free", trialEndsAt: null, periodEnd: null, founder: false });
    expect(parsePlan({ status: "weird", founder: "yes" })).toMatchObject({ status: "free", founder: false });
    expect(parsePlan({ status: "trial", trial_ends_at: "2026-11-28T10:00:00Z", founder: true })).toMatchObject({ status: "trial", founder: true });
  });
  it("trial and active count as Pro; ended and free don't", () => {
    expect(isPro(parsePlan({ status: "trial" }))).toBe(true);
    expect(isPro(parsePlan({ status: "active" }))).toBe(true);
    expect(isPro(parsePlan({ status: "ended" }))).toBe(false);
    expect(isPro(parsePlan({ status: "free" }))).toBe(false);
  });
  it("counts trial days left, rounded up, never negative", () => {
    const p = parsePlan({ status: "trial", trial_ends_at: "2026-11-28T12:00:00Z" });
    expect(trialDaysLeft(p, new Date("2026-10-29T12:00:00Z"))).toBe(30);
    expect(trialDaysLeft(p, new Date("2026-11-28T11:00:00Z"))).toBe(1);
    expect(trialDaysLeft(p, new Date("2026-12-01T00:00:00Z"))).toBe(0);
  });
  it("matches the database's plan limits and refusal messages", () => {
    expect(PLAN_LIMITS.free).toEqual({ services: 2, portfolio: 6 });
    expect(planLimitKindOf("plan_limit_reached:services")).toBe("services");
    expect(planLimitKindOf({ message: "plan_limit_reached:portfolio" })).toBe("portfolio");
    expect(planLimitKindOf("plan_limit_reached:other")).toBeNull();
    expect(limitMessage("plan_limit_reached:services")).toEqual({ key: "plan_limit_services", vars: { n: 2 } });
    expect(limitMessage("plan_limit_reached:portfolio")).toEqual({ key: "plan_limit_portfolio", vars: { n: 6 } });
    expect(limitMessage("daily_limit_reached:services")).toEqual({ key: "limit_services", vars: { n: 20 } });
  });
});
