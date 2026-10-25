import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeInfo, Briefcase, Building2, Eye, GraduationCap, Hand, Languages, MapPin, Tag, Users, Wifi } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { useI18n } from "@/lib/i18n";
import { seo } from "@/lib/seo";
import { BenefitItem, FinalCta, PageIntro, SectionHeading } from "@/components/page-sections";

export const Route = createFileRoute("/about")({
  head: () => seo("À propos", "La mission de SkillLoop : rendre les compétences locales tunisiennes faciles à trouver, sur place ou à distance.", { path: "/about" }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <>
      <PageIntro kicker={t("ab_kicker")} title={t("ab_title")} sub={t("ab_sub")} />

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
        <div className="min-w-0">
          <SectionHeading title={t("ab_mission_t")} />
          <p className="mt-4 text-lg leading-relaxed">{t("ab_mission_d")}</p>
        </div>
        <img src={hero} alt="" loading="lazy" width={1024} height={1024} className="aspect-[4/3] w-full rounded-3xl object-cover" />
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading title={t("ab_who_t")} />
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <BenefitItem icon={Users} title={t("ab_who1_t")} desc={t("ab_who1_d")} />
            <BenefitItem icon={Briefcase} title={t("ab_who2_t")} desc={t("ab_who2_d")} />
            <BenefitItem icon={GraduationCap} title={t("ab_who3_t")} desc={t("ab_who3_d")} />
            <BenefitItem icon={Building2} title={t("ab_who4_t")} desc={t("ab_who4_d")} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading title={t("ab_ex_t")} />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link to="/explore" search={{ mode: "inperson" }} className="step-card block p-6">
            <span className="flex items-center gap-2 font-bold"><MapPin className="size-5 text-sea" aria-hidden />{t("ab_ex_local")}</span>
            <p className="mt-2 text-muted-foreground">{t("ab_ex_l")}</p>
          </Link>
          <Link to="/explore" search={{ mode: "remote" }} className="step-card block p-6">
            <span className="flex items-center gap-2 font-bold"><Wifi className="size-5 text-sea" aria-hidden />{t("ab_ex_remote")}</span>
            <p className="mt-2 text-muted-foreground">{t("ab_ex_r")}</p>
          </Link>
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading title={t("ab_pr_t")} />
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <BenefitItem icon={Eye} title={t("ab_pr1_t")} desc={t("ab_pr1_d")} />
            <BenefitItem icon={Tag} title={t("ab_pr2_t")} desc={t("ab_pr2_d")} />
            <BenefitItem icon={Hand} title={t("ab_pr3_t")} desc={t("ab_pr3_d")} />
            <BenefitItem icon={Languages} title={t("ab_pr4_t")} desc={t("ab_pr4_d")} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex gap-3 rounded-2xl border bg-surface-sunken p-6">
          <BadgeInfo className="mt-0.5 size-5 shrink-0 text-sea" aria-hidden />
          <div>
            <h2 className="font-bold">{t("ab_lim_t")}</h2>
            <p className="mt-1 text-muted-foreground">{t("ab_lim_d")}</p>
          </div>
        </div>
      </section>

      <FinalCta title={t("ab_cta_t")}>
        <Link to="/explore" className="btn btn-lime">{t("ab_cta_c")}</Link>
        <Link to="/offer" className="btn btn-ghost-dark">{t("ab_cta_p")}</Link>
      </FinalCta>
    </>
  );
}
