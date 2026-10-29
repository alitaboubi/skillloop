import { createFileRoute, notFound } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { PRO_PLAN_ENABLED } from "@/lib/plan";
import { PricingPage } from "@/components/plan-card";

// Public pricing page for SkillLoop Pro. Exists only once VITE_PRO_PLAN=on (after the subscriptions migration).
export const Route = createFileRoute("/pricing")({
  loader: () => {
    if (!PRO_PLAN_ENABLED) throw notFound();
  },
  head: () => seo("Tarifs", "SkillLoop est gratuit pour les clients. Pour les pros : un plan gratuit pour toujours et SkillLoop Pro à 10 DT/mois, avec un mois offert.", { path: "/pricing" }),
  component: PricingPage,
});
