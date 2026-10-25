import { describe, expect, it } from "vitest";
import { fetchPublicProfile } from "@/lib/profiles-db";
import { profileSeo } from "@/lib/seo";

const ID = "11111111-2222-4333-8444-555555555555";
const profileRow = { id: ID, display_name: "Amel Ben Ali", title: "Électricienne", bio: "Dépannage et installation à Tunis.", city: "Tunis", area: "La Marsa",
  avatar_url: null, professional_details: {}, created_at: "2026-01-01T00:00:00Z", preferred_lang: "fr" };
const serviceRow = { id: "0f8b6a4e-2c1d-4e5f-9a7b-1c2d3e4f5a6b", owner_id: ID, title: "Réparation électrique", description: "Prises et tableaux.", category: "home",
  price_model: "fixed", price: 80, city: "Tunis", remote: false, created_at: "2026-10-20T10:00:00Z", image_url: null, details: {}, profiles: { display_name: "Amel Ben Ali" } };

/** Records the filters of every query by table; each table answers with the given rows. */
function fakeDb(tables: Record<string, unknown>) {
  const calls: Record<string, [string, string, unknown][]> = {};
  const db = {
    from(table: string) {
      const log = (calls[table] ??= []);
      const result = { data: tables[table] ?? null, error: null };
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (c: string, v: unknown) => { log.push(["eq", c, v]); return chain; },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => result,
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
      };
      return chain;
    },
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
  };
  return { db: db as never, calls };
}

describe("fetchPublicProfile (server render)", () => {
  it("reads public contacts only and published, non-archived services only", async () => {
    const { db, calls } = fakeDb({ profiles: profileRow, profile_contacts: [], portfolio_items: [], services: [serviceRow] });
    const d = await fetchPublicProfile(ID, db);
    expect(calls["profile_contacts"]).toContainEqual(["eq", "is_public", true]);
    const svcFilters = calls["services"]!.map(([, c, v]) => `${c}=${String(v)}`);
    expect(svcFilters).toEqual(expect.arrayContaining(["status=published", "archived=false"]));
    expect(svcFilters.filter((f) => f === "status=published")).toHaveLength(2); // ids + full list
    expect(d?.profile.display_name).toBe("Amel Ben Ali");
    expect(d?.services.map((s) => s.title)).toEqual(["Réparation électrique"]);
  });

  it("unknown profile → null (404); malformed id never queries", async () => {
    const { db, calls } = fakeDb({ profiles: null });
    expect(await fetchPublicProfile(ID, db)).toBeNull();
    expect(await fetchPublicProfile("nope", db)).toBeNull();
    expect(calls["profiles"]).toHaveLength(1);
  });
});

describe("profile page head", () => {
  const origin = "https://skillloop.example";
  const base = { ...profileRow, serviceIds: ["s1"], portfolio: [] as unknown[] };
  const robots = (h: ReturnType<typeof profileSeo>) => h.meta.find((m) => "name" in m && m.name === "robots");

  it("uses the provider's own name, title, place and bio, with a canonical URL", () => {
    const h = profileSeo(base, origin);
    expect(h.meta[0]).toEqual({ title: "Amel Ben Ali — Électricienne | SkillLoop" });
    expect(h.meta).toContainEqual({ name: "description", content: "Électricienne · La Marsa, Tunis — Dépannage et installation à Tunis." });
    expect(h.meta).toContainEqual({ property: "og:type", content: "profile" });
    expect(h.links).toEqual([{ rel: "canonical", href: `${origin}/pros/${ID}` }]);
    expect(robots(h)).toBeUndefined();
  });

  it("noindex for a profile with no published service and no portfolio", () => {
    expect(robots(profileSeo({ ...base, serviceIds: [] }, origin))).toEqual({ name: "robots", content: "noindex" });
    expect(robots(profileSeo({ ...base, serviceIds: [], portfolio: [{}] }, origin))).toBeUndefined();
  });
});
