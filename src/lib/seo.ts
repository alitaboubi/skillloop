import type { Service } from "./data";
import { homeLd, ldScript, profileLd, serviceLd } from "./structured-data";

/**
 * Public site origin for canonical URLs (VITE_SITE_URL, e.g. https://skillloop.tn). In dev it falls back to the
 * local server; a production build without it emits no canonical rather than a wrong one.
 */
export function siteUrl(raw: string | undefined = import.meta.env["VITE_SITE_URL"], dev = !!import.meta.env.DEV): string | null {
  const v = raw?.trim() || (dev ? "http://localhost:8080" : "");
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** Collapses whitespace and cuts at a word boundary, for meta descriptions. */
export function snippet(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

type LdBuilder = (origin: string) => Record<string, unknown> | Record<string, unknown>[];

export const seo = (title: string, description: string, opts: { path?: string; origin?: string | null; noindex?: boolean; type?: string; ld?: LdBuilder } = {}) => {
  const origin = opts.origin === undefined ? siteUrl() : opts.origin;
  const canonical = opts.path && origin ? `${origin}${opts.path}` : null;
  return {
    meta: [
      { title: `${title} | SkillLoop` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | SkillLoop` },
      { property: "og:description", content: description },
      { property: "og:type", content: opts.type ?? "website" },
      ...(opts.noindex ? [{ name: "robots", content: "noindex" }] : []),
      ...(canonical ? [{ property: "og:url", content: canonical }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    // Structured data only with an absolute site URL, and never on noindex pages.
    scripts: opts.ld && origin && !opts.noindex ? [ldScript(opts.ld(origin))] : [],
  };
};

/** Home page head, with WebSite/Organization structured data. */
export const homeSeo = (origin?: string | null) =>
  seo("Services locaux et à distance en Tunisie", "Réparations, cours, digital, auto, événements : trouvez un prestataire près de chez vous ou à distance, ou publiez votre service.", {
    path: "/", ld: homeLd, ...(origin === undefined ? {} : { origin }),
  });

/** Head for a public service page: built only from the published listing's own text. */
export function serviceSeo(s: Parameters<typeof serviceLd>[0] | undefined, origin?: string | null) {
  if (!s) return seo("Service", "Service proposé sur SkillLoop.", { origin: origin ?? null });
  return seo(s.title, snippet(s.description) || s.title, { path: `/services/${s.id}`, ld: (o) => serviceLd(s, o), ...(origin === undefined ? {} : { origin }) });
}

type ProfileHead = { id: string; display_name: string; title?: string | null; bio?: string | null; city?: string | null; area?: string | null; created_at?: string | null; serviceIds: string[]; portfolio: unknown[] };

/**
 * Head for a public provider profile, from the profile's own fields. A profile with no published service and no
 * portfolio (e.g. a client-only account) is a thin page about a private person: rendered, but noindex.
 */
export function profileSeo(p: ProfileHead | null | undefined, origin?: string | null) {
  if (!p) return seo("Profil professionnel", "Profil professionnel sur SkillLoop.", { origin: origin ?? null, type: "profile" });
  const name = p.display_name.trim() || "Profil";
  const place = [p.area, p.city].filter(Boolean).join(", ");
  const lead = [p.title, place].filter(Boolean).join(" · ");
  const description = snippet([lead, p.bio?.trim()].filter(Boolean).join(" — ")) || `${name} sur SkillLoop.`;
  return seo(p.title ? `${name} — ${p.title}` : name, description, {
    path: `/pros/${p.id}`, type: "profile", noindex: p.serviceIds.length === 0 && p.portfolio.length === 0, ld: (o) => profileLd(p, o),
    ...(origin === undefined ? {} : { origin }),
  });
}
