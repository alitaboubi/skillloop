/** SkillLoop's own public accounts (footer, menu, home video section, Organization structured data). */
export const SOCIAL_LINKS = [
  { kind: "instagram", url: "https://www.instagram.com/skillloop_tunisia", handle: "@skillloop_tunisia" },
  { kind: "facebook", url: "https://www.facebook.com/p/SkillLoop-Tunisia-61595942581358/", handle: "SkillLoop Tunisia" },
] as const;

export type SocialKind = (typeof SOCIAL_LINKS)[number]["kind"];

/** The presentation reel (marketing/reel-ep4), re-encoded 720×1280 for the web; served from public/ (CSP media-src 'self'). */
export const REEL_SRC = "/media/skillloop-reel.mp4";
export const REEL_SECONDS = 23;

/** « La vitrine » ad (marketing/reel-ep7, 16:9 cut), re-encoded 1280×720 for the web; plays muted in the home showcase. */
export const VITRINE_SRC = "/media/skillloop-vitrine.mp4";
