import type { TKey } from "./i18n";

/**
 * Avis clients (migration 20261105120000_reviews.sql, PREPARED, NOT APPLIED; needs 20261101120000_request_progress.sql).
 * Off: the reviews table, the acceptance time and the review functions are never read or written, and no stars show.
 * These rules mirror the database guard (private.guard_review) so the UI only offers what the database will accept;
 * the database stays the gate.
 */
export const REVIEWS_ENABLED = import.meta.env["VITE_REVIEWS"] === "on";

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const COMMENT_MAX = 1000;
/** A rating of 1–2 needs this many characters of explanation (trimmed). */
export const LOW_RATING_COMMENT_MIN = 20;
export const REPLY_MAX = 1000;
export const REPORT_MIN = 5;
export const REPORT_MAX = 500;
const DAY = 24 * 60 * 60 * 1000;
export const NO_APPOINTMENT_WAIT_DAYS = 7;
export const AFTER_APPOINTMENT_WAIT_DAYS = 1;
export const EDIT_WINDOW_DAYS = 14;

export type ReviewableRequest = {
  status: string;
  accepted_at?: string | null | undefined;
  scheduled_for?: string | null | undefined;
  completed_at?: string | null | undefined;
};

export type Eligibility =
  | { kind: "eligible" }
  | { kind: "not_accepted" }
  | { kind: "wait"; until: Date | null }; // null: no known time yet (accepted, no acceptance time recorded)

/**
 * Can the client review this request now? Accepted, and the job is over: the pro marked it done, or one day after the
 * agreed appointment, or 7 days after acceptance when no appointment was set (a pro can't block a review).
 */
export function reviewEligibility(r: ReviewableRequest, now: Date = new Date()): Eligibility {
  if (r.status !== "accepted") return { kind: "not_accepted" };
  if (r.completed_at) return { kind: "eligible" };
  const opensAt = r.scheduled_for
    ? new Date(new Date(r.scheduled_for).getTime() + AFTER_APPOINTMENT_WAIT_DAYS * DAY)
    : r.accepted_at
      ? new Date(new Date(r.accepted_at).getTime() + NO_APPOINTMENT_WAIT_DAYS * DAY)
      : null;
  if (!opensAt) return { kind: "wait", until: null };
  return opensAt.getTime() <= now.getTime() ? { kind: "eligible" } : { kind: "wait", until: opensAt };
}

export type ReviewDraft = { rating: number | null; comment: string };
export type ReviewError = { field: "rating" | "comment"; key: TKey; n?: number };

/** Same limits as the table: 1–5 stars; comment ≤ 1000; a 1–2 star rating explained in ≥ 20 characters. */
export function validateReview(d: ReviewDraft): ReviewError | null {
  if (d.rating === null || !Number.isInteger(d.rating) || d.rating < RATING_MIN || d.rating > RATING_MAX) {
    return { field: "rating", key: "rv_err_rating" };
  }
  const c = d.comment.trim();
  if (c.length > COMMENT_MAX) return { field: "comment", key: "rv_err_long", n: COMMENT_MAX };
  if (d.rating <= 2 && c.length < LOW_RATING_COMMENT_MIN) return { field: "comment", key: "rv_err_low_explain", n: LOW_RATING_COMMENT_MIN };
  return null;
}

export type OwnReview = { created_at: string; reply?: string | null | undefined };

/** The client may edit for 14 days, and only until the pro replied. */
export function canEditReview(r: OwnReview, now: Date = new Date()): boolean {
  if (r.reply) return false;
  return now.getTime() - new Date(r.created_at).getTime() <= EDIT_WINDOW_DAYS * DAY;
}

/** The pro writes one reply, once. */
export function canReply(r: { reply?: string | null | undefined }): boolean {
  return !r.reply;
}

export type ReviewSummary = { review_count: number; rating_avg: number | string | null };

/**
 * What a card or profile may show. Nothing at all without reviews — never "0 avis" or empty stars, and never an average
 * that wasn't computed by the database.
 */
export function summaryDisplay(s: ReviewSummary | null | undefined): { avg: number; count: number } | null {
  if (!s || !s.review_count || s.rating_avg === null || s.rating_avg === undefined) return null;
  const avg = Number(s.rating_avg);
  if (!Number.isFinite(avg)) return null;
  return { avg: Math.round(avg * 10) / 10, count: s.review_count };
}

/** Database refusals → the message to show (null: unknown error, use the generic one). */
export function reviewErrorKey(message: string | undefined | null): TKey | null {
  if (!message) return null;
  if (message.includes("job not finished yet")) return "rv_err_too_early";
  if (message.includes("edit window closed")) return "rv_err_edit_closed";
  if (message.includes("the pro already replied")) return "rv_err_replied";
  if (message.includes("review_limit")) return "rv_err_limit";
  if (message.includes("reviews_request_id_key") || message.includes("duplicate key")) return "rv_err_exists";
  if (message.includes("reviews_low_rating_explained")) return "rv_err_low_explain";
  return null;
}

/** Same as the database's private.review_author: "Amira Ben Salah" → "Amira S." (what the public sees). */
export function reviewAuthor(name: string | null | undefined): string | null {
  const n = (name ?? "").trim().replace(/\s+/g, " ");
  if (!n) return null;
  const parts = n.split(" ");
  if (parts.length === 1) return n;
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

/** One decimal in the interface language ("4,7" / "4.7"; ar-TN keeps Latin digits, like prices). */
export function formatRating(avg: number, lang: string): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-TN" : lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(avg);
}

export function reviewCountKey(lang: string, n: number): "rv_count_one" | "rv_count_other" {
  return new Intl.PluralRules(lang).select(n) === "one" ? "rv_count_one" : "rv_count_other";
}
