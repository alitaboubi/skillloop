import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";

// Site key configured + a fake Turnstile API (no Cloudflare call).
const ts = vi.hoisted(() => ({
  opts: null as null | Record<string, unknown>,
  resets: 0,
  fail: false,
  signIn: [] as unknown[],
  signUp: [] as unknown[],
  reset: [] as unknown[][],
  resetError: null as null | { message: string; code: string },
  authError: { message: "bad" } as { message: string; code?: string },
}));
vi.mock("@/lib/turnstile", () => ({
  TURNSTILE_SITE_KEY: "0x-public-site-key",
  captchaOptions: (t: string | null) => (t ? { captchaToken: t } : {}),
  loadTurnstile: () => ts.fail ? Promise.reject(new Error("blocked")) : Promise.resolve({
    render: (_el: HTMLElement, o: Record<string, unknown>) => { ts.opts = o; return "w1"; },
    reset: () => { ts.resets++; },
    remove: () => {},
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    signInWithPassword: async (a: unknown) => { ts.signIn.push(a); return { error: ts.authError }; },
    signUp: async (a: unknown) => { ts.signUp.push(a); return { data: {}, error: ts.authError.code ? ts.authError : null }; },
    resetPasswordForEmail: async (...a: unknown[]) => { ts.reset.push(a); return { data: null, error: ts.resetError }; },
  } },
}));

import { AuthCard } from "@/components/auth-card";
import { ForgotPassword } from "@/components/forgot-password-card";

function renderCard(mode: "login" | "signup" | "forgot") {
  const root = createRootRoute({ component: () => (mode === "forgot" ? <ForgotPassword /> : <AuthCard mode={mode} />) });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return render(<QueryClientProvider client={new QueryClient()}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
}
const fill = async () => {
  fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "a@b.tn" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "longenough" } });
};

beforeEach(() => { Object.assign(ts, { opts: null, resets: 0, fail: false, signIn: [], signUp: [], reset: [], resetError: null, authError: { message: "bad" } }); });

describe("auth with Turnstile on", () => {
  it("renders the widget with the public site key and the right action", async () => {
    renderCard("login");
    await waitFor(() => expect(ts.opts).toMatchObject({ sitekey: "0x-public-site-key", action: "login", theme: "auto" }));
  });

  it("won't submit without a token", async () => {
    renderCard("login");
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Confirmez la vérification anti-robot");
    expect(ts.signIn).toEqual([]);
  });

  it("sends the token to Supabase with the login and resets the single-use widget", async () => {
    renderCard("login");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-123"));
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(ts.signIn).toEqual([{ email: "a@b.tn", password: "longenough", options: { captchaToken: "tok-123" } }]);
    expect(ts.resets).toBe(1);
  });

  it("signup name field accepts at most 80 characters (same limit as the profile name)", async () => {
    renderCard("signup");
    expect(await screen.findByLabelText("Nom complet")).toHaveAttribute("maxLength", "80");
  });

  it("sends the token with signup too", async () => {
    renderCard("signup");
    await waitFor(() => expect(ts.opts).toMatchObject({ action: "signup" }));
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-9"));
    fireEvent.change(await screen.findByLabelText("Nom complet"), { target: { value: "Amel" } });
    await fill();
    fireEvent.click(screen.getByLabelText(/J’ai lu et j’accepte/)); // terms acknowledgement (required on sign-up)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Créer un compte" })); });
    expect((ts.signUp[0] as { options: Record<string, unknown> }).options).toMatchObject({ captchaToken: "tok-9" });
  });

  it("sign-up requires the terms acknowledgement and never calls Supabase without it", async () => {
    renderCard("signup");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-t"));
    fireEvent.change(await screen.findByLabelText("Nom complet"), { target: { value: "Amel" } });
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Créer un compte" })); });
    expect(screen.getByText("Acceptez les conditions pour créer votre compte.")).toBeInTheDocument();
    expect(ts.signUp).toHaveLength(0);
  });

  it("sign-up offers both roles with what each unlocks", async () => {
    renderCard("signup");
    expect(await screen.findByRole("radio", { name: /Je cherche un pro/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Je propose mes services/ })).not.toBeChecked();
    expect(screen.getByText(/publier vos services et recevoir des demandes/)).toBeInTheDocument();
  });

  it("a refused bot check on login says so, not 'wrong password'", async () => {
    ts.authError = { message: "captcha protection: request disallowed (timeout-or-duplicate)", code: "captcha_failed" };
    renderCard("login");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-old"));
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("La vérification anti-robot a échoué");
    expect(screen.queryByText(/captcha protection/)).toBeNull();
  });

  it("a wrong password is still reported as such", async () => {
    ts.authError = { message: "Invalid login credentials", code: "invalid_credentials" };
    renderCard("login");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-ok"));
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(screen.getByRole("alert")).not.toHaveTextContent("anti-robot");
  });

  it("a refused bot check on signup shows the friendly message, never the raw Supabase text", async () => {
    ts.authError = { message: "captcha protection: request disallowed (no captcha_token found)", code: "captcha_failed" };
    renderCard("signup");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-s"));
    fireEvent.change(await screen.findByLabelText("Nom complet"), { target: { value: "Amel" } });
    await fill();
    fireEvent.click(screen.getByLabelText(/J’ai lu et j’accepte/)); // terms acknowledgement (required on sign-up)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Créer un compte" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("La vérification anti-robot a échoué");
    expect(screen.queryByText(/captcha protection/)).toBeNull();
  });

  it("an expired token is dropped and blocks the next submit", async () => {
    renderCard("login");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-1"));
    act(() => (ts.opts!["expired-callback"] as () => void)());
    await fill();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(ts.signIn).toEqual([]);
  });

  it("explains when the check can't load, with a retry", async () => {
    ts.fail = true;
    renderCard("login");
    expect(await screen.findByText("La vérification anti-robot n’a pas pu se charger.")).toBeInTheDocument();
    ts.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(ts.opts).not.toBeNull());
  });
});

