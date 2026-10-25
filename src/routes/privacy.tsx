import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { hasPlaceholders } from "@/lib/legal";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  // Indexed only once every [PLACEHOLDER] is filled in.
  head: () => seo("Politique de confidentialité", "Quelles données SkillLoop traite, pourquoi, avec qui, combien de temps, et vos droits.", { path: "/privacy", noindex: hasPlaceholders("privacy") }),
  component: () => <LegalPage kind="privacy" />,
});
