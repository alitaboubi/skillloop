import { describe, expect, it } from "vitest";
import { CONTACT_KINDS, contactHref, contactLabel, contactOps, isPublicContactValid, normalizeContact, type ContactDraft, type ContactKind } from "@/lib/profile-contacts";

const empty = () => Object.fromEntries(CONTACT_KINDS.map((k) => [k, { value: "", isPublic: false }])) as Record<ContactKind, ContactDraft>;

describe("contact validation", () => {
  it("accepts local and international phone numbers and tidies spacing", () => {
    expect(normalizeContact("phone", " 22  123 456 ")).toEqual({ value: "22 123 456" });
    expect(normalizeContact("whatsapp", "+216 22-123-456")).toEqual({ value: "+216 22-123-456" });
    expect(normalizeContact("phone", "12345")).toEqual({ error: "err_contact_phone" });
    expect(normalizeContact("phone", "call me")).toEqual({ error: "err_contact_phone" });
  });
  it("adds https, upgrades http and rejects malformed links", () => {
    expect(normalizeContact("website", "monsite.tn")).toEqual({ value: "https://monsite.tn/" });
    expect(normalizeContact("website", "http://monsite.tn/a")).toEqual({ value: "https://monsite.tn/a" });
    expect(normalizeContact("website", "not a link")).toEqual({ error: "err_link" });
  });
  it("keeps social links on their own platform", () => {
    expect(normalizeContact("instagram", "instagram.com/amel")).toEqual({ value: "https://instagram.com/amel" });
    expect(normalizeContact("facebook", "https://m.facebook.com/page")).toEqual({ value: "https://m.facebook.com/page" });
    expect(normalizeContact("linkedin", "https://evil.example/linkedin.com")).toEqual({ error: "err_link_host" });
    expect(normalizeContact("instagram", "https://instagram.com.evil.tn/x")).toEqual({ error: "err_link_host" });
  });
  it("treats empty input as no contact", () => expect(normalizeContact("website", "   ")).toEqual({ value: "" }));
});

describe("public contact rendering", () => {
  it("only renders known kinds with safe values", () => {
    expect(isPublicContactValid("website", "https://monsite.tn/")).toBe(true);
    expect(isPublicContactValid("website", "javascript:alert(1)")).toBe(false);
    expect(isPublicContactValid("website", "monsite.tn")).toBe(false); // legacy value without https
    expect(isPublicContactValid("email", "a@b.tn")).toBe(false);
    expect(isPublicContactValid("instagram", "https://example.com/x")).toBe(false);
  });
  it("builds tel and wa.me links (8-digit local numbers get +216)", () => {
    expect(contactHref("phone", "+216 22 123 456")).toBe("tel:+21622123456");
    expect(contactHref("whatsapp", "22 123 456")).toBe("https://wa.me/21622123456");
    expect(contactHref("whatsapp", "+33 6 12 34 56 78")).toBe("https://wa.me/33612345678");
    expect(contactLabel("website", "https://www.monsite.tn/")).toBe("monsite.tn");
  });
});

describe("contact write plan", () => {
  const saved = [{ id: "p", kind: "phone", value: "22 123 456", is_public: false }, { id: "w", kind: "website", value: "https://a.tn/", is_public: true }];
  it("inserts new, updates changed, deletes cleared and leaves the rest", () => {
    const d = empty();
    d.phone = { value: "22 123 456", isPublic: true };
    d.instagram = { value: "https://instagram.com/amel", isPublic: true };
    expect(contactOps(saved, d)).toEqual([
      { op: "update", id: "p", value: "22 123 456", is_public: true },
      { op: "delete", id: "w" },
      { op: "insert", kind: "instagram", value: "https://instagram.com/amel", is_public: true },
    ]);
  });
  it("writes nothing when nothing changed", () => {
    const d = empty();
    d.phone = { value: "22 123 456", isPublic: false };
    d.website = { value: "https://a.tn/", isPublic: true };
    expect(contactOps(saved, d)).toEqual([]);
  });
});
