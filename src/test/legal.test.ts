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

  it("privacy policy asks for the operator, both contact emails, retention, minimum age and the INPDP status", () => {
    const fr = text("privacy", "fr");
    for (const k of ["entité légale", "email de contact confidentialité", "email du support", "durée de conservation", "âge minimum", "INPDP"])
      expect(fr).toMatch(new RegExp(`\\[PLACEHOLDER:[^\\]]*${k}`));
  });

  it("states the account-deletion facts the app implements", () => {
    const en = text("privacy", "en");
    expect(en).toMatch(/Deleted: your sign-in account and email/);
    expect(en).toMatch(/Kept: requests and messages/);
  });

  it("drafts stay out of search until filled in", () => {
    expect(hasPlaceholders("privacy")).toBe(true);
    expect(hasPlaceholders("terms")).toBe(true);
    expect(LEGAL_PATHS).toEqual([]);
  });

  it("splits placeholders for highlighting", () => {
    expect(splitPlaceholders("Contact: [PLACEHOLDER: email]. Thanks")).toEqual([
      { text: "Contact: ", placeholder: false },
      { text: "[PLACEHOLDER: email]", placeholder: true },
      { text: ". Thanks", placeholder: false },
    ]);
  });
});
