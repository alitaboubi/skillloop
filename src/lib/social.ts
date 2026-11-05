/** SkillLoop's own public accounts (footer, menu, home video section, Organization structured data). */
export const SOCIAL_LINKS = [
  { kind: "instagram", url: "https://www.instagram.com/skillloop_tunisia", handle: "@skillloop_tunisia" },
  { kind: "facebook", url: "https://www.facebook.com/p/SkillLoop-Tunisia-61595942581358/", handle: "SkillLoop Tunisia" },
] as const;

export type SocialKind = (typeof SOCIAL_LINKS)[number]["kind"];

/** The presentation reel (marketing/reel-ep4), re-encoded 720×1280 for the web; served from public/ (CSP media-src 'self'). */
export const REEL_SRC = "/media/skillloop-reel.mp4";
export const REEL_SECONDS = 23;
