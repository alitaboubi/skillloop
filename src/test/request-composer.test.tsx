import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import type { Service } from "@/lib/data";

// Mocked backend and session — no network.
const db = vi.hoisted(() => ({ inserts: [] as { table: string; row: unknown }[] }));
vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    let op = "select";
    const b: Record<string, unknown> = {};
    for (const k of ["select", "eq", "order", "limit", "maybeSingle", "single"]) b[k] = () => b;
    b["insert"] = (row: unknown) => { op = "insert"; db.inserts.push({ table, row }); return b; };
    b["then"] = (res: (v: unknown) => void, rej: (e: unknown) => void) => {
      const r = op === "insert" ? (table === "requests" ? { data: { id: "r9" }, error: null } : { error: null })
        : table === "messages" ? { count: 1, error: null } : table === "profiles" ? { data: null, error: null } : { data: [], error: null };
      return Promise.resolve(r).then(res, rej);
    };
    return b;
  };
  return { supabase: { from, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) } } };
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "c1" }, ready: true, session: null }) }));

import { RequestBox } from "@/routes/services.$id";

const svc: Service = {
  id: "s1", title: "Réparation de fuites", description: "", category: "home", price: 40, unit: "per_hour", city: "Sousse", remote: false,
  image: "", provider: "Amel", delivery: "—", languages: "—", publishedDaysAgo: 1, ownerId: "p1", real: true,
};

function renderBox() {
  const root = createRootRoute({ component: () => <RequestBox s={svc} /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
}
const raf = () => act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));

beforeEach(() => { db.inserts = []; });

describe("guided request composer", () => {
  it("offers this category's questions; each chip adds its line once, on its own line", async () => {
    renderBox();
    const box = (await screen.findByLabelText(/Décrivez votre besoin/)) as HTMLTextAreaElement;
    // Home repairs: problem, appliance, floor/access, when (request-guides.ts).
    for (const q of ["Le problème", "Appareil / marque", "Étage / accès", "Quand"]) expect(screen.getByRole("button", { name: q })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Étage / accès" }));
    await raf();
    fireEvent.change(box, { target: { value: `${box.value}2e étage, sans ascenseur` } });
    fireEvent.click(screen.getByRole("button", { name: "Quand" }));
    fireEvent.click(screen.getByRole("button", { name: "Quand" }));
    expect(box.value).toBe("Étage / accès : 2e étage, sans ascenseur\nQuand : ");
    expect(screen.getByRole("button", { name: "Quand" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows exactly what the provider will see, and sends only from the review", async () => {
    renderBox();
    const box = await screen.findByLabelText(/Décrivez votre besoin/);
    fireEvent.change(box, { target: { value: "  Besoin : fuite sous l’évier\nQuand : samedi matin  " } });
    fireEvent.click(screen.getByRole("button", { name: "Relire ma demande" }));
    expect(screen.getByRole("heading", { name: "Voici ce que verra Amel" })).toHaveFocus();
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Besoin : fuite sous l’évier\nQuand : samedi matin")).toBeInTheDocument();
    expect(db.inserts).toEqual([]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Envoyer la demande" })); });
    await waitFor(() => expect(db.inserts[0]).toMatchObject({ table: "requests", row: { service_id: "s1", client_id: "c1", provider_id: "p1", message: "Besoin : fuite sous l’évier\nQuand : samedi matin" } }));
    expect(await screen.findByText("Et maintenant ?")).toBeInTheDocument();
  });

  it("editing from the review keeps the text and returns focus to it", async () => {
    renderBox();
    const box = await screen.findByLabelText(/Décrivez votre besoin/);
    fireEvent.change(box, { target: { value: "Bonjour, fuite urgente à réparer." } });
    fireEvent.click(screen.getByRole("button", { name: "Relire ma demande" }));
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    const again = screen.getByLabelText(/Décrivez votre besoin/) as HTMLTextAreaElement;
    expect(again.value).toBe("Bonjour, fuite urgente à réparer.");
    expect(again).toHaveFocus();
  });

  it("still requires 10 characters before the review", async () => {
    renderBox();
    fireEvent.change(await screen.findByLabelText(/Décrivez votre besoin/), { target: { value: "fuite" } });
    fireEvent.click(screen.getByRole("button", { name: "Relire ma demande" }));
    expect(screen.queryByRole("heading", { name: /Voici ce que verra/ })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Au moins 10 caractères.");
  });
});
