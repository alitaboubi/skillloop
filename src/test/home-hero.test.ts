import { describe, expect, it } from "vitest";
import { suggestTitle } from "@/components/home-hero";

describe("provider description → starting title", () => {
  it("keeps a short description as-is", () => {
    expect(suggestTitle("Cours de physique")).toBe("Cours de physique");
  });
  it("never turns a long description into a title longer than 80 characters", () => {
    const long = "Je propose des cours particuliers de mathématiques et de physique pour collégiens et lycéens à Sfax et en ligne le soir";
    const out = suggestTitle(long);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(long.startsWith(out)).toBe(true);
  });
  it("uses only the first sentence", () => {
    expect(suggestTitle("Plomberie. J'interviens à Tunis.")).toBe("Plomberie");
  });
});
