import type { TKey } from "./i18n";

/** Offer wizard rules shared by create and edit. Mirrors the database publish guard so errors surface per field. */
export const OFFER_STEPS = ["basics", "pricing", "place", "review"] as const;
export type PriceModel = "fixed" | "from" | "hourly" | "quote";

export type OfferForm = {
  title: string;
  category: string;
  description: string;
  priceModel?: PriceModel | string;
  price: string;
  duration?: string;
  deliverables?: string;
  mode: string; // "inperson" | "remote"
  city: string;
  regulatedAck?: boolean;
};

export type OfferField = keyof OfferForm;
export type OfferErrors = Partial<Record<OfferField, { key: TKey; n?: number }>>;

export const LIMITS = { title: 120, description: 4000, duration: 80, deliverables: 1000 } as const;

export const emptyOffer = (title = ""): OfferForm => ({
  title, category: "", description: "", priceModel: "fixed", price: "", duration: "", deliverables: "", mode: "inperson", city: "", regulatedAck: false,
});

/** Accepts "50", "50.5", "50,5" and "1 200"; returns null when it is not a usable amount. */
export function parsePrice(v: string): number | null {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : null;
}

/** Which fields each step owns; validation is cumulative up to the given step. */
const STEP_FIELDS: OfferField[][] = [
  ["title", "category", "regulatedAck", "description"],
  ["price", "duration", "deliverables"],
  ["city"],
  [],
];
export const stepOf = (field: OfferField) => STEP_FIELDS.findIndex((fs) => fs.includes(field));

export function validateOffer(f: OfferForm, step: number): OfferErrors {
  const e: OfferErrors = {};
  if (step >= 0) {
    const title = f.title.trim();
    if (!title) e.title = { key: "err_required" };
    else if (title.length < 5) e.title = { key: "err_short", n: 5 };
    else if (title.length > LIMITS.title) e.title = { key: "err_long", n: LIMITS.title };
    if (!f.category) e.category = { key: "err_required" };
    if (f.category === "healthcare" && !f.regulatedAck) e.regulatedAck = { key: "err_regulated" };
    const d = f.description.trim();
    if (!d) e.description = { key: "err_required" };
    else if (d.length < 20) e.description = { key: "err_short", n: 20 };
    else if (d.length > LIMITS.description) e.description = { key: "err_long", n: LIMITS.description };
  }
  if (step >= 1) {
    const p = parsePrice(f.price);
    if (f.priceModel !== "quote" && (p === null || p <= 0)) e.price = { key: "err_price" };
    if ((f.duration ?? "").trim().length > LIMITS.duration) e.duration = { key: "err_long", n: LIMITS.duration };
    if ((f.deliverables ?? "").trim().length > LIMITS.deliverables) e.deliverables = { key: "err_long", n: LIMITS.deliverables };
  }
  if (step >= 2 && !f.city) e.city = { key: "err_required" };
  return e;
}

/** First step that still has an error — used to send the user back to the right place. */
export function firstInvalidStep(e: OfferErrors): number {
  const steps = (Object.keys(e) as OfferField[]).map(stepOf).filter((i) => i >= 0);
  return steps.length ? Math.min(...steps) : -1;
}

export type ServiceRow = {
  id: string; owner_id: string; title: string; description: string; category: string; price_model: string; price: number | null;
  city: string; remote: boolean; status: string; archived: boolean; image_url: string | null; details: unknown;
};

const asDetails = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function rowToOfferForm(r: ServiceRow): OfferForm {
  const d = asDetails(r.details);
  return {
    title: r.title, category: r.category, description: r.description,
    priceModel: r.price_model, price: r.price_model === "quote" || r.price == null ? "" : String(r.price),
    duration: str(d["duration"]), deliverables: str(d["deliverables"]),
    mode: r.remote ? "remote" : "inperson", city: r.city, regulatedAck: d["regulated_ack"] === true || d["regulated_ack"] === "true",
  };
}

/** Database fields for a form; existing `details` keys we don't edit (e.g. packages) are preserved. */
export function offerToRow(f: OfferForm, existingDetails?: unknown) {
  const details = { ...asDetails(existingDetails) };
  const set = (k: string, v: string) => { if (v.trim()) details[k] = v.trim(); else delete details[k]; };
  set("duration", f.duration ?? "");
  set("deliverables", f.deliverables ?? "");
  if (f.category === "healthcare" && f.regulatedAck) details["regulated_ack"] = true; else delete details["regulated_ack"];
  const quote = f.priceModel === "quote";
  return {
    title: f.title.trim(), description: f.description.trim(), category: f.category,
    price_model: f.priceModel ?? "fixed", price: quote ? null : parsePrice(f.price), city: f.city, remote: f.mode === "remote", details,
  };
}

/** Review groups that changed while editing, for "Changed" markers. */
export type ReviewGroup = "title" | "category" | "description" | "price" | "duration" | "deliverables" | "place" | "photo";
export function changedGroups(before: OfferForm, after: OfferForm, photoChanged: boolean): Set<ReviewGroup> {
  const c = new Set<ReviewGroup>();
  const tr = (v?: string) => (v ?? "").trim();
  if (tr(before.title) !== tr(after.title)) c.add("title");
  if (before.category !== after.category) c.add("category");
  if (tr(before.description) !== tr(after.description)) c.add("description");
  if (before.priceModel !== after.priceModel || (after.priceModel !== "quote" && parsePrice(before.price) !== parsePrice(after.price))) c.add("price");
  if (tr(before.duration) !== tr(after.duration)) c.add("duration");
  if (tr(before.deliverables) !== tr(after.deliverables)) c.add("deliverables");
  if (before.mode !== after.mode || before.city !== after.city) c.add("place");
  if (photoChanged) c.add("photo");
  return c;
}
