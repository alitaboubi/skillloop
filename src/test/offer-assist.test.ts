import { describe, expect, it, vi } from "vitest";
import { applySuggestion, briefProblem, createCooldown, demoAdapter, generateOfferAssistance, notConnectedAdapter, resolveAdapter, serverAdapter, type OfferAssistanceInput } from "@/lib/ai/offer-assist";

const input: OfferAssistanceInput = { field: "description", mode: "write", current: "", brief: "Je répare les fuites à Sousse.", lang: "fr", tone: "clear", context: { title: "Plomberie", category: "Maison" } };

describe("offer assistance service", () => {
  it("is not connected yet: honest 'unavailable', no text", async () => {
    expect(await generateOfferAssistance(input, notConnectedAdapter)).toEqual({ status: "unavailable" });
  });
  it("uses the server route adapter outside the explicit dev demo", () => expect(resolveAdapter()).toBe(serverAdapter));
  it("rejects a brief that is too short before calling the adapter", async () => {
    const adapter = vi.fn(notConnectedAdapter);
    expect(await generateOfferAssistance({ ...input, brief: "fuite" }, adapter)).toEqual({ status: "error", reason: "invalid_input" });
    expect(adapter).not.toHaveBeenCalled();
  });
  it("needs existing text to improve", async () => {
    expect(await generateOfferAssistance({ ...input, mode: "improve", current: " " }, notConnectedAdapter)).toEqual({ status: "error", reason: "invalid_input" });
  });
  it("normalises adapter failures and empty answers", async () => {
    expect(await generateOfferAssistance(input, async () => { throw new Error("network"); })).toEqual({ status: "error", reason: "failed" });
    expect(await generateOfferAssistance(input, async () => ({ status: "success", text: "   " }))).toEqual({ status: "error", reason: "failed" });
    expect(await generateOfferAssistance(input, async () => ({ status: "error", reason: "rate_limited" }))).toEqual({ status: "error", reason: "rate_limited" });
  });
  it("the demo adapter only echoes the provider's own words and is flagged", async () => {
    expect(await demoAdapter({ ...input, field: "deliverables", brief: "Diagnostic, Réparation; Nettoyage" })).toEqual({ status: "success", text: "Diagnostic\nRéparation\nNettoyage", demo: true });
  });
  it("brief rules: titles and improvements may skip the brief; everything has a maximum", () => {
    expect(briefProblem("title", "write", "")).toBeNull();
    expect(briefProblem("description", "improve", "")).toBeNull();
    expect(briefProblem("description", "write", "court")).toBe("short");
    expect(briefProblem("description", "write", "x".repeat(501))).toBe("long");
  });
});

describe("applying a suggestion", () => {
  it("fills an empty field", () => expect(applySuggestion("", " Texte ", "use", 100)).toEqual({ ok: true, value: "Texte" }));
  it("never replaces existing text without confirmation", () => {
    expect(applySuggestion("Mon texte", "Nouveau", "replace", 100)).toEqual({ ok: false, reason: "needs_confirm" });
    expect(applySuggestion("Mon texte", "Nouveau", "use", 100)).toEqual({ ok: false, reason: "needs_confirm" });
    expect(applySuggestion("Mon texte", "Nouveau", "replace", 100, "\n\n", true)).toEqual({ ok: true, value: "Nouveau" });
  });
  it("appends after existing text with the field's separator", () => {
    expect(applySuggestion("Diagnostic", "Devis", "append", 100, "\n")).toEqual({ ok: true, value: "Diagnostic\nDevis" });
  });
  it("refuses anything that would exceed the field limit instead of cutting it", () => {
    expect(applySuggestion("", "x".repeat(11), "use", 10)).toEqual({ ok: false, reason: "too_long", length: 11 });
    expect(applySuggestion("12345", "67890", "append", 10)).toEqual({ ok: false, reason: "too_long", length: 12 });
  });
  it("ignores an empty suggestion", () => expect(applySuggestion("a", "  ", "append", 10)).toEqual({ ok: false, reason: "empty" }));
});

describe("client cooldown", () => {
  it("blocks requests closer than the interval", () => {
    const c = createCooldown(4000);
    expect(c.tryStart(0)).toBe(true);
    expect(c.tryStart(1000)).toBe(false);
    expect(c.remaining(1000)).toBe(3000);
    expect(c.tryStart(4000)).toBe(true);
  });
});
