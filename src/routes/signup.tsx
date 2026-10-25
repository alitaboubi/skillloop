import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/signup")({
  head: () => seo("Créer un compte", "Rejoignez SkillLoop pour trouver ou proposer des services en Tunisie.", { noindex: true }),
  component: () => <AuthCard mode="signup" />,
});
