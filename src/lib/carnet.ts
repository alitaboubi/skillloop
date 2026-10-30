import type { TKey } from "./i18n";

/**
 * The pro's "carnet" (Phase 2): "Ma méthode" (up to 3 short steps written by the pro) and "Mes engagements"
 * (picked from a fixed list, shown as declared). Stored in profiles.professional_details (method, commitments,
 * warranty_days) — no schema change; the column is already size-capped (8 KB).
 */
export const METHOD_STEPS = 3;
export const METHOD_STEP_MAX = 160;
export const WARRANTY_MAX_DAYS = 365;

export const COMMITMENTS = ["quote_first", "clean_after", "on_time", "receipt", "materials", "warranty"] as const;
export type Commitment = (typeof COMMITMENTS)[number];
export const COMMITMENT_KEYS: Record<Commitment, TKey> = {
  quote_first: "cm_quote_first",
  clean_after: "cm_clean_after",
  on_time: "cm_on_time",
  receipt: "cm_receipt",
  materials: "cm_materials",
  warranty: "cm_warranty",
};

export type Carnet = { method: string[]; commitments: Commitment[]; warrantyDays: number | null };

const isCommitment = (v: unknown): v is Commitment => typeof v === "string" && (COMMITMENTS as readonly string[]).includes(v);

/** Reads the carnet from stored details, dropping anything malformed (old or hand-edited data never breaks the page). */
export function readCarnet(details: unknown): Carnet {
  const pd = (details && typeof details === "object" ? details : {}) as Record<string, unknown>;
  const method = Array.isArray(pd["method"])
    ? (pd["method"] as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, METHOD_STEP_MAX)).filter(Boolean).slice(0, METHOD_STEPS)
    : [];
  const days = pd["warranty_days"];
  const warrantyDays = typeof days === "number" && Number.isInteger(days) && days >= 1 && days <= WARRANTY_MAX_DAYS ? days : null;
  const picked = Array.isArray(pd["commitments"]) ? (pd["commitments"] as unknown[]).filter(isCommitment) : [];
  // A warranty without a duration says nothing: it is only shown with its number of days.
  const commitments = COMMITMENTS.filter((c) => picked.includes(c) && (c !== "warranty" || warrantyDays !== null));
  return { method, commitments, warrantyDays: commitments.includes("warranty") ? warrantyDays : null };
}

export const hasCarnet = (c: Carnet) => c.method.length > 0 || c.commitments.length > 0;

export type CarnetDraft = { method: string[]; commitments: Commitment[]; warrantyDays: string };

/** Field errors (i18n keys). Steps are optional; a ticked warranty needs 1–365 days. */
export function validateCarnet(d: CarnetDraft): Partial<Record<"method" | "warranty", { key: "err_long" | "cm_err_days"; n?: number }>> {
  const e: ReturnType<typeof validateCarnet> = {};
  if (d.method.some((s) => s.trim().length > METHOD_STEP_MAX)) e.method = { key: "err_long", n: METHOD_STEP_MAX };
  if (d.commitments.includes("warranty")) {
    const n = Number(d.warrantyDays.trim());
    if (!Number.isInteger(n) || n < 1 || n > WARRANTY_MAX_DAYS) e.warranty = { key: "cm_err_days", n: WARRANTY_MAX_DAYS };
  }
  return e;
}

/** Merges a (validated) draft into the stored details; other keys (accepting, languages…) are kept. Empty parts are removed. */
export function writeCarnet(details: unknown, d: CarnetDraft): Record<string, unknown> {
  const next = { ...((details && typeof details === "object" ? details : {}) as Record<string, unknown>) };
  const method = d.method.map((s) => s.trim()).filter(Boolean).slice(0, METHOD_STEPS);
  const commitments = COMMITMENTS.filter((c) => d.commitments.includes(c));
  delete next["method"]; delete next["commitments"]; delete next["warranty_days"];
  if (method.length) next["method"] = method;
  if (commitments.length) next["commitments"] = commitments;
  if (commitments.includes("warranty")) next["warranty_days"] = Number(d.warrantyDays.trim());
  return next;
}

/**
 * Carnet themes (SkillLoop Pro): a cover and accent for the public page, stored as professional_details.carnet_theme.
 * No theme = the standard SkillLoop look. The database refuses a new theme without Pro ("plan_required:themes"), and the
 * public page applies it only while the pro has Pro (the stored choice is kept for a renewal). Styles: .ctheme-* in
 * src/styles.css.
 */
export const CARNET_THEMES = ["sea", "clay", "olive", "night"] as const;
export type CarnetTheme = (typeof CARNET_THEMES)[number];
export const THEME_KEYS: Record<CarnetTheme, TKey> = { sea: "ct_sea", clay: "ct_clay", olive: "ct_olive", night: "ct_night" };

export function readTheme(details: unknown): CarnetTheme | null {
  const v = ((details && typeof details === "object" ? details : {}) as Record<string, unknown>)["carnet_theme"];
  return (CARNET_THEMES as readonly unknown[]).includes(v) ? (v as CarnetTheme) : null;
}

/** Sets or clears the theme; other keys are kept. */
export function writeTheme(details: unknown, theme: CarnetTheme | null): Record<string, unknown> {
  const next = { ...((details && typeof details === "object" ? details : {}) as Record<string, unknown>) };
  if (theme) next["carnet_theme"] = theme; else delete next["carnet_theme"];
  return next;
}
