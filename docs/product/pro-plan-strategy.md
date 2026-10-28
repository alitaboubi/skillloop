# SkillLoop — Founders' launch, free month and "SkillLoop Pro" (10 TND/month): strategic plan

## Context
SkillLoop is live (free, one real published service so far). Ali wants to (1) sponsor a showcase pro profile on
Instagram/Facebook — **his own real design service**, portfolio showing his motion designs; (2) promise early adopters
promotion of their business + social accounts and **one free month**; (3) then charge **10 TND/month** for a paid plan
that pros are *proud* to hold, so the plan itself promotes SkillLoop. Decisions taken: name stays **SkillLoop** (ad said
"Skillup"); showcase = Ali's own service; no legal status / payment means yet; each early adopter gets **1 feature post
+ stories** on SkillLoop's accounts. Nothing is built yet; this plan orders the work and the approvals.

## Research — what we know and what we don't
- **Payments in Tunisia:** Konnect holds the first BCT payment-facilitator licence (links, plugins, API) — no public proof of
  recurring/subscription billing; D17 / e-Dinar wallet (La Poste) works for online merchant payments, no evidence of
  automatic monthly debits. → Start with **manual monthly payment** (D17 / transfer) + reminders; a gateway later.
- **Legal:** auto-entrepreneur status live since Nov 2024 (540 activities, card = patente; ~5,000 cards by Oct 2025);
  e-invoicing generalising in 2026. VAT treatment of a platform subscription for an auto-entrepreneur **not confirmed** →
  verify with the DGI/accountant before charging.
- **Benchmarks:** freemium→paid conversion is typically 2–8 % (SaaS data; marketplaces may differ). Fiverr Seller Plus
  ($25–49/month) sells analytics, promotion tools, priority support — and reviewers say it didn't always bring more
  business. **Lesson: sell presentation, tools and pride, never promise clients.**
- **Ads:** no Tunisia-specific Meta CPM/CPC data found; regional proxies (Algeria, emerging markets) suggest low CPMs →
  test with a small daily budget and measure.
- Sources: dabafinance (Konnect), webdo/tunisienumerique (e-Dinar/D17), La Presse & allAfrica (auto-entrepreneur),
  Fiverr help center (Seller Plus), userpilot/marketingschool (freemium), kolonell/dzbuild/contentstudio (Meta costs).

## Principles (non-negotiable)
1. **Never sell trust.** Paid ≠ verified. The proof levels (Déclaré/Confirmé/Vérifié) stay free and earned. The Pro mark
   means "abonné SkillLoop Pro", shown as such — never as quality.
2. **Paid visibility is labelled** ("Mis en avant"), capped (≤ 1 in 5 slots), and never replaces the newcomers row.
3. **The free plan stays genuinely useful** (supply first): page, carnet, services, requests, messages, share link.
4. **No promise of clients.** Pro = a better shop window, tools and reach — clearly worded.
5. Every DB change = prepared migration + tests + your approval, as before.

## The offer
**Free (forever):** profile + carnet (méthode, engagements), up to **2 published services**, **6 portfolio images**,
requests & messages, share link/WhatsApp, Déclaré badge.

**SkillLoop Pro — 10 TND/month (or 100 TND/year):** the things a pro *shows off*:
| Pride feature | Why they're proud / why it promotes SkillLoop |
|---|---|
| **Portfolio en mouvement** — short videos/motion pieces (≤15 s) + up to 30 items + avant/après | Their work looks like Ali's showcase; every share shows SkillLoop |
| **Carnet Pro design** — cover themes, highlighted method, larger gallery | A page they'd send instead of a Facebook page |
| **Carte & QR du pro** — printable card/sticker for shop, van, business card → their page | Offline word of mouth carries the SkillLoop name |
| **Lien personnel** `…/p/nom` (later on own domain) | Professional address they print and share |
| **Statistiques** — views, shares, requests (aggregated, private) | Shows value monthly; motivates renewal |
| **Mis en avant** — labelled rotation slots on Explore/home | Reach, honestly labelled |
| **Mise en avant sur nos réseaux** — rotation on SkillLoop Instagram/Facebook | Their social accounts grow with ours |
| **Unlimited services** + priority support + carnet review by the team | Serious-business feel |
| **Mark "Pro"** (subscription) and, for the first 100, **"Membre fondateur"** (a fact: joined at launch; kept for life) | Status that costs nothing to fake-proof — it's simply true |

