import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  let depth = 0, i = css.indexOf("{", start);
  const from = i;
  for (; i < css.length; i++) { if (css[i] === "{") depth++; else if (css[i] === "}" && --depth === 0) break; }
  return css.slice(from, i);
};
const names = (b: string) => new Set([...b.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1] ?? ""));

describe("theme tokens (AGENTS.md: every :root token also exists in .dark)", () => {
  const root = names(block(":root"));
  const dark = names(block(".dark"));
  // Theme-independent tokens (layout and motion) are defined once.
  const shared = /^--(radius|duration-|ease-)/;
  it("every colour/surface token has a dark value", () => {
    const missing = [...root].filter((n) => !shared.test(n) && !dark.has(n));
    expect(missing).toEqual([]);
  });
  it("the Mapped loop palette exists in both themes", () => {
    for (const n of ["--ink", "--sea", "--sea-soft", "--clay", "--clay-strong", "--clay-soft", "--warning", "--surface-sunken", "--gradient-ink", "--shadow-raised"]) {
      expect(root.has(n), n).toBe(true);
      expect(dark.has(n), n).toBe(true);
    }
  });
});
