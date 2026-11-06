import { beforeAll, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { OPEN_SUPPORT_EVENT, type SupportOpen } from "@/lib/support";
import { openFeatureSheet } from "@/lib/social-features";
import { FeatureSheetHost } from "@/components/feature-sheet";

const IG = "https://www.instagram.com/reel/DQx1AbC_9-z/";
const FB = "https://www.facebook.com/reel/1234567890";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  Element.prototype.hasPointerCapture ??= () => false;
});

async function renderHost() {
  const root = createRootRoute({ component: () => <FeatureSheetHost /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
  await screen.findByText((_, el) => el === document.body);
}
const open = async (sheet: Parameters<typeof openFeatureSheet>[0]) => {
  await act(async () => {
    openFeatureSheet(sheet);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  });
  return screen.findByRole("dialog");
};

describe("video sheet (from a notification)", () => {
  it("« Nouvelle vidéo »: watch on Instagram or Facebook, or ask for your own video (message ready)", async () => {
    await renderHost();
    const dialog = await open({ mode: "new", title: "Hamma & Loopy", instagramUrl: IG, facebookUrl: FB, publishedAt: "2026-11-06T10:00:00Z" });
    expect(dialog).toHaveTextContent("Hamma & Loopy");
    expect(screen.getByRole("link", { name: /Voir sur Instagram/ })).toHaveAttribute("href", IG);
    expect(screen.getByRole("link", { name: /Voir sur Facebook/ })).toHaveAttribute("href", FB);
    expect(screen.getByRole("link", { name: /Voir sur Instagram/ })).toHaveAttribute("rel", "noopener noreferrer");

    const opened: SupportOpen[] = [];
    const on = (e: Event) => opened.push((e as CustomEvent<SupportOpen>).detail);
    window.addEventListener(OPEN_SUPPORT_EVENT, on);
    // The support panel opens only once this dialog has fully closed (else the focus return dismisses the panel).
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Je veux ma vidéo/ }));
      await new Promise((r) => setTimeout(r, 50));
    });
    window.removeEventListener(OPEN_SUPPORT_EVENT, on);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opened).toHaveLength(1);
    expect(opened[0]!.topic).toBe("chat");
    expect(opened[0]!.draft?.text).toContain("Hamma & Loopy");
  });

  it("offers WhatsApp too, with the same message", async () => {
    await renderHost();
    await open({ mode: "new", title: "Hamma & Loopy", instagramUrl: IG, facebookUrl: null, publishedAt: null });
    const wa = screen.getByRole("link", { name: /WhatsApp/ });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/21621774202\?text=/);
    expect(decodeURIComponent(wa.getAttribute("href")!.split("text=")[1]!)).toContain("Hamma & Loopy");
  });

  it("« Vous êtes à l'affiche »: one platform only, and the way to the profile choice", async () => {
    await renderHost();
    await open({ mode: "you", title: "Plombier à Sfax", instagramUrl: null, facebookUrl: FB, publishedAt: null });
    expect(screen.queryByRole("link", { name: /Voir sur Instagram/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Voir sur Facebook/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choisir si elle s’affiche sur mon profil/ })).toHaveAttribute("href", "/dashboard#features");
    expect(screen.queryByRole("button", { name: /Je veux ma vidéo/ })).toBeNull();
  });
});
