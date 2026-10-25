import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";

const calls = vi.hoisted(() => ({ signIn: [] as unknown[], reset: [] as unknown[][] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    signInWithPassword: async (a: unknown) => { calls.signIn.push(a); return { error: { message: "bad" } }; },
    signUp: async () => ({ data: {}, error: null }),
    // An unknown address errors here; the page must still say "sent" (no account enumeration).
    resetPasswordForEmail: async (...a: unknown[]) => { calls.reset.push(a); return { data: null, error: { message: "user not found", code: "user_not_found" } }; },
  } },
}));

import { AuthCard } from "@/components/auth-card";
import { ForgotPassword } from "@/components/forgot-password-card";
import { readSiteKey, captchaOptions, TURNSTILE_SITE_KEY } from "@/lib/turnstile";
import { setReturnTo } from "@/lib/return-to";

function renderCard(mode: "login" | "signup" | "forgot") {
  const root = createRootRoute({ component: () => (mode === "forgot" ? <ForgotPassword /> : <AuthCard mode={mode} />) });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return render(<QueryClientProvider client={new QueryClient()}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
}

beforeEach(() => { calls.signIn = []; calls.reset = []; sessionStorage.clear(); document.head.querySelectorAll("script[src*='turnstile']").forEach((s) => s.remove()); });

describe("Turnstile config", () => {
  it("is off unless a non-empty public site key is configured", () => {
    expect(TURNSTILE_SITE_KEY).toBeNull();
    expect(readSiteKey("")).toBeNull();
    expect(readSiteKey("  ")).toBeNull();
    expect(readSiteKey(" 0x4AAA ")).toBe("0x4AAA");
    expect(captchaOptions(null)).toEqual({});
    expect(captchaOptions("tok")).toEqual({ captchaToken: "tok" });
  });
});

describe("auth with Turnstile off (no site key)", () => {
  it("shows no widget, loads no script, and signs in exactly as before", async () => {
    renderCard("login");
    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "a@b.tn" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "secret" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Connexion" })); });
    expect(calls.signIn).toEqual([{ email: "a@b.tn", password: "secret", options: {} }]);
    expect(document.head.querySelector("script[src*='turnstile']")).toBeNull();
    expect(screen.queryByText(/anti-robot/)).toBeNull();
  });

  it("explains why you're signing in, from the page that sent you", async () => {
    setReturnTo("/services/0f8fad5b-d9cb-469f-a165-70867728950e#request");
    renderCard("login");
    expect(await screen.findByText("Connectez-vous pour envoyer votre demande.")).toBeInTheDocument();
  });

  it("toggles password visibility and shows the live rule on signup", async () => {
    renderCard("signup");
    const pw = (await screen.findByLabelText("Mot de passe")) as HTMLInputElement;
    expect(pw.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(pw.type).toBe("text");
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toHaveAttribute("aria-pressed", "true");
    const rule = screen.getByText("8 caractères minimum");
    expect(rule.className).toMatch(/text-muted-foreground/);
    fireEvent.change(pw, { target: { value: "longenough" } });
    expect(screen.getByText("8 caractères minimum").className).toMatch(/text-success/);
  });
});

describe("password recovery with Turnstile off", () => {
  it("sends the reset exactly as before, shows no widget, and never reveals whether the account exists", async () => {
    renderCard("forgot");
    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "nobody@b.tn" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" })); });
    expect(calls.reset).toEqual([["nobody@b.tn", { redirectTo: `${window.location.origin}/reset-password` }]]);
    expect(document.head.querySelector("script[src*='turnstile']")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/lien/i);
    expect(screen.queryByText(/anti-robot/)).toBeNull();
  });
});
