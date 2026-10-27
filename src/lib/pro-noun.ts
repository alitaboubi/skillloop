import type { Lang } from "@/lib/i18n";

/**
 * The UI word for a provider (approved 2026-10-27): "pro" in French and English; in Arabic صنايعي for trade
 * categories and محترف otherwise. Use it wherever copy names a provider in a category context.
 */
const TRADES = new Set(["home", "automotive"]);

export function proNoun(lang: Lang, category?: string | null): string {
  if (lang !== "ar") return "pro";
  return category && TRADES.has(category) ? "صنايعي" : "محترف";
}
