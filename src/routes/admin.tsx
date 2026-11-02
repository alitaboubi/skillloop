import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { seo } from "@/lib/seo";
import { ADMIN_ENABLED } from "@/lib/admin";
import { AdminPage } from "@/components/admin-overview";

// Operator space (periods = ADMIN_PERIODS): platform figures (aggregates only). Exists only once VITE_ADMIN=on (after the admin migration).
export const Route = createFileRoute("/admin")({
  validateSearch: z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional().catch(undefined) }),
  loader: () => {
    if (!ADMIN_ENABLED) throw notFound();
  },
  head: () => seo("Espace opérateur", "Les chiffres de SkillLoop.", { noindex: true }),
  component: Page,
});

function Page() {
  const { days } = Route.useSearch();
  return <AdminPage days={days ?? 30} />;
}
