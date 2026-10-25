# SkillLoop public-launch roadmap (audit 2026-10-24)

Scope: take SkillLoop from "works locally on our own Supabase" to a public, free-to-use platform. Same stack
(TanStack Start + Supabase + Cloudflare Workers); nothing rewritten. Browser checks and approvals stay tracked in
`docs/supabase-migration-runbook.md`. Verified so far: 8.0–8.5, H.1, H.2, S.1, P.1, DB tests 26/26. **8.6–8.11 are not verified.**

How this audit was done: reading the code and the baseline migration, and fetching the server-rendered HTML of
public and private pages from a local dev server. Nothing was deployed or changed in the database.

---

## 0. Launch checklist — what is left (updated 2026-10-25)

Done and verified (not repeated here): SSR/SEO basics, CAPTCHA enforced, limits & quotas + upload-quota fix applied and
verified with real uploads, all local browser checks and smoke test, AI route + AI quota migration applied and verified
locally (AI_ENABLED=false). Open risk: simultaneous uploads exactly at the upload limit (Storage cleanup unverified).
Full step lists: `docs/deployment-plan.md`.

### A. Your decisions / approvals (in priority order)
1. **Domain.**
2. **Deployment setup:** git repository; deploy tool (wrangler dev dependency or Cloudflare Workers Builds); Cloudflare account + Worker name; Workers Free vs Paid after measuring a preview.
3. **Supabase plan & backups** (Free: no restorable backups, pauses when inactive).
4. **Email sending:** SMTP provider + sender address on the domain.
5. **Privacy policy & terms content:** legal name/entity, contact, data kept and retention, account-deletion behaviour, support contact, Groq disclosure (if AI is launched).
6. **Production auth settings:** Supabase Site URL + redirect URLs, minimum password length 8; Google OAuth consent screen + authorized domain; Turnstile production hostname.
7. **AI at launch: on or off.** If on: Groq Zero Data Retention, Worker secrets GROQ_API_KEY + AI_QUOTA_SECRET, then AI_ENABLED=true.
8. Later / optional: published photos public vs private; error tracker; optional migrations (duplicate requests, message lock after decline); profile/bio AI extension.

### B. Code work (mine)
1. After the Worker name decision: set it in the nitro config; add `nosniff` for static assets in `public/_headers`.
2. After your content: privacy and terms pages (fr/en/ar) linked from the footer and the auth pages.
3. Translate the root error page (still hard-coded English).
4. AI quality without new calls: `explanation` returned as just a language name; handle Groq `json_validate_failed`; French description added "spécialisé"/"diagnostiquer" and merged facts. Any re-evaluation needs approval, with the call count enforced in the database.
5. Optional (approval: dependency change): replace `vite-tsconfig-paths` with Vite's built-in tsconfig paths; local Node 22 (supabase-js warning).
6. Post-launch: CSP nonces instead of `'unsafe-inline'`.

### C. Post-deployment checks (on the real domain)
1. Security headers H.1: CSP enforced, HSTS, no console violations.
2. CAPTCHA C.0–C.8; Google sign-in; password-reset email from the custom sender.
3. One real upload: +1 quota entry and +1 file.
4. Smoke test: profile, service create/edit/archive, request, chat.
5. `/robots.txt` and `/sitemap.xml` on the domain; Search Console sitemap + one URL inspection; Lighthouse (mobile).
6. If AI is enabled: signed-in end-to-end test with the approved call count enforced in the database; then confirm AI_ENABLED=false/true behaves as chosen.

---

## 1. Audit findings

### 1.1 Backend (profiles, services, uploads, requests, messages)

