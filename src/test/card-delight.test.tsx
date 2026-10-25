import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { ServiceCard } from "@/components/site";
import { vtName } from "@/lib/view-transitions";
import type { Service } from "@/lib/data";

const base: Service = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e", title: "Plomberie", description: "", category: "home", price: 40, unit: "per_hour",
  city: "Sousse", remote: false, image: "", provider: "Amel", delivery: "—", languages: "—", publishedDaysAgo: 2, real: true,
};
async function card(s: Service) {
  const root = createRootRoute({ component: () => <ServiceCard s={s} /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
  await screen.findByRole("link");
}

describe("service card delight", () => {
  it("shows 'New' only for real services published in the last 7 days", async () => {
    await card(base);
    expect(screen.getByText("Nouveau")).toBeInTheDocument();
  });
  it("no badge for older services", async () => {
    await card({ ...base, publishedDaysAgo: 10 });
    expect(screen.queryByText("Nouveau")).toBeNull();
  });
  it("no badge on non-real previews (wizard review card)", async () => {
    await card({ ...base, real: false });
    expect(screen.queryByText("Nouveau")).toBeNull();
  });
  it("view-transition names are valid CSS identifiers, one per kind and id", () => {
    expect(vtName("svc", base.id)).toBe(`svc-${base.id}`);
    expect(vtName("conv", "a b/c")).toBe("conv-abc");
    expect(vtName("svc", "x")).not.toBe(vtName("conv", "x"));
  });
});
