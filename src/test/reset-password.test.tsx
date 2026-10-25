import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { parseAuthHashError, passwordUpdateErrorKey } from "@/lib/auth-url";

const sb = vi.hoisted(() => ({ session: null as unknown, updateError: null as unknown, updates: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: sb.session } }),
    updateUser: async (a: unknown) => { sb.updates.push(a); return { data: {}, error: sb.updateError }; },
  } },
}));
import { ResetPassword } from "@/components/reset-password-card";

async function renderAt(hash = "") {
  window.history.replaceState(null, "", `/reset-password${hash}`);
  const root = createRootRoute({ component: () => <ResetPassword /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
}
beforeEach(() => { sb.session = null; sb.updateError = null; sb.updates = []; localStorage.clear(); });

describe("auth URL helpers", () => {
  it("reads Supabase's error from the hash", () => {
    expect(parseAuthHashError("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"))
      .toEqual({ code: "otp_expired", description: "Email link is invalid or has expired" });
    expect(parseAuthHashError("#access_token=x&type=recovery")).toBeNull();
    expect(parseAuthHashError("")).toBeNull();
  });
  it("maps update errors to friendly keys, never raw text", () => {
    expect(passwordUpdateErrorKey({ name: "AuthSessionMissingError", message: "Auth session missing!" })).toBe("reset_link_invalid_t");
    expect(passwordUpdateErrorKey({ code: "same_password" })).toBe("err_same_password");
    expect(passwordUpdateErrorKey({ code: "weak_password" })).toBe("err_password");
    expect(passwordUpdateErrorKey({ message: "boom" })).toBe("err_generic");
  });
});

describe("reset password page", () => {
  it("an expired link shows a clear message and a way to request a new one — no form", async () => {
    sb.session = { user: { id: "u1" } }; // even if a session exists, the rejected link wins
    await renderAt("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    expect(await screen.findByText("Ce lien n’est plus valide")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Demander un nouveau lien" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("Mot de passe")).toBeNull();
  });
  it("without a recovery session, no form either", async () => {
    await renderAt();
    expect(await screen.findByText("Ce lien n’est plus valide")).toBeInTheDocument();
  });
  it("with a recovery session, updates the password and confirms", async () => {
    sb.session = { user: { id: "u1" } };
    await renderAt();
    const pw = await screen.findByLabelText("Mot de passe");
    fireEvent.change(pw, { target: { value: "nouveau-mdp-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" })); });
    expect(sb.updates).toEqual([{ password: "nouveau-mdp-123" }]);
    expect(screen.getByRole("status")).toHaveTextContent("Mot de passe mis à jour.");
  });
  it("a session lost during the update switches to the clear message, not 'Auth session missing!'", async () => {
    sb.session = { user: { id: "u1" } };
    sb.updateError = { name: "AuthSessionMissingError", message: "Auth session missing!" };
    await renderAt();
    fireEvent.change(await screen.findByLabelText("Mot de passe"), { target: { value: "nouveau-mdp-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" })); });
    expect(screen.queryByText(/Auth session missing/)).toBeNull();
    expect(screen.getByText("Ce lien n’est plus valide")).toBeInTheDocument();
  });
  it("same password gets a friendly message", async () => {
    sb.session = { user: { id: "u1" } };
    sb.updateError = { code: "same_password", message: "New password should be different from the old password." };
    await renderAt();
    fireEvent.change(await screen.findByLabelText("Mot de passe"), { target: { value: "nouveau-mdp-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez un mot de passe différent de l’ancien.");
  });
});
