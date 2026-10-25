import { describe, expect, it } from "vitest";
import { changedGroups, emptyOffer, firstInvalidStep, offerToRow, parsePrice, rowToOfferForm, validateOffer, type ServiceRow } from "@/lib/offer-wizard";

const ok = { ...emptyOffer("Cours de maths"), category: "tutoring", description: "Cours particuliers pour lycéens, tous niveaux.", price: "30", city: "Sfax" };

describe("offer wizard validation", () => {
  it("validates cumulatively, one step at a time", () => {
    const blank = emptyOffer();
    expect(Object.keys(validateOffer(blank, 0))).toEqual(["title", "category", "description"]);
    expect(validateOffer({ ...ok, price: "" }, 0)).toEqual({});
    expect(validateOffer({ ...ok, price: "" }, 1).price).toEqual({ key: "err_price" });
    expect(validateOffer({ ...ok, city: "" }, 1)).toEqual({});
    expect(validateOffer({ ...ok, city: "" }, 2).city).toEqual({ key: "err_required" });
    expect(validateOffer(ok, 2)).toEqual({});
  });
  it("mirrors the publish guard: healthcare needs the regulated acknowledgement", () => {
    expect(validateOffer({ ...ok, category: "healthcare" }, 0).regulatedAck).toEqual({ key: "err_regulated" });
    expect(validateOffer({ ...ok, category: "healthcare", regulatedAck: true }, 0)).toEqual({});
  });
  it("quote pricing needs no amount", () => expect(validateOffer({ ...ok, priceModel: "quote", price: "" }, 2)).toEqual({}));
  it("bounds lengths", () => {
    expect(validateOffer({ ...ok, title: "x".repeat(121) }, 0).title).toEqual({ key: "err_long", n: 120 });
    expect(validateOffer({ ...ok, duration: "x".repeat(81) }, 1).duration).toEqual({ key: "err_long", n: 80 });
  });
  it("sends the user back to the earliest step with an error", () => {
    expect(firstInvalidStep(validateOffer({ ...ok, city: "", price: "0" }, 2))).toBe(1);
    expect(firstInvalidStep({})).toBe(-1);
  });
});

describe("prices", () => {
  it("accepts commas and thousands spaces", () => {
    expect(parsePrice("45,5")).toBe(45.5);
    expect(parsePrice("1 200")).toBe(1200);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

const row: ServiceRow = {
  id: "s1", owner_id: "u1", title: "Plomberie", description: "Réparation de fuites et installations.", category: "healthcare",
  price_model: "hourly", price: 40, city: "Tunis", remote: false, status: "published", archived: false, image_url: "u1/a.png",
  details: { duration: "1 h", packages: "Basique\nPremium", regulated_ack: true },
};

describe("editing an existing service", () => {
  it("loads every editable field from the stored row", () => {
    expect(rowToOfferForm(row)).toEqual({
      title: "Plomberie", category: "healthcare", description: "Réparation de fuites et installations.", priceModel: "hourly", price: "40",
      duration: "1 h", deliverables: "", mode: "inperson", city: "Tunis", regulatedAck: true,
    });
  });
  it("saves back without dropping detail keys the wizard doesn't edit", () => {
    const out = offerToRow({ ...rowToOfferForm(row), duration: "", deliverables: "Diagnostic\nDevis", price: "42,5" }, row.details);
    expect(out).toMatchObject({ price_model: "hourly", price: 42.5, remote: false });
    expect(out.details).toEqual({ packages: "Basique\nPremium", deliverables: "Diagnostic\nDevis", regulated_ack: true });
  });
  it("drops the health acknowledgement when the category changes, and stores no amount for quotes", () => {
    const out = offerToRow({ ...rowToOfferForm(row), category: "home", priceModel: "quote" }, row.details);
    expect(out.details).not.toHaveProperty("regulated_ack");
    expect(out.price).toBeNull();
  });
  it("marks only the review groups that changed", () => {
    const before = rowToOfferForm(row);
    expect([...changedGroups(before, { ...before }, false)]).toEqual([]);
    expect([...changedGroups(before, { ...before, price: "40,0", city: "Sfax" }, true)]).toEqual(["place", "photo"]);
  });
});
