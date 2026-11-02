import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRO_PLAN_ENABLED, PRO_PRICE_TND } from "@/lib/plan";
import type { TKey } from "@/lib/i18n";

/**
 * SkillLoop Pro, phase 3a: manual payments (docs/product/pro-plan-strategy.md). Stored in public.payments (migration
 * 20261103120000_payments.sql — PREPARED, not applied). The pro pays outside SkillLoop (D17, transfer, Flouci) and
 * declares the reference; an operator approves it in /admin, which extends Pro in the database. No card data, no
 * gateway. Off until applied AND the legal side is ready: VITE_PAYMENTS=on (needs VITE_PRO_PLAN=on). While off nothing
 * reads or writes payments and the plan UI keeps saying no payment exists.
 */
export const PAYMENTS_ENABLED = PRO_PLAN_ENABLED && import.meta.env["VITE_PAYMENTS"] === "on";

export type PayPeriod = "month" | "year";
export type PayMethodId = "d17" | "transfer" | "flouci";
export type PayStatus = "pending" | "approved" | "refused" | "cancelled";
export const PAY_PERIODS: readonly PayPeriod[] = ["month", "year"];
const METHODS: readonly PayMethodId[] = ["d17", "transfer", "flouci"];
const STATUSES: readonly PayStatus[] = ["pending", "approved", "refused", "cancelled"];
export const REFERENCE_MAX = 60;

export type PayMethod = { id: PayMethodId; account: string; holder: string };

/**
 * Where to pay, from public build variables (they are shown to every payer anyway). A method without its account is
 * hidden. RIB keeps digits only and must be 20 long; phone numbers keep digits and a leading +.
 */
export function payMethods(env: Record<string, unknown>): PayMethod[] {
  const s = (k: string) => (typeof env[k] === "string" ? (env[k] as string).trim() : "");
  const holder = s("VITE_PAY_NAME");
  const phone = (v: string) => { const p = v.replace(/[^\d+]/g, ""); return /^\+?\d{8,15}$/.test(p) ? p : ""; };
  const rib = s("VITE_PAY_RIB").replace(/\D/g, "");
  const all: PayMethod[] = [
    { id: "d17", account: phone(s("VITE_PAY_D17")), holder },
    { id: "transfer", account: rib.length === 20 ? rib : "", holder },
    { id: "flouci", account: phone(s("VITE_PAY_FLOUCI")), holder },
  ];
  return all.filter((m) => m.account);
}
export const PAY_METHODS = payMethods(import.meta.env as Record<string, unknown>);

/** RIB in its printed groups (bank 2 · branch 3 · account 13 · key 2). */
export const formatRib = (rib: string) => rib.length === 20 ? `${rib.slice(0, 2)} ${rib.slice(2, 5)} ${rib.slice(5, 18)} ${rib.slice(18)}` : rib;

/** Short code the pro writes as the transfer message, so the operator can match a transfer to an account. */
export const payCode = (userId: string) => `SL-${userId.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase()}`;

/** Mirrors private.pro_price in the migration. */
export const priceOf = (p: PayPeriod) => PRO_PRICE_TND[p];

/** The reference typed by the pro, trimmed; null when it would be refused (3–60 characters). */
export function cleanReference(v: string): string | null {
  const r = v.trim().replace(/\s+/g, " ");
  return r.length >= 3 && r.length <= REFERENCE_MAX ? r : null;
}

export type Payment = {
  id: string; period: PayPeriod; amount: number; method: PayMethodId; reference: string; status: PayStatus;
  note: string | null; periodEnd: string | null; createdAt: string; decidedAt: string | null;
};
export type AdminPayment = Payment & { userId: string; name: string; founder: boolean };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** One row of public.payments (or admin_payments()); null when it isn't one we can show. */
export function parsePayment(raw: unknown): Payment | null {
  const o = obj(raw);
  const period = PAY_PERIODS.find((p) => p === o["period"]);
  const method = METHODS.find((m) => m === o["method"]);
  const status = STATUSES.find((s) => s === o["status"]);
  const createdAt = date(o["created_at"]);
  if (!str(o["id"]) || !period || !method || !status || !createdAt) return null;
  const amount = typeof o["amount_tnd"] === "number" && o["amount_tnd"] > 0 ? o["amount_tnd"] : priceOf(period);
  return {
    id: str(o["id"]), period, amount, method, reference: str(o["reference"]), status,
    note: str(o["note"]).trim() || null, periodEnd: date(o["period_end"]), createdAt, decidedAt: date(o["decided_at"]),
  };
}

export function parseAdminPayments(raw: unknown): AdminPayment[] {
  return (Array.isArray(raw) ? raw : []).flatMap((r) => {
    const p = parsePayment(r);
    const o = obj(r);
    return p && str(o["user_id"]) ? [{ ...p, userId: str(o["user_id"]), name: str(o["name"]), founder: o["founder"] === true }] : [];
  });
}

/** What the pro's checkout shows: the pending declaration, else the last refused one (to explain why), else nothing. */
export function checkoutState(list: Payment[]): { pending: Payment | null; refused: Payment | null } {
  const sorted = [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const pending = sorted.find((p) => p.status === "pending") ?? null;
  const last = sorted.find((p) => p.status !== "cancelled");
  return { pending, refused: !pending && last?.status === "refused" ? last : null };
}

/** Database errors from the payment RPCs → copy key. */
export function paymentError(err: { message?: string } | null | undefined): TKey {
  const m = err?.message?.trim() ?? "";
  if (m === "payment_pending_exists") return "pay_err_pending";
  if (m === "rate_limited:payments") return "pay_err_rate";
  if (m === "payment_not_pending") return "pay_err_not_pending";
  if (m.startsWith("payment_invalid:")) return "pay_err_reference";
  return "pay_err_generic";
}

export const myPaymentsQuery = (userId: string) => queryOptions({
  queryKey: ["payments", userId],
  enabled: PAYMENTS_ENABLED && !!userId,
  queryFn: async () => {
    const { data, error } = await supabase.from("payments" as never)
      .select("id, period, amount_tnd, method, reference, status, note, period_end, created_at, decided_at")
      .order("created_at", { ascending: false }).limit(10);
    if (error) throw error;
    return ((data ?? []) as unknown[]).flatMap((r) => parsePayment(r) ?? []);
  },
});

export async function declarePayment(period: PayPeriod, method: PayMethodId, reference: string) {
  const { error } = await supabase.rpc("declare_payment" as never, { p_period: period, p_method: method, p_reference: reference } as never);
  if (error) throw error;
}

export async function cancelPayment(id: string) {
  const { error } = await supabase.rpc("cancel_my_payment" as never, { p_id: id } as never);
  if (error) throw error;
}

export type AdminPayFilter = "pending" | "all";
export const adminPaymentsQuery = (filter: AdminPayFilter) => queryOptions({
  queryKey: ["admin-payments", filter],
  enabled: PAYMENTS_ENABLED,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_payments" as never, { p_status: filter } as never);
    if (error) throw error;
    return parseAdminPayments(data);
  },
});

export async function decidePayment(id: string, approve: boolean, note: string) {
  const { error } = await supabase.rpc("admin_decide_payment" as never, { p_id: id, p_approve: approve, p_note: note.trim() || null } as never);
  if (error) throw error;
}
