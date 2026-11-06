import { describe, expect, it } from "vitest";
import { LEGAL, hasPlaceholders, splitPlaceholders } from "@/lib/legal";
import { LEGAL_PATHS } from "@/lib/sitemap";

const text = (kind: "privacy" | "terms", lang: "fr" | "en" | "ar") => {
  const d = LEGAL[kind][lang];
  return [d.intro, ...d.sections.flatMap((s) => [s.h, ...s.body.flat()])].join("\n");
};

describe("privacy policy and terms", () => {
  it.each(["privacy", "terms"] as const)("%s has the same sections in fr, en and ar", (kind) => {
    const ids = (l: "fr" | "en" | "ar") => LEGAL[kind][l].sections.map((s) => s.id);
    expect(ids("en")).toEqual(ids("fr"));
    expect(ids("ar")).toEqual(ids("fr"));
  });

  it.each(["fr", "en", "ar"] as const)("every language has the same number of placeholders (%s)", (lang) => {
    const n = (k: "privacy" | "terms", l: "fr" | "en" | "ar") => (text(k, l).match(/\[PLACEHOLDER:/g) ?? []).length;
    expect(n("privacy", lang)).toBe(n("privacy", "fr"));
    expect(n("terms", lang)).toBe(n("terms", "fr"));
  });

  it.each(["fr", "en", "ar"] as const)("names the operator, the contact email, the minimum age and the INPDP complaint route (%s)", (lang) => {
    for (const kind of ["privacy", "terms"] as const) {
      const all = text(kind, lang);
      expect(all).toMatch(/Ali Taboubi/);
      expect(all).toMatch(/contact@skillloop\.tn/);
      expect(all).toMatch(/18/);
    }
    expect(text("privacy", lang)).toMatch(/INPDP/);
  });

  it("states the account-deletion facts the app implements", () => {
    const en = text("privacy", "en");
    expect(en).toMatch(/Deleted: your sign-in account and email/);
    expect(en).toMatch(/Kept: requests and messages/);
  });

  it("filled-in documents are indexed and listed in the sitemap", () => {
    expect(hasPlaceholders("privacy")).toBe(false);
    expect(hasPlaceholders("terms")).toBe(false);
    expect(LEGAL_PATHS).toEqual(["/privacy", "/terms"]);
  });

  it("splits placeholders for highlighting", () => {
    expect(splitPlaceholders("Contact: [PLACEHOLDER: email]. Thanks")).toEqual([
      { text: "Contact: ", placeholder: false },
      { text: "[PLACEHOLDER: email]", placeholder: true },
      { text: ". Thanks", placeholder: false },
    ]);
  });
});