| # | Finding | Severity |
|---|---|---|
| B1 | **No upper length limits in the database** for service `title`/`description`/`city`, profile `display_name`/`title`/`bio`/`city`/`area`, or the `details`/`professional_details` JSON. The UI limits them, but anyone calling the API directly can store very large values that public pages then render. Requests (10–4000), messages (1–4000), portfolio and contacts are already bounded. | High |
| B2 | **No per-user caps** on services created, requests sent, messages sent or files uploaded. One account (or a script) can fill storage with 5 MB files or spam providers. Supabase only rate-limits auth emails. | High |
| B3 | **CAPTCHA isn't enforced** by Supabase yet (the widget is shown, but the server doesn't check the token). Signup and reset can be scripted. Already tracked; waiting on 8.10 and your approval. | High |
| B4 | **Duplicate requests and messages after a decline** are still possible. The optional migrations are already proposed. | Medium |
| B5 | **Storage read rule trusts the referenced path.** A file becomes publicly readable once any profile, published service or portfolio row points to it. Because a user can write any path into their own `avatar_url`/`image_url`, they could expose someone else's private draft photo. This needs the path, which is a random UUID, so it's hard to exploit. Fix: require the path to start with the row owner's id. | Low |
| B6 | `profiles` grants UPDATE on all columns, including the deprecated `phone`/`facebook`/… columns (invisible to the API, but writable). | Low |
| B7 | **Account deletion is undecided.** The service-history migration also means deleting an account that has requests may now fail rather than cascade. Not tested; still an open privacy/retention decision. | Decision |
| B8 | Leftovers: `ai_access_blocks` table (unused), `src/integrations/supabase/client.server.ts` and `auth-middleware.ts` (unused, but the right base for server routes), the `ai` / `@ai-sdk/*` packages (installed, never imported), and the dead `sample` branch in `services.$id.tsx`. | Cleanup |
| B9 | **No server-side error visibility.** Errors only reach the browser console; there are no logs or alerts for the deployed Worker. | Medium |
| — | What's fine: RLS on every table; column grants hide private profile fields; request status changes guarded in the database; publish guard mirrors the wizard; private bucket with 5 MB / JPEG-PNG-WebP limits; no secrets in the client bundle (checked earlier). Listings are real (no mock data). | — |

### 1.2 SEO (server-rendered HTML, dev server)

| # | Finding | Severity |
|---|---|---|
| S1 | **Service pages send no content in the HTML.** `/services/<id>` returns the generic title "Service \| SkillLoop" and an empty page shell. The service is only fetched in the browser. `/pros/<id>` behaves the same way. These are the pages that matter most for search. | Blocker |
| S2 | **Soft 404s:** a well-formed but unknown service or provider id returns **200**. A malformed id correctly returns 404. | High |
| S3 | **Explore listings aren't in the HTML** either: only the 22 navigation links are crawlable, so there's no server-rendered path from the site to individual services. | High |
| S4 | **Missing:** `sitemap.xml` (404), canonical URLs, `og:url`, `og:image`. | High |
| S5 | **Private pages aren't excluded from search.** `robots.txt` allows everything, and `/dashboard`, `/messages`, `/profile`, `/offer`, `/login`, `/signup` and `/reset-password` have no `noindex`. No private data is in their HTML (it all loads after sign-in), but these pages shouldn't be indexed. | Medium |
| S6 | The home title repeats the brand ("SkillLoop — … \| SkillLoop"). The 404 page text is hardcoded in English (it breaks the i18n rule) and uses the default site title. | Low |
| S7 | **Images:** photos are private-bucket signed URLs that expire after 24 h, so they can't serve as stable `og:image` or for image search. Fix: either serve published photos through a stable app URL, or make published photos publicly readable. This is your decision. | Medium |
| S8 | **Language:** the HTML is always `lang="fr"`. Language is browser state with no per-language URLs, so only French can be indexed; `hreflang` isn't possible without separate URLs. That's acceptable for launch (decision below). | Decision |
| S9 | **Performance:** the Google Fonts stylesheet blocks rendering, and there are two font families. Measure with Lighthouse on the deployed build before optimizing. | Measure |
| — | **Structured data:** only what the page really shows. `Organization`/`WebSite` on home, `BreadcrumbList` and `Service` (name, description, `areaServed`, `provider`, price only when set) on service pages. **No ratings or `AggregateRating`** (there are no reviews). Structured data doesn't guarantee rich results, indexing or rankings. | — |

