import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => seo("Connexion", "Connectez-vous à votre compte SkillLoop.", { noindex: true }),
  component: () => <AuthCard mode="login" />,
});
