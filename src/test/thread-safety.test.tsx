import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";

// Mocked Supabase client — these tests never reach a real backend.
const db = vi.hoisted(() => ({
  insertResults: [] as { error: { message: string } | null }[],
  inserts: [] as unknown[],
  updates: [] as unknown[],
  messages: [] as unknown[],
  authCb: null as null | ((e: string, s: unknown) => void),
}));
vi.mock("@/integrations/supabase/client", () => {
  const from = () => {
    let op = "select";
    const b: Record<string, unknown> = {};
    for (const k of ["select", "eq", "order", "single"]) b[k] = () => b;
    b["insert"] = (p: unknown) => { op = "insert"; db.inserts.push(p); return b; };
    b["update"] = (p: unknown) => { op = "update"; db.updates.push(p); return b; };
    b["then"] = (res: (v: unknown) => void, rej: (e: unknown) => void) =>
      Promise.resolve(op === "insert" ? db.insertResults.shift() ?? { error: null } : op === "update" ? { error: null } : { data: db.messages, error: null }).then(res, rej);
    return b;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      from, channel: () => channel, removeChannel: () => {},
      auth: {
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => { db.authCb = cb; return { data: { subscription: { unsubscribe: () => {} } } }; },
        getSession: async () => ({ data: { session: null } }),
      },
    },
  };
});

import { RequestActions } from "@/components/request-actions";
import { Thread } from "@/routes/messages";
import { AuthProvider } from "@/lib/auth";

const wrap = (ui: ReactNode, qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => (
  <QueryClientProvider client={qc}><I18nProvider>{ui}</I18nProvider></QueryClientProvider>
);
const pending = { id: "r1", status: "pending", provider_id: "p1", client_id: "c1", service_id: "s1", message: "m", created_at: "2026-10-01T10:00:00Z", services: { title: "Plomberie" }, client: null, provider: null };

// jsdom has no layout; browsers implement scrollIntoView.
Element.prototype.scrollIntoView = () => {};
beforeEach(() => { db.insertResults = []; db.inserts = []; db.updates = []; db.messages = []; });

describe("request status actions", () => {
  it("asks before declining; 'keep as is' changes nothing", () => {
    render(wrap(<RequestActions req={pending} userId="p1" />));
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(screen.getByText(/Refuser cette demande \? Ce choix est définitif/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ne rien changer" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Ne rien changer" }));
    expect(db.updates).toEqual([]);
  });
  it("commits only after confirmation", async () => {
    render(wrap(<RequestActions req={pending} userId="p1" />));
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(db.updates).toEqual([{ status: "accepted" }]));
  });
  it("a client can only cancel, also with confirmation", () => {
    render(wrap(<RequestActions req={pending} userId="c1" />));
    expect(screen.queryByRole("button", { name: "Accepter" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText(/Annuler votre demande/)).toBeInTheDocument();
  });
});

function renderThread(userId = "c1", req: Parameters<typeof Thread>[0]["req"] = pending) {
  const root = createRootRoute({ component: () => <Thread req={req} userId={userId} onBack={() => {}} /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return render(wrap(<RouterProvider router={router} />));
}

describe("message thread", () => {
  it("shows role-specific guidance", async () => {
    renderThread("p1");
    expect(await screen.findByText(/Nouvelle demande. Posez vos questions ici/)).toBeInTheDocument();
  });

  it("keeps a failed message visible with retry, and sends it on retry", async () => {
    db.insertResults = [{ error: { message: "offline" } }, { error: null }];
    renderThread();
    const box = await screen.findByLabelText("Écrire un message…");
    fireEvent.change(box, { target: { value: "Bonjour, êtes-vous dispo samedi ?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("Non envoyé")).toBeInTheDocument();
    expect(screen.getByText("Bonjour, êtes-vous dispo samedi ?")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Réessayer" })); });
    await waitFor(() => expect(screen.queryByText("Non envoyé")).toBeNull());
    expect(db.inserts).toHaveLength(2);
  });

  it("Shift+Enter keeps writing instead of sending", async () => {
    renderThread();
    const box = await screen.findByLabelText("Écrire un message…");
    fireEvent.change(box, { target: { value: "Ligne 1" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(db.inserts).toEqual([]);
  });
});

describe("thread header and days", () => {
  it("shows who you're talking to (linked to their profile), the service at a glance, and day separators", async () => {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    db.messages = [
      { id: "m1", sender_id: "c1", body: "Bonjour", created_at: yesterday.toISOString() },
      { id: "m2", sender_id: "p1", body: "Avec plaisir", created_at: now.toISOString() },
    ];
    renderThread("c1", { ...pending, services: { title: "Plomberie", price: 40, price_model: "hourly", city: "Sousse", remote: false }, provider: { display_name: "Amel" } });
    const who = await screen.findByRole("link", { name: "Amel" });
    expect(who).toHaveAttribute("href", "/pros/p1");
    expect(screen.getByRole("link", { name: /Plomberie/ })).toHaveTextContent(/40\s*TND.*heure.*Sousse/);
    expect(await screen.findByText("Hier")).toBeInTheDocument();
    expect(screen.getByText("Aujourd’hui")).toBeInTheDocument();
  });
  it("says so when the service is no longer available", async () => {
    renderThread("c1", { ...pending, services: null });
    expect(await screen.findAllByText("Service plus disponible")).not.toHaveLength(0);
  });
});

describe("account switch", () => {
  it("drops every cached query when the user signs out", async () => {
    const qc = new QueryClient();
    render(wrap(<AuthProvider><span /></AuthProvider>, qc));
    await waitFor(() => expect(db.authCb).not.toBeNull());
    act(() => db.authCb!("SIGNED_IN", { user: { id: "u1" } }));
    qc.setQueryData(["requests", "u1"], [{ id: "private" }]);
    act(() => db.authCb!("SIGNED_OUT", null));
    expect(qc.getQueryData(["requests", "u1"])).toBeUndefined();
  });
});
