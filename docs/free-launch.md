# SkillLoop — free launch guide (prepared 2026-10-25, NOTHING deployed)

Free-only stack, no domain, no paid plan. Every step that changes an external service is **yours to do (or approve)**;
nothing here has been executed. Limits below are what the providers published as of 2026-10 — **re-check each pricing
page the day you launch**.

| Part | Free choice | Notes |
|---|---|---|
| Hosting | Cloudflare Workers Free, Worker **`skillloop`** | already set in `vite.config.ts` (`.output/server/wrangler.json`) |
| Public URL | `https://skillloop.<your-subdomain>.workers.dev` | `skillloop.workers.dev` itself is impossible: workers.dev URLs are always `<worker>.<account-subdomain>.workers.dev`. Pick the account subdomain once (e.g. `skillloop` → `skillloop.skillloop.workers.dev`). |
| Database / Auth / Storage | Supabase Free (existing project, Paris) | |
| Email | **Brevo Free** | Resend's free plan only delivers to your own address until you verify a **domain** — unusable without one. Brevo lets you verify a single sender **address**. |
| Bot check | Cloudflare Turnstile Free | already enforced |
| Deploy | private GitHub repo + Cloudflare Workers Builds | connecting the repo **deploys on the next push** — that is the "first deploy" approval |
| Search | Google Search Console, URL-prefix property | |


**Your values (public, 2026-10-25):** site URL `https://skillloop.taboubiali363.workers.dev` · GitHub
`alitaboubi/skillloop` (private) · Worker `skillloop` · Supabase project ref `ccwmgmcilezlpfyxhztk`
(auth callback `https://ccwmgmcilezlpfyxhztk.supabase.co/auth/v1/callback`). `wrangler.json` carries
`vars.AI_ENABLED = "false"` and `keep_vars: true` (deploys never erase dashboard Text variables).

---

## 1. Done in code (this session) — no external change

| Item | Where | Verified by me |
|---|---|---|
| `nosniff` (+ referrer, frame) for static files | `public/_headers` (nitro appends its `/assets/*` cache rule) | build output `.output/public/_headers` |
| Worker name `skillloop`, fixed compatibility date, **Workers Logs on** | `vite.config.ts` → `.output/server/wrangler.json`; `.wrangler/deploy/config.json` so `npx wrangler deploy` finds it | build output |
| One JSON line per server error (method + path only, never query/headers/body) | `src/lib/server-log.ts`, used by `src/server.ts` | unit test |
| Privacy policy + terms, fr/en/ar, `[PLACEHOLDER: …]` highlighted | `/privacy`, `/terms` (`src/lib/legal.ts`, `src/components/legal-page.tsx`) | tests (same sections/placeholders in 3 languages), server render 200 |
| …kept out of search while drafts | `noindex` + not in the sitemap until no placeholder remains | test + render |
| Links | footer ("Société" column) and every sign-in page (login, signup, forgot, reset) | render |
| Account deletion (anonymise + keep the other person's history) | migration **prepared, not applied**; UI behind `VITE_ACCOUNT_DELETION=on`; see `docs/account-deletion.md` | 6 unit tests + 16 pgTAP tests (dry run needs you) |
| Search Console tag | `VITE_GOOGLE_SITE_VERIFICATION` → `<meta name="google-site-verification">` | — |

Not done (by your instruction): deploy, domain, AI (stays `AI_ENABLED=false`), Worker name change.

---

## 2. Manual steps (in this order)

### 2.1 GitHub (private repository)
1. github.com → New repository → name `skillloop`, **Private**, no README/licence (the folder already has files).
2. Tell me when it exists: I'll `git init`, check that **no secret is tracked** (`.env`, `.env.*`, `.dev.vars`,
   `supabase/.temp` are ignored; I list every tracked file first), commit, and give you the push command. **[approval]**

### 2.2 Cloudflare (account, subdomain, Worker build — the deploy step)
1. dash.cloudflare.com → sign up (free). **Workers & Pages** → choose your **workers.dev subdomain** (Account details →
   Subdomain). Write down `https://skillloop.<subdomain>.workers.dev` = your **site URL** below.
2. **Turnstile** → your existing widget → Hostname management → **add** `skillloop.<subdomain>.workers.dev`
   (keep `localhost`). Do not change any other CAPTCHA setting. **[approval: CAPTCHA change]**
