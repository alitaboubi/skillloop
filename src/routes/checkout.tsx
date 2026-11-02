import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { seo } from "@/lib/seo";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { CheckoutPage } from "@/components/checkout";

// Manual payment for SkillLoop Pro. Exists only once VITE_PAYMENTS=on (after the payments migration).
export const Route = createFileRoute("/checkout")({
  validateSearch: z.object({ period: z.enum(["month", "year"]).optional().catch(undefined) }),
  loader: () => {
    if (!PAYMENTS_ENABLED) throw notFound();
  },
  head: () => seo("Passer à Pro", "Payer SkillLoop Pro par D17, virement ou Flouci.", { noindex: true }),
  component: Page,
});

function Page() {
  const { period } = Route.useSearch();
  return <CheckoutPage period={period ?? "month"} />;
}
