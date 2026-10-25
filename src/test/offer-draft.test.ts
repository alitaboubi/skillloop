import { beforeEach, describe, expect, it } from "vitest";
import { WIZARD_DRAFT_TTL, clearOfferDraft, clearWizardDraft, draftFromText, postAuthPath, readOfferDraft, readWizardDraft, saveOfferDraft, saveWizardDraft } from "@/lib/offer-draft";

describe("homepage → offer draft", () => {
  beforeEach(() => sessionStorage.clear());
  it("keeps the full paragraph as description, not as title", () => {
    const text = "Je propose des cours particuliers de mathématiques et de physique pour lycéens à Sfax, en ligne le soir et le week-end.";
    const d = draftFromText(text);
    expect(d.description).toBe(text);
    expect(d.title.length).toBeLessThanOrEqual(80);
  });
  it("a short description becomes only the title", () => {
    expect(draftFromText("Petits travaux de plomberie")).toEqual({ title: "Petits travaux de plomberie", description: "" });
  });
  it("after sign-in, returns to the offer form while a draft is pending", () => {
    expect(postAuthPath()).toBe("/dashboard");
    saveOfferDraft({ title: "Plomberie", description: "" });
    expect(postAuthPath()).toBe("/offer");
    expect(readOfferDraft()?.title).toBe("Plomberie");
    clearOfferDraft();
    expect(postAuthPath()).toBe("/dashboard");
  });
});

describe("wizard draft", () => {
  beforeEach(() => sessionStorage.clear());
  it("restores the form and step for the same account", () => {
    saveWizardDraft("u1", { title: "Cours" }, 2, 1000);
    expect(readWizardDraft("u1", 2000)).toEqual({ form: { title: "Cours" }, step: 2 });
  });
  it("never hands one account's draft to another and discards it", () => {
    saveWizardDraft("u1", { title: "Cours" }, 1, 1000);
    expect(readWizardDraft("u2", 2000)).toBeNull();
    expect(readWizardDraft("u1", 2000)).toBeNull();
  });
  it("expires after 24 hours", () => {
    saveWizardDraft("u1", { title: "Cours" }, 0, 0);
    expect(readWizardDraft("u1", WIZARD_DRAFT_TTL + 1)).toBeNull();
  });
  it("can be cleared", () => {
    saveWizardDraft("u1", { title: "Cours" }, 0);
    clearWizardDraft();
    expect(readWizardDraft("u1")).toBeNull();
  });
});
