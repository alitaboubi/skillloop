import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { ListingSketch, StartShortcuts } from "@/components/states";
import { draftsFirst, draftsToFinish, formatWait, isCaughtUp, pendingOldestFirst, waitDuration } from "@/lib/provider-today";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const H = 3_600_000;

describe("provider today", () => {
  it("lists only this provider's pending requests, longest wait first", () => {
    const reqs = [
      { id: "new", provider_id: "p1", status: "pending", created_at: ago(1 * H) },
      { id: "old", provider_id: "p1", status: "pending", created_at: ago(50 * H) },
      { id: "done", provider_id: "p1", status: "accepted", created_at: ago(90 * H) },
      { id: "theirs", provider_id: "p2", status: "pending", created_at: ago(99 * H) },
    ];
    expect(pendingOldestFirst(reqs, "p1").map((r) => r.id)).toEqual(["old", "new"]);
  });
  it("measures the real wait in the largest whole unit", () => {
    expect(waitDuration(ago(10_000), NOW)).toEqual({ n: 1, unit: "minute" });
    expect(waitDuration(ago(59 * 60_000), NOW)).toEqual({ n: 59, unit: "minute" });
    expect(waitDuration(ago(5 * H), NOW)).toEqual({ n: 5, unit: "hour" });
    expect(waitDuration(ago(49 * H), NOW)).toEqual({ n: 2, unit: "day" });
  });
  it("formats the wait in each language", () => {
    // Intl uses a non-breaking space ("2\u00a0jours"), which keeps number and unit together.
    const plain = (v: string) => v.replace(/\s/g, " ");
    expect(plain(formatWait(ago(49 * H), "fr", NOW))).toBe("2 jours");
    expect(plain(formatWait(ago(49 * H), "en", NOW))).toBe("2 days");
    expect(formatWait(ago(49 * H), "ar-TN", NOW)).toMatch(/يوم/);
  });
  it("surfaces drafts to finish, never archived ones, and lists drafts first", () => {
    const s = [{ id: "a", status: "published" }, { id: "b", status: "draft" }, { id: "c", status: "draft", archived: true }];
    expect(draftsToFinish(s).map((x) => x.id)).toEqual(["b"]);
    expect(draftsFirst(s).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("is caught up only with nothing pending and no draft", () => {
    expect(isCaughtUp(0, 0)).toBe(true);
    expect(isCaughtUp(1, 0)).toBe(false);
    expect(isCaughtUp(0, 1)).toBe(false);
  });
});

describe("teaching empty states", () => {
  it("the listing sketch is labelled as an example and contains no fake facts", () => {
    const { container } = render(<I18nProvider><ListingSketch /></I18nProvider>);
    expect(screen.getByText("Exemple de structure — pas un vrai service")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d|TND|د\.ت/);
  });
  it("offers three real category shortcuts into Explore", async () => {
    const root = createRootRoute({ component: () => <StartShortcuts /> });
    const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
    render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/explore?category=home", "/explore?category=tutoring", "/explore?category=tech"]);
  });
});
