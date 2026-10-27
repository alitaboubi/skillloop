import { describe, expect, it } from "vitest";
import { readCarnet, validateCarnet, writeCarnet, hasCarnet } from "@/lib/carnet";
import { REQUEST_GUIDES, guideLine, requestGuide } from "@/lib/request-guides";
import { synonymCategories } from "@/lib/search-synonyms";
import { filterServices, groupByPro, newTalents } from "@/lib/explore-filters";
import { profileChecklist } from "@/lib/request-timeline";
import { CATEGORIES, type Service } from "@/lib/data";
import { dictionaries } from "@/lib/i18n";

const svc = (p: Partial<Service>): Service => ({
  id: "x", title: "T", description: "", category: "tech", price: 0, unit: "pm_fixed", city: "Tunis",
  remote: false, image: "", provider: "", delivery: "", languages: "", publishedDaysAgo: 0, ...p,
});

describe("carnet (method + commitments)", () => {
  it("reads only valid steps and known commitments", () => {
    const c = readCarnet({ method: [" Je passe voir ", "", 4, "Devis", "Travail", "Rangement"], commitments: ["clean_after", "bogus", "quote_first"] });
    expect(c).toEqual({ method: ["Je passe voir", "Devis", "Travail"], commitments: ["quote_first", "clean_after"], warrantyDays: null });
  });
  it("never shows a warranty without its number of days", () => {
    expect(readCarnet({ commitments: ["warranty"] }).commitments).toEqual([]);
    expect(readCarnet({ commitments: ["warranty"], warranty_days: 90 })).toMatchObject({ commitments: ["warranty"], warrantyDays: 90 });
    expect(readCarnet({ commitments: ["warranty"], warranty_days: 9999 }).commitments).toEqual([]);
  });
  it("validates the warranty length only when a warranty is ticked", () => {
    expect(validateCarnet({ method: [], commitments: ["warranty"], warrantyDays: "" }).warranty).toEqual({ key: "cm_err_days", n: 365 });
    expect(validateCarnet({ method: [], commitments: ["warranty"], warrantyDays: "30" })).toEqual({});
    expect(validateCarnet({ method: [], commitments: [], warrantyDays: "abc" })).toEqual({});
  });
  it("writes into the details without touching other settings, and removes emptied parts", () => {
    const next = writeCarnet({ accepting: true, method: ["old"], warranty_days: 10 }, { method: [" A ", "", "B"], commitments: ["on_time"], warrantyDays: "10" });
    expect(next).toEqual({ accepting: true, method: ["A", "B"], commitments: ["on_time"] });
    expect(writeCarnet(next, { method: ["", "", ""], commitments: [], warrantyDays: "" })).toEqual({ accepting: true });
  });
  it("counts in the profile checklist once something is filled", () => {
    const item = (pd: unknown) => profileChecklist({ publishedServices: 0, professional_details: pd }).find((x) => x.key === "db_check_carnet")?.done;
    expect(item({})).toBe(false);
    expect(item({ method: ["Je passe voir"] })).toBe(true);
    expect(hasCarnet(readCarnet({ commitments: ["receipt"] }))).toBe(true);
  });
});

describe("guided requests", () => {
  it("every category has 1–4 questions, all translated", () => {
    for (const c of CATEGORIES) {
      const qs = REQUEST_GUIDES[c.id];
      expect(qs.length, c.id).toBeGreaterThan(0);
      expect(qs.length, c.id).toBeLessThanOrEqual(4);
      for (const k of qs) for (const lang of ["fr", "en", "ar"] as const) expect(dictionaries[lang][k], `${lang}.${k}`).toBeTruthy();
    }
  });
  it("unknown categories fall back to the generic questions", () => expect(requestGuide("nope")).toEqual(REQUEST_GUIDES.other));
  it("health requests never ask for symptoms", () => expect(REQUEST_GUIDES.healthcare).toContain("gq_reason"));
  it("lines follow each language's colon typography", () => {
    expect(guideLine("Niveau", "fr")).toBe("Niveau :");
    expect(guideLine("Level", "en")).toBe("Level:");
  });
});

describe("Tunisian search words", () => {
  it("maps French, derja and franco-arabe words to categories", () => {
    expect(synonymCategories("Plombier")).toContain("home");
    expect(synonymCategories("klimatiseur")).toContain("home");
    expect(synonymCategories("بلومبي")).toContain("home");
    expect(synonymCategories("كرهبة")).toContain("automotive");
    expect(synonymCategories("9raya")).toContain("tutoring");
    expect(synonymCategories("électricité")).toContain("home");
  });
  it("short words match exactly only; unknown words map to nothing", () => {
    expect(synonymCategories("pc")).toContain("tech");
    expect(synonymCategories("p")).toEqual([]);
    expect(synonymCategories("zzzz")).toEqual([]);
  });
  it("finds a service whose text uses other words", () => {
    const list = [svc({ id: "h", category: "home", title: "Réparation de fuites" }), svc({ id: "t", category: "tutoring", title: "Maths" })];
    expect(filterServices(list, { q: "plombier" }).map((x) => x.id)).toEqual(["h"]);
    expect(filterServices(list, { q: "plombier Tunis" }).map((x) => x.id)).toEqual(["h"]);
    expect(filterServices(list, { q: "plombier Sfax" })).toEqual([]);
  });
});

describe("experts view", () => {
  const list = [
    svc({ id: "1", ownerId: "a", provider: "Amel", category: "home", city: "Sousse", publishedDaysAgo: 2, accepting: true }),
    svc({ id: "2", ownerId: "b", provider: "Karim", category: "tech", publishedDaysAgo: 90 }),
    svc({ id: "3", ownerId: "a", provider: "Amel", category: "design", city: "Tunis", publishedDaysAgo: 40 }),
    svc({ id: "4", provider: "No owner" }),
  ];
  it("groups services per pro in list order, with real counts", () => {
    const g = groupByPro(list);
    expect(g.map((p) => p.ownerId)).toEqual(["a", "b"]);
    expect(g[0]).toMatchObject({ services: 2, categories: ["home", "design"], cities: ["Sousse", "Tunis"], accepting: true, firstDaysAgo: 40 });
  });
  it("newcomers: first service within 30 days, never when everyone is new", () => {
    const withNew = [...list, svc({ id: "5", ownerId: "c", provider: "Sami", publishedDaysAgo: 5 })];
    expect(newTalents(withNew).map((p) => p.ownerId)).toEqual(["c"]);
    expect(newTalents([svc({ id: "5", ownerId: "c", publishedDaysAgo: 5 })])).toEqual([]);
  });
});
