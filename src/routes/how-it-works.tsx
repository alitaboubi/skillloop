import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { FileText, Inbox, MessageCircle, PenLine, Search, Send, UserPlus, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { seo } from "@/lib/seo";
import { FaqBlock, FinalCta, PageIntro, ProcessSteps, SectionHeading, type Step } from "@/components/page-sections";

export const Route = createFileRoute("/how-it-works")({
  validateSearch: z.object({ side: z.enum(["customer", "provider"]).optional().catch(undefined) }),
  head: () => seo("Comment ça marche", "Le parcours client et le parcours professionnel sur SkillLoop : chercher, demander, échanger, publier.", { path: "/how-it-works" }),
  component: Page,
});

type Side = "customer" | "provider";

function Page() {
  const { t } = useI18n();
  const side: Side = Route.useSearch().side ?? "customer";
  const navigate = Route.useNavigate();
  const setSide = (k: Side) => navigate({ search: { side: k === "customer" ? undefined : k }, replace: true, resetScroll: false });

  const customer: Step[] = [
    { icon: Search, title: t("hw_c1_t"), desc: t("hw_c1_d") },
    { icon: Eye, title: t("hw_c2_t"), desc: t("hw_c2_d") },
    { icon: Send, title: t("hw_c3_t"), desc: t("hw_c3_d") },
    { icon: MessageCircle, title: t("hw_c4_t"), desc: t("hw_c4_d") },
  ];
  const provider: Step[] = [
    { icon: UserPlus, title: t("hw_p1_t"), desc: t("hw_p1_d") },
    { icon: PenLine, title: t("hw_p2_t"), desc: t("hw_p2_d") },
    { icon: Inbox, title: t("hw_p3_t"), desc: t("hw_p3_d") },
    { icon: MessageCircle, title: t("hw_p4_t"), desc: t("hw_p4_d") },
  ];
  const faq = [1, 2, 3, 4].map((n) => ({
    q: t(`hw_faq${n}_q` as "hw_faq1_q"),
    a: t(`hw_faq${n}_a` as "hw_faq1_a"),
  }));

  return (
    <>
      <PageIntro kicker={t("hw_kicker")} title={t("how_title")} sub={t("hw_sub")} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div role="tablist" aria-label={t("hw_tabs_label")} className="inline-flex rounded-full border bg-card p-1">
          {(["customer", "provider"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              id={`tab-${k}`}
              aria-selected={side === k}
              aria-controls={`panel-${k}`}
              onClick={() => setSide(k)}
              className="segment"
            >
              {k === "customer" ? t("hw_tab_customer") : t("hw_tab_provider")}
            </button>
          ))}
        </div>

        <div key={side} role="tabpanel" id={`panel-${side}`} aria-labelledby={`tab-${side}`} className="mt-8 animate-in fade-in duration-300">
          <SectionHeading title={side === "customer" ? t("hw_c_title") : t("hw_p_title")} sub={side === "customer" ? t("hw_c_sub") : t("hw_p_sub")} />
          <div className="mt-8"><ProcessSteps steps={side === "customer" ? customer : provider} /></div>
        </div>

        <div className="mt-10 flex gap-3 rounded-2xl border bg-surface-sunken p-5">
          <FileText className="mt-0.5 size-5 shrink-0 text-sea" aria-hidden />
          <div>
            <h3 className="font-bold">{t("hw_note_t")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("hw_note_d")}</p>
          </div>
        </div>
      </section>

      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading title={t("hw_faq_title")} />
          <div className="mt-6"><FaqBlock items={faq} /></div>
        </div>
      </section>

      <FinalCta title={side === "customer" ? t("hw_cta_c_t") : t("hw_cta_p_t")}>
        {side === "customer" ? (
          <Link to="/explore" className="btn btn-lime">{t("hw_cta_c_btn")}</Link>
        ) : (
          <><Link to="/offer" className="btn btn-lime">{t("hw_cta_p_btn")}</Link><Link to="/professionals" className="btn btn-ghost-dark">{t("pros_title_short")}</Link></>
        )}
      </FinalCta>
    </>
  );
}