**Founders' launch (first 100 pros):** 1 month Pro free **starting when their first service is published** (not at
sign-up), no card needed; feature post + stories; "Membre fondateur" mark; **price locked at 10 TND for life**.
End of trial: graceful downgrade — nothing deleted (extra services become drafts, extra portfolio items hidden), reminders
at day 23 and 29 (email budget: Gmail SMTP 20/h — batch sends).

## Ad text (corrected, honest — run only once Phase 1 is live)
- **FR:** « Soyez parmi les premiers pros sur SkillLoop : votre activité et vos réseaux sociaux mis en avant sur nos
  comptes, et un mois de SkillLoop Pro offert. Ensuite, 10 DT/mois — ou restez gratuit. »
- **AR:** « كون من أول المحترفين على SkillLoop: نعرّفو بخدمتك وبحساباتك على صفحاتنا، وشهر SkillLoop Pro بلاش. من بعد 10 د/الشهر، ولا تبقى على المجاني. »
- Showcase = Ali's own profile; his portfolio described as his work ("conçu par Ali, avec des outils d'IA" where true).
  Until motion portfolio exists, use stills on the profile and the motion pieces in the ad video itself.

## Phased roadmap
**Phase 0 — now (no DB):** fix the two false claims on the live site (signup « travaux confirmés », how-it-works
« brouillon IA »); complete Ali's showcase profile (carnet, portfolio stills, contacts); /pricing page draft *not
published*; legal: apply for the auto-entrepreneur card, ask an accountant about VAT/invoices; update CGU/privacy draft
(subscription, cancellation, refunds, Tunisian consumer law).
**Phase 1 — plans foundation (1 migration):** `subscriptions` (user_id, plan free|pro, status trial|active|expired,
trial_ends_at, period_end, founder) with RLS (read own; writes only by admin/RPC); entitlement helper in SQL used by
limit triggers (extend the pattern of `20261024140000_limits_and_quotas.sql`); trial starts on first publish (hook into
the publish guard); UI: plan chip, "Mon abonnement" in /dashboard, trial banner, public /pricing. Founders counter.
**Phase 2 — Pro features:** motion portfolio (video upload ≤15 s/≤8 MB, poster frame, storage quota; reuse
PhotoPicker/media-viewer patterns), Carnet Pro themes, QR card (needs approval: tiny dependency or hand-written encoder),
private stats table (daily counters, no personal data), labelled "Mis en avant" slots in explore-filters.
**Phase 3 — payments:** manual first (D17/transfer + admin activation screen + receipt PDF), then a gateway
(Konnect/Flouci/ClicToPay) once ~30 paying pros justify the contract; payment links monthly if no recurring API.
**Validation before Phase 2:** 10 short interviews with pros — would they pay 10 TND? which 3 Pro features matter?

## Metrics (weekly)
Founders signed up / published · trial → paid conversion (target ≥ 10 % of founders; benchmark 2–8 %) · churn after
month 2 · Pro features used (motion uploads, QR scans, shares) · requests per pro (free vs Pro, never promised) ·
ad cost per published pro.

## Risks → mitigation
Pay-to-win perception → principles 1–2, visible labels · pros pay but get no clients → don't promise clients, value =
presentation/tools, free month first · manual payments workload → cap founders at 100, admin screen · legal/VAT unknown →
no charging before the card and accountant answer · ad promises before features exist → ad runs only after Phase 1.

## Critical files (when building)
`supabase/migrations/` (new subscriptions migration + checks + tests in `supabase/tests/database/`),
`src/lib/marketplace-writes.ts` (limits), `src/lib/explore-filters.ts` (labelled slots), `src/routes/dashboard.tsx`,
`src/components/profile-editors.tsx` (portfolio/motion), `src/lib/i18n.tsx` (FR/EN/AR copy), `src/lib/legal.ts`.

## Verification
Per phase: unit tests (entitlements, trial dates, downgrade rules), pgTAP tests for RLS/limits via
`node scripts/db-test.mjs --pending …` (dry run before apply), SSR checks of /pricing and profiles, manual run-through
with two accounts (founder trial → expiry → downgrade), and the ad text checked against what is live before sponsoring.
