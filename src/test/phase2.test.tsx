import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<typeof import("@tanstack/react-router")>()), useNavigate: () => navigate }));

import { SearchPalette } from "@/components/search-palette";
import { readRecent, rememberSearch } from "@/lib/recent-searches";
import { peek } from "@/lib/peek";

// jsdom has no ResizeObserver / scrollIntoView (cmdk uses both); browsers do.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

beforeEach(() => { navigate.mockReset(); localStorage.clear(); });

const palette = () => render(<I18nProvider><SearchPalette open onOpenChange={() => {}} /></I18nProvider>);

describe("search palette", () => {
  it("is a labelled dialog with categories and cities", () => {
    palette();
    expect(screen.getByRole("dialog", { name: "Rechercher sur SkillLoop" })).toBeInTheDocument();
    expect(screen.getByText("Catégories")).toBeInTheDocument();
    expect(screen.getByText("Sousse")).toBeInTheDocument();
  });

  it("offers a free-text search that opens Explore with ?q and remembers it on this device", () => {
    palette();
    fireEvent.change(screen.getByPlaceholderText("Un service, une catégorie, une ville…"), { target: { value: "plombier" } });
    fireEvent.click(screen.getByText("Rechercher « plombier »"));
    expect(navigate).toHaveBeenCalledWith({ to: "/explore", search: { q: "plombier" } });
    expect(readRecent()).toEqual(["plombier"]);
  });

  it("keeps at most 5 recent searches, newest first, without duplicates", () => {
    for (const q of ["a1", "b2", "c3", "d4", "e5", "B2", "f6"]) rememberSearch(q);
    expect(readRecent()).toEqual(["f6", "B2", "e5", "d4", "c3"]);
  });

  it("survives broken storage", () => {
    localStorage.setItem("skillloop.recent-searches", "{not json");
    expect(readRecent()).toEqual([]);
  });
});

describe("card preview line", () => {
  it("keeps short descriptions whole and cuts long ones at a word", () => {
    expect(peek("Réparation  de\nfuites.")).toBe("Réparation de fuites.");
    const long = "mot ".repeat(80);
    const p = peek(long);
    expect(p.endsWith("…")).toBe(true);
    expect(p.length).toBeLessThanOrEqual(161);
    expect(p).not.toMatch(/ …$/);
  });
});
