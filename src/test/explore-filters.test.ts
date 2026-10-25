import { describe, expect, it } from "vitest";
import { activeFilters, cleanExploreSearch, facetCounts, filterServices, isNew, matchesQuery } from "@/lib/explore-filters";
import type { Service } from "@/lib/data";

const svc = (p: Partial<Service>): Service => ({
  id: "x", title: "T", description: "", category: "tech", price: 0, unit: "pm_fixed", city: "Tunis",
  remote: false, image: "", provider: "", delivery: "", languages: "", publishedDaysAgo: 0, ...p,
});

describe("explore filters", () => {
  const list = [svc({ id: "a", city: "Sousse", remote: true, price: 50 }), svc({ id: "b", city: "Tunis", price: 20, publishedDaysAgo: 3 })];
  it("filters by city", () => expect(filterServices(list, { city: "Sousse" }).map((s) => s.id)).toEqual(["a"]));
  it("on-site mode excludes remote services", () => expect(filterServices(list, { mode: "inperson" }).map((s) => s.id)).toEqual(["b"]));
  it("sorts by price ascending", () => expect(filterServices(list, { sort: "price" }).map((s) => s.id)).toEqual(["b", "a"]));
  it("sort is not shown as a removable filter", () => expect(activeFilters({ sort: "price", city: "Sfax" })).toEqual([{ key: "city", value: "Sfax" }]));
  it("quote-only services sort after priced ones", () => {
    const l = [svc({ id: "q", quoteOnly: true, price: 0 }), svc({ id: "p", price: 90 })];
    expect(filterServices(l, { sort: "price" }).map((x) => x.id)).toEqual(["p", "q"]);
  });
  it("remote services stay visible for any city unless on-site is chosen", () => {
    const l = [svc({ id: "r", city: "Sousse", remote: true }), svc({ id: "o", city: "Sousse" })];
    expect(filterServices(l, { city: "Tunis" }).map((x) => x.id)).toEqual(["r"]);
    expect(filterServices(l, { city: "Tunis", mode: "inperson" })).toEqual([]);
  });
  it("matches keywords regardless of accents, case and word order", () => {
    const x = svc({ title: "Électricien à domicile", description: "Dépannage rapide" });
    expect(matchesQuery(x, "electricien")).toBe(true);
    expect(matchesQuery(x, "DOMICILE électricien")).toBe(true);
    expect(matchesQuery(x, "electricien plomberie")).toBe(false);
  });
  it("matches the city and the translated category label", () => {
    const x = svc({ title: "Leçons", category: "tutoring", city: "Sfax" });
    expect(matchesQuery(x, "cours sfax", (id) => (id === "tutoring" ? "Cours particuliers" : id))).toBe(true);
  });
  it("ignores Arabic diacritics and alef variants", () => {
    expect(matchesQuery(svc({ title: "دروس إنجليزية" }), "انجليزيه")).toBe(true);
  });
  it("drops unknown categories and cities from the URL and trims the keyword", () => {
    expect(cleanExploreSearch({ q: "  plombier ", category: "nope", city: "Paris", sort: "price" })).toEqual({ q: "plombier", category: undefined, city: undefined, sort: "price" });
    expect(cleanExploreSearch({ category: "tutoring", city: "Sfax" })).toMatchObject({ category: "tutoring", city: "Sfax" });
  });
  it("facet counts apply every other active filter and match the results", () => {
    const l = [
      svc({ id: "1", category: "home", city: "Sousse" }),
      svc({ id: "2", category: "home", city: "Tunis" }),
      svc({ id: "3", category: "tech", city: "Sfax", remote: true }),
    ];
    const f = facetCounts(l, { category: "home" });
    expect(f.city["Sousse"]).toBe(1);
    expect(f.city["Sfax"]).toBe(0); // the only Sfax service is tech, not home
    expect(f.category["home"]).toBe(2);
    expect(f.category["tech"]).toBe(1); // other categories ignore the current category choice
    expect(f.mode).toEqual({ remote: 0, inperson: 2 });
    // remote services count for any city unless on-site is chosen, exactly like the results
    expect(facetCounts(l, {}).city["Tunis"]).toBe(filterServices(l, { city: "Tunis" }).length);
  });
  it("marks services published in the last 7 days as new", () => {
    expect(isNew({ publishedDaysAgo: 0 })).toBe(true);
    expect(isNew({ publishedDaysAgo: 6 })).toBe(true);
    expect(isNew({ publishedDaysAgo: 7 })).toBe(false);
  });
});