3. **When you approve the first deploy:** Workers & Pages → Create → **Import a repository** → GitHub → `skillloop`.
   - Project/Worker name: **`skillloop`** (must equal the name in `wrangler.json`).
   - Build command: `bun run build` · Deploy command: `npx wrangler deploy` · Root: `/`.
   - Build variables (section 3.1) **before** the first build; add `NODE_VERSION=22`.
   - Non-production branch builds: off (or "versions upload" only).
4. Worker → Settings → **Variables and Secrets** → runtime variables (section 3.2).
5. Worker → **Logs**: should show "Workers Logs enabled" (from `wrangler.json`). Errors appear as JSON lines with
   `"kind":"ssr_error"` or `"http_5xx"`; filter Level = error.
6. Optional free alert: Notifications → Add → "Workers — Weekly summary" / usage notifications (no paid plan needed).

### 2.3 Supabase (existing free project) **[approval: auth settings]**
1. **Authentication → URL Configuration**: Site URL = your site URL; Redirect URLs: add `https://skillloop.<subdomain>.workers.dev/**`
   (keep `http://localhost:8080/**` for development).
2. **Authentication → Providers → Email**: Confirm email **on**; minimum password length **8**.
3. **Authentication → Emails → SMTP Settings** (older dashboards: Project Settings → Authentication → SMTP): Enable custom SMTP
   with the Brevo values from 2.4: host `smtp-relay.brevo.com`, port `587`, username = your Brevo SMTP login, password =
   the Brevo SMTP key (paste it **only here**), sender email = your Brevo-verified address, sender name `SkillLoop`.
   Without this, Supabase's built-in sender only delivers to your project's team members and is heavily rate-limited —
   real users would never get confirmation or reset emails.
