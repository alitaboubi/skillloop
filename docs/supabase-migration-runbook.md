# SkillLoop → own Supabase project — runbook

Decisions (2026-10-24): fresh start (no users, no data), schema only, support chat off, region Paris,
remove both `@lovable.dev` packages, add the Supabase CLI as a dev tool, local only (no production domain yet).

**Never touched:** the Lovable project (`mowuufibfngoqzmslykh`). Rollback at any point = restore `.env.lovable`.
**Never in the repo or client code:** database password, service-role key, Google client secret, Turnstile secret.

Legend: 🧑 = you (account, dashboard, secrets) · 🤖 = Claude (code, after your approval) · ✅ = checkpoint.

---

## Phase 0 — Safety first (local only)

1. 🤖 Add to `.gitignore` (today `.env` is **not** ignored — it would be committed on `git init`):
   ```
   .env
   .env.*
   !.env.example
   supabase/.temp
   supabase/.branches
   ```
2. 🧑 Back up the working Lovable config: `cp .env .env.lovable` (ignored by the rule above).
3. ✅ `ls -a` shows `.env.lovable`; the app still runs on the Lovable backend.

## Phase 1 — Supabase CLI (approved dev tool)

1. 🤖 `bun add -d supabase` then `bunx supabase --version`.
2. 🤖 In `supabase/config.toml`, set `project_id = "skillloop"` (a local name only; the remote link is separate).
3. ✅ CLI prints a version; nothing remote has happened.

## Phase 2 — Prove the schema locally (Docker, no account needed)

Files for review: `supabase/migrations/20261024120000_skillloop_baseline.sql`, `supabase/tests/database/skillloop_rls.test.sql`.

1. 🧑 Start Docker Desktop (WSL integration enabled).
2. 🤖 `bunx supabase start` — local Postgres/Auth/Storage/Realtime in Docker.
3. 🤖 `bunx supabase db reset` — applies the migration to the **local** database only.
   ⚠️ Never run `db reset --linked`: that would wipe the remote project.
4. 🤖 `bunx supabase test db` — 20 access-rule checks (publish guard, healthcare ack, private columns hidden,
   no truncate, one first message per request, strangers see nothing, final status changes, not-accepting
   guard, own-folder uploads, server-only table).
5. ✅ All 20 pass. Any failure is fixed in the migration file and re-run here — still nothing remote.
6. 🤖 `bunx supabase stop` when done.

## Phase 3 — Create your project

1. 🧑 supabase.com → New project: **name `skillloop`**, **region West EU (Paris, eu-west-3)**, a strong database
   password stored in your password manager (not in the repo, not in `.env`).
2. 🧑 Note the **project ref** (Settings → General) and from Settings → API: the **Project URL** and the
   **publishable key** (`sb_publishable_…`). Do **not** copy the secret/service-role key anywhere.
3. ✅ Empty project exists.

## Phase 4 — Apply the schema to your project

1. 🧑 `bunx supabase login` (opens the browser; token stays in your user profile, not the repo).
2. 🧑 `bunx supabase link --project-ref <ref>` (asks for the database password; not written to the repo).
3. 🤖 `bunx supabase db push --dry-run` → you review the listed migration → 🧑 approve → 🤖 `bunx supabase db push`.
4. 🤖 `bunx supabase migration list` shows the baseline applied remotely.
5. 🧑 Dashboard checks: Table editor lists 7 tables with RLS enabled; Storage shows **service-images (private)**;
   Database → Publications → `supabase_realtime` includes `messages`.
6. ✅ Schema live on your project, still unused by the app.

## Phase 5 — Auth settings (local only for now)

1. 🧑 Authentication → URL Configuration:
   - **Site URL:** `http://localhost:8080`
   - **Redirect URLs:** `http://localhost:8080/**`
     (covers `/reset-password`, `/offer`, `/dashboard` and the return-to-page after Google sign-in)
2. 🧑 Authentication → Providers → Email: enabled, "Confirm email" on.
   Note: Supabase's built-in email sender is rate-limited (a few emails per hour) — fine for 2 test accounts;
   a real SMTP provider (Authentication → SMTP) is needed before real users.
3. 🧑 Google sign-in:
   - Google Cloud Console → APIs & Services → OAuth consent screen: External, app name "SkillLoop", your email;
     keep it in *Testing* and add your test Google accounts as test users.
   - Credentials → Create OAuth client ID → *Web application*:
     - Authorized JavaScript origins: `http://localhost:8080`
     - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`
   - Supabase → Authentication → Providers → Google: paste the **client ID** and **client secret**
     (the secret lives only there).
4. 🧑 Leave **Attack Protection → CAPTCHA off** for now (Phase 9).
5. ✅ Settings saved.

## Phase 6 — Point the app at your project

1. 🧑 Edit `.env` (values from Phase 3; names only shown here):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL`, `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
   | `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_ID` | `<ref>` |
   | `VITE_TURNSTILE_SITE_KEY` | unchanged |
   | `LOVABLE_*` (if present) | delete |

   No service-role key: no server code uses it today.
2. 🤖 `bunx supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts`.
3. ✅ Restart the dev server; `/explore` loads (empty catalogue).

## Phase 7 — Remove Lovable from the code (🤖, after approval of this runbook)

| Change | Detail |
|---|---|
| `vite.config.ts` | Own config with the already-installed plugins: TanStack Start (`server.entry = "server"`), React, Tailwind, tsconfig paths, Nitro (build); dev server on port 8080. No new packages. |
| Google sign-in | `auth-card.tsx`: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })` — redirect straight back to the remembered page; `ReturnAfterOAuth` stays as a safety net. |
| Supabase client | `client.ts`: default browser storage (drop the Lovable editor broker), remove the browser `process.env` fallback (clear error instead). |
| Delete | `src/integrations/lovable/`, `previewAuthStorage.ts`, `lovable-error-reporting.ts` (root error boundary keeps `console.error`), unused `cron-auth.ts`, `.lovable/`. |
| Support chat **off** | Unmount `<SupportChat />`, remove `/api/support` and the Lovable-AI-gateway helpers (`src/lib/ai/run-id.ts`, `creator-*.server.ts`, `responses.ts`) — verified Lovable-only before deleting. The offer writing-help UI stays (it never used Lovable). |
| Packages | `bun remove @lovable.dev/cloud-auth-js @lovable.dev/vite-tanstack-config`; drop their entries in `bunfig.toml`. |
| Migrations | `supabase/migrations` becomes the source of truth. `drizzle/` + `drizzle.config.ts` (`LOVABLE_DB_MIGRATION_URL`) are archived/removed after cutover — removing the `drizzle-*` packages needs a separate yes from you. |
| Tests & docs | Update the auth tests' Lovable mock; README + AGENTS.md. |

