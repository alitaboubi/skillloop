import { describe, expect, it } from "vitest";
import { PAYMENTS_ENABLED, PAY_METHODS, checkoutState, cleanReference, formatRib, parseAdminPayments, parsePayment, payCode, payMethods, paymentError, priceOf, type Payment } from "@/lib/payments";
import { PRO_PRICE_TND } from "@/lib/plan";
import { STATIC_PATHS } from "@/lib/sitemap";

const row = (o: Record<string, unknown> = {}) => ({
  id: "p1", period: "month", amount_tnd: 10, method: "d17", reference: "D17-1", status: "pending",
  note: null, period_end: null, created_at: "2026-11-03T10:00:00Z", decided_at: null, ...o,
});

describe("manual payments", () => {
  it("is off in tests, has no methods, and the checkout is never in the sitemap", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
    expect(PAY_METHODS).toEqual([]);
    expect(STATIC_PATHS).not.toContain("/checkout");
  });
  it("prices mirror the plan (and private.pro_price)", () => {
    expect(priceOf("month")).toBe(PRO_PRICE_TND.month);
    expect(priceOf("year")).toBe(PRO_PRICE_TND.year);
  });
  it("shows only the methods that have a valid account", () => {
    expect(payMethods({})).toEqual([]);
    const m = payMethods({ VITE_PAY_NAME: " Ali T ", VITE_PAY_D17: "+216 22 333 444", VITE_PAY_RIB: "08 123 0001234567890 12", VITE_PAY_FLOUCI: "12" });
    expect(m.map((x) => x.id)).toEqual(["d17", "transfer"]);
    expect(m[0]).toEqual({ id: "d17", account: "+21622333444", holder: "Ali T" });
    expect(m[1]!.account).toBe("08123000123456789012");
    expect(payMethods({ VITE_PAY_RIB: "1234" })).toEqual([]);
    expect(formatRib("08123000123456789012")).toBe("08 123 0001234567890 12");
  });
  it("cleans references like the database (3–60 characters, trimmed)", () => {
    expect(cleanReference("  D17  778 ")).toBe("D17 778");
    expect(cleanReference(" ab ")).toBeNull();
    expect(cleanReference("x".repeat(61))).toBeNull();
    expect(cleanReference("x".repeat(60))).toHaveLength(60);
  });
  it("derives a stable short code from the account id", () => {
    expect(payCode("1a2b3c4d-0000-0000-0000-000000000000")).toBe("SL-1A2B3C");
  });
  it("reads rows defensively", () => {
    expect(parsePayment(null)).toBeNull();
    expect(parsePayment(row({ method: "cash" }))).toBeNull();
    expect(parsePayment(row({ amount_tnd: -1, period: "year" }))!.amount).toBe(100);
    expect(parsePayment(row({ note: "  " }))!.note).toBeNull();
    expect(parseAdminPayments([row({ user_id: "u1", name: "Pro", founder: true }), row({ id: "" }), "x"]))
      .toEqual([expect.objectContaining({ id: "p1", userId: "u1", name: "Pro", founder: true })]);
    expect(parseAdminPayments(null)).toEqual([]);
  });
  it("shows the pending declaration, else the last refused one", () => {
    const p = (o: Record<string, unknown>) => parsePayment(row(o)) as Payment;
    expect(checkoutState([])).toEqual({ pending: null, refused: null });
    const refused = p({ id: "r", status: "refused", created_at: "2026-11-02T10:00:00Z" });
    expect(checkoutState([refused]).refused?.id).toBe("r");
    expect(checkoutState([refused, p({ id: "c", status: "cancelled", created_at: "2026-11-03T10:00:00Z" })]).refused?.id).toBe("r");
    expect(checkoutState([refused, p({ id: "a", status: "approved", period_end: "2026-12-03T10:00:00Z", created_at: "2026-11-03T10:00:00Z" })]).refused).toBeNull();
    expect(checkoutState([refused, p({ id: "n" })]).pending?.id).toBe("n");
  });
  it("maps database errors to copy", () => {
    expect(paymentError({ message: "payment_pending_exists" })).toBe("pay_err_pending");
    expect(paymentError({ message: "rate_limited:payments" })).toBe("pay_err_rate");
    expect(paymentError({ message: "payment_invalid:reference" })).toBe("pay_err_reference");
    expect(paymentError(null)).toBe("pay_err_generic");
  });
});