4. **Authentication → Rate Limits**: "emails sent per hour" ≤ **12** (12 × 24 = 288 < Brevo's 300/day).
5. **Authentication → Emails → Templates**: "Confirm signup" and "Reset password" — put French (and short Arabic/English)
   text; keep the `{{ .ConfirmationURL }}` link.
6. **Google provider** (if you keep Google sign-in): Google Cloud console → OAuth consent screen → App home page = site URL,
   Privacy policy = `<site URL>/privacy`, Terms = `<site URL>/terms`. The redirect URI stays the Supabase callback
   (`https://<project>.supabase.co/auth/v1/callback`). Basic scopes (email, profile) need no Google review; Google may
   ask you to verify ownership of authorized domains — workers.dev hosts can only be verified per URL, so the consent
   screen may show "unverified" branding until you have a domain.
7. **Account deletion** (optional before launch, recommended): follow `docs/account-deletion.md` (preflight → dry run →
   apply → verify → `VITE_ACCOUNT_DELETION=on`). **[approval: schema change]**
8. **Backups (free plan has none)**: once a week, a manual dump from your terminal, connection string typed in the terminal
   only (never saved): `pg_dump "<session-pooler URI>" --no-owner -Fc -f skillloop-$(date +%F).dump` → store outside the repo.

### 2.4 Brevo (email)
1. brevo.com → sign up (Free).
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: name `SkillLoop`, email = the address users will see
   (yours) → confirm the 6-digit code Brevo emails you. That is your **verified sender**.
3. **SMTP & API → SMTP** → Generate a new SMTP key (name it `supabase`). Copy the SMTP **login** and the **key** straight
   into Supabase (2.3 step 3). Don't save the key anywhere else; it can be regenerated.
4. Test: sign up with a second address and request a password reset; check Inbox **and Spam**.
- **Deliverability caveat (no domain):** a free-mailbox sender (Gmail/Outlook…) sent through Brevo is not aligned
  with that mailbox's DMARC, so some providers may send it to spam (or Brevo may ask you to authenticate a domain). This
  is the main weakness of a no-domain launch; the fix is a domain with SPF/DKIM — later, not now.

### 2.5 Google Search Console (after the first deploy)
1. search.google.com/search-console → Add property → **URL prefix** → `https://skillloop.<subdomain>.workers.dev/`
   (a *Domain* property is impossible without DNS control).
2. Method **HTML tag** → copy only the `content="…"` value → Cloudflare → Worker → Settings → Build → Variables:
   `VITE_GOOGLE_SITE_VERIFICATION=<value>` → Retry/redeploy the latest build → back in Search Console → **Verify**.
   Keep the variable forever (removing it un-verifies the property).
3. **Sitemaps** → submit `sitemap.xml` → status "Success" (it lists /, /explore, /how-it-works, /professionals, /about,
   every published service and its provider's profile; privacy/terms join once their placeholders are filled).
4. **URL inspection → Request indexing**, one by one (Google allows a small daily quota): `/`, `/explore`,
   `/professionals`, `/how-it-works`, `/about`, then your 3–5 best `/services/<id>` pages and their `/pros/<id>`.
5. Expect days to weeks before pages appear. Private pages (dashboard, messages, login…) are `noindex` on purpose.

---

## 3. Production environment variables (names only — never values in git, chat or files)

### 3.1 Cloudflare → Worker → Settings → **Build** → Variables (baked into the bundle at build time; all PUBLIC)
| Name | Value | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → publishable/anon key | public (RLS protects data) |
| `VITE_SUPABASE_PROJECT_ID` | project ref | public |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile **site** key | public |
| `VITE_SITE_URL` | `https://skillloop.<subdomain>.workers.dev` (no trailing slash) | public |
| `VITE_GOOGLE_SITE_VERIFICATION` | Search Console tag value (2.5) | public |
| `VITE_ACCOUNT_DELETION` | `on` **only after** the migration is applied; else leave unset | public |
| `NODE_VERSION` | `22` | — |

### 3.2 Cloudflare → Worker → Settings → **Variables and Secrets** (runtime)
| Name | Type | Value |
|---|---|---|
| `SUPABASE_URL` | Text | same as `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | Text | same as the publishable key |
| `AI_ENABLED` | Text | `false` |
| `GROQ_API_KEY`, `AI_QUOTA_SECRET` | Secret | **not set** at launch (AI off) |

### 3.3 Secrets that live ONLY inside the provider dashboards
| Secret | Lives in | Never in |
|---|---|---|
| Turnstile **secret** key | Supabase → Auth → Bot protection (already set) | repo, Cloudflare vars, chat |
| Brevo SMTP key | Supabase SMTP settings | repo, `.env`, chat |
| Google OAuth client secret | Supabase → Auth → Providers → Google | repo, chat |
| Supabase service-role key / DB password | not used by the app at all | anywhere in the app |

Checks before the first push: `git ls-files | grep -E '\.env($|\.)|\.dev\.vars'` → only `.env.example`; and a grep of
tracked files for `sb_secret_`, `service_role`, `eyJhbGciOi` (JWT) → nothing.

---

## 4. Free-tier limits and what happens when exceeded (as published 2026-10 — re-check)

| Service | Free limit | When exceeded | SkillLoop exposure / mitigation |
|---|---|---|---|
| Workers requests | 100,000/day (resets 00:00 UTC) | further requests fail (Cloudflare error page) until reset | static files (JS/CSS/fonts) are **free and don't count**; only pages/API count. Plenty for a launch. |
| Workers CPU | **10 ms CPU per request** | that request fails (error 1102) | **main risk**: server-rendering React may exceed 10 ms on heavy pages. Measure on the first preview (Worker → Metrics → CPU time p50/p99). If p99 > ~8 ms, options: lighter SSR, or Workers Paid (~US$5/month) — your decision. |
| Worker size | 3 MB compressed | deploy refused | today **0.65 MB** |
| Workers Logs | ~200,000 events/day, 3-day retention | extra events dropped | we log only errors |
| Workers Builds | ~3,000 build min/month, 1 at a time | builds wait / stop | a build takes ~1–2 min |
| Turnstile | free, unlimited challenges | — | — |
| Supabase database | 500 MB | project becomes **read-only** (no signups, posts, messages) | text rows are small; months of headroom |
| Supabase Storage | 1 GB | uploads refused | framed JPEGs ≈ 0.2–0.5 MB ⇒ ~2,000–5,000 photos; app caps 40 uploads/user/day, 5 MB/file |
| Supabase egress | 5 GB/month (+5 GB cached) | restrictions after a grace period | photos are the bulk; watch Usage page |
| Supabase auth users | 50,000 monthly active | restrictions | — |
| Supabase activity | project **pauses after ~7 days without activity** | site loads but data calls fail until you press "Restore" in the dashboard | real traffic prevents it; check weekly |
| Supabase backups | **none** | data loss on accident | weekly manual `pg_dump` (2.3 step 8) |
| Supabase auth emails | your custom-SMTP rate limit (set 12/hour) | further confirmation/reset emails refused for the hour ("email rate limit exceeded") | message shown; user retries later |
| Brevo | 300 emails/day | emails not sent until the next day | limit Supabase to 12/hour |
| Search Console | free | — | — |
| App's own limits | services 20, requests 30, messages 300, uploads 40 per user per rolling 24 h (DB-enforced) | friendly "daily limit" message | protects the free quotas from one abusive account |

---

## 5. Decisions you must make before the first deploy
1. **Cloudflare account + workers.dev subdomain** (final URL).
2. **GitHub**: account and private repo; approve `git init` + first commit/push (I check for secrets first).
3. **First deploy** = connecting the repo in Workers Builds (approve when ready).
4. **Sender address** for Brevo (which mailbox users will see), and accept the no-domain deliverability caveat.
5. **Legal placeholders**: operator (person or company), support + privacy emails, retention for inactive accounts,
   minimum age, INPDP declaration status, governing law/courts, liability clause (your adviser).
6. **Account deletion**: approve preflight → dry run → apply (or launch with the "request by email" fallback).
7. **Supabase auth settings**: Site URL/redirects, password 8, SMTP, rate limit (you apply; approval).
8. **Turnstile hostname** addition (CAPTCHA change; approval).
9. **Google sign-in at launch**: keep (consent screen URLs) or temporarily hide.
10. **Backups**: weekly manual dump — yes/no, and where you store it.
11. **If the 10 ms CPU limit is hit**: optimise first, or accept Workers Paid — decide after measuring.
12. **AI**: stays off (confirm).

---

## 6. Final free-launch checklist
**Before the first deploy**
- [ ] Legal placeholders filled (or consciously launched as marked draft, `noindex`)
- [ ] Repo private; `git ls-files` shows no secret; `.env` untracked
- [ ] `bun run build` OK; tests 316/316; typecheck clean (I re-run on request)
- [ ] Cloudflare subdomain chosen; build + runtime variables set (section 3)
- [ ] Turnstile hostname added
- [ ] Supabase: Site URL, redirect URLs, Confirm email on, password 8
- [ ] Brevo sender verified; Supabase custom SMTP on; rate limit 12/h; templates edited
- [ ] (optional) account-deletion migration applied + verified + `VITE_ACCOUNT_DELETION=on`

**First deploy (approval) → then on the workers.dev URL**
- [ ] Home, explore, a service, a profile load; `/nope` → 404
- [ ] Response headers on a page: CSP (enforced), HSTS, nosniff; on `/assets/*.js`: nosniff + immutable cache
- [ ] Sign up → confirmation email arrives from your sender (inbox/spam noted) → confirm → sign in
- [ ] Forgot password → email → reset works
- [ ] Google sign-in returns to the right page (if kept)
- [ ] Turnstile shows and passes on login/signup/forgot
- [ ] Create a service with a photo (+1 upload counted), request it from a 2nd account, chat both ways
- [ ] Privacy/terms reachable from footer and sign-in pages, all 3 languages
- [ ] (if enabled) delete a throwaway account; the other account still sees the conversation as "Compte supprimé"
- [ ] Worker → Logs shows requests; trigger nothing on purpose — just confirm no `ssr_error` lines
- [ ] Worker → Metrics: CPU time p99 under 10 ms (else decision 11)
- [ ] `/robots.txt` and `/sitemap.xml` use the workers.dev URL
- [ ] Search Console verified; sitemap submitted; indexing requested for the key pages
- [ ] Lighthouse (mobile) run once; note scores

**Weekly while on free plans**
- [ ] Supabase Usage (DB, storage, egress) and that the project isn't paused
- [ ] Cloudflare Worker metrics (requests, CPU, errors) and Logs for `ssr_error`
- [ ] Brevo daily sends; Search Console coverage
- [ ] Manual database dump

## Status update (2026-10-26)
- Live: https://skillloop.taboubiali363.workers.dev (Cloudflare Workers Builds from alitaboubi/skillloop).
- Email: Gmail SMTP (dedicated account, app password in Supabase only), port 465, French templates and subjects,
  rate limit 20/hour — confirmation and password-reset emails verified on the live site. (Brevo not used.)
- Remaining before announcing: Search Console, legal placeholders, account-deletion decision.
