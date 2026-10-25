import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { ResetPassword } from "@/components/reset-password-card";

export const Route = createFileRoute("/reset-password")({
  head: () => seo("Nouveau mot de passe", "Choisissez un nouveau mot de passe SkillLoop.", { noindex: true }),
  component: ResetPassword,
});
