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
2. Pro profile: cover + identity block, meaningful facts (services, cities, languages, member since, Pro/founder),
   services as a list that fills the space, portfolio first when present, sticky contact on mobile.
3. Home: shorter path (search → categories → live services → how it works → for pros → FAQ), proof of activity only from
   real counts, one CTA per section.
4. How it works, Pour les pros, About, Pricing: one shared editorial template, consistent sections.
5. Dashboard + messages (design slice 4), then auth/settings consistency pass (slice 5).
Each batch: browser check FR + AR at 1366 and 390 px, tests, then commit.
