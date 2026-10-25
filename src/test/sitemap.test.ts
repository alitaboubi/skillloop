import { describe, expect, it } from "vitest";
import { publicPaths, robotsTxt, sitemapXml, STATIC_PATHS } from "@/lib/sitemap";
import { seo } from "@/lib/seo";

const O = "https://skillloop.example";

/** Fake services table: answers `range(from, to)` from `rows`, records filters. */
function fakeDb(rows: { id: string; owner_id: string }[]) {
  const filters: string[] = [];
  const ranges: [number, number][] = [];
  const chain = {
    select: () => chain,
    eq: (c: string, v: unknown) => { filters.push(`${c}=${String(v)}`); return chain; },
    order: () => chain,
    range: async (from: number, to: number) => { ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; },
  };
  return { db: { from: () => chain } as never, filters, ranges };
}

describe("robots.txt", () => {
  it("allows crawling and points to the sitemap (private pages use noindex instead of Disallow)", () => {
    expect(robotsTxt(O)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${O}/sitemap.xml\n`);
  });
});

describe("sitemap.xml", () => {
  it("is valid sitemap XML with absolute, escaped URLs", () => {
    const xml = sitemapXml(O, ["/", "/a?x=1&y=<2>"]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(xml).toContain(`<loc>${O}/</loc>`);
    expect(xml).toContain(`<loc>${O}/a?x=1&amp;y=&lt;2&gt;</loc>`);
  });

  it("lists static pages, published non-archived services and their providers once", async () => {
    const { db, filters } = fakeDb([{ id: "s1", owner_id: "u1" }, { id: "s2", owner_id: "u1" }, { id: "s3", owner_id: "u2" }]);
    const paths = await publicPaths(db);
    expect(filters).toEqual(["status=published", "archived=false"]);
    expect(paths).toEqual([...STATIC_PATHS, "/services/s1", "/services/s2", "/services/s3", "/pros/u1", "/pros/u2"]);
    expect(paths.some((p) => /dashboard|messages|profile|offer|login|signup|password/.test(p))).toBe(false);
  });

  it("pages through more than 1000 services", async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ id: `s${i}`, owner_id: "u1" }));
    const { db, ranges } = fakeDb(rows);
    const paths = await publicPaths(db);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(paths.filter((p) => p.startsWith("/services/"))).toHaveLength(1500);
  });
});

describe("private pages", () => {
  it("noindex is emitted and no canonical without a path", () => {
    const h = seo("Messages", "x", { noindex: true, origin: O });
    expect(h.meta).toContainEqual({ name: "robots", content: "noindex" });
    expect(h.links).toEqual([]);
  });
});
