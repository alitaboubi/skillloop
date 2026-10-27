import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Clock, Inbox, MapPin, MessageCircle, PenLine, Tag, Type, UserPlus, Wifi } from "lucide-react";
import repair from "@/assets/svc-repair.jpg";
import { useI18n } from "@/lib/i18n";
import { seo } from "@/lib/seo";
import { BenefitItem, FaqBlock, FinalCta, ProcessSteps, SectionHeading, type Step } from "@/components/page-sections";
import { PointerField } from "@/components/brand";

export const Route = createFileRoute("/professionals")({
  head: () => seo("Pour les professionnels", "Publiez un service clair sur SkillLoop, sur place ou à distance, et recevez des demandes de clients en Tunisie.", { path: "/professionals" }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const steps: Step[] = [
    { icon: UserPlus, title: t("hw_p1_t"), desc: t("hw_p1_d") },
    { icon: PenLine, title: t("hw_p2_t"), desc: t("hw_p2_d") },
    { icon: Inbox, title: t("hw_p3_t"), desc: t("hw_p3_d") },
    { icon: MessageCircle, title: t("hw_p4_t"), desc: t("hw_p4_d") },
  ];
  const faq = [1, 2, 3, 4].map((n) => ({ q: t(`pr_faq${n}_q` as "pr_faq1_q"), a: t(`pr_faq${n}_a` as "pr_faq1_a") }));
  return (
    <>
      <section className="bg-hero relative overflow-hidden text-navy-foreground">
        <PointerField />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16">
          <div className="min-w-0">
            <p className="eyebrow text-clay!">{t("pr_kicker")}</p>
            <h1 className="display-title mt-2 text-[2rem] md:text-5xl">{t("pros_title")}</h1>
            <p className="mt-3 max-w-xl text-navy-muted">{t("pr_sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/offer" className="btn btn-lime">{t("pr_cta_publish")}</Link>
              <Link to="/how-it-works" search={{ side: "provider" }} className="btn btn-ghost-dark">
                {t("pr_cta_how")}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
          </div>
          <img src={repair} alt="" width={944} height={704} className="aspect-[4/3] w-full rounded-3xl object-cover" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading title={t("pr_why_t")} />
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <BenefitItem icon={MapPin} title={t("pr_local_t")} desc={t("pr_local_d")} />
          <BenefitItem icon={Wifi} title={t("pr_remote_t")} desc={t("pr_remote_d")} />
          <BenefitItem icon={Tag} title={t("pr_price_t")} desc={t("pr_price_d")} />
          <BenefitItem icon={Inbox} title={t("pr_inbox_t")} desc={t("pr_inbox_d")} />
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading title={t("pr_guide_t")} sub={t("pr_guide_sub")} />
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <BenefitItem icon={Type} title={t("pr_g1_t")} desc={t("pr_g1_d")} />
            <BenefitItem icon={Tag} title={t("pr_g2_t")} desc={t("pr_g2_d")} />
            <BenefitItem icon={Camera} title={t("pr_g3_t")} desc={t("pr_g3_d")} />
            <BenefitItem icon={Clock} title={t("pr_g4_t")} desc={t("pr_g4_d")} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading title={t("pr_steps_t")} />
        <div className="mt-8"><ProcessSteps steps={steps} /></div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading title={t("hw_faq_title")} />
          <div className="mt-6"><FaqBlock items={faq} /></div>
        </div>
      </section>

      <FinalCta title={t("pr_final_t")} sub={t("pr_final_sub")}>
        <Link to="/offer" className="btn btn-lime">{t("pr_cta_publish")}</Link>
      </FinalCta>
    </>
  );
}
