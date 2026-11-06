// The eight services published on SkillLoop (live listing, read 2026-11-06). The first four pros agreed to be featured on
// 2026-11-05; the four who joined on 2026-11-05 (Malek, Dalel, Maram, Info Design) were added at Ali's request.
// Covers: the first four are brand illustrations; the new four get a brand cover built in code (`BrandCover`), because
// their uploaded photos show clients' business cards with phone numbers. Info Design's avatar is its own logo.
export type PriceKind = "fixed" | "from" | "hourly" | "quote";
export type Pro = {
  id: string; name: string; title: string; city: string; kind: PriceKind; price?: number;
  cover?: string; av?: string; initial: string; cat: string; icon: string;
};

export const PROS: Pro[] = [
  { id: "logo", name: "Br9 Team", title: "Logo & identité visuelle", city: "Tunis", kind: "fixed", price: 150, cover: "logo", av: "logo-av", initial: "B", cat: "Design & Média", icon: "palette" },
  { id: "web", name: "Feres Hasni", title: "Sites web vitrines & landing pages", city: "Tunis", kind: "from", price: 500, cover: "web", av: "web-av", initial: "F", cat: "Tech & IT", icon: "laptop" },
  { id: "infod", name: "Info Design", title: "Conception graphique · logo, affiche, flyers, cartes de visite", city: "Monastir", kind: "quote", av: "infod-av", initial: "I", cat: "Design & Média", icon: "palette" },
  { id: "ui", name: "aziz kouki", title: "UI/UX · Applications mobiles & web", city: "Sousse", kind: "from", price: 200, cover: "ui", av: "ui-av", initial: "A", cat: "Design & Média", icon: "grid" },
  { id: "malek", name: "Malek Mathlothi", title: "Service entreprises", city: "Tunis", kind: "fixed", price: 1000, initial: "M", cat: "Services aux entreprises", icon: "briefcase" },
  { id: "dalel", name: "Dalel Mainsi", title: "Conception de toute une charte graphique", city: "Monastir", kind: "hourly", price: 25, initial: "D", cat: "Design & Média", icon: "pen" },
  { id: "cm", name: "Ahmed", title: "Community manager · Instagram, Facebook & TikTok", city: "Tunis", kind: "from", price: 450, cover: "cm", initial: "A", cat: "Services aux entreprises", icon: "message" },
  { id: "maram", name: "Abassi Maram", title: "Développeur web", city: "Monastir", kind: "quote", initial: "A", cat: "Tech & IT", icon: "code" },
];

/** Label above the price, as on the service card (src/lib/i18n.tsx: pm_fixed, price_from, per_hour, pm_quote). */
export const priceHead = (p: Pro) => ({ fixed: "Prix fixe", from: "À partir de", hourly: "Par heure", quote: "Prix" })[p.kind];
export const priceShort = (p: Pro) => (p.kind === "quote" ? "Sur devis" : `${p.price} DT${p.kind === "hourly" ? " / h" : ""}`);

/** Example request typed in the request card (not a real conversation). */
export const REQUEST = "Un logo pour ma boutique de vêtements à Sousse.";