### 1.3 AI (offer writing help)

- **Status: not connected.** `resolveAdapter()` returns the "unavailable" adapter. With `?ai_demo=1`, development only, it echoes the user's own text with a "Demo" label.
- There's no provider, no key and no cost, and nothing reaches any AI service today. The `ai` / `@ai-sdk/openai` packages are installed but unused.
- **Already done:**
  - the UI (review → Use/Add/Replace, replace confirms, undo);
  - input limits (brief 10–500 characters, the field limits);
  - content rules (don't invent prices, credentials or reviews);
  - a typed result that handles `unavailable` / `rate_limited` / `failed`;
  - the input carries no ids, emails or contacts.
- **Missing:**
  - a server route (auth, quotas, provider call);
  - persistent per-user and global usage counting (the existing in-memory limiter is per instance only, so it's best-effort);
  - a spending cap.

### 1.4 Launch architecture today

- **Build:** nitro `cloudflare-module`, so it runs on Cloudflare Workers. Security headers are ready (CSP enforced in production, HSTS).
- **Not set up yet:** git repository, deploy tool (wrangler), Worker, domain, production Site URL and redirect URLs in Supabase, custom SMTP, backups, privacy policy and terms.

---

## 2. Prioritized roadmap

### A. Launch blockers (must be done before public traffic)

1. ✅ **Server-rendered public pages** (S1–S4; S.1–S.4 OK): the service page, provider profile and explore listings render on the server with:
   - real title, description and canonical URL;
   - 404 for unknown ids;
   - `sitemap.xml` of published services and providers.
2. ✅ **Keep private pages out of search** (S5; noindex + sitemap, robots allows crawling by design): `noindex` on account and auth pages, and `robots.txt` disallowing them, plus a link to the sitemap.
3. ✅ **Database hardening migration** — applied (20261024140000 + upload fix 20261024150000), 90/90 tests, real-upload count and 41st refusal verified:
   - maximum lengths;
   - JSON size caps;
   - category whitelist;
   - daily per-user caps on services, requests, messages and uploads;
   - storage path ownership.
4. **Custom SMTP with a sending domain:** Supabase's built-in email is for testing only and has a very low hourly limit.
5. ✅ **CAPTCHA enforcement in Supabase**: enabled, C.0–C.8 OK (repeat on production). Setup/fallback: `docs/proposals/captcha-enforcement.md`.
6. **Privacy policy and terms pages** with your real details: data held, contacts, retention, account deletion. I won't invent any of it.
7. **Production configuration:**
   - domain;
   - Supabase Site URL and redirect URLs;
   - Google OAuth consent screen (app name, logo, privacy/terms URLs, authorized domain; Google review if needed);
   - minimum password length of 8.
8. **Backups decision:** the free Supabase plan has no point-in-time recovery or downloadable backups.
9. ✅ Local browser checks 8.0–8.11, S.1–S.5, P.1, smoke test, T.1 retest — done. ⏳ Short smoke run on the deployed site.

### B. Required implementation (in order; each one is a focused task)

| Order | Task | Needs approval? |
|---|---|---|
| 1 | ✅ done (S.1 OK) — **Public service page SSR**: loader fetches the published service on the server with the public key (RLS applies), real head tags (title, description, canonical, `og:*`), 404 status for unknown ids, remove the dead `sample` code, tests. | No, code only |
| 2a | ✅ done (S.2 OK) — Same for `/pros/$id` (real head, content, public contacts only, 404, noindex for empty profiles). | No |
| 2b | ✅ done (S.3 OK) — SSR of the first page of `/explore` results, so service links are crawlable. | No |
| 3 | ✅ done (S.4) — `robots.txt` (disallow the private routes, add the sitemap line), `noindex` head on private routes, `sitemap.xml` server route, fix the home title duplicate, i18n the 404 page. | No |
| 4 | ✅ done (S.5 OK) — JSON-LD (Organization/WebSite, BreadcrumbList, Service) from real fields only, with tests. | No |
| 5 | ✅ applied — database hardening migration + upload-quota fix, 90 pgTAP tests. | done |
| 6 | Stable image URLs for published photos (S7), after your decision. | **Yes** if storage policy changes |
| 7 | (design: `docs/proposals/ai-offer-assist.md`) AI server route: `POST /api/offer-assist` that requires a Supabase session, validates input with zod, enforces per-user daily quota and global daily cap in a usage table (service role, server only) plus a short burst limit, calls the provider with a server-side key, enforces the output schema and length, and fails gracefully into the existing UI states. | **Yes**: provider choice, key, spend cap, migration for usage table, possibly one dependency |
| 8 | Deployment setup: git repository, `wrangler` config (Worker name, routes, environment variables as secrets), build and deploy steps documented, Worker logs enabled. | **Yes**: new dev dependency (wrangler), accounts |
| 9 | Error visibility: structured server logs (Cloudflare Workers logs, free) and an optional error tracker later. | Tracker = decision |

### C. Manual verification (in the browser; I guide, you report)

- 8.6–8.11 (requests and chat between two accounts, not-accepting, account switch, explore with real data, Turnstile, mobile/RTL/dark).
- After task 1–3: view source on a service page (title, description, content present), unknown id returns 404, `/robots.txt` and `/sitemap.xml` are correct.
- After deployment: H.1 again on production (enforced CSP, HSTS, no console violations), Google sign-in on the real domain, reset email from the custom SMTP sender, Lighthouse on home, explore and a service page, Search Console URL inspection of one service.
- After the AI route: quota reached → friendly "limit" state; provider down → "failed" state; no suggestion is applied without Use/Add/Replace.

### D. Optional post-launch improvements

- Content Security Policy phase 2: nonces instead of `'unsafe-inline'` for scripts.
- Per-language URLs (`/en/…`, `/ar/…`) with `hreflang`, only once the translated pages are actually useful.
- Self-hosted fonts or a smaller font subset if Lighthouse flags them.
- Reviews and ratings: real ones, with moderation. Only then rating-structured data.
- Useful public content: guides written for real questions (for example "how to choose an electrician in Tunis"). Not auto-generated city/category pages.
- AI later: improve the description from bullet points, translate one's own listing (fr ⇄ ar ⇄ en), all with review before publishing.
- Reporting and blocking users, a moderation queue.

---

## 3. AI MVP proposal

**Feature:** "Help me write" on the offer wizard for the **title, description and deliverables** (already built in the UI). The provider writes from their brief; they review and edit before the field changes; nothing is published automatically.

**What's sent to the provider:**
- the field, mode, tone and language;
- the user's brief (≤ 500 characters);
- the current text of that field;
- title and category.

Never sent: messages, contacts, email, phone, ids or other users' data. Anything beyond this needs a product/privacy decision first.

**Server-side controls** (all in the server route, never the browser):
- Auth: a Supabase access token is required and verified on the server.
- Input: zod schema, the brief and field limits above, and a supported language only.
- Quotas, counted in the database so they hold across Worker instances:
  - per user per day (for example 20 suggestions);
  - a short burst limit (for example 1 every 5 s);
  - a **global daily cap** (for example 1,000 a day), after which the AI says "unavailable today" for everyone;
  - an optional block list (`ai_access_blocks` already exists).
- Output: a structured result (`text`, optional `explanation`), cut off at the field limit rather than retried, with a maximum output size per call.
- Spending: a hard monthly budget or alerts **in the provider's console**, plus the global cap above. In the worst case the cost is cap × price per call.
- Failure: timeouts and provider errors map to the existing `failed` / `rate_limited` / `unavailable` states; the form always keeps working without AI.
- Privacy: the privacy policy names the provider and what's sent; you choose a provider with no-training terms for API data.

**Provider options** (I'll fetch current prices and terms before you choose; I'm not quoting prices from memory):

| Option | Good for | Watch out for |
|---|---|---|
| Anthropic (Claude, small "Haiku" model) | Strong French and Arabic instruction following; API data isn't used for training by default | Paid per token (needs a card); a new dependency (`@ai-sdk/anthropic`) or a plain `fetch` |
| OpenAI (small model) | `@ai-sdk/openai` is **already installed**; cheap small models | Paid per token; check the data-retention settings |
| Google Gemini (Flash) | Free tier exists | Free-tier prompts may be used to improve their products, so it's unsuitable for user content unless you're on the paid tier |
| Mistral (small) | EU company and hosting; good French | Tunisian Arabic quality to verify; paid |
| Cloudflare Workers AI | Same platform as hosting, a daily free allowance, no new vendor | Open models are weaker at Tunisian Arabic and careful copy; quality to test |

Recommended evaluation: test the same ~10 real briefs (French, Tunisian Arabic, English) on 2–3 options, then choose. Nothing is configured until you approve a provider and a spending cap.

---

## 4. Free usage and costs

**Free for users:** browsing, search, profiles, publishing services, requests and chat are all free. AI writing help is free within a daily quota (not unlimited).

**Infrastructure free tiers** (limits change, so they'll be confirmed on the vendors' pricing pages before deciding):
- **Supabase Free:**
  - limited database size (about 500 MB), file storage (about 1 GB) and egress (bandwidth);
  - projects pause after a week of inactivity;
  - no backups you can restore yourself.
  - The paid plan (around $25/month) removes pausing and adds daily backups.
- **Cloudflare Workers Free:** a daily request limit and a **very small CPU time per request**. Server-rendering React pages may exceed it; measure it on a preview deploy. Workers Paid (about $5/month) raises the limits.
- **Email:** most SMTP providers have a free tier (a few thousand emails a month). Signup confirmations and resets fit that early on.

**Likely cost triggers:**
- photo storage and bandwidth (5 MB uploads × users);
- Supabase pausing or backups (a reason to go Pro);
- Worker CPU from SSR;
- AI calls.

**Preventing surprise AI spending:**
- a global daily cap in the database;
- a provider-side monthly budget and alerts;
- per-user quotas;
- a kill switch (one environment variable or `ai_access_blocks` row turns AI off).

---

## 5. Decisions and approvals needed from you

| Topic | Decision |
|---|---|
| Domain | Which domain? Register it through Cloudflare or elsewhere? |
| Email | SMTP provider (Resend, Brevo, Amazon SES, Postmark…) and the sender address. Needs the domain (DNS: SPF/DKIM). |
| Deployment | Approve a git repository, wrangler (dev dependency), the Worker name, Free vs Paid Workers after measuring. |
| Database | Approve the hardening migration (you'll see the SQL first). Supabase Free vs Pro (backups, no pausing). |
| Storage | Make **published** photos publicly readable (stable URLs, better sharing and SEO), or keep them private behind an app image route? |
| Privacy | Policy and terms details: legal entity or name, contact, data kept, retention, account deletion behavior (B7), AI provider disclosure. |
| Google OAuth | Consent-screen branding, privacy/terms URLs, production domain; app verification if Google requires it. |
| CAPTCHA | Approve enforcement in Supabase after 8.10. |
| Auth | Supabase minimum password length 8 (your dashboard action). |
| AI | Provider (after the comparison), monthly spending cap, daily per-user quota, global daily cap. |
| Indexing language | French only for launch (recommended), or per-language URLs later. |

---

## 6. Recommended first task

**B.1: public service page server rendering**, the biggest SEO gap, with no approvals, dependencies or database changes. Scope:

- a route loader fetching the published service on the server through the existing public client (RLS unchanged);
- real `<title>`, description, canonical URL and `og:*` tags;
- a **404 status** for unknown or unpublished ids;
- the page content present in the HTML;
- the dead `sample` code removed;
- tests;
- then a view-source manual check.
