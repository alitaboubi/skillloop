# AGENTS.md
Find code with graphify first (see CLAUDE.md). Feature-by-feature notes (where things live, flags, decisions): docs/agents-reference.md — open only the part you need.

## Hard rules
- Backend = own Supabase project (skillloop, Paris); no Lovable code. Schema = supabase/migrations, applied in order; docs/legacy is never applied. Migrations marked PREPARED, NOT APPLIED stay unapplied (and their flag off) until the founder says so. DB access-rule tests: `node scripts/db-test.mjs`.
- Secrets are never in .env or VITE_* (GROQ_API_KEY, AI_QUOTA_SECRET = Worker secrets only). Never use the user Supabase client for server-rendered data (use publicSupabase).
- All UI copy in src/lib/i18n.tsx (fr default, en, ar = Tunisian Arabic, RTL); never hardcode strings. User text is never translated and uses dir="auto".
- No sample/fake data, no unearned claims: ratings, verification, proof levels beyond "declared", and AI wording only when real. Pro never buys trust; paid visibility is labelled. Category fallback images are never shown as a pro's work; a missing price is never 0.
- Design system "Mapped loop" (docs/design/art-direction.md): colour by role (lime = one primary action, sea = links/info, clay = human accent, ink = brand surface); violet retired. Every :root token needs a .dark value. Radii 8/12/16/24, no text under 14 px, logical positions for RTL.
- Motion: reuse src/components/brand.tsx and the styles.css motion block; fine pointer only, off under reduced motion, transform/opacity only; no scroll reveals, no animation libraries. View transitions only card photo → service photo and conversation row → thread header.
- Reuse shared pieces instead of new ones: site.tsx (header/footer/cards), states.tsx (loading/error/empty, StatusBadge, TrustBadge), page-sections.tsx, media-viewer.tsx, share-kit.tsx, crop-dialog.tsx, request-actions.tsx (status changes always confirmed).
- Route files export only their Route; testable components go in src/components. Filters/modes live in URL search params.
- Turnstile CAPTCHA is ENFORCED in Supabase: never remove VITE_TURNSTILE_SITE_KEY. Password recovery always says "sent".
- SEO: private pages use seo(..., { noindex: true }), never robots Disallow; structured data only for fields the page shows, never ratings/reviews.
- Tested rule files in src/lib (*.ts with tests) are the source of truth: change the rule there and keep its test passing.
