import type { CategoryId } from "./data";
import type { Lang, TKey } from "./i18n";

/**
 * Guided requests (Phase 2): up to four questions per category, offered as chips in the request box. A chip only adds
 * an editable line ("Niveau : ") to the client's own text — the pro still receives exactly the reviewed message.
 * Health requests ask for the reason without medical details.
 */
export const REQUEST_GUIDES: Record<CategoryId, TKey[]> = {
  tech: ["gq_problem", "gq_device", "gq_deadline", "gq_budget"],
  design: ["gq_deliverable", "gq_examples", "gq_deadline", "gq_budget"],
  tutoring: ["gq_subject", "gq_level", "gq_frequency", "gq_format"],
  home: ["gq_problem", "gq_appliance", "gq_access", "gq_when"],
  care: ["gq_for_whom", "gq_when", "gq_frequency", "gq_where"],
  healthcare: ["gq_reason", "gq_when", "gq_where", "gq_format"],
  engineering: ["gq_need", "gq_size", "gq_where", "gq_deadline"],
  automotive: ["gq_vehicle", "gq_problem", "gq_where", "gq_when"],
  business: ["gq_need", "gq_deliverable", "gq_deadline", "gq_budget"],
  events: ["gq_event_date", "gq_people", "gq_where", "gq_budget"],
  personal: ["gq_need", "gq_for_whom", "gq_when", "gq_where"],
  student: ["gq_subject", "gq_level", "gq_deadline", "gq_format"],
  other: ["gq_need", "gq_where", "gq_when", "gq_budget"],
};

export function requestGuide(category: string): TKey[] {
  return REQUEST_GUIDES[category as CategoryId] ?? REQUEST_GUIDES.other;
}

/** The line a chip adds: the question label followed by a colon (French typography keeps the space before it). */
export function guideLine(label: string, lang: Lang): string {
  return lang === "fr" ? `${label} :` : `${label}:`;
}
