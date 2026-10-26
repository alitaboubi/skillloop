/** First ~160 characters of the provider's own description, cut at a word (never translated). */
export function peek(text: string, max = 160): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}
