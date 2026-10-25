import { describe, expect, it } from "vitest";
import { parseThemePref, resolveTheme } from "@/lib/theme";

describe("theme preference", () => {
  it("system follows the device setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("an explicit choice overrides the device", () => expect(resolveTheme("light", true)).toBe("light"));
  it("unknown stored values fall back to system", () => expect(parseThemePref("purple")).toBe("system"));
});
