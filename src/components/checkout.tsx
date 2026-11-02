import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Check, CheckCircle2, Clock, Copy, Crown, Hourglass, LogIn, ShieldCheck, Smartphone, Sparkles, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { rememberCurrentPage } from "@/lib/return-to";
import { PRO_PRICE_TND, isPro, planQuery } from "@/lib/plan";
import {
  PAY_METHODS, PAY_PERIODS, REFERENCE_MAX, adminPaymentsQuery, cancelPayment, checkoutState, cleanReference, declarePayment,
  decidePayment, formatRib, myPaymentsQuery, payCode, paymentError, priceOf,
  type AdminPayFilter, type AdminPayment, type PayMethodId, type PayPeriod, type Payment,
} from "@/lib/payments";
import { PageIntro } from "@/components/page-sections";
import { BrandBackdrop } from "@/components/brand";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { PageHero } from "@/components/site";

const METHOD_ICON: Record<PayMethodId, LucideIcon> = { d17: Smartphone, transfer: Banknote, flouci: Wallet };
const METHOD_NAME: Record<PayMethodId, TKey> = { d17: "pay_m_d17", transfer: "pay_m_transfer", flouci: "pay_m_flouci" };
const METHOD_HOW: Record<PayMethodId, TKey> = { d17: "pay_how_d17", transfer: "pay_how_transfer", flouci: "pay_how_flouci" };
const PAY_STATUS: Record<Payment["status"], TKey> = { pending: "pay_st_pending", approved: "pay_st_approved", refused: "pay_st_refused", cancelled: "pay_st_cancelled" };
const PAY_TONE: Record<Payment["status"], string> = { pending: "badge-warning", approved: "badge-success", refused: "badge-danger", cancelled: "badge-muted" };