✅ Typecheck, all tests, lint, build pass; no `lovable` reference left in `src/`, `package.json` or `vite.config.ts`.

## Phase 8 — End-to-end check (local, your project)

1. Sign up account A (email) → confirmation email → login → returns to the right page.
2. Account B via Google → lands back where sign-in started.
3. A: complete profile (photo, availability, portfolio, contacts) → public profile shows only public contacts.
4. A: publish a service with a photo; save a draft; edit; archive/restore.
5. B: request A's service → exactly **one** first message; chat in real time both ways; A accepts.
6. Password reset email → `/reset-password` works.
7. Sign out → no previous-user data; account switch clean.

✅ All pass → the app runs fully on your Supabase. The Lovable project is still untouched.

## Phase 9 — Turnstile (when you want it)

1. 🧑 Cloudflare → Turnstile → your widget → Hostnames: add `localhost` (and your domain later).
2. 🧑 Confirm `VITE_TURNSTILE_SITE_KEY` in `.env` (public key) and restart the dev server.
3. 🧑 Supabase → Authentication → Attack Protection → **Enable CAPTCHA** → provider Turnstile → paste the **secret key**.
4. ✅ Login, signup and password reset still work (all three send the token); without completing the widget they're blocked.
   Google sign-in is unaffected.

## Rollback

- Before Phase 6: nothing in the app changed.
- After Phase 6/7: `cp .env.lovable .env` and restore the code from the checkpoint archive
  (`scratchpad/checkpoint-pre-supabase-migration.tgz`, taken before Phase 7). The Lovable project was never modified.

---

# Status and production checklist (updated 2026-10-24)

Labels: ✅ verified (with how) · ⏳ not yet verified · ⛔ blocked (needs a decision/action) ·
**[B]** production blocker · [O] optional / improvement. Unit tests and builds are **not** evidence that browser flows work.

## A. End-to-end checks (Phase 8, real browser, your project)
| # | Check | Status |
|---|---|---|
| 8.0 | Google sign-in returns to the app signed in | ✅ you, in browser |
| 8.1 | Session survives refresh + new tab; sign-out clears session and data; Back shows no previous data | ✅ you, in browser |
| 8.2 | Email signup (2nd account) → confirmation email → confirm → login | ✅ you, in browser (incl. Turnstile widget on signup) |
| 8.3 | Password reset email → `/reset-password` → new password works | ✅ (re-test after fix; first run failed on a used/expired link + raw "Auth session missing!") |
| 8.4 | Profile: name/bio, photo upload, availability, portfolio (photo), contacts public vs private → public profile as visitor | ✅ (no console errors; header avatar shows the photo; oversized/wrong-type file refused) |
| 8.5 | Service: publish with photo, draft, edit, archive/restore; card photo visible to a logged-out visitor | ✅ (your run, confirmed "8.5 OK") |
| 8.6 | Request B→A: review step → send → exactly one first message; realtime chat both ways; accept with confirmation | ✅ (your run, "8.6 OK") |
| 8.7 | A marks "not accepting" → B sees it on the service page and cannot request | ✅ (your run, "8.7 OK"); open question: wording shown when sending from a tab opened before the change (code shows the generic error) |
| 8.8 | Account switch on one browser (A → sign out → B): no data from A | ✅ (your run, "8.8 OK") |
| 8.9 | Explore with real data: counts, "New" badge, search; card→service transition (Chrome/Edge) | ✅ (your run, "8.9 OK") |
| 8.10 | Turnstile widget loads on login/signup/reset (Cloudflare hostname must include `localhost`) | ✅ (your run: loads on login/signup/forgot-password with no domain error; Arabic + dark OK; login after verification OK; no Turnstile/CSP console errors). Not reported: submit-before-✓ refusal (step 2) |
| 8.11 | Spot check: phone width, Arabic/RTL, dark mode on the pages above | ✅ (your run, "8.11 OK") |