describe("password recovery with Turnstile on", () => {
  const email = async () => fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "a@b.tn" } });
  const send = () => act(async () => { fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" })); });

  it("renders the widget with the 'reset' action and won't send without a token", async () => {
    renderCard("forgot");
    await waitFor(() => expect(ts.opts).toMatchObject({ sitekey: "0x-public-site-key", action: "reset" }));
    await email();
    await send();
    expect(screen.getByRole("alert")).toHaveTextContent("Confirmez la vérification anti-robot");
    expect(ts.reset).toEqual([]);
  });

  it("sends the token with the reset request and resets the single-use widget", async () => {
    renderCard("forgot");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-r"));
    await email();
    await send();
    expect(ts.reset).toEqual([["a@b.tn", { redirectTo: `${window.location.origin}/reset-password`, captchaToken: "tok-r" }]]);
    expect(ts.resets).toBe(1);
    expect(screen.getByRole("status")).toHaveTextContent(/lien/i);
  });

  it("a refused bot check is reported instead of a false 'link sent'", async () => {
    ts.resetError = { message: "captcha protection: request disallowed", code: "captcha_failed" };
    renderCard("forgot");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-bad"));
    await email();
    await send();
    expect(screen.getByRole("alert")).toHaveTextContent("La vérification anti-robot a échoué");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("other errors still say 'sent', so account existence is never revealed", async () => {
    ts.resetError = { message: "user not found", code: "user_not_found" };
    renderCard("forgot");
    await waitFor(() => expect(ts.opts).not.toBeNull());
    act(() => (ts.opts!["callback"] as (t: string) => void)("tok-ok"));
    await email();
    await send();
    expect(screen.getByRole("status")).toHaveTextContent(/lien/i);
  });

  it("explains when the check can't load, with a retry", async () => {
    ts.fail = true;
    renderCard("forgot");
    expect(await screen.findByText("La vérification anti-robot n’a pas pu se charger.")).toBeInTheDocument();
    ts.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(ts.opts).toMatchObject({ action: "reset" }));
  });
});
