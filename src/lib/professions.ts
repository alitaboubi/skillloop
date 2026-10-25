import type { CategoryId } from "./data";
import type { TKey } from "./i18n";
import { z } from "zod";

export const REQUEST_FIELDS = ["scope", "level", "stack", "event", "schedule", "area", "urgency", "duration"] as const;
export type RequestField = typeof REQUEST_FIELDS[number];
export const REQUEST_LABELS: Record<RequestField, TKey> = { scope: "rf_scope", level: "rf_level", stack: "rf_stack", event: "rf_event", schedule: "rf_schedule", area: "rf_area", urgency: "rf_urgency", duration: "rf_duration" };
export const PROFESSION_FIELDS: Partial<Record<CategoryId, RequestField[]>> = {
  healthcare: ["schedule"], engineering: ["scope", "schedule"], home: ["scope", "area", "urgency"],
  tech: ["scope", "stack", "schedule"], tutoring: ["level", "schedule", "duration"], design: ["scope", "schedule"],
  events: ["event", "schedule", "area", "duration"], automotive: ["scope", "schedule"], care: ["scope", "schedule"],
  business: ["scope", "schedule"], personal: ["scope", "area", "schedule"], student: ["scope", "schedule"], other: ["scope", "schedule"],
};
export function requestFields(category: string, configured?: unknown): RequestField[] {
  if (category === "healthcare") return ["schedule"];
  if (Array.isArray(configured)) return configured.filter((x): x is RequestField => REQUEST_FIELDS.includes(x)).slice(0, 8);
  return PROFESSION_FIELDS[category as CategoryId] ?? ["scope", "schedule"];
}

export const CONTACT_KINDS = ["facebook", "instagram", "linkedin", "website", "whatsapp", "phone"] as const;
export type ContactKind = typeof CONTACT_KINDS[number];
export function normalizePhone(value: string): string | null {
  const cleaned = value.replace(/[\s().-]/g, "").replace(/^00/, "+");
  if (/^\d{8}$/.test(cleaned)) return `+216${cleaned}`;
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}
export function contactUrl(kind: string, value: string): string | null {
  if (!value.trim()) return null;
  if (kind === "phone" || kind === "whatsapp") {
    const phone = normalizePhone(value);
    return phone ? kind === "phone" ? `tel:${phone}` : `https://wa.me/${phone.slice(1)}` : null;
  }
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    const hosts: Record<string, string> = { facebook: "facebook.com", instagram: "instagram.com", linkedin: "linkedin.com" };
    const host = hosts[kind];
    if (host && u.hostname !== host && !u.hostname.endsWith(`.${host}`)) return null;
    return u.href;
  } catch { return null; }
}
export const aiDraftSchema = z.object({
  title: z.string(), description: z.string(), category: z.string(), subcategory: z.string(), city: z.string(),
  remote: z.boolean(), price_model: z.enum(["fixed", "from", "hourly", "quote"]), price: z.number().nullable(),
  price_source: z.enum(["provider", "estimate", "quote"]), price_reason: z.string(), duration: z.string(),
  deliverables: z.string(), packages: z.string(), tags: z.string(), booking: z.enum(["quote", "appointment", "project"]),
  availability: z.string(), skills: z.string(), radius: z.number().nullable(), image_suggestion: z.string(),
  client_fields: z.array(z.enum(REQUEST_FIELDS)), questions: z.array(z.string()),
}).strict();
export type AiDraft = z.infer<typeof aiDraftSchema>;
export function safeAiDraft(draft: AiDraft): AiDraft {
  return { ...draft, price: draft.price !== null && Number.isFinite(draft.price) && draft.price > 0 ? draft.price : null,
    client_fields: requestFields(draft.category, draft.client_fields), questions: draft.questions.slice(0, 3),
    title: draft.title.slice(0, 120), description: draft.description.slice(0, 4000) };
}