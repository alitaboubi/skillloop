import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { validateOffer } from "@/routes/offer";

describe("translations", () => {
  it("every language has every key filled", () => {
    const keys = Object.keys(dictionaries.fr);
    for (const lang of ["en", "ar"] as const) {
      for (const k of keys) expect(dictionaries[lang][k as keyof typeof dictionaries.fr], `${lang}.${k}`).toBeTruthy();
    }
  });
  it("uses the required Tunisian Arabic wording", () => {
    expect(dictionaries.ar.request_quote).toBe("اطلب تقدير للسوم");
    expect(dictionaries.ar.request_sent).toBe("بعثنا طلبك، نستناو تأكيد مقدّم الخدمة.");
    expect(dictionaries.fr.request_sent).toBe("Demande envoyée — en attente de confirmation du professionnel.");
  });
});

describe("offer form", () => {
  const base = { title: "Cours de maths", category: "tutoring", description: "x".repeat(25), price: "30", city: "Tunis", mode: "inperson" };
  it("accepts a complete offer", () => expect(validateOffer(base, 1)).toEqual({}));
  it("rejects a zero price", () => expect(validateOffer({ ...base, price: "0" }, 1).price).toBeDefined());
  it("requires a title of at least 5 characters", () => expect(validateOffer({ ...base, title: "abc" }, 0).title?.n).toBe(5));
});
