import { describe, expect, it } from "vitest";
import { canEditReview, canReply, reviewEligibility, reviewErrorKey, summaryDisplay, validateReview } from "@/lib/reviews";

const now = new Date("2026-11-05T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

describe("review eligibility (mirrors private.guard_review)", () => {
  it("needs an accepted request", () => {
    for (const status of ["pending", "declined", "cancelled"]) expect(reviewEligibility({ status, completed_at: daysAgo(1) }, now).kind).toBe("not_accepted");
  });
  it("opens as soon as the pro marked the job done", () => {
    expect(reviewEligibility({ status: "accepted", accepted_at: daysAgo(0), completed_at: daysAgo(0) }, now).kind).toBe("eligible");
  });
  it("without 'done' and without an appointment: 7 days after acceptance", () => {
    expect(reviewEligibility({ status: "accepted", accepted_at: daysAgo(6) }, now)).toEqual({ kind: "wait", until: new Date(inDays(1)) });
    expect(reviewEligibility({ status: "accepted", accepted_at: daysAgo(7) }, now).kind).toBe("eligible");
  });
  it("with an appointment: one day after it, even if accepted long ago", () => {
    expect(reviewEligibility({ status: "accepted", accepted_at: daysAgo(30), scheduled_for: inDays(3) }, now)).toEqual({ kind: "wait", until: new Date(inDays(4)) });
    expect(reviewEligibility({ status: "accepted", accepted_at: daysAgo(30), scheduled_for: daysAgo(1) }, now).kind).toBe("eligible");
  });
  it("accepted without any known time: waits (never guesses)", () => {
    expect(reviewEligibility({ status: "accepted" }, now)).toEqual({ kind: "wait", until: null });
  });
});

describe("review validation (mirrors the table checks)", () => {
  it("needs 1–5 whole stars", () => {
    expect(validateReview({ rating: null, comment: "" })?.key).toBe("rv_err_rating");
    expect(validateReview({ rating: 0, comment: "" })?.key).toBe("rv_err_rating");
    expect(validateReview({ rating: 6, comment: "" })?.key).toBe("rv_err_rating");
    expect(validateReview({ rating: 4.5, comment: "" })?.key).toBe("rv_err_rating");
    expect(validateReview({ rating: 5, comment: "" })).toBeNull();
  });
  it("a 1–2 star rating is explained in 20+ characters (trimmed)", () => {
    expect(validateReview({ rating: 2, comment: "   Pas venu.        " })).toEqual({ field: "comment", key: "rv_err_low_explain", n: 20 });
    expect(validateReview({ rating: 1, comment: "Le pro n'est jamais venu au rendez-vous." })).toBeNull();
    expect(validateReview({ rating: 3, comment: "" })).toBeNull();
  });
  it("comment ≤ 1000 characters", () => {
    expect(validateReview({ rating: 5, comment: "x".repeat(1001) })).toEqual({ field: "comment", key: "rv_err_long", n: 1000 });
  });
});

describe("editing and replying", () => {
  it("the client edits for 14 days, until the pro replies", () => {
    expect(canEditReview({ created_at: daysAgo(13) }, now)).toBe(true);
    expect(canEditReview({ created_at: daysAgo(15) }, now)).toBe(false);
    expect(canEditReview({ created_at: daysAgo(1), reply: "Merci !" }, now)).toBe(false);
  });
  it("the pro replies once", () => {
    expect(canReply({ reply: null })).toBe(true);
    expect(canReply({ reply: "Merci" })).toBe(false);
  });
});

describe("summary display", () => {
  it("shows nothing without reviews (no '0 avis', no empty stars)", () => {
    expect(summaryDisplay(null)).toBeNull();
    expect(summaryDisplay({ review_count: 0, rating_avg: null })).toBeNull();
  });
  it("uses the database average (numeric arrives as a string)", () => {
    expect(summaryDisplay({ review_count: 3, rating_avg: "4.7" })).toEqual({ avg: 4.7, count: 3 });
    expect(summaryDisplay({ review_count: 1, rating_avg: 5 })).toEqual({ avg: 5, count: 1 });
  });
});

describe("database refusals → messages", () => {
  it("maps each known refusal", () => {
    expect(reviewErrorKey("review_not_allowed: job not finished yet")).toBe("rv_err_too_early");
    expect(reviewErrorKey("review_not_allowed: edit window closed")).toBe("rv_err_edit_closed");
    expect(reviewErrorKey("review_not_allowed: the pro already replied")).toBe("rv_err_replied");
    expect(reviewErrorKey("review_limit: too many reviews today")).toBe("rv_err_limit");
    expect(reviewErrorKey('duplicate key value violates unique constraint "reviews_request_id_key"')).toBe("rv_err_exists");
    expect(reviewErrorKey('new row violates check constraint "reviews_low_rating_explained"')).toBe("rv_err_low_explain");
    expect(reviewErrorKey("something else")).toBeNull();
  });
});

describe("public author name (mirrors private.review_author)", () => {
  it("first name + initial of the last word", async () => {
    const { reviewAuthor } = await import("@/lib/reviews");
    expect(reviewAuthor("Amira Ben Salah")).toBe("Amira S.");
    expect(reviewAuthor("  sami   kaabi ")).toBe("sami K.");
    expect(reviewAuthor("Yasmine")).toBe("Yasmine");
    expect(reviewAuthor("")).toBeNull();
    expect(reviewAuthor(null)).toBeNull();
  });
  it("formats the average with one decimal in the interface language", async () => {
    const { formatRating } = await import("@/lib/reviews");
    expect(formatRating(4.7, "fr")).toBe("4,7");
    expect(formatRating(5, "en")).toBe("5.0");
  });
});
