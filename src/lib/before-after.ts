/**
 * Before/after pairs on portfolio items (Phase 2). Stored in portfolio_items.before_image_url / before_consent_at
 * (migration 20261028120000_portfolio_before_after.sql — PREPARED, not applied). Off until that migration is applied:
 * VITE_BEFORE_AFTER=on (public build flag). While off, nothing reads or writes the new columns.
 */
export const BEFORE_AFTER_ENABLED = import.meta.env["VITE_BEFORE_AFTER"] === "on";
