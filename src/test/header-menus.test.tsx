import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider, LANGS } from "@/lib/i18n";

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string }, signOut: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user, ready: true, session: null }), useSignOut: () => auth.signOut }));
vi.mock("@/lib/profiles-db", () => ({
  profileQuery: (id: string) => queryOptions({ queryKey: ["profile", id], queryFn: async () => ({ display_name: "Amel Ben Ali", avatar: undefined }) }),
}));
vi.mock("@/lib/services-db", () => ({ publishedServicesQuery: queryOptions({ queryKey: ["services", "published"], queryFn: async () => [] }) }));
// Signed in, the header reads unread counts (Realtime) and the plan: both hit Supabase, which CI has no config for.
vi.mock("@/lib/use-unread", () => ({ useUnread: () => ({ count: 0 }), useUnreadLive: () => {} }));
vi.mock("@/lib/plan", async (orig) => ({ ...(await orig<typeof import("@/lib/plan")>()), useIsPro: () => false }));

import { SiteHeader } from "@/components/site";

beforeAll(() => {
  // Radix menus measure their trigger; jsdom has no layout APIs.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
// The chosen language/theme persist in localStorage by design; start every test from the defaults.
beforeEach(() => localStorage.clear());

async function renderHeader() {
  const root = createRootRoute({ component: () => <SiteHeader /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<QueryClientProvider client={new QueryClient()}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
  return screen.findByRole("button", { name: "Langue et apparence" });
}
const openMenu = (el: HTMLElement) => act(() => { fireEvent.keyDown(el, { key: "Enter" }); });

describe("header: language & appearance menu", () => {
  it("replaces the separate flag/theme groups with one menu of radio items", async () => {
    auth.user = null;
    const trigger = await renderHeader();
    expect(screen.queryByRole("group", { name: /Langue/ })).toBeNull();
    await openMenu(trigger);
    const langs = await screen.findAllByRole("menuitemradio");
    expect(langs.map((x) => x.textContent?.trim())).toEqual(expect.arrayContaining(LANGS.map((l) => l.label)));
    expect(screen.getByRole("menuitemradio", { name: /Français/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: /Système/ })).toBeInTheDocument();
  });

  it("switches language from the menu", async () => {
    auth.user = null;
    const trigger = await renderHeader();
    await openMenu(trigger);
    await act(async () => { fireEvent.click(await screen.findByRole("menuitemradio", { name: /English/ })); });
    expect(await screen.findByRole("button", { name: "Language and appearance" })).toBeInTheDocument();
  });

  it("signed out shows login and signup, no account menu", async () => {
    auth.user = null;
    await renderHeader();
    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Menu du compte/ })).toBeNull();
  });
});

describe("header: account menu", () => {
  it("shows the user's initial and groups account actions, including sign out", async () => {
    auth.user = { id: "u1", email: "amel@test.tn" };
    auth.signOut.mockClear();
    await renderHeader();
    const trigger = await screen.findByRole("button", { name: "Menu du compte · Amel Ben Ali" });
    expect(trigger).toHaveTextContent("A");
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/messages");
    await openMenu(trigger);
    expect(await screen.findByRole("menuitem", { name: /Tableau de bord/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("menuitem", { name: /Voir mon profil public/ })).toHaveAttribute("href", "/pros/u1");
    expect(screen.getByText("amel@test.tn")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("menuitem", { name: /Déconnexion/ })); });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
