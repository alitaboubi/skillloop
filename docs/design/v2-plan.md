# SkillLoop design v2 — plan (2026-11-03)

Goal: every public page reads as a serious, current marketplace, credible with **few listings**, built for Tunisian
mobile users. Same design system ("Mapped loop", docs/design/art-direction.md): no new fonts, colours by role, honest
copy only (no fake ratings, counts or claims).

## What the research says (practitioner sources, not hard data)
- **Trust at a glance, where people decide**: availability, location/remote, member since, Pro mark on cards *and* at the
  top of the detail page — not only in a side panel. Specific facts beat generic words like "vérifié".
- **One obvious next step** per page (request / message / WhatsApp share).
- **Thin supply must not look broken**: never show rows of zeros or empty sections; fold empty categories, offer
  "Prévenez-moi" and a recruit-a-pro path instead of dead ends.
- **Search first** on home and Explore; categories as the second entry.
- **Tunisia**: ~59–71 % on social media (Facebook first, Instagram, WhatsApp), mobile first, low trust in online payment,
  D17/Flouci growing → WhatsApp sharing, mobile layouts and "no card asked" reassurance matter more than desktop polish.

## Audit of the live site (screenshots 2026-11-03)
| Page | Main issues |
|---|---|
| Service | photo sometimes invisible (hydration race — **fixed**); trust only in the sidebar (**fixed**); page ended on nothing when no similar service (**fixed**) |
| Explore | 10 categories at « 0 » made the platform look empty (**fixed**) |
| Pro profile | stat « 1 Domaines » is weak; avatar overlaps oddly; services grid of one card leaves a large void |
| Home | very long (11 sections); search card good; "Exemples de besoins" and "À vérifier" compete with the main path |
| How it works / Pros / About | to review in batch 3 |

## Batches
1. ✅ Service page + Explore (e420d1d).
2. ✅ Pro profile: « Zone d’intervention » (cities from services + En ligne) replaces « 1 Domaines » (kept only when > 1);
   a single service shows as a wide card (photo + description) instead of half a row; odd stat fills the row on phones;
   sticky « Demander un devis » bar on mobile.
3. ✅ Home: 11 → 9 sections — « Exemples de besoins » removed (the hero already has examples), « À vérifier avant de
   choisir un pro » moved to How it works (customer side, ChoosingChecklist in page-sections.tsx).
4. ✅ Pour les pros: founders' offer band (ProOffer in plan-card.tsx, real places left, links to /offer and /pricing;
   only with VITE_PRO_PLAN). About and Pricing reviewed: already consistent, unchanged.
5. ✅ Messages with no conversation: one centred panel with both paths. Dashboard reviewed: unchanged.
Not done yet: auth/settings consistency pass; dashboard with real data (only checked empty).
Each batch: browser check FR + AR at 1366 and 390 px, tests, then commit.
