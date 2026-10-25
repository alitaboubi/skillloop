import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { hasPlaceholders } from "@/lib/legal";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  // Indexed only once every [PLACEHOLDER] is filled in.
  head: () => seo("Conditions d'utilisation", "Les règles d'utilisation de SkillLoop : rôle de la plateforme, comptes, contenus interdits, signalements.", { path: "/terms", noindex: hasPlaceholders("terms") }),
  component: () => <LegalPage kind="terms" />,
});
