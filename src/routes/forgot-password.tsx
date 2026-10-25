import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { ForgotPassword } from "@/components/forgot-password-card";

export const Route = createFileRoute("/forgot-password")({
  head: () => seo("Mot de passe oublié", "Réinitialisez le mot de passe de votre compte SkillLoop.", { noindex: true }),
  component: ForgotPassword,
});
