import { CATEGORIES } from "@/lib/data";
import { AVATAR_PRESETS, coverGroups, coversOf } from "@/lib/presets";

describe("ready-made covers and avatars", () => {
  it("has three covers for every category", () => {
    for (const c of CATEGORIES) expect(coversOf(c.id)).toHaveLength(3);
  });
  it("lists the service's own category first, then every other one once", () => {
    const groups = coverGroups("events");
    expect(groups[0]!.category).toBe("events");
    expect(groups.map((g) => g.category).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
  });
  it("falls back to the usual order without a category", () => {
    expect(coverGroups("").map((g) => g.category)).toEqual(CATEGORIES.map((c) => c.id));
  });
  it("offers avatars", () => {
    expect(AVATAR_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(AVATAR_PRESETS.map((a) => a.src)).size).toBe(AVATAR_PRESETS.length);
  });
});