function useDates() {
  const { lang } = useI18n();
  const locale = lang === "ar" ? "ar-TN" : lang;
  return (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function CopyValue({ value, shown, label }: { value: string; shown?: string; label: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); }
    catch { toast.error(t("pay_copy_failed")); }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p dir="ltr" className="truncate text-start font-mono text-base font-bold tabular-nums">{shown ?? value}</p>
      </div>
      <button type="button" onClick={copy} className="btn btn-outline min-h-10 shrink-0 px-3" aria-label={t("pay_copy_x", { x: label })}>
        {done ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span className="hidden sm:inline">{t(done ? "pay_copied" : "pay_copy")}</span>
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: Payment["status"] }) {
  const { t } = useI18n();
  return <span className={`badge ${PAY_TONE[status]}`}>{t(PAY_STATUS[status])}</span>;
}

/** Signed-in pro: choose a period and a way to pay, pay outside SkillLoop, then declare the reference. */
export function CheckoutPage({ period: initial }: { period: PayPeriod }) {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-10"><ListSkeleton /></div>;
  if (!user)
    return (
      <>
        <PageHero title={t("pay_title")} />
        <div className="mx-auto max-w-xl px-4 py-12">
          <EmptyState icon={LogIn} title={t("pay_signin")} action={<Link to="/login" onClick={rememberCurrentPage} className="btn btn-lime">{t("login")}</Link>} />
        </div>
      </>
    );
  return <Checkout userId={user.id} initial={initial} />;
}

function Checkout({ userId, initial }: { userId: string; initial: PayPeriod }) {
  const { t, lang } = useI18n();
  const date = useDates();
  const qc = useQueryClient();
  const plan = useQuery(planQuery(userId));
  const pays = useQuery(myPaymentsQuery(userId));
  const [period, setPeriod] = useState<PayPeriod>(initial);
  const [method, setMethod] = useState<PayMethodId | null>(PAY_METHODS[0]?.id ?? null);
  const [reference, setReference] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const refId = useId();
  const code = payCode(userId);

  if (plan.isLoading || pays.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10"><ListSkeleton /></div>;
  if (pays.isError) return <div className="mx-auto max-w-xl px-4 py-12"><ErrorState onRetry={() => pays.refetch()} /></div>;

  const { pending, refused } = checkoutState(pays.data ?? []);
  const p = plan.data;
  const amount = priceOf(period);
  const chosen = PAY_METHODS.find((m) => m.id === method) ?? null;
  const clean = cleanReference(reference);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["payments", userId] }), qc.invalidateQueries({ queryKey: ["plan", userId] })]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!chosen || !clean) return;
    setBusy(true);
    try {
      await declarePayment(period, chosen.id, clean);
      toast.success(t("pay_sent_toast"));
      setReference("");
      setTouched(false);
      await refresh();
    } catch (err) {
      toast.error(t(paymentError(err as { message?: string })));
    } finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    setBusy(true);
    try { await cancelPayment(id); await refresh(); toast.success(t("pay_cancelled_toast")); }
    catch (err) { toast.error(t(paymentError(err as { message?: string }))); }
    finally { setBusy(false); setConfirmCancel(false); }
  };

  const until = p?.status === "active" ? p.periodEnd : p?.status === "trial" ? p.trialEndsAt : null;
  const perMonthOfYear = new Intl.NumberFormat(lang === "ar" ? "ar-TN" : lang, { maximumFractionDigits: 1 }).format(PRO_PRICE_TND.year / 12);

  return (
    <>
      <PageIntro kicker={t("plan_pro_name")} title={t(p && isPro(p) ? "pay_title_extend" : "pay_title")} sub={t("pay_sub")} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-6">
          {p && isPro(p) && until && (
            <p className="flex items-start gap-2 rounded-2xl bg-sea-soft px-4 py-3 text-sm text-sea">
              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t(p.status === "trial" ? "pay_now_trial" : "pay_now_active", { d: date(until) })}
            </p>
          )}

          {pending ? (
            <section aria-labelledby="pay-pending" className="panel p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Hourglass className="size-6 text-clay-strong" aria-hidden />
                <h2 id="pay-pending" className="text-lg font-bold">{t("pay_pending_t")}</h2>
                <StatusPill status="pending" />
              </div>
              <p className="mt-2 max-w-prose text-muted-foreground">{t("pay_pending_d")}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">{t("pay_amount")}</dt><dd className="font-bold tabular-nums">{t("pay_tnd", { n: pending.amount })} · {t(pending.period === "year" ? "pay_year" : "pay_month")}</dd></div>
                <div><dt className="text-muted-foreground">{t("pay_method")}</dt><dd className="font-semibold">{t(METHOD_NAME[pending.method])}</dd></div>
                <div><dt className="text-muted-foreground">{t("pay_reference")}</dt><dd dir="auto" className="font-mono font-semibold">{pending.reference}</dd></div>
                <div><dt className="text-muted-foreground">{t("pay_sent_on")}</dt><dd className="font-semibold">{date(pending.createdAt)}</dd></div>
              </dl>
              <div className="mt-5">
                {confirmCancel ? (
                  <div role="group" aria-label={t("pay_cancel_q")} className="space-y-2 rounded-2xl border bg-surface-sunken p-3 sm:max-w-sm">
                    <p className="text-sm font-semibold">{t("pay_cancel_q")}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" autoFocus disabled={busy} onClick={() => setConfirmCancel(false)} className="btn btn-outline min-h-10">{t("keep_as_is")}</button>
                      <button type="button" disabled={busy} onClick={() => cancel(pending.id)} className="btn btn-danger min-h-10">{busy ? t("loading") : t("confirm_yes")}</button>
                    </div>
                  </div>
                ) : <button type="button" onClick={() => setConfirmCancel(true)} className="btn btn-outline min-h-10">{t("pay_cancel")}</button>}
              </div>
            </section>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-6">
              {refused && (
                <div role="status" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
                  <div>
                    <p className="font-semibold">{t("pay_refused_t", { ref: refused.reference })}</p>
                    {refused.note && <p dir="auto" className="mt-1 text-muted-foreground">{refused.note}</p>}
                    <p className="mt-1 text-muted-foreground">{t("pay_refused_d")}</p>
                  </div>
                </div>
              )}

              <fieldset className="panel p-6">
                <legend className="sr-only">{t("pay_step1")}</legend>
                <p aria-hidden className="text-sm font-bold uppercase tracking-wider text-clay-strong">1 · {t("pay_step1")}</p>
                <div role="radiogroup" aria-label={t("pay_step1")} className="mt-4 grid gap-3 sm:grid-cols-2">
                  {PAY_PERIODS.map((x) => (
                    <button key={x} type="button" role="radio" aria-checked={period === x} onClick={() => setPeriod(x)}
                      className={`relative rounded-2xl border-2 p-4 text-start transition-colors ${period === x ? "border-lime bg-lime/10" : "border-border hover:border-foreground/30"}`}>
                      <span className="flex items-center justify-between gap-2 font-bold">
                        {t(x === "year" ? "pay_year" : "pay_month")}
                        {x === "year" && <span className="rounded-full bg-lime px-2 py-0.5 text-sm font-bold text-lime-foreground">{t("pc_two_free")}</span>}
                      </span>
                      <span className="mt-2 block text-3xl font-extrabold tabular-nums">{priceOf(x)} <span className="text-base font-semibold text-muted-foreground">{t("pay_dt")}</span></span>
                      <span className="mt-1 block text-sm text-muted-foreground">{x === "year" ? t("pc_year_equals", { n: perMonthOfYear }) : t("pay_month_d")}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="panel p-6">
                <legend className="sr-only">{t("pay_step2")}</legend>
                <p aria-hidden className="text-sm font-bold uppercase tracking-wider text-clay-strong">2 · {t("pay_step2")}</p>
                {PAY_METHODS.length === 0 ? <p className="mt-3 text-muted-foreground">{t("pay_no_method")}</p> : (
                  <>
                    <div role="radiogroup" aria-label={t("pay_step2")} className="mt-4 grid gap-3 sm:grid-cols-3">
                      {PAY_METHODS.map((m) => {
                        const Icon = METHOD_ICON[m.id];
                        return (
                          <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)}
                            className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start font-semibold transition-colors ${method === m.id ? "border-lime bg-lime/10" : "border-border hover:border-foreground/30"}`}>
                            <Icon className="size-5 shrink-0 text-sea" aria-hidden />{t(METHOD_NAME[m.id])}
                          </button>
                        );
                      })}
                    </div>
                    {chosen && (
                      <div key={chosen.id} className="swap-in mt-5 space-y-3 rounded-2xl bg-surface-sunken p-4">
                        <p className="text-sm">{t(METHOD_HOW[chosen.id], { n: amount })}</p>
                        <CopyValue label={t(chosen.id === "transfer" ? "pay_rib" : "pay_number")} value={chosen.account} shown={chosen.id === "transfer" ? formatRib(chosen.account) : chosen.account} />
                        {chosen.holder && <p className="text-sm text-muted-foreground">{t("pay_holder", { name: chosen.holder })}</p>}
                        <CopyValue label={t("pay_code_label")} value={code} />
                        <p className="text-sm text-muted-foreground">{t("pay_code_d")}</p>
                      </div>
                    )}
                  </>
                )}
              </fieldset>

              <fieldset className="panel p-6" disabled={!chosen}>
                <legend className="sr-only">{t("pay_step3")}</legend>
                <p aria-hidden className="text-sm font-bold uppercase tracking-wider text-clay-strong">3 · {t("pay_step3")}</p>
                <label htmlFor={refId} className="mt-4 block text-sm font-semibold">{t("pay_reference")}</label>
                <input id={refId} value={reference} onChange={(e) => setReference(e.target.value)} onBlur={() => setTouched(true)}
                  maxLength={REFERENCE_MAX + 10} autoComplete="off" dir="auto" inputMode="text"
                  aria-invalid={touched && !clean} aria-describedby={`${refId}-h`} className="field mt-2 w-full font-mono placeholder:font-sans" placeholder={t("pay_reference_ph")} />
                <p id={`${refId}-h`} className={`mt-2 text-sm ${touched && !clean ? "text-destructive" : "text-muted-foreground"}`}>
                  {touched && !clean ? t("pay_err_reference") : t("pay_reference_h")}
                </p>
                <button type="submit" disabled={busy || !chosen} className="btn btn-lime mt-5 w-full sm:w-auto">
                  {busy ? t("loading") : t("pay_submit", { n: amount })}
                </button>
              </fieldset>
            </form>
          )}

          {(pays.data ?? []).some((x) => x.id !== pending?.id) && (
            <section aria-labelledby="pay-history" className="panel p-6">
              <h2 id="pay-history" className="text-lg font-bold">{t("pay_history")}</h2>
              <ul className="mt-4 divide-y">
                {(pays.data ?? []).filter((x) => x.id !== pending?.id).map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span><span className="font-semibold tabular-nums">{t("pay_tnd", { n: x.amount })}</span> · {t(METHOD_NAME[x.method])} · {date(x.createdAt)}</span>
                    <span className="flex items-center gap-2">
                      {x.status === "approved" && x.periodEnd && <span className="text-muted-foreground">{t("pay_until", { d: date(x.periodEnd) })}</span>}
                      <StatusPill status={x.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Summary */}
        <aside aria-labelledby="pay-summary" className="relative overflow-hidden rounded-3xl bg-ink-hero p-6 text-ink-foreground shadow-lg lg:sticky lg:top-24">
          <BrandBackdrop variant="intro" />
          <h2 id="pay-summary" className="relative flex items-center gap-2 font-bold"><Sparkles className="size-5 text-lime" aria-hidden />{t("plan_pro_name")}</h2>
          <p key={period} className="swap-in relative mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tabular-nums">{pending ? pending.amount : amount}</span>
            <span className="font-semibold text-ink-muted">{t((pending?.period ?? period) === "year" ? "pc_per_year" : "pc_tnd_month")}</span>
          </p>
          {p?.founder && <p className="relative mt-4 flex items-start gap-2 text-sm font-semibold"><Crown className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />{t("pay_founder_lock")}</p>}
          <ul className="relative mt-5 space-y-2.5 text-sm">
            {(["pay_sum1", "pay_sum2", "pay_sum3"] as const).map((k) => <li key={k} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />{t(k)}</li>)}
          </ul>
          <div className="relative mt-6 space-y-2 border-t border-ink-foreground/15 pt-5 text-sm text-ink-muted">
            <p className="flex items-start gap-2"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden />{t("pay_manual_note")}</p>
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{t("pay_no_card")}</p>
          </div>
          <Link to="/pricing" className="relative mt-5 inline-block text-sm font-semibold text-lime underline-offset-4 hover:underline">{t("plan_see")}</Link>
        </aside>
      </div>
    </>
  );
}

/** Operator: payment declarations to check against the D17 / bank / Flouci statements. */
export function AdminPayments() {
  const { t } = useI18n();
  const date = useDates();
  const [filter, setFilter] = useState<AdminPayFilter>("pending");
  const q = useQuery(adminPaymentsQuery(filter));
  return (
    <section aria-labelledby="adm-pay-t" className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="adm-pay-t" className="flex items-center gap-2 text-lg font-bold"><Wallet className="size-5 text-clay-strong" aria-hidden />{t("adm_pay_t")}</h2>
        <div role="group" aria-label={t("adm_pay_filter")} className="inline-flex rounded-full border bg-card p-1">
          {(["pending", "all"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${filter === f ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t(f === "pending" ? "adm_pay_pending" : "adm_pay_all")}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("adm_pay_d")}</p>
      <div className="mt-5">
        {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} />
          : !q.data?.length ? <p className="text-sm text-muted-foreground">{t(filter === "pending" ? "adm_pay_none" : "adm_none")}</p>
          : <ul className="space-y-3">{q.data.map((p) => <AdminPaymentRow key={p.id} p={p} date={date} />)}</ul>}
      </div>
    </section>
  );
}

function AdminPaymentRow({ p, date }: { p: AdminPayment; date: (iso: string) => string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"approve" | "refuse" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const noteId = useId();
  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await decidePayment(p.id, approve, note);
      toast.success(t(approve ? "adm_pay_approved" : "adm_pay_refused"));
      await qc.invalidateQueries({ queryKey: ["admin-payments"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (err) { toast.error(t(paymentError(err as { message?: string }))); }
    finally { setBusy(false); setMode(null); }
  };
  return (
    <li className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span dir="auto">{p.name || t("account_deleted_name")}</span>
            {p.founder && <span className="tag tag-new">{t("plan_founder")}</span>}
            <StatusPill status={p.status} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">{t("pay_tnd", { n: p.amount })}</span> · {t(p.period === "year" ? "pay_year" : "pay_month")} · {t(METHOD_NAME[p.method])} · {date(p.createdAt)}
          </p>
          <p className="mt-1 text-sm"><span className="text-muted-foreground">{t("pay_reference")} :</span> <span dir="auto" className="font-mono font-semibold">{p.reference}</span>
            <span className="text-muted-foreground"> · {t("pay_code_label")} :</span> <span className="font-mono font-semibold">{payCode(p.userId)}</span></p>
          {p.note && <p dir="auto" className="mt-1 text-sm text-muted-foreground">{p.note}</p>}
          {p.status === "approved" && p.periodEnd && <p className="mt-1 text-sm text-success">{t("pay_until", { d: date(p.periodEnd) })}</p>}
        </div>
        {p.status === "pending" && !mode && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("approve")} className="btn btn-lime min-h-10"><CheckCircle2 className="size-4" aria-hidden />{t("adm_pay_approve")}</button>
            <button type="button" onClick={() => setMode("refuse")} className="btn btn-outline min-h-10">{t("adm_pay_refuse")}</button>
          </div>
        )}
      </div>
      {mode && (
        <div role="group" aria-label={t(mode === "approve" ? "adm_pay_approve_q" : "adm_pay_refuse_q")} className="mt-3 space-y-2 rounded-2xl border bg-surface-sunken p-3">
          <p className="text-sm font-semibold">{t(mode === "approve" ? "adm_pay_approve_q" : "adm_pay_refuse_q", { n: p.amount, ref: p.reference })}</p>
          <label htmlFor={noteId} className="block text-sm text-muted-foreground">{t(mode === "approve" ? "adm_pay_note_opt" : "adm_pay_note")}</label>
          <input id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} dir="auto" className="field w-full" />
          <div className="flex flex-wrap gap-2">
            <button type="button" autoFocus disabled={busy} onClick={() => setMode(null)} className="btn btn-outline min-h-10">{t("keep_as_is")}</button>
            <button type="button" disabled={busy} onClick={() => decide(mode === "approve")} className={`btn min-h-10 ${mode === "approve" ? "btn-lime" : "btn-danger"}`}>{busy ? t("loading") : t("confirm_yes")}</button>
          </div>
        </div>
      )}
    </li>
  );
}
