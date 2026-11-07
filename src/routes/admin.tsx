import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { seo } from "@/lib/seo";
import { ADMIN_ENABLED } from "@/lib/admin";
import { AdminPage } from "@/components/admin-overview";
import { CONSOLE_SECTIONS } from "@/lib/admin-console";

// Operator console (sections in ?section=, see src/lib/admin-console.ts). Exists only once VITE_ADMIN=on (after the admin migration).
export const Route = createFileRoute("/admin")({
  validateSearch: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional().catch(undefined),
    section: z.enum(CONSOLE_SECTIONS).optional().catch(undefined),
    /** Open account (side panel) and open support conversation. */
    u: z.string().uuid().optional().catch(undefined),
    c: z.string().uuid().optional().catch(undefined),
    /** Accounts filters. */
    q: z.string().max(60).optional().catch(undefined),
    role: z.enum(["all", "pro", "client"]).optional().catch(undefined),
    sort: z.enum(["new", "name"]).optional().catch(undefined),
  }),
  loader: () => {
    if (!ADMIN_ENABLED) throw notFound();
  },
  head: () => seo("Espace opérateur", "Les chiffres de SkillLoop.", { noindex: true }),
  component: Page,
});

function Page() {
  const s = Route.useSearch();
  return <AdminPage days={s.days ?? 30} search={s} />;
}
