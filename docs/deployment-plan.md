# SkillLoop deployment plan (Cloudflare Workers + Supabase)

**Status: plan only (2026-10-24).** Nothing here has been installed, purchased, configured or deployed.
Every step marked **[approval]** needs your explicit approval first. Local verification is complete (see
`docs/supabase-migration-runbook.md`); launch decisions are summarised in `docs/launch-roadmap.md` §0.

---

## 0. Decision sheet (2026-10-25) — what I need from you

### Launch blockers
1. **Domain**
   - the exact name and which form is canonical (`skillloop.tn` or `www.…`; the other redirects);
   - the registrar, and who controls that account;
   - whether DNS will move to Cloudflare (nameservers) — needed to attach the domain to the Worker;
   - any DNS records already in use (mail MX, verification TXT) that must be kept.
2. **Worker name** — suggested: **`skillloop`** (the preview then lives at `skillloop.<your-account>.workers.dev`).
3. **Deploy method** (each item needs your approval):

   | | Git-based builds (Cloudflare Workers Builds) | `wrangler` from this machine |
   |---|---|---|
   | Setup | create a private git repository (this folder isn't one yet) → push → in Cloudflare connect the repo, build `bun run build`, deploy `npx wrangler deploy --config .output/server/wrangler.json` | add `wrangler` (dev dependency **or** run it via `bunx`) → `wrangler login` in the browser → `bun run build` → deploy |
   | Secrets | build-time public `VITE_*` in the build settings; `GROQ_API_KEY` / `AI_QUOTA_SECRET` as Worker secrets in the dashboard | same Worker secrets, set with `printf %s "$X" \| wrangler secret put X` (never typed into files) |
   | Approvals | repo host + private repo; Cloudflare ↔ Git app install; first push (I check no secret is tracked first) | dependency change or `bunx` download; Cloudflare login on this machine; each deploy |
   | Fit | repeatable, no Cloudflare credentials on this PC — recommended once a repo exists | quickest for a first preview |
4. **Email (SMTP)**, **Supabase plan/backups**, **production auth settings** (Site URL/redirects, password 8, Google OAuth, Turnstile hostname) — see §2/§6.
5. **Operator & privacy details** for the privacy policy and terms (I won't invent any of this):
   - operator: legal name (person or company), company form and registration number if any, postal/contact address, country;
   - contacts: privacy-request email, support email (also for users who can't pass the bot check);
   - governing law / courts, and whether you have declared or plan to declare the processing to the Tunisian data-protection authority (INPDP) — your or your adviser's call;
   - who the service targets (Tunisia only, or also EU residents — affects which rules apply);
   - minimum user age;
   - retention: accounts, profiles, services, requests, messages, photos, server logs; and what account deletion does (delete vs anonymise; requests/messages tied to other users);
   - processors to confirm: Supabase (Paris, EU), Cloudflare (hosting, Turnstile), Google (sign-in), Groq (US — only if AI is launched);
   - storage on the device: language, theme, session and drafts in local storage (no analytics, no ad cookies today);
   - terms specifics: SkillLoop's role (connects people; no booking or payment), prohibited content, how to report content, limits of liability (legal wording is yours).

### What a free preview can show before any paid plan
- the site and server-rendered pages on `*.workers.dev`; security headers (H.1, enforced CSP + HSTS);
- **CPU time per page** in Workers metrics/logs — decides Free vs Paid (check Cloudflare's current Free CPU limit at that time);
- sign-in on the preview URL (needs the preview URL added to Supabase redirect URLs and Turnstile hostnames — settings changes, approval);
- profile, services, uploads (+1/+1 check), requests, chat, robots/sitemap, Lighthouse;
- AI stays off on the preview unless you approve otherwise.

### Optional improvements (not blockers)
Public vs private published photos; error tracker; optional migrations (duplicate requests, message lock); profile/bio AI;
CSP nonces; `vite-tsconfig-paths` → built-in; Node 22 locally.

### Still unresolved (documented risk)
Simultaneous uploads by one account exactly at the 40/day limit: the second is refused after its bytes were sent;
whether Storage removes those bytes is unverified.

---

## 1. Architecture

| Part | What runs there |
|---|---|
| **Cloudflare Worker** (built by nitro, preset `cloudflare-module`) | Server rendering of every page, `/robots.txt`, `/sitemap.xml`, future `/api/*` routes, security headers (`src/server.ts`) |
| **Cloudflare static assets** (`ASSETS` binding, `.output/public`) | JS/CSS/fonts/favicon; served without passing through `src/server.ts` |
| **Supabase** (project `skillloop`, Paris) | Auth (email + Google, CAPTCHA enforced), Postgres with RLS + quotas, Storage (`service-images`, private), Realtime chat |
| **Cloudflare Turnstile** | Bot check on login, signup, password reset (secret only in Supabase) |
| **Groq** (later, optional) | Offer writing help, server-side only; off until its own approvals (§9) |

The build already produces `.output/server/wrangler.json` (`main: index.mjs`, `nodejs_compat`, `ASSETS` → `../public`,
`compatibility_date` = build date). Its `name` is a placeholder (`tanstack-start-ts`) and must be set (§4).

---

## 2. Decisions and approvals, in order

1. **Domain** — everything below uses it (`VITE_SITE_URL`, Supabase Site URL, Google OAuth, Turnstile hostname, email DNS).
2. **Cloudflare account and Worker name** (e.g. `skillloop`). **[approval]**
3. **Deploy tool** — one of: **[approval]**
   - `wrangler` as a dev dependency (deploy from this machine), or
   - Cloudflare *Workers Builds* connected to a git repository (needs a git repo first).
4. **Workers plan** — start on Free for a preview; measure CPU time per server-rendered page; switch to Paid (~US$5/month) if pages exceed the Free CPU limit. **[approval for any paid plan]**
5. **Supabase plan and backups** — Free has no restorable backups and pauses inactive projects. **[approval]**
6. **Email (SMTP)** — provider + sender address on the domain (SPF/DKIM DNS records). **[approval]**
7. **Privacy policy and terms** — your legal details, contact, retention, account deletion, support contact.
8. **Supabase Auth production settings**, **Google OAuth production**, **Turnstile hostname** (§6). **[approval]**

---

## 3. Configuration inventory

### Build-time, public (baked into the browser bundle — safe to expose)
| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
| `VITE_SUPABASE_PROJECT_ID` | `<project-ref>` |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile **site** key (never remove while CAPTCHA is enforced) |
| `VITE_SITE_URL` | `https://<your-domain>` (canonical URLs, sitemap, structured data; without it production emits no canonical) |

They must be present **when `bun run build` runs** (local `.env`, or the build settings of Workers Builds).

### Worker runtime variables (Cloudflare → Worker → Settings → Variables and Secrets)
| Name | Type | Notes |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Text | server-side fallback for the public client |
| `AI_ENABLED` | Text | `false` until the AI quota migration is applied and verified |
| `GROQ_MODEL`, `AI_TIMEOUT_MS` | Text | AI settings; the AI usage limits live in the database (`private.ai_settings`) |
| `GROQ_API_KEY` | **Secret** | Groq key; never in `.env`, the repo, logs or chat |
| `AI_QUOTA_SECRET` | **Secret** | gates the AI quota functions (DB stores only its hash); never in `.env`, the repo, SQL or chat |

**Never on the Worker or in the bundle:** Supabase service-role/secret key (not needed), database password, Turnstile
secret (lives in Supabase), Google client secret (lives in Supabase).

---

## 4. Worker configuration (code change, after approval of the name)

- Set the Worker name through nitro's Cloudflare options in `vite.config.ts` (so the generated `wrangler.json` no longer says `tanstack-start-ts`).
- Keep `nodejs_compat`; enable Workers **observability logs** (free) for server errors.
- Static asset headers: assets bypass `src/server.ts`, so add `X-Content-Type-Options: nosniff` for `/assets/*` in `public/_headers` (it already sets long-term caching).

---

## 5. Build and deploy (commands listed, not run)

1. `bun run test && bun run typecheck && bun run build` — with the production `VITE_*` values.
2. **Preview first** **[approval]**: `wrangler deploy --config .output/server/wrangler.json` → `https://<worker>.<account>.workers.dev`.
   Check pages, sign-in redirect behaviour (preview URL must be in Supabase redirect URLs), headers, CPU time.
3. **Production** **[approval]**: attach the custom domain to the Worker (Workers → Settings → Domains & Routes), redeploy with `VITE_SITE_URL` = domain.
4. Alternative: Workers Builds from git — same build command; deploy command as above.

---

## 6. Production settings checklist (exact places) **[approval for each]**

| Where | Setting |
|---|---|
| Supabase → Authentication → URL Configuration | Site URL = `https://<domain>`; Redirect URLs: `https://<domain>/**` (+ preview URL during testing) |
| Supabase → Authentication → Providers → Email | Minimum password length **8** |
| Supabase → Authentication → Emails → SMTP Settings | custom SMTP host, user, sender address |
| Supabase → Authentication → Attack Protection | CAPTCHA stays **on** (Turnstile secret already set) |
| Google Cloud Console → OAuth consent screen | app name, logo, support email, authorized domain, privacy + terms URLs; publish / verify if required |
| Google Cloud Console → Credentials → OAuth client | redirect URI stays Supabase's callback; add the domain to authorized JavaScript origins if asked |
| Cloudflare → Turnstile → widget → Hostnames | add `<domain>` (and the preview host) **before** the first deploy |
| Groq console (later) | API key, Zero Data Retention, spending limit if ever on a paid plan |

---

## 7. Post-deploy verification (on the real domain)

1. **H.1 again**: CSP is *enforced* (not report-only), HSTS present, no console violations on home, explore, login, service page, messages.
2. **CAPTCHA C.0–C.8** (tokenless requests refused; login, signup, reset, Google unaffected).
3. Google sign-in and return to the remembered page; reset email from the custom sender; link works once.
4. One real upload: +1 quota entry and +1 file (queries in `supabase/checks/`).
5. Short smoke test: profile edit, create/edit/archive a service, request, chat both ways.
6. `https://<domain>/robots.txt` and `/sitemap.xml` use the domain; submit the sitemap in Google Search Console; URL-inspect one service.
7. Lighthouse on home, explore, one service page (mobile).

---

## 8. Rollback

- **Worker**: Cloudflare → Worker → Deployments → roll back to the previous version (or `wrangler rollback`).
- **Database**: per-migration scripts in `supabase/checks/*_rollback.sql` (each reviewed before use; never run automatically).
- **Settings**: revert in the same dashboard screen; CAPTCHA has an immediate off switch (Attack Protection).

---

## 9. AI writing help (separate track)

Not connected in production. Requires, each separately approved: the AI quota migration, live evaluation calls, the
`GROQ_API_KEY` secret on the Worker, then `AI_ENABLED=true`. Until then the feature shows "temporarily unavailable" and
service creation is unaffected.

---

## 10. Known gaps / accepted risks

- Two uploads started at the same moment by one account at exactly 39: the second is refused after its bytes were sent;
  whether Storage cleans them up is unverified (recorded as unresolved).
- Script CSP still allows `'unsafe-inline'` (phase 2: nonces).
- Static assets don't get the server's security headers (fix in §4).
