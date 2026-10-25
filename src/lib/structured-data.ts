import { CATEGORIES, type Service } from "./data";
import { dictionaries } from "./i18n";

/**
 * JSON-LD (schema.org) built ONLY from what the page really shows. No ratings, reviews, availability or
 * guarantees (SkillLoop has none), no image (photo links are temporary signed URLs), and nothing without an
 * absolute site URL. Structured data never guarantees rich results, indexing or ranking.
 */
type Json = Record<string, unknown>;

/** A <script type="application/ld+json"> for route head(); `<` is escaped so user text can't close the script tag. */
export const ldScript = (data: Json | Json[]) => ({ type: "application/ld+json", children: JSON.stringify(data).replace(/</g, "\\u003c") });

const fr = dictionaries.fr;
const categoryLabel = (id: string) => {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? fr[c.key] : undefined;
};

export function homeLd(origin: string): Json[] {
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: "SkillLoop", url: `${origin}/`, inLanguage: "fr" },
    { "@context": "https://schema.org", "@type": "Organization", name: "SkillLoop", url: `${origin}/` },
  ];
}

type ServiceLd = Pick<Service, "id" | "title" | "description" | "category" | "city" | "remote" | "price" | "quoteOnly" | "priceMissing" | "provider" | "ownerId">;

export function serviceLd(s: ServiceLd, origin: string): Json[] {
  const url = `${origin}/services/${s.id}`;
  const provider = s.ownerId && s.provider && s.provider !== "—" ? { "@type": "Person", name: s.provider, url: `${origin}/pros/${s.ownerId}` } : undefined;
  const priced = !s.quoteOnly && !s.priceMissing && s.price > 0;
  const service: Json = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title,
    description: s.description,
    url,
    ...(categoryLabel(s.category) ? { serviceType: categoryLabel(s.category) } : {}),
    ...(s.city ? { areaServed: { "@type": "City", name: s.city } } : {}),
    ...(provider ? { provider } : {}),
    ...(priced ? { offers: { "@type": "Offer", price: s.price, priceCurrency: "TND", url } } : {}),
  };
  const crumbs: Json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: fr.home, item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: fr.explore_services, item: `${origin}/explore` },
      { "@type": "ListItem", position: 3, name: s.title, item: url },
    ],
  };
  return [service, crumbs];
}

type ProfileLd = { id: string; display_name: string; title?: string | null; bio?: string | null; created_at?: string | null };

export function profileLd(p: ProfileLd, origin: string): Json {
  const url = `${origin}/pros/${p.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    ...(p.created_at ? { dateCreated: p.created_at } : {}),
    mainEntity: {
      "@type": "Person",
      name: p.display_name.trim() || undefined,
      url,
      ...(p.title?.trim() ? { jobTitle: p.title.trim() } : {}),
      ...(p.bio?.trim() ? { description: p.bio.trim() } : {}),
    },
  };
}
