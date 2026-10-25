import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { renderErrorPage } from "@/lib/error-page";

vi.mock("@tanstack/react-router", () => ({ useRouter: () => ({ invalidate: vi.fn() }) }));
import { ErrorScreen } from "@/components/error-screen";

const props = { error: new Error("boom"), reset: vi.fn() } as unknown as ErrorComponentProps;
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("root error page (can render outside the language provider)", () => {
  it("without the provider: French by default, no crash", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorScreen {...props} />);
    expect(screen.getByRole("heading", { name: "Cette page n’a pas pu se charger" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" })).toHaveAttribute("href", "/");
  });

  it("without the provider: uses the saved language (Arabic, right-to-left)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("skillloop.lang", "ar");
    render(<ErrorScreen {...props} />);
    const h = await screen.findByRole("heading", { name: "الصفحة هاذي ما تحلّتش" });
    expect(h.closest("[dir]")).toHaveAttribute("dir", "rtl");
  });

  it("inside the provider: follows the current language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("skillloop.lang", "en");
    render(<I18nProvider><ErrorScreen {...props} /></I18nProvider>);
    expect(await screen.findByRole("heading", { name: "This page didn’t load" })).toBeInTheDocument();
  });
});

describe("server fallback page", () => {
  it("French first, with English and Tunisian Arabic, noindex, no English-only text", () => {
    const html = renderErrorPage();
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("Cette page n’a pas pu se charger");
    expect(html).toContain("This page didn’t load");
    expect(html).toContain("الصفحة هاذي ما تحلّتش");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('name="robots" content="noindex"');
  });
});