## B. Bugs / missing functionality (from audits, still open)
| Item | Status |
|---|---|
| **[B]** Service hard-delete cascaded requests + messages. Fix `supabase/migrations/20261024130000_protect_request_history.sql` (FK → `on delete restrict`, no data change). **Applied** 2026-10-24 in SQL Editor; constraint verified `ON DELETE RESTRICT`. Behaviour test `supabase/tests/database/service_history.test.sql` (delete refused, request + messages kept, archive works, never-requested service deletable). | ✅ applied 2026-10-24; constraint verified; behaviour test 6/6 + full suite 26/26 on your project (your run) |
| **[B] Decision** Account deletion cascades: deleting a user removes their profile and every request/message where they were client *or* provider (the other party loses history too). No in-app account deletion exists; only via dashboard. Needs a data-retention/privacy decision (anonymise vs erase) — **not changed** (approval of 2026-10-24 covers only the service FK). | ⛔ unresolved decision |
| [O] Request idempotency / duplicate pending requests (UI pre-flight prevents the common case; network retries can still duplicate). Fix = migration (unique partial index or key). | ⛔ needs migration approval |
| [O] Messages still allowed after decline/cancel (policy change). | ⛔ needs migration approval |
| [O] Explore loads the newest 200 services client-side (fine at launch scale). | known limit |
| [O] Mobile thread may scroll the whole page to the newest message. | ⏳ check in 8.6 |
| [O] Support chat removed (by decision); offer writing help shows "AI not connected" honestly. | ✅ by design |
| [O] `types.ts` not regenerated from the new project (schema identical; typecheck passes). | known |

## C. Security & configuration
| Item | Status |
|---|---|
| RLS/grants/guards on the real project (20 pgTAP tests) + anonymous REST checks | ✅ |
| No secret in `.env` / client bundle (only the `sb_secret_` *prefix check* string appears) | ✅ build scan |
| `.env*` git-ignored (except `.env.example`) | ✅ |
| **[B]** Security headers: `src/lib/security-headers.ts` applied to every response in `src/server.ts` (CSP allowing only Supabase project, Turnstile, Google Fonts; frame-ancestors none; nosniff; X-Frame-Options DENY; Referrer-Policy; Permissions-Policy; COOP; HSTS in production). Dev = CSP Report-Only. Limitation: scripts allow 'unsafe-inline' (phase 2 = nonces). | ✅ unit tests + local dev headers + H.1 browser console clean (your run) · ⏳ enforced CSP/HSTS only verifiable after deploy |
| **[B]** Email: Supabase built-in sender is rate-limited (a few/hour) — custom SMTP (provider choice; may be paid). | ⛔ your decision |
| **[B]** Auth server-side password minimum (app asks 8; Supabase default is 6) → set 8 in Auth settings. | ⛔ your action (live auth setting) |
| **[B]** Privacy policy (+ terms) pages: none exist; needed for real users' personal data and for Google OAuth to leave *Testing*. Content is yours (Tunisian data-protection law). | ⛔ your content |
| [B] Supabase CAPTCHA enforcement (Turnstile secret) — after 8.10 passes | ⛔ your approval |
| [O] Storage limits (5 MB, JPEG/PNG/WebP) enforced server-side — set in SQL; refusal seen in 8.4 (client check; server-side limit not isolated) | ⏳ (8.5) |
| [O] Plan: free tier pauses inactive projects and has no automatic backups → paid plan decision | ⛔ your decision |
| [O] Error monitoring (none since Lovable removal) — would add a dependency | ⛔ your decision |
| [O] Dependency audit | ⏳ |

## D. Deployment (nothing deployed; proposal comes after section A)
| Item | Status |
|---|---|
| Build target: Cloudflare Workers module (`nitro` → `.output/`, `wrangler.json` generated; worker name still `tanstack-start-ts`) | ✅ builds locally |
| Source control: no git repo yet → `git init` + private remote | ⛔ your approval |
| Deploy tool: `wrangler` not installed (dependency or `bunx`) + Cloudflare account/token | ⛔ your approval |
| Production domain + DNS | ⛔ your decision |
| Prod config: `VITE_*` are baked at build; Worker runtime vars `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` | ⏳ |
| After domain: Supabase Site URL + Redirect URLs, Google OAuth origins/redirect + consent screen publish, Turnstile hostname | ⛔ your action |
| Production smoke test (repeat key parts of section A on the live URL) | ⏳ |


## Status lists (2026-10-24)

**Fixed and verified**
- Structured data (JSON-LD) on home, service and provider profile: 0 errors in validator.schema.org (S.5, your run).
- Search basics (S.4, your pasted output): sitemap lists the 5 static pages + your published service + Ali's profile; robots.txt allow-all + sitemap line; `/dashboard` HTML has `noindex`; French 404 page translated with both buttons. S.4a (archive removes the service from the sitemap, restore brings it back) and S.4b (Arabic 404: RTL layout, working buttons): **passed** (your manual check, 2026-10-24).
- CAPTCHA (Turnstile) enforced in Supabase Auth (enabled by you, 2026-10-24). C.0 (my run): password login, recovery and signup WITHOUT a token → HTTP 400 `captcha_failed`. C.1–C.8 done (your report "ALL C STEPS DONE"). Kill switch: Supabase → Authentication → Attack Protection → CAPTCHA off.
- Explore listings in the server HTML, one canonical `/explore`, archived services excluded even for their owner (S.3, your run + my curl).
- Server-rendered provider profiles (`/pros/$id`): public contacts only, canonical, noindex for empty profiles, 404 unknown (S.2, your run + my curl).
- Server-rendered public service pages (`/services/$id`): content, title/description/canonical in the raw HTML; draft/archived/unknown → 404; owner still sees own draft (S.1, your run + my curl).
- Photo framing before upload (services/portfolio 4:3, avatar round) incl. reframe and Arabic/mobile (P.1, your run).
- Header redesign (language & appearance menu, avatar account menu, messages icon): 4 component tests + **H.2 browser check OK** (links, language/theme incl. Arabic RTL, keyboard, mobile menu unchanged) (your run).
- /forgot-password code-split warning fixed (component moved to src/components); console clean in H.2 (your run).
- Dev-server `Error: aborted (status 500)` investigated: client disconnects mid-response (reproduced on a temporary server: cold-start timeouts → same trace; complete requests → none). Not an app bug.
- Service deletion can no longer erase requests/messages — migration applied; 6/6 behaviour tests + 26/26 total on your project (your run).
- Access rules on your project (20 tests), anonymous REST checks, no secrets in the client bundle.
- Browser: Google sign-in (8.0), session/sign-out (8.1), email signup + confirmation + login with Turnstile widget (8.2), password reset incl. expired-link state (8.3; fix: clear "link no longer valid" state + request a new link, no raw Supabase errors, 7 tests), profile edit/photo/availability/portfolio/contacts + public profile as visitor with private contact hidden (8.4).
- Header right-side spacing (gap 16 px) and header avatar photo (confirmed during 8.4).

