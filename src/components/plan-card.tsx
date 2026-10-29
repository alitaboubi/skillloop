import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Sparkles } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { FOUNDERS_CAP, PLAN_LIMITS, PRO_PRICE_TND, foundersLeftQuery, isPro, planQuery, trialDaysLeft } from "@/lib/plan";
import { FaqBlock, FinalCta, PageIntro, SectionHeading } from "@/components/page-sections";

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
      <Link to="/pricing" className="link-sea mt-3 inline-block text-sm font-semibold">{t("plan_see")}</Link>
    </section>
  );
}

const NOW: TKey[] = ["pc_pro_now1", "pc_pro_now2", "pc_pro_now3", "pc_pro_now4"];
const SOON: TKey[] = ["pc_pro_soon1", "pc_pro_soon2", "pc_pro_soon3", "pc_pro_soon4"];
const FREE: TKey[] = ["pc_free1", "pc_free2", "pc_free3", "pc_free4"];

/** Public /pricing (route renders it only when PRO_PLAN_ENABLED). Features not built yet are labelled « Bientôt ». */
export function PricingPage() {
  const { t } = useI18n();
  const placesLeft: number | null | undefined = useQuery(foundersLeftQuery()).data;
  const li = (k: TKey, soon = false) => (
    <li key={k} className="flex items-start gap-3 text-sm">
      <Check className={`mt-0.5 size-4 shrink-0 ${soon ? "text-muted-foreground" : "text-success"}`} aria-hidden />
      <span>{t(k, { s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio, pp: PLAN_LIMITS.pro.portfolio })}{soon && <span className="ms-2 tag tag-sea">{t("pc_soon")}</span>}</span>
    </li>
  );
  return (
    <>
      <PageIntro kicker={t("pc_kicker")} title={t("pc_title")} sub={t("pc_sub")} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="pr-free" className="panel p-6">
            <h2 id="pr-free" className="text-xl font-bold">{t("plan_free_name")}</h2>
            <p className="mt-1 text-3xl font-extrabold">0 <span className="text-base font-semibold text-muted-foreground">{t("pc_tnd_month")}</span></p>
            <ul className="mt-5 space-y-3">{FREE.map((k) => li(k))}</ul>
          </section>
          <section aria-labelledby="pr-pro" className="panel-action p-6 pt-7">
            <h2 id="pr-pro" className="flex items-center gap-2 text-xl font-bold"><Sparkles className="size-5 text-clay" aria-hidden />{t("plan_pro_name")}</h2>
            <p className="mt-1 text-3xl font-extrabold">{PRO_PRICE_TND.month} <span className="text-base font-semibold text-muted-foreground">{t("pc_tnd_month")}</span></p>
            <p className="text-sm text-muted-foreground">{t("pc_or_year", { n: PRO_PRICE_TND.year })}</p>
            <ul className="mt-5 space-y-3">{NOW.map((k) => li(k))}{SOON.map((k) => li(k, true))}</ul>
          </section>
        </div>

        <section aria-labelledby="pr-founders" className="mt-10 rounded-3xl bg-ink-hero p-6 text-ink-foreground sm:p-8">
          <h2 id="pr-founders" className="text-xl font-bold">{t("pc_founders_t", { n: FOUNDERS_CAP })}</h2>
          <p className="mt-2 max-w-prose text-ink-muted">{t("pc_founders_d")}</p>
          {typeof placesLeft === "number" && <p className="mt-3 font-semibold text-lime">{t("pc_founders_left", { n: placesLeft })}</p>}
          <Link to="/offer" className="btn btn-lime mt-5">{t("offer_service")}</Link>
        </section>

        <section className="mt-12">
          <SectionHeading title={t("pc_promise_t")} sub={t("pc_promise_d")} />
        </section>
        <section className="mt-10">
          <FaqBlock items={[1, 2, 3, 4].map((i) => ({ q: t(`pc_q${i}` as TKey), a: t(`pc_a${i}` as TKey, { price: PRO_PRICE_TND.month, s: PLAN_LIMITS.free.services, p: PLAN_LIMITS.free.portfolio }) }))} />
        </section>
      </div>
      <FinalCta title={t("pc_cta_t")}><Link to="/offer" className="btn btn-lime">{t("offer_service")}</Link></FinalCta>
    </>
  );
}
