import { publicSupabase } from "@/integrations/supabase/client";
import { hasPlaceholders } from "@/lib/legal";
import { PRO_PLAN_ENABLED } from "@/lib/plan";

/**
 * robots.txt and sitemap.xml (served by src/routes/robots[.]txt.ts and sitemap[.]xml.ts).
 * Private pages are kept out of search with a `noindex` meta tag, NOT a robots.txt Disallow: a disallowed page is never
 * fetched, so its noindex would never be seen and the bare URL could still be listed.
 * The sitemap lists only public pages: static pages, published non-archived services, and the profiles of their providers
 * (profiles without a published service are noindex, see profileSeo).
 */
export const STATIC_PATHS: readonly string[] = ["/", "/explore", "/how-it-works", "/professionals", "/about", ...(PRO_PLAN_ENABLED ? ["/pricing"] : [])];
/** Privacy and terms join the sitemap once their [PLACEHOLDER] fields are filled in (until then they are noindex). */
export const LEGAL_PATHS: string[] = (["privacy", "terms"] as const).filter((k) => !hasPlaceholders(k)).map((k) => `/${k}`);

export function robotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapXml(origin: string, paths: string[]): string {
  const urls = paths.map((p) => `  <url><loc>${xmlEscape(origin + p)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

type Db = typeof publicSupabase;
const PAGE = 1000; // PostgREST's default max rows per request
const MAX = 45000; // one sitemap file holds at most 50,000 URLs

/** Public paths from the database, read without any session (same visibility as a logged-out visitor). */
export async function publicPaths(db: Db = publicSupabase): Promise<string[]> {
  const rows: { id: string; owner_id: string }[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await db.from("services").select("id, owner_id").eq("status", "published").eq("archived", false)
      .order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  const owners = [...new Set(rows.map((r) => r.owner_id))];
  return [...STATIC_PATHS, ...LEGAL_PATHS, ...rows.map((r) => `/services/${r.id}`), ...owners.map((id) => `/pros/${id}`)];
}
