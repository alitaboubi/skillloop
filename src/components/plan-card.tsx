import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Crown, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { FOUNDERS_CAP, PLAN_LIMITS, PRO_PRICE_TND, foundersLeftQuery, isPro, planQuery, trialDaysLeft } from "@/lib/plan";
import { FaqBlock, FinalCta, PageIntro, SectionHeading } from "@/components/page-sections";
import { BrandBackdrop, LoopProgress, PointerField } from "@/components/brand";
import { PRO_TOOLS_ENABLED } from "@/lib/pro-tools";

/** Dashboard « Mon abonnement » (only rendered when PRO_PLAN_ENABLED). Real data only; no payment exists yet. */
export function PlanCard({ userId, publishedServices }: { userId: string; publishedServices: number }) {
  const { t } = useI18n();
  const q = useQuery(planQuery(userId));
  if (q.isLoading || q.isError || !q.data) return null;
  const p = q.data;
  const pro = isPro(p);
  return (
    <section aria-labelledby="plan-t" className={pro ? "panel-action p-6 pt-7" : "panel p-6"}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="plan-t" className="text-lg font-bold">{t(pro ? "plan_pro_name" : "plan_free_name")}</h2>
        {p.status === "trial" && <span className="badge badge-success"><Clock className="size-3.5" aria-hidden />{t("plan_trial_left", { n: trialDaysLeft(p) })}</span>}
        {p.founder && <span className="tag tag-new">{t("plan_founder")}</span>}
      </div>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {p.status === "trial" ? t("plan_trial_d", { price: PRO_PRICE_TND.month })
          : p.status === "active" ? t("plan_active_d")
          : p.status === "ended" ? t("plan_ended_d", { s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio })
          : publishedServices === 0 ? t("plan_free_start_d") : t("plan_free_d", { s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {pro && <Link to="/dashboard" search={{ mode: "provider", section: "pro" }} className="btn btn-outline min-h-10"><Sparkles className="size-4" aria-hidden />{t("plan_tools")}</Link>}
        <Link to="/pricing" className="link-sea text-sm font-semibold">{t("plan_see")}</Link>
      </div>
    </section>
  );
}

/**
 * Pro tools and whether they are live: the card & QR needs only the plan; videos, statistics and themes need
 * migration 20261030120000_pro_tools.sql (VITE_PRO_TOOLS). Anything not live stays labelled « Bientôt ».
 */
const TOOLS: { k: TKey; row: TKey; live: boolean }[] = [
  { k: "pc_pro_motion", row: "pc_row_motion", live: PRO_TOOLS_ENABLED },
  { k: "pc_pro_qr", row: "pc_row_qr", live: true },
  { k: "pc_pro_stats", row: "pc_row_stats", live: PRO_TOOLS_ENABLED },
  { k: "pc_pro_themes", row: "pc_row_themes", live: PRO_TOOLS_ENABLED },
];
const NOW: TKey[] = ["pc_pro_now1", "pc_pro_now2", "pc_pro_now3", "pc_pro_now4", ...TOOLS.filter((x) => x.live).map((x) => x.k)];
const SOON: TKey[] = TOOLS.filter((x) => !x.live).map((x) => x.k);
const FAQ = PRO_TOOLS_ENABLED ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
const FREE: TKey[] = ["pc_free1", "pc_free2", "pc_free3", "pc_free4"];
type Cell = "yes" | "no" | "soon" | TKey | number;
const ROWS: { k: TKey; free: Cell; pro: Cell }[] = [
  { k: "pc_row_page", free: "yes", pro: "yes" },
  { k: "pc_row_services", free: PLAN_LIMITS.free.services, pro: "pc_unlimited" },
  { k: "pc_row_portfolio", free: PLAN_LIMITS.free.portfolio, pro: PLAN_LIMITS.pro.portfolio },
  { k: "pc_row_requests", free: "yes", pro: "yes" },
  { k: "pc_row_share", free: "yes", pro: "yes" },
  { k: "pc_row_proof", free: "yes", pro: "yes" },
  { k: "pc_row_social", free: "no", pro: "pc_founders_only" },
  ...TOOLS.map((x): { k: TKey; free: Cell; pro: Cell } => ({ k: x.row, free: "no", pro: x.live ? "yes" : "soon" })),
];

/** Public /pricing (route renders it only when PRO_PLAN_ENABLED). Tools not live yet are labelled « Bientôt » (TOOLS). */
export function PricingPage() {
  const { t, lang } = useI18n();
  const [yearly, setYearly] = useState(false);
  const placesLeft: number | null | undefined = useQuery(foundersLeftQuery()).data;
  const vars = { s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio, pp: PLAN_LIMITS.pro.portfolio };
  const perMonthOfYear = new Intl.NumberFormat(lang === "ar" ? "ar-TN" : lang, { maximumFractionDigits: 1 }).format(PRO_PRICE_TND.year / 12);
  const cell = (c: Cell, dark = false) =>
    c === "yes" ? <Check className={`mx-auto size-5 ${dark ? "text-lime" : "text-success"}`} aria-label={t("pc_yes")} />
    : c === "no" ? <Minus className="mx-auto size-5 text-muted-foreground/60" aria-label={t("pc_no")} />
    : c === "soon" ? <span className="tag tag-sea">{t("pc_soon")}</span>
    : typeof c === "number" ? <span className="font-bold tabular-nums">{c}</span>
    : <span className="font-semibold">{t(c)}</span>;
  return (
    <>
      <PageIntro kicker={t("pc_kicker")} title={t("pc_title")} sub={t("pc_sub")} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex justify-center">
          <div role="group" aria-label={t("pc_billing")} className="inline-flex items-center rounded-full border bg-card p-1 shadow-sm">
            {[false, true].map((y) => (
              <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${yearly === y ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t(y ? "pc_yearly" : "pc_monthly")}
                {y && <span className="rounded-full bg-lime px-2 py-0.5 text-sm font-bold text-lime-foreground">{t("pc_two_free")}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Free */}
          <section aria-labelledby="pr-free" className="panel flex flex-col p-8">
            <h2 id="pr-free" className="text-lg font-bold">{t("plan_free_name")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pc_free_for")}</p>
            <p className="mt-6 flex items-baseline gap-2"><span className="text-6xl font-extrabold tracking-tight tabular-nums">0</span><span className="font-semibold text-muted-foreground">{t("pc_forever")}</span></p>
            <Link to="/offer" className="btn btn-outline mt-6 w-full">{t("pc_cta_free")}</Link>
            <ul className="mt-8 space-y-3.5">
              {FREE.map((k) => <li key={k} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{t(k, vars)}</li>)}
            </ul>
          </section>

          {/* Pro */}
          <section aria-labelledby="pr-pro" className="relative order-first flex flex-col lg:order-none overflow-hidden rounded-3xl bg-ink-hero p-8 text-ink-foreground shadow-lg ring-2 ring-lime/70">
            <BrandBackdrop variant="intro" />
            <PointerField />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <h2 id="pr-pro" className="flex items-center gap-2 text-lg font-bold"><Sparkles className="size-5 text-lime" aria-hidden />{t("plan_pro_name")}</h2>
              <span className="rounded-full bg-lime px-3 py-1 text-sm font-bold text-lime-foreground">{t("pc_recommended")}</span>
            </div>
            <p className="relative mt-1 text-sm text-ink-muted">{t("pc_pro_for")}</p>
            <div key={String(yearly)} className="swap-in relative mt-6">
              <p className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold tracking-tight tabular-nums">{yearly ? PRO_PRICE_TND.year : PRO_PRICE_TND.month}</span>
                <span className="font-semibold text-ink-muted">{t(yearly ? "pc_per_year" : "pc_tnd_month")}</span>
              </p>
              <p className="mt-1 text-sm text-ink-muted">{yearly ? t("pc_year_equals", { n: perMonthOfYear }) : t("pc_or_year", { n: PRO_PRICE_TND.year })}</p>
            </div>
            <p className="relative mt-5 flex items-start gap-2 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm font-semibold"><Crown className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />{t("pc_founder_strip")}</p>
            <Link to="/offer" className="btn btn-lime relative mt-6 w-full">{t("pc_cta_pro")}</Link>
            <ul className="relative mt-8 space-y-3.5">
              {NOW.map((k) => <li key={k} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />{t(k, vars)}</li>)}
            </ul>
            {SOON.length > 0 && (
              <>
                <p className="relative mt-6 border-t border-ink-foreground/15 pt-5 text-sm font-bold uppercase tracking-wider text-clay">{t("pc_soon_t")}</p>
                <ul className="relative mt-3 space-y-3">
                  {SOON.map((k) => <li key={k} className="flex items-start gap-3 text-sm text-ink-muted"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden />{t(k, vars)}</li>)}
                </ul>
              </>
            )}
          </section>
        </div>

        <section aria-labelledby="pr-founders" className="mt-12 grid items-center gap-6 rounded-3xl border bg-card p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <LoopProgress value={typeof placesLeft === "number" ? FOUNDERS_CAP - placesLeft : 0} total={FOUNDERS_CAP} label={t("pc_founders_progress", { n: typeof placesLeft === "number" ? FOUNDERS_CAP - placesLeft : 0, total: FOUNDERS_CAP })} className="w-32" />
          <div>
            <h2 id="pr-founders" className="text-xl font-bold">{t("pc_founders_t", { n: FOUNDERS_CAP })}</h2>
            <p className="mt-2 max-w-prose text-muted-foreground">{t("pc_founders_d")}</p>
            {typeof placesLeft === "number" && <p className="mt-3 font-bold text-clay-strong">{t("pc_founders_left", { n: placesLeft })}</p>}
          </div>
        </section>

        <section aria-labelledby="pr-compare" className="mt-16">
          <SectionHeading id="pr-compare" title={t("pc_compare_t")} />
          <div className="mt-6 overflow-x-auto rounded-3xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="p-3 text-start font-semibold text-muted-foreground sm:p-4">{t("pc_feature")}</th>
                  <th scope="col" className="w-20 p-3 text-center font-bold sm:w-36 sm:p-4">{t("plan_free_name")}</th>
                  <th scope="col" className="w-20 bg-ink p-3 text-center font-bold text-ink-foreground sm:w-36 sm:p-4">{t("plan_pro_name")}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.k} className="border-b last:border-0">
                    <th scope="row" className="p-3 text-start font-medium sm:p-4">{t(r.k)}</th>
                    <td className="p-3 text-center sm:p-4">{cell(r.free)}</td>
                    <td className="bg-ink/[0.04] p-3 text-center sm:p-4">{cell(r.pro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-sea-soft p-6 text-sea sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5" aria-hidden />{t("pc_promise_t")}</h2>
          <p className="mt-2 max-w-prose">{t("pc_promise_d")}</p>
        </section>
        <section className="mt-12">
          <FaqBlock items={FAQ.map((i) => ({ q: t(`pc_q${i}` as TKey), a: t(`pc_a${i}` as TKey, { price: PRO_PRICE_TND.month, s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio }) }))} />
        </section>
      </div>
      <FinalCta title={t("pc_cta_t")}><Link to="/offer" className="btn btn-lime">{t("pc_cta_pro")}</Link></FinalCta>
    </>
  );
}
