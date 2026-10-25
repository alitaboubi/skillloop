import { describe, expect, it, vi } from "vitest";
import { fetchPublicService, fetchPublicServices } from "@/lib/services-db";
import { serviceSeo, siteUrl, snippet } from "@/lib/seo";

const ID = "0f8b6a4e-2c1d-4e5f-9a7b-1c2d3e4f5a6b";
const row = {
  id: ID, owner_id: "11111111-2222-4333-8444-555555555555", title: "Réparation électrique", description: "Dépannage, prises et tableaux électriques à Tunis.",
  category: "home", price_model: "fixed", price: 80, city: "Tunis", remote: false, created_at: "2026-10-20T10:00:00Z",
  image_url: null, details: {}, profiles: { display_name: "Amel", title: "Électricienne" },
};

/** Minimal stand-in for the supabase-js query chain; records every filter applied. */
function fakeDb(result: { data: unknown; error: unknown }) {
  const filters: [string, unknown][] = [];
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: result.data ? [result.data] : [], error: result.error })),
    eq: vi.fn((col: string, v: unknown) => { filters.push([col, v]); return chain; }),
    maybeSingle: vi.fn(async () => result),
  };
  const db = { from: vi.fn(() => chain), storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) } };
  return { db: db as never, filters, chain };
}

describe("fetchPublicService (server render)", () => {
  it("asks only for a published, non-archived service by id", async () => {
    const { db, filters } = fakeDb({ data: row, error: null });
    const s = await fetchPublicService(ID, db);
    expect(filters).toEqual([["id", ID], ["status", "published"], ["archived", false]]);
    expect(s).toMatchObject({ id: ID, title: "Réparation électrique", city: "Tunis", provider: "Amel", hasPhoto: false });
  });

  it("returns null (→ 404) when the row is not visible: missing, draft or archived", async () => {
    const { db } = fakeDb({ data: null, error: null });
    expect(await fetchPublicService(ID, db)).toBeNull();
  });

  it("never queries for a malformed id", async () => {
    const { db } = fakeDb({ data: row, error: null });
    expect(await fetchPublicService("abc", db)).toBeNull();
    expect((db as unknown as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it("surfaces backend errors (→ error page / 500), not a fake 404", async () => {
    const { db } = fakeDb({ data: null, error: new Error("down") });
    await expect(fetchPublicService(ID, db)).rejects.toThrow("down");
  });
});

const svc = { id: ID, title: "Réparation électrique", description: "Dépannage,\n prises   et tableaux.", category: "home" as const, city: "Tunis", remote: false,
  price: 80, quoteOnly: false, priceMissing: false, provider: "Amel", ownerId: "11111111-2222-4333-8444-555555555555" };

describe("service page head", () => {
  const origin = "https://skillloop.example";
  const head = serviceSeo(svc, origin);
  const meta = (k: string) => head.meta.find((m) => ("name" in m && m.name === k) || ("property" in m && m.property === k));

  it("uses the listing's own title and description", () => {
    expect(head.meta[0]).toEqual({ title: "Réparation électrique | SkillLoop" });
    expect(meta("description")).toMatchObject({ content: "Dépannage, prises et tableaux." });
    expect(meta("og:title")).toMatchObject({ content: "Réparation électrique | SkillLoop" });
  });

  it("has an absolute canonical URL and og:url for this service", () => {
    expect(head.links).toEqual([{ rel: "canonical", href: `${origin}/services/${ID}` }]);
    expect(meta("og:url")).toMatchObject({ content: `${origin}/services/${ID}` });
  });

  it("emits no canonical without a site URL (never a wrong one)", () => {
    const h = serviceSeo({ ...svc, title: "T", description: "D" }, null);
    expect(h.links).toEqual([]);
    expect(h.scripts).toEqual([]); // no structured data without absolute URLs
  });
});

describe("seo helpers", () => {
  it("siteUrl: VITE_SITE_URL origin, dev fallback, nothing in a prod build without it", () => {
    expect(siteUrl("https://skillloop.example/some/path/", false)).toBe("https://skillloop.example");
    expect(siteUrl("", true)).toBe("http://localhost:8080");
    expect(siteUrl("", false)).toBeNull();
    expect(siteUrl("javascript:alert(1)", false)).toBeNull();
  });

  it("snippet: short text unchanged, long text cut at a word with an ellipsis", () => {
    expect(snippet("  Bonjour   le monde ")).toBe("Bonjour le monde");
    const long = "mot ".repeat(80);
    const s = snippet(long, 160);
    expect(s.length).toBeLessThanOrEqual(160);
    expect(s.endsWith("mot…")).toBe(true);
  });
});

describe("fetchPublicServices (Explore server render)", () => {
  it("lists published, non-archived services only", async () => {
    const { db, filters } = fakeDb({ data: row, error: null });
    const list = await fetchPublicServices(db);
    expect(filters).toEqual([["status", "published"], ["archived", false]]);
    expect(list.map((s) => s.id)).toEqual([ID]);
  });
});
