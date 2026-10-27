import type { CategoryId } from "./data";
import { normalizeText } from "./explore-filters";

/**
 * "Recherche en vrai tunisien" (Phase 2): words people really type — French, Tunisian Arabic in Arabic script and
 * franco-arabe — mapped to a category, so "klimatiseur", "بلومبي" or "9raya" find the right services even when the
 * pro wrote something else. Curated by hand; extend from real zero-result searches. Matching is per word and
 * accent/diacritic-insensitive (normalizeText); short words must match exactly, longer ones also as a prefix.
 */
const RAW: Record<CategoryId, string[]> = {
  home: [
    "plombier", "plomberie", "fuite", "electricien", "electricite", "clim", "climatisation", "climatiseur", "klimatiseur",
    "peintre", "peinture", "menuisier", "menuiserie", "carrelage", "carreleur", "maçon", "maconnerie", "serrurier",
    "chauffe", "bricolage", "jardinier", "nettoyage", "menage",
    "blombi", "trisian", "sabbagh", "najjar", "klimatizor",
    "بلومبي", "سباك", "تريسيان", "كهربائي", "كليماتيزور", "مكيف", "صباغ", "نجار", "بناي", "دهين", "تنظيف",
  ],
  tutoring: [
    "cours", "prof", "professeur", "soutien", "particulier", "bac", "maths", "physique", "anglais", "francais", "etude",
    "lakour", "9raya", "takwiya",
    "قراية", "دروس", "تقوية", "استاذ", "باك", "رياضيات",
  ],
  automotive: [
    "mecanicien", "mecanique", "garage", "voiture", "auto", "vidange", "carrosserie", "pneu", "depannage",
    "karhba", "mekanisian", "karossri",
    "كرهبة", "ميكانيسيان", "ميكانيك", "كاروسري", "فيدانج",
  ],
  design: ["logo", "graphiste", "graphisme", "affiche", "flyer", "identite", "illustration", "design", "ديزاين", "لوغو"],
  tech: [
    "informatique", "ordinateur", "pc", "laptop", "site", "web", "application", "appli", "developpeur", "reseau", "wifi", "imprimante",
    "ordi", "pisi",
    "حاسوب", "بيسي", "موقع", "برمجة", "انترنت",
  ],
  events: ["mariage", "fete", "photographe", "dj", "traiteur", "animation", "decoration", "3ors", "عرس", "حفلة", "فوتوغراف", "تصوير"],
  care: ["garde", "nounou", "babysitting", "babysitter", "domicile", "agee", "عناية", "جليسة", "مربية"],
  healthcare: ["infirmier", "infirmiere", "kine", "kinesitherapeute", "soins", "fermlia", "فرملية", "ممرض", "كينيه"],
  personal: ["coiffure", "coiffeur", "maquillage", "esthetique", "beaute", "coach", "sport", "hajjem", "حجام", "ماكياج", "حلاق", "تجميل"],
  business: ["comptable", "comptabilite", "fiscal", "juridique", "marketing", "traduction", "traducteur", "محاسب", "ترجمة"],
  engineering: ["architecte", "plan", "ingenieur", "etude", "topographe", "chantier", "مهندس", "معماري", "مثال"],
  student: ["memoire", "pfe", "rapport", "stage", "presentation", "مذكرة", "تقرير"],
  other: [],
};

// Built on first use (keeps module order free of cycles with explore-filters).
let terms: [string, CategoryId][] | null = null;
const allTerms = () =>
  (terms ??= Object.entries(RAW).flatMap(([cat, words]) => words.map((w) => [normalizeText(w), cat as CategoryId] as [string, CategoryId])));

/** Categories a single typed word points to (empty when none). */
export function synonymCategories(word: string): CategoryId[] {
  const w = normalizeText(word).trim();
  if (w.length < 2) return [];
  const out = new Set<CategoryId>();
  for (const [term, cat] of allTerms()) {
    if (w === term || (term.length >= 4 && w.length >= 4 && (w.startsWith(term) || term.startsWith(w)))) out.add(cat);
  }
  return [...out];
}