**Implemented but not yet verified**
- Limits & daily quotas (approved 2026-10-24): migration `supabase/migrations/20261024140000_limits_and_quotas.sql` **PREPARED, NOT APPLIED**. Read-only preflight `supabase/checks/20261024140000_limits_preflight.sql` (expect 0 rows); rollback `supabase/checks/20261024140000_limits_rollback.sql`; 47 database tests in `supabase/tests/database/limits.test.sql` (skipped until applied; dry run: `node scripts/db-test.mjs --pending supabase/migrations/20261024140000_limits_and_quotas.sql`). App side done: limit messages in fr/en/ar shown only for the exact quota refusal, upload-limit detection via `upload_quota_left()` after a failed upload, signup name field max 80 (12 app tests). After applying: check that ONE real photo upload adds exactly one upload to the ledger (Storage API path is not covered by the SQL tests).
  Dry run #1 (your run, 2026-10-24): FAILED 42804 `column "user_id" is of type uuid but expression is of type text`. Cause: test fixture in limits.test.sql (a UNION of untyped literals resolves to text) — not the migration or runner. Fixed with ::uuid casts at the source; also made one multi-statement test step a single DO block. Runner now reports file + line + statement + PostgreSQL hint/context per failing file and continues with the next file (no credentials or row DETAIL printed). Preflight: Success (0 rows), unchanged. Dry run #2 (your run): limits.test.sql NOT RUN — transient pooler login refusal (28P01) on the first connection (the next files connected fine with the same credentials); skillloop_rls test 8 failed "have 2, want 1" because it counted ALL visible services and the project now has a real published service (data-dependent test, fails with or without the migration) → now counts only the test provider's services; limits tests also scoped to test-owned rows. Runner: connects before running files (one retry after 3 s), connection errors are reported as NOT RUN with one retry, never as SQL errors. service_history 6/6 and the other 19 skillloop_rls tests passed with the migration in place. Dry run #3 (your run, 2026-10-24): **passed 73, failed 0** — successful DRY-RUN verification (migration executed inside each test transaction and rolled back). Migration file unchanged since 19:06, i.e. the exact version dry-run tested; sha256 9b9e7f48956e8475f85b12e3e29dee4f52e58e56b2003798d575ccfcf9d6d29b. **NOT APPLIED.** Still unverified: real Storage API upload path (one upload = one ledger entry), browser smoke test after applying. Post-apply checks: `supabase/checks/20261024140000_limits_verify.sql`.
  Review changes after dry run #3 (2026-10-24): message-quota exemption narrowed from "any nested insert" to "the request's opening message only" (nested, sender = request's client, body = request text, first message of that request); +3 tests (refused upload takes no slot; any other trigger-inserted message is counted) → 50 limits tests, 76 total; verify script fixed (`handle_new_user()` lookup) and given a mandatory before/after real-upload query. **New fingerprint a5ce00ad95f2f753f1e53db9c8fe6815c0436fd8fc54f8cac57800088c1aebbe — the 73/73 dry run applies to the PREVIOUS version; dry run #4 required.** Dry run #4 (your run, 2026-10-24): fingerprint a5ce00ad…aebbe confirmed, **passed 76, failed 0** — this version is DRY-RUN VERIFIED, **NOT APPLIED**. Upload baseline must be taken after applying (the quota log is created by the migration), right before the single real upload. **Approved for permanent application by you (2026-10-24), this exact version only (sha256 a5ce00ad…aebbe); no other schema/auth changes.** Executed by you in the SQL Editor (2026-10-24): "Success. No rows returned". Post-apply verification: 10/10 structural checks passed (your run: passed 10 | total 10 | failing none). 76/76 database tests against the applied schema (your run, no --pending; limits 50/50, service_history 6/6, skillloop_rls 20/20). Real-upload check (your run, 19:08 → 19:10 UTC, one new portfolio item with one photo as Ali): files_in_folder 2 → 3 (+1, upload worked, folder rule OK) but **uploads_logged 0 → 0: the upload quota is NOT recorded for real uploads through Supabase Storage** — UNVERIFIED/FAILED for uploads. The services/requests/messages quotas and all limits are table triggers/constraints (verified 76/76) and are unaffected; the upload policy can't wrongly refuse (it counts 0). Investigation in progress; no rollback or further SQL run. Browser smoke test: pending.
  Recorded precisely (2026-10-24): (1) the real upload SUCCEEDED; (2) the upload quota did NOT count it and is NOT enforced; (3) the other protections passed the database tests (76/76); (4) the browser smoke tests are still UNVERIFIED. Decision (you): keep the applied migration, investigate a fix forward; no new migration/trigger approved.
  Read-only diagnostic (your run): current_user postgres; storage.objects owner supabase_storage_admin; postgres has TRIGGER privilege on storage.objects (true); storage schema version "revoke-grants-to-unused-operations"; private.quota_events total 0 (no quota event of any kind yet); newest file's owner_id = Ali's id (the Storage service records the uploader on the row).
  Investigation: Storage source (uploader.ts) shows the policy is checked as the caller inside rolled-back probes and the final row is written as a superuser — explains the 0 (proposal treats it as evidence-backed; real test still decides). Official guidance: triggers on storage.objects explicitly allowed (changelog Apr 2025), functions in `storage` not; docs ask to treat storage tables as read-only. Fix-forward PROPOSAL (not approved, not applied): `docs/proposals/upload-quota-fix.md`, migration `20261024150000_upload_quota_trigger.sql` (sha256 in the proposal reply), rollback, verify, 14 tests (`upload_quota.test.sql`); limits test 28 made fix-agnostic. Expected dry run 90. Dry run (your run, 2026-10-24): **passed 90, failed 0** — fix migration sha256 ab6be78c9c592c47e0dbca05fe3be907fde70d92cbc86a47c6458b044ddbf287 (file unchanged since 20:16, before the dry run) is DRY-RUN VERIFIED, **NOT APPLIED, not approved**. Real Storage upload enforcement: UNVERIFIED. **Approved for permanent application by you (2026-10-24): this fix only (sha256 ab6be78c…f287).** Documented concurrency/Storage-cleanup uncertainty acknowledged and recorded as UNRESOLVED (not verified safe). Executed by you in the SQL Editor (2026-10-24): "Success. No rows returned". Post-apply checks: 5/5 passed (your run). Database tests against the applied schema: 90/90 (your run). **Real-upload check — CORRECTED by you: NOT verified.** Actual results: before 0 | 3, after 1 | 3 (uploads_logged +1, files_in_folder +0); repeated: 2 | 3. Each upload is recorded once in the quota log, but the file count did not grow — so either the file was removed afterwards (e.g. the app's cleanup after a failed portfolio save, or a replaced photo) or the save did not complete. Under investigation (read-only); no change made. (My earlier note of +1/+1 was based on your first, mistaken numbers.)
  Read-only investigation (your queries): upload events at 21:46:51.667 and 21:48:14.439; the 21:48 event has EXACTLY the created_at of the file `…/portfolio/a08ffb3b….jpg` (same transaction) and that file is referenced by the only portfolio item (created 21:48:14.565). No file exists for the 21:46 event, and the pre-fix portfolio photo (~19:09) and its item are gone too ⇒ items/photos were deleted or replaced between uploads (the app removes a photo when its item is deleted or its photo replaced), which explains files staying at 3. No error was shown (your report). Conclusion so far: one event per completed upload (1:1 for the 21:48 upload); the strict "+1 event and +1 file" criterion still needs one clean run (add one NEW item, no edit/delete in between).
  **Clean run (your run, 2026-10-24): REAL-UPLOAD COUNTING VERIFIED.** One new portfolio item, no edits/deletes: uploads_logged 2 → 3 and files_in_folder 3 → 4 (+1 / +1; since the previous test: 1 entry, 1 file); the entry and the file have the identical timestamp 21:55:21.447713 (same transaction), and the new portfolio item (title "vcfddf", created 21:55:21.691973) points to exactly that file. The first matching check returned 0 only because the item title differed from the suggested "TEST quota upload".
  Status: one real upload counted exactly once — VERIFIED. Real 41st-upload refusal — UNVERIFIED (Zeineb test not approved). Concurrent-upload cleanup — UNRESOLVED. Browser smoke test — complete: step 1 profile editing (Ali: bio/title saved, persisted, shown on public profile) OK (your run). Found during step 1 (your report): saving the profile while browsing in Arabic switched the site to French — the form applied the stored "preferred language" (still the default fr) on every save. Fixed: the language switches only when that field was changed in the form (savedLangChange, 3 tests). Re-check OK (your run: Arabic stays Arabic after saving other fields; changing the preference to English switches the site). Step 2 create a service (Ali, "TEST smoke – cours", photo, published, visible on /explore to visitors) OK (your run). Step 3 edit (title, price 30, photo replaced) + archive/restore OK (your run). Step 4 request from Zeineb (review → send, one opening message, pending for Ali) OK (your run). Step 5 messaging both ways live + accept with confirmation OK (your run). **Browser smoke test after the limits migration + upload fix: COMPLETE (5/5 steps + language re-check).** Test content left in place (no cleanup deletions). Zeineb limit test SQL revised for review (blocks B and E are now single guarded statements so the SQL Editor shows their results). **Blocks B and E approved by you for this test only (used and closed) (account 03ecfb0b-…9011; quota log only).** Run: A baseline 0 uploads | 0 files; B seeded 39 rows, seed_created_at 2026-10-24 22:15:43.122029+00 (one timestamp, 39 rows, confirmed read-only); after B: 39 | 0. C (your run): 40th upload = Zeineb's profile photo, accepted (upload entry and avatar file share the timestamp 22:17:16.600772; profile uses it); 41st upload = a portfolio photo, refused in the app with "Limite du jour atteinte : 40 photos envoyées par 24 h. Réessayez plus tard ; rien n'a été enregistré." — afterwards 40 in window, 1 real event, 1 file, 0 portfolio items (nothing retained from the refused upload). **Real 41st-upload refusal: VERIFIED.** (Before-transfer refusal is per the Storage source; the database shows no file row retained.) Concurrent-upload cleanup: still UNRESOLVED. D preview 39 = seeded_rows; E (guarded) deleted 39; final read-only check: synthetic_left 0, Zeineb upload entries 1 (the real profile-photo upload at 22:17:16.600772 remains), Zeineb files 1. **Zeineb limit test COMPLETE; synthetic entries removed; no other account, file, item or real event touched.** 40-upload boundary on real Storage: UNVERIFIED until the separate limit test (not approved yet). Earlier verify script check 3 now marked superseded and accepts both states. Zeineb limit test + cleanup prepared for review only (`supabase/checks/20261024150000_upload_limit_test.sql`); no synthetic events added. Browser smoke test, S.4a, S.4b, T.1: open. If the run errors: check state with `supabase/checks/20261024140000_limits_state.sql` (read-only) — do NOT run the rollback script against an unapplied migration. Real-upload check will use one NEW portfolio item with one photo.
- Login/signup now say "La vérification anti-robot a échoué…" when Supabase refuses the bot check (before: login said "wrong email or password", signup showed raw Supabase text). Wrong passwords are still reported as such. 3 tests. Browser check: hard to trigger by hand (needs a refused token); optional.
- Password eye button no longer sits on the text in Arabic (field wrapper forced LTR like the input) and Edge's duplicate built-in eye is hidden. Visual check pending.
- Security headers: unit tests + headers on local dev responses + **H.1 browser check (dev, report-only): no CSP violations** across home/explore, email login with Turnstile, Google sign-in, photo preview, messages (your run). Not yet: enforced CSP + HSTS on the deployed site.

- Redesign "Mapped loop" (docs/design/art-direction.md): proof (home, card, service detail) approved; batch 3 (shared design system) and batch 4 (discovery pages + mobile service request bar replacing the bottom nav, approved by you 2026-10-25) implemented; batch 5 (auth + offer flows, framed clickable profile photo) implemented; batch 6 (dashboard/settings/requests/messages, one avatar frame, pointer flow on banners) implemented; batch 7 (PointerField mouse motion on all empty surfaces, consistency + responsive pass; checklist docs/design/route-checklist.md) implemented; typecheck, 300 tests, build, lint (no new issues) and server render checked by me. **Browser check of batches 3–7: you reported "all thing done" (2026-10-25) — PASSED (your report).** Follow-ups implemented, not yet seen by you: new favicon (Mapped-loop colours), grey sheen + lime dot ping on the home hero badge.
- Free-launch preparation (2026-10-25, nothing deployed; guide: docs/free-launch.md): public/_headers (nosniff etc. for static files); Worker name `skillloop` + Workers Logs + fixed compatibility date in vite.config.ts (checked in build output); JSON error lines (src/lib/server-log.ts); /privacy and /terms in fr/en/ar with [PLACEHOLDER] fields (noindex + out of sitemap while drafts), linked from footer and sign-in pages; Search Console tag via VITE_GOOGLE_SITE_VERIFICATION. Typecheck, 316 tests, build, lint (0 errors), dev render checked by me. Your browser check pending.
- Account deletion (2026-10-25): migration 20261025120000_account_deletion.sql **PREPARED, NOT APPLIED** (preflight/verify/rollback in supabase/checks, 16 pgTAP tests in account_deletion.test.sql — dry run not yet run); UI in Settings OFF until VITE_ACCOUNT_DELETION=on. What is deleted/anonymised/retained: docs/account-deletion.md.
- Git (2026-10-25): repository initialised on branch `main`, 258 files staged, **not committed or pushed** (your commit identity + GitHub token). Secret scan of every staged file: no keys/JWTs/SMTP/Turnstile/Groq/DB-URL values (only bare prefixes in key-type checks); `.env`, `.env.before-urlfix`, `.env.lovable`, `.output/`, `.wrangler/`, `supabase/.temp/`, `*:Zone.Identifier` ignored. wrangler.json now pins `AI_ENABLED=false` and `keep_vars: true`.

**Still blocked / awaiting your decision or approval**
- Email SMTP provider (and it needs a sending domain).
- Supabase Auth minimum password length → 8 (your dashboard action).
- Privacy policy + terms content; account-deletion retention decision.
- Support contact for users who can't pass the bot check (CAPTCHA itself is now enforced).
- Deployment: git repo, deploy tool (wrangler), Cloudflare Worker, domain; paid plan / backups decision.
- Optional migrations: duplicate-request protection, message lock after decline.

**Remaining browser checks:** none locally. On production after deployment: H.1 (enforced CSP/HSTS), C.0–C.8 (CAPTCHA), Google sign-in, reset email from the custom sender, one real upload (+1/+1), short smoke test.

**Unresolved (accepted risk, recorded):** two uploads started at the same moment by one account at exactly 39 — the second is refused at the final write, after its bytes were sent; whether Storage removes those bytes is unverified.

**T.1 — manual retest PASSED, issue NOT reproduced (2026-10-24, your run): the failed-login → retry scenario worked and the Turnstile widget came back normally. No code fix was applied.** Original report kept for reference: during 8.11 (Arabic + Chrome phone emulation, /login) after a refused login (400), the Turnstile area stayed blank and the form asked to "complete the check above"; console showed Cloudflare `postMessage … origin` messages. Same sequence worked on desktop in C.2. Needed: the 400 response `error_code`, whether an iframe exists in the blank area, and whether it reproduces without emulation / in French. No code changed.
  Code review (2026-10-24): after each submit the app calls Turnstile `reset()` and clears the token (src/components/turnstile.tsx); nothing in the app hides the widget, and Turnstile's error callback (which shows "couldn't load + retry") did not fire — so the widget was left mid-reset with no token and no error. The `postMessage … origin` lines come from Cloudflare's api.js while its iframe reloads, consistent with a reset that didn't finish. Hypotheses: (H1) Chrome phone emulation (spoofed user agent) makes the re-check stall — emulation-only; (H2) the reset stalls on real devices too. Local reproduction in a headless Chrome was blocked by a permission rule (not attempted further). Candidate fix ONLY if H2 is confirmed: re-render a fresh widget instead of reset(), plus a ~15 s watchdog that shows the existing "retry" link if no token arrives.

Public-launch plan (SEO, AI, deployment, decisions): see `docs/launch-roadmap.md`. Applied: limits & quotas (20261024140000) and upload-quota fix (20261024150000). AI (Groq, provider approved 2026-10-24): server route implemented and tested with mocks (19 server + 3 UI tests; route checked locally: AI off → 503, no/invalid sign-in → 401, GET → 405); **not enabled, no live call made**; quota migration `20261024160000_ai_quota.sql` (sha256 7bd62fbb…30bb8) prepared, NOT applied; live eval **approved 2026-10-24 (Free tier, local, max 9 calls, key typed by you only)** — script hardened: dry-run mode (no network, verified), stops on auth/quota/model/compatibility errors, no retries, paces calls by Groq's remaining-token header, reports your account limits from response headers; **Run 1 done (your run, 2026-10-25 UTC, openai/gpt-oss-20b): 9/9 calls, 9/9 passed the automatic checks, no errors, 5,260 tokens total (≈520–720 per call), 259–1,251 ms.** Account limits reported by Groq: 1,000 requests/day, 8,000 tokens/min (TPD not reported). Report: supabase/.temp/ai-eval-openai_gpt-oss-20b.md (no key in it — checked). Injection case: no review, price or phone added. Manual review findings: (a) Arabic "description improve" came out in Modern Standard Arabic, not Tunisian Derja, and added a small claim ("…بنجاح"); (b) French description merged "fuites" + "chauffe-eau" into "fuites de chauffe-eau" and added "afin de garantir un service transparent et juste"; (c) Arabic title copied the whole description sentence. Proposed prompt fixes (Derja explicitly, no added qualities/promises incl. "garantir", keep separate facts separate, short titles) need a second evaluation run (separate approval).
  Run 2 preparation (2026-10-25): instructions tightened (Tunisian Derja not MSA; short genuine titles; separate facts stay separate; no added claims/promises/outcomes; improving adds no information) + two deterministic guards (claim words the provider never used → rejected; title copied from a description sentence → rejected); tests only show these exist, not that the model follows them. Second run approved: same 9 cases, gpt-oss-20b only, max 9 calls; **Run 2 done (your run): 9/9 calls, 9/9 passed the automatic checks, 6,578 tokens (longer instructions: ~+130 tokens/call), no errors.** Manual comparison with sources and run 1: FIXED — Arabic description now Tunisian Derja with no added claim; French "garantir… transparent" gone; English injection still ignored. IMPROVED, NOT FIXED — Arabic title is short now but still the opening clause of the description, not a genuine title. STILL FAILING — French description still merges "fuites" + "chauffe-eau" into "fuites de chauffe-eau" (the source "fuites chauffe eau" is itself ambiguous) and adds "spécialisé" and "diagnostiquer"; French title drops "installe" ("& chauffe-eau"). Tests prove only that instructions/guards exist.
  Run 2 issues classified (2026-10-25): INVENTED/LOST MEANING — FR description adds "spécialisé" and "diagnostiquer"; FR description turns the ambiguous "fuites chauffe eau" into one relationship ("fuites de chauffe-eau"); FR title drops "installe" (repair vs install of water heaters lost). STYLE ONLY — Arabic title as a short sentence reusing the provider's clause; "أو" instead of "ولا". Changes made without new live calls: removed the "copied description sentence" title rejection (style, not invention) and softened the title rule (reusing the provider's words is fine); new rule: ambiguous relationships stay as written / listed separately and are mentioned in the explanation; languages separated — output_language (chosen per request in the panel, defaults to the interface language, never changes the interface or preferred_lang) vs explanation_language (the brief's language, e.g. Derja) vs input language. Not re-evaluated (no Groq calls approved).
  Capacity correction: 1,000 requests/day + 8,000 tokens/min do NOT establish a daily call capacity; no daily token limit was reported and none is assumed. Provisional app limits: 10/user/day, 10 s cooldown, 120/day global, plus 6/min global burst cap.
  AI quota migration REVISION 3 (sha256 44d81046dc87cd2348ddb0b26bafc1c2233dd0e300f30ea8b7d4ebe48d2387f9, NOT applied): concerns (1)(2)(4) addressed by a server-held AI_QUOTA_SECRET checked inside the functions (DB keeps only its SHA-256 hash; wrong/missing secret records nothing; works the same via REST and GraphQL; still the user's own token, no service key) and limits stored in private.ai_settings, not passed by the caller; (3) addressed by release_ai_quota (only when the provider produced nothing); global burst via a per-minute cap; 19 pgTAP tests; rollback + verify updated. Dry run of revision 2 (your run): 90 passed, ai_quota.test.sql failed — test bug (global_per_minute = 100 outside the 1–60 rule), not a migration bug. Revision 3: release now MARKS the slot ('ai_released') instead of deleting it — it stops counting toward daily caps but still counts for the per-user cooldown and the global per-minute cap, so repeated provider 429s can't become unlimited rapid retries; release requires the server secret (tested); 21 tests. **Dry run of revision 3 (your run, 2026-10-25): passed 111, failed 0 — DRY-RUN VERIFIED, NOT APPLIED; secret setup NOT approved.** **Approved for permanent application by you (2026-10-25): revision 3 only (sha256 44d81046…87f9). Secret setup NOT approved.** Executed by you in the SQL Editor (2026-10-25): "Success. No rows returned". Post-apply checks: 6/6 passed (your run). 111/111 database tests on the applied schema (your run). **AI quota migration revision 3: APPLIED AND VERIFIED.** Approved by you (2026-10-25): A = set the AI quota secret hash; B = local signed-in end-to-end test, synthetic text, max 2 real Groq calls, AI_ENABLED back to false afterwards. Production AI and deployment NOT approved. A DONE (your run): secret hash set (secret_hash_set = true); plaintext secret kept by you only. B (your run, 2026-10-24 23:48–23:51 UTC): **APPROVAL EXCEEDED — 4 real Groq calls instead of the approved maximum of 2.** Evidence: 4 kept 'ai' slots for Ali at 23:48:22, 23:49:09, 23:49:40, 23:50:34 (each slot = one request sent to Groq; all > 10 s apart, so the cooldown correctly allowed them); 0 released. Cause: my test steps allowed clicks in two panels with no server-side stop; the 2-call limit relied on manual counting. Impact: synthetic text only, Free tier (no charge); 4 of Ali's 10 daily AI slots used until 24 h pass. Lesson: future live tests must enforce the approved count in the database (temporary private.ai_settings.user_daily = N, with approval) before starting. Observed so far: suggestion did not change the 65-char description; title panel showed the cooldown message (server vs client cause not yet confirmed — needs the terminal log); explanation line showed only "French" (model put the language name in `explanation` — prompt issue, not yet fixed). No further calls. Terminal log (your run) matches the 4 slots exactly: title fr success (881 tokens), title ar success (969), title **cooldown refused by the server** (no Groq call, no slot), description fr success (809), title fr **provider_failed http_400:json_validate_failed** (Groq call made; slot kept by design), title **cooldown** (no call), then **disabled** after restart.
  Verified in the real app (B): server cooldown blocks a repeat without calling Groq or adding a slot (2×); AI_ENABLED=false blocks calls ("disabled", UI "indisponible"), and B6 after that = 4 | 0 (nothing recorded); a Groq 400 is handled as "failed" without retry. B5 scope: VERIFIED — the suggestion did not change the description (65 chars kept while a 67-char suggestion was shown), clicking "Remplacer mon texte" did not change it either (that click only opens the "Oui, remplacer" confirmation), the service was not saved/published. NOT VERIFIED in the browser — the field changing after "Oui, remplacer" (covered by component tests only; can be checked later without Groq via the dev-only ?ai_demo=1 adapter). Findings for later (no calls): explanation returned as just "French"; one json_validate_failed out of 4. AI_ENABLED=false (local and production). Ali's 4 test AI slots expire on their own after 24 h.
  Code-only follow-ups (2026-10-25, no Groq calls): (1) `explanation` field removed from the request data (the model had echoed "French"); rule moved into the instructions; an explanation that is only a language name or < 4 chars is dropped (suggestion kept). (2) json_validate_failed: output caps raised (title 300→600, deliverables 800→1200, description 1600→2000 tokens, incl. reasoning) on the HYPOTHESIS that the 300-token title cap cut the JSON (not verified); if it still happens the user sees the normal "try again" message and the daily slot is released (still counts for cooldown/per-minute). (3) Facts: rules "no added tasks/steps/services/specialisations" and "keep each listed service with its action (repair/install)"; "spécialis/expert/متخصص/خبير" added to the claim-word net. These prompt changes do NOT guarantee correctness and are not re-evaluated (no live calls approved). Root error page and server fallback page translated (fr/en/ar). ⏳ "Oui, remplacer" browser check in demo mode pending. Secret NOT set (route answers "unavailable"); AI_ENABLED=false. Exact rev2→rev3 diff produced from a rebuild of revision 2 whose sha256 matches 4d012181…a3a7. Production keeps AI_ENABLED=false until: migration applied + verified, secret set, and an authenticated end-to-end flow verified. Original concerns, for reference: (1) any signed-in user can call consume_ai_quota directly and record "ai" slots without an AI call, so many accounts could exhaust the GLOBAL daily cap (denial of AI for everyone); (2) caps come from the caller (clamped, but still caller-chosen); (3) a slot is spent even when the provider then fails; (4) the function is also reachable through the GraphQL endpoint like any public function. Direction to propose: make the RPC usable only by the server route (server-held secret checked inside the function, still without a service-role key), caps defined server-side, optional refund on provider failure. Deployment plan: `docs/deployment-plan.md`.

**Remaining SEO tasks (separate):** stable image URLs (decision); after deployment: Search Console + sitemap submission, Lighthouse.

H.1 status basis: you reported "done" with screenshots after running the H.1 steps (2026-10-24). 8.5 confirmed "8.5 OK" (2026-10-24).
