import { describe, expect, it } from "vitest";
import { savedLangChange } from "@/lib/i18n";

describe("savedLangChange: saving the profile switches the site language only when that field changed", () => {
  it("unchanged preference (e.g. browsing in Arabic, preference still fr) → keep the current language", () => {
    expect(savedLangChange("fr", "fr")).toBeNull();
  });
  it("changed preference → switch to it", () => {
    expect(savedLangChange("fr", "ar")).toBe("ar");
    expect(savedLangChange("ar", "en")).toBe("en");
  });
  it("an unknown value never switches", () => {
    expect(savedLangChange("fr", "de")).toBeNull();
  });
});
