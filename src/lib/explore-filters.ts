import { CATEGORIES, CITIES, type Service } from "./data";

export type ExploreSearch = {
  q?: string | undefined;
  category?: string | undefined;
  city?: string | undefined;
  mode?: "remote" | "inperson" | undefined;
  sort?: "recent" | "price" | undefined;
};

/** Case-, accent- and Arabic-diacritic-insensitive form used for keyword matching. */
export function normalizeText(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** Every keyword must appear somewhere in the title, description, city or (translated) category label. */
export function matchesQuery(x: Service, q: string, categoryLabel?: (id: string) => string): boolean {
  const words = normalizeText(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalizeText([x.title, x.description, x.city, categoryLabel?.(x.category) ?? ""].join(" "));
  return words.every((w) => hay.includes(w));
}

export function filterServices(list: Service[], s: ExploreSearch, categoryLabel?: (id: string) => string): Service[] {
  const q = s.q ?? "";
  return list
    .filter(
      (x) =>
        matchesQuery(x, q, categoryLabel) &&
        (!s.category || x.category === s.category) &&
        (!s.city || x.city === s.city || (x.remote && s.mode !== "inperson")) &&
        (!s.mode || (s.mode === "remote" ? x.remote : !x.remote)),
    )
    .sort((a, b) => {
      if (s.sort !== "price") return a.publishedDaysAgo - b.publishedDaysAgo;
      // Quote-only services have no comparable amount: always list them last.
      const qa = a.quoteOnly ? 1 : 0, qb = b.quoteOnly ? 1 : 0;
      return qa - qb || a.price - b.price;
    });
}

/** Filters that can be removed as chips (sort is not a filter). */
export function activeFilters(s: ExploreSearch): { key: "q" | "category" | "city" | "mode"; value: string }[] {
  const out: { key: "q" | "category" | "city" | "mode"; value: string }[] = [];
  if (s.q) out.push({ key: "q", value: s.q });
  if (s.category) out.push({ key: "category", value: s.category });
  if (s.city) out.push({ key: "city", value: s.city });
  if (s.mode) out.push({ key: "mode", value: s.mode });
  return out;
}

/** Drops unknown categories/cities (stale or hand-edited links) and trims the keyword, so the URL never filters on values the UI cannot show. */
export function cleanExploreSearch(s: ExploreSearch): ExploreSearch {
  const q = s.q?.trim().slice(0, 120);
  return {
    ...s,
    q: q || undefined,
    category: CATEGORIES.some((c) => c.id === s.category) ? s.category : undefined,
    city: (CITIES as readonly string[]).includes(s.city ?? "") ? s.city : undefined,
  };
}

export type FacetCounts = { category: Record<string, number>; city: Record<string, number>; mode: { remote: number; inperson: number } };

/**
 * How many results each option would give, with every *other* active filter applied
 * (the number a user really gets by choosing it). Uses filterServices, so the city/remote rule matches the results.
 */
export function facetCounts(list: Service[], s: ExploreSearch, categoryLabel?: (id: string) => string): FacetCounts {
  const count = (patch: Partial<ExploreSearch>) => filterServices(list, { ...s, ...patch, sort: undefined }, categoryLabel).length;
  const category: Record<string, number> = {};
  for (const c of CATEGORIES) category[c.id] = count({ category: c.id });
  const city: Record<string, number> = {};
  for (const c of CITIES) city[c] = count({ city: c });
  return { category, city, mode: { remote: count({ mode: "remote" }), inperson: count({ mode: "inperson" }) } };
}

/** "New" only from the real publication date: published within the last 7 days. */
export const NEW_DAYS = 7;
export const isNew = (x: Pick<Service, "publishedDaysAgo">) => x.publishedDaysAgo >= 0 && x.publishedDaysAgo < NEW_DAYS;
