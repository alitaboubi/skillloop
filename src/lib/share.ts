/** Share helpers: public links for services and profiles, and a WhatsApp share link. No tracking parameters. */
export function absoluteUrl(path: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** wa.me with no number opens WhatsApp's contact picker with the text prefilled. */
export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`.trim())}`;
}

export const servicePath = (id: string) => `/services/${id}`;
export const profilePath = (id: string) => `/pros/${id}`;
