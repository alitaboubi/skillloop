import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * SkillLoop Pro, phase 1 (docs/product/pro-plan-strategy.md). Stored in public.subscriptions (migration
 * 20261029120000_subscriptions.sql — PREPARED, not applied). Off until that migration is applied: VITE_PRO_PLAN=on
 * (public build flag). While off, nothing reads the plan and no plan UI is shown. No payment exists yet.
 */
export const PRO_PLAN_ENABLED = import.meta.env["VITE_PRO_PLAN"] === "on";

/** Keep in sync with private.plan_cap / trial_days / founders_cap in the migration. null = unlimited. */
export const PLAN_LIMITS = { free: { services: 2, portfolio: 6 }, pro: { services: null, portfolio: 30 } } as const;
export const TRIAL_DAYS = 30;
export const FOUNDERS_CAP = 100;
export const PRO_PRICE_TND = { month: 10, year: 100 } as const;

export type PlanStatus = "free" | "trial" | "active" | "ended";
export type MyPlan = { status: PlanStatus; trialEndsAt: string | null; periodEnd: string | null; founder: boolean };

/** Reads public.my_plan()'s JSON defensively; anything unexpected is the free plan. */
export function parsePlan(raw: unknown): MyPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const status = (["free", "trial", "active", "ended"] as const).find((s) => s === o["status"]) ?? "free";
  const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
  return { status, trialEndsAt: date(o["trial_ends_at"]), periodEnd: date(o["period_end"]), founder: o["founder"] === true };
}

export const isPro = (p: MyPlan) => p.status === "trial" || p.status === "active";

/** Whole days left in the trial (rounded up; 0 when over). */
export function trialDaysLeft(p: MyPlan, now: Date = new Date()): number {
  if (p.status !== "trial" || !p.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(p.trialEndsAt) - now.getTime()) / 86_400_000));
}

export const planQuery = (userId: string) => queryOptions({
  queryKey: ["plan", userId],
  enabled: PRO_PLAN_ENABLED && !!userId,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("my_plan" as never);
    if (error) throw error;
    return parsePlan(data);
  },
});

export const foundersLeftQuery = () => queryOptions({
  queryKey: ["founders-left"],
  enabled: PRO_PLAN_ENABLED,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("founders_left" as never);
    if (error) throw error;
    return typeof data === "number" ? data : null;
  },
});
