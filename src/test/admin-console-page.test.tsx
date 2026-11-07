import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";

// The database, by function name. Each test can replace an answer.
const db = vi.hoisted(() => ({
  answers: {} as Record<string, unknown>,
  calls: [] as { fn: string; args: unknown }[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (fn: string, args: unknown) => {
      db.calls.push({ fn, args });
      const a = db.answers[fn];
      return a instanceof Error ? { data: null, error: a } : { data: a ?? null, error: null };
    }),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }),
    channel: () => ({ on: function () { return this; }, subscribe: function () { return this; } }),
    removeChannel: () => {},
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "op", email: "op@x" }, ready: true, session: null }) }));
vi.mock("@/lib/profiles-db", () => ({ profileQuery: (id: string) => queryOptions({ queryKey: ["profile", id], queryFn: async () => ({ display_name: "Ali", avatar: undefined }) }) }));
vi.mock("@/lib/admin", async (orig) => {
  const real = await orig<typeof import("@/lib/admin")>();
  return {
    ...real,
    ADMIN_ENABLED: true,
    amIAdminQuery: () => queryOptions({ queryKey: ["am-i-admin"], queryFn: async () => true }),
    adminOverviewQuery: (days: number) => queryOptions({ queryKey: ["admin-overview", days], queryFn: async () => real.parseOverview({ days }) }),
  };
});

import { AdminPage, type ConsoleSearch } from "@/components/admin-overview";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => {
  db.calls = [];
  db.answers = {
    admin_todo: { support_unread: 2, support_open: 3, consent_pending: 1, requests_waiting: 0, new_users: 4 },
    admin_users: { total: 2, items: [
      { id: "11111111-1111-4111-8111-111111111111", name: "Amira Plombière", city: "Sfax", pro: true, services: 2, requests: 5, support: "open", created_at: "2026-11-01T10:00:00Z" },
      { id: "22222222-2222-4222-8222-222222222222", name: "Karim", city: "Tunis", pro: false, services: 0, requests: 1, support: null, created_at: "2026-11-02T10:00:00Z" },
    ] },
    admin_user: { id: "11111111-1111-4111-8111-111111111111", name: "Amira Plombière", city: "Sfax", created_at: "2026-11-01T10:00:00Z",
      services: [{ id: "s1", title: "Plomberie", status: "published", archived: false }], requests: { as_client: 0, as_pro: 5, pending: 1, accepted: 3 } },
    admin_subscriptions: [],
    admin_grant_pro: { until: "2026-12-07T10:00:00Z" },
    admin_log: [],
  };
});

async function renderConsole(search: ConsoleSearch & { days?: 7 | 30 | 90 }) {
  const root = createRootRoute();
  const admin = createRoute({ getParentRoute: () => root, path: "/admin", validateSearch: (s: Record<string, unknown>) => s as never,
    component: function C() { const s = admin.useSearch() as ConsoleSearch & { days?: 7 | 30 | 90 }; return <AdminPage days={s.days ?? 30} search={s} />; } });
  const qs = new URLSearchParams(Object.entries(search).flatMap(([k, v]) => (v ? [[k, String(v)]] : []))).toString();
  const router = createRouter({ routeTree: root.addChildren([admin as never]), history: createMemoryHistory({ initialEntries: [`/admin${qs ? `?${qs}` : ""}`] }) });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider><RouterProvider router={router as never} /></I18nProvider></QueryClientProvider>);
  return router;
}

describe("operator console", () => {
  it("overview: the to-dos (only for sections that are on), and the section tabs", async () => {
    await renderConsole({});
    expect(await screen.findByRole("heading", { name: "À faire aujourd’hui" })).toBeInTheDocument();
    expect((await screen.findByText("nouveaux comptes")).closest("a")).toHaveTextContent("4");
    // VITE_SUPPORT is off in tests: no Messages tab, no « messages non lus » card.
    expect(screen.queryByText("messages non lus")).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Sections de la console" });
    expect(within(nav).getByRole("link", { name: /Utilisateurs/ })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Abonnements/ })).toBeInTheDocument();
  });

  it("users: the list, then one account in the side panel, then Pro for 90 days (confirmed, logged by the database)", async () => {
    await renderConsole({ section: "users", u: "11111111-1111-4111-8111-111111111111" });
    // The side panel is modal: the list behind it is hidden from assistive tech, so find it by text.
    expect(await screen.findByText("Karim")).toBeInTheDocument();
    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByRole("heading", { name: "Amira Plombière" })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Plomberie" })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "90 jours" }));
    fireEvent.click(within(panel).getByRole("button", { name: /Donner Pro/ }));
    expect(within(panel).getByText(/Donner 90 jours de Pro à Amira Plombière/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(within(panel).getByRole("button", { name: "Confirmer" })); });
    const call = db.calls.find((c) => c.fn === "admin_grant_pro");
    expect(call?.args).toEqual({ p_user: "11111111-1111-4111-8111-111111111111", p_days: 90, p_note: null });
  });

  it("a block whose migration is not applied says so instead of failing", async () => {
    db.answers["admin_subscriptions"] = Object.assign(new Error("Could not find the function public.admin_subscriptions"), { code: "PGRST202" });
    await renderConsole({ section: "subscriptions" });
    expect(await screen.findByText("20261107140000_admin_subscriptions.sql")).toBeInTheDocument();
  });

  it("never asks the database for more than a page of accounts", async () => {
    await renderConsole({ section: "users", q: "amira", role: "pro" });
    await screen.findByText("Amira Plombière");
    expect(db.calls.find((c) => c.fn === "admin_users")?.args).toEqual({ p_q: "amira", p_role: "pro", p_sort: "new", p_limit: 25, p_offset: 0 });
  });
});
