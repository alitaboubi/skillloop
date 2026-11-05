# Avis clients — spec (2026-11-05, APPLIED AND VERIFIED 2026-11-05)

Goal: trust that is **earned, never bought**. Only a client who really worked with a pro can rate that work.
Migration: `supabase/migrations/20261105120000_reviews.sql` (needs `20261101120000_request_progress.sql` first).
App rules: `src/lib/reviews.ts` (tested, mirror the database). Flag: `VITE_REVIEWS=on` (after both migrations).

## Rules (enforced by the database)

| Rule | Value | Why |
|---|---|---|
| Who reviews | The **client** of the request, nobody else | No self-reviews, no outsiders |
| How many | **One per request** | One job = one opinion |
| When | Request **accepted**, and the job is over: pro marked « Terminée », **or** 1 day after the agreed appointment, **or** 7 days after acceptance if no appointment | A pro can't block a review by never marking the job done |
| Stars | 1–5, whole stars | Simple, comparable |
| Comment | Optional, ≤ 1000 characters. **1–2 stars need ≥ 20 characters** | A bad rating must be understandable — fair to the pro and useful to other clients |
| Editing | Client: **14 days**, and only **until the pro replies** | Room to correct, no changing after the pro answered |
| Pro's reply | **One** public reply, ≤ 1000 characters, written once | Right of reply |
| Report | Pro can report **once** (5–500 characters) → operator decides | A report hides nothing by itself |
| Moderation | Only the operator hides a review (`hidden_at`, SQL editor) | Pros never remove reviews |
| Delete | No delete through the app | Reviews can't be erased under pressure |
| Rate limit | 10 new reviews per client per 24 h | Spam brake |
| Account deletion | A deleted account's reviews (written or received) are removed | Personal data |
| Times | All stamped by the database | No backdating |

Side fixes in the same migration (needed by the "when" rule):
- `requests.created_at` is now **stamped by the database** on insert. Before, the app could send any date (a request could be backdated).
- New `requests.accepted_at`, stamped when the pro accepts. Already-accepted requests get their `created_at` (best known value).

## What the public sees
- Pro profile / service page / Explore card: **average + count** ("4,7 ★ · 12 avis") — **only when there is at least one review**. Never "0 avis" or empty stars.
- Review list: stars, comment, date, the service it was for, the pro's reply. Author = **first name + initial** ("Amira S."): never the full name, photo, id or contact.
- Hidden reviews and reports are never public. The two parties still see their own review (with a "masqué" note).
- **No ratings in Google structured data** (SEO rule: only what the page shows, never ratings/reviews).

## Screens (next step, behind VITE_REVIEWS)
1. **Client — conversation + dashboard**: when the job is over, a card « Comment s'est passé le travail avec {pro} ? » → 5 stars + comment (+ the 20-character rule shown live for 1–2 stars) → preview → publish. Before that: « Vous pourrez donner votre avis le {date} ».
2. **Pro — dashboard**: new reviews, « Répondre » (once, with a preview), « Signaler » (reason).
3. **Public** — /pros/$id: "Avis" section + summary in the identity card; /services/$id: summary near the provider line + the 3 latest; Explore cards: "4,7 ★ (12)".
4. **Proof level**: a pro with reviews could move from « Déclaré » to « Confirmé » — to decide later (separate change).

## Decisions to confirm (defaults chosen)
1. 7-day wait when the pro never marks the job done (could be 3 or 14).
2. 14-day edit window, closed by the pro's reply.
3. Low ratings (1–2) need a 20-character explanation.
4. Author shown as "Amira S.".
5. Reviews of a deleted account are removed (alternative: keep them, anonymised as "Client SkillLoop").

## Apply (same process as the earlier migrations)
1. Dry run: `node scripts/db-test.mjs --pending supabase/migrations/20261101120000_request_progress.sql --pending supabase/migrations/20261105120000_reviews.sql`
2. Your approval → apply both in the SQL Editor (request_progress first).
3. Verify: `supabase/checks/20261105120000_reviews_verify.sql` → expect `passed 10 | total 10 | failing none`.
4. Rollback if needed: `supabase/checks/20261105120000_reviews_rollback.sql` (turn the flag off first).

## Verified so far
- 34/34 pgTAP tests (`supabase/tests/database/reviews.test.sql`) on a local in-memory Postgres (PGlite) with Supabase stubs, after baseline → protect_request_history → limits → request_progress → reviews. Existing suites unchanged before/after (skillloop_rls 20, service_history 6, request_progress 14; limits same results — 5 fail with and without, local storage stub only).
- Verify script 10/10 locally, rollback drops everything, re-apply after rollback works; with account_deletion applied, deleting a client's account removes their review.
- **On your Supabase project (your run, 2026-11-05):** dry run passed; applied request_progress then reviews in the SQL Editor; verify 4/4 and 10/10; db-test passed on the applied schema. `VITE_REVIEWS` stays off until the screens are built and checked.
