import { describe, expect, it } from "vitest";
import { homeLd, ldScript, profileLd, serviceLd } from "@/lib/structured-data";
import { profileSeo, serviceSeo } from "@/lib/seo";

const O = "https://skillloop.example";
const svc = { id: "s1", title: "Cours de maths", description: "Soutien lycée.", category: "tutoring" as const, city: "Sousse", remote: false,
  price: 30, quoteOnly: false, priceMissing: false, provider: "Amel", ownerId: "u1" };

describe("service JSON-LD", () => {
  const [service, crumbs] = serviceLd(svc, O) as [Record<string, unknown>, Record<string, unknown>];

  it("describes only what the page shows: name, description, category, city, provider, price in TND", () => {
    expect(service).toMatchObject({
      "@type": "Service", name: "Cours de maths", description: "Soutien lycée.", url: `${O}/services/s1`, serviceType: "Cours particuliers",
      areaServed: { "@type": "City", name: "Sousse" }, provider: { "@type": "Person", name: "Amel", url: `${O}/pros/u1` },
      offers: { "@type": "Offer", price: 30, priceCurrency: "TND" },
    });
  });

  it("never claims ratings, reviews or images", () => {
    const json = JSON.stringify(serviceLd(svc, O));
    expect(json).not.toMatch(/aggregateRating|review|ratingValue|"image"/i);
  });

  it("no offer for quote-only or missing prices (never a 0 price)", () => {
    expect(serviceLd({ ...svc, quoteOnly: true }, O)[0]).not.toHaveProperty("offers");
    expect(serviceLd({ ...svc, priceMissing: true, price: 0 }, O)[0]).not.toHaveProperty("offers");
  });

  it("breadcrumbs follow the page: Accueil → Explorer → service", () => {
    expect((crumbs["itemListElement"] as { name: string; item: string }[]).map((x) => [x.name, x.item]))
      .toEqual([["Accueil", `${O}/`], ["Explorer les services", `${O}/explore`], ["Cours de maths", `${O}/services/s1`]]);
  });
});

describe("profile and home JSON-LD", () => {
  it("ProfilePage with the provider's own name, title and bio", () => {
    expect(profileLd({ id: "u1", display_name: "Amel", title: "Prof", bio: "Bio.", created_at: "2026-01-01T00:00:00Z" }, O)).toMatchObject({
      "@type": "ProfilePage", url: `${O}/pros/u1`, mainEntity: { "@type": "Person", name: "Amel", jobTitle: "Prof", description: "Bio." },
    });
  });

  it("no structured data on a noindex profile", () => {
    const h = profileSeo({ id: "u1", display_name: "Amel", serviceIds: [], portfolio: [] }, O);
    expect(h.scripts).toEqual([]);
    expect(profileSeo({ id: "u1", display_name: "Amel", serviceIds: ["s1"], portfolio: [] }, O).scripts).toHaveLength(1);
  });

  it("home: WebSite + Organization", () => {
    expect(homeLd(O).map((x) => x["@type"])).toEqual(["WebSite", "Organization"]);
  });
});

describe("script safety", () => {
  it("user text cannot close the script tag", () => {
    const s = serviceSeo({ ...svc, title: "</script><script>alert(1)</script>" }, O).scripts[0]!;
    expect(s.type).toBe("application/ld+json");
    expect(s.children).not.toContain("</script>");
    expect(JSON.parse(s.children)[0].name).toBe("</script><script>alert(1)</script>");
    expect(ldScript({ a: "<b>" }).children).toBe('{"a":"\\u003cb>"}');
  });
});
