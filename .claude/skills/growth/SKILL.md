---
name: growth
description: SkillLoop growth and marketing — getting the first 100 pros to publish services (Founders' launch + SkillLoop Pro), campaign plans, ad and post copy in Tunisian Derja and French, content calendars, reel ideas and motion-video prompts (Revid). Use for any request about marketing SkillLoop, finding providers or clients, promoting the Pro plan, writing ads/posts/DMs, or planning what to publish next.
---

# SkillLoop Growth

This skill gives SkillLoop's context to the general marketing skills (Anthropic **Marketing** plugin, **Social Media
Skills**, **Marketing Ideas & Growth Experiments**) and to the **Revid** MCP. Use those for method; use this for facts,
voice and limits. Video production itself goes to the `media-studio` skill.

## Where we are (update this section when it changes)
- Marketplace has very few services (4 at 2026-11-05, all made by Ali). **Supply is the bottleneck**, not clients:
  a client who lands on an empty Explore page does not come back. Every plan starts with pros publishing services.
- Instagram `@skillloop_tunisia`: ~36 followers, 8 reels, 400–2 000 views each. Best performers: the 3D character
  story reel (2 065) and the real-person story reel (2 049) — **people and stories beat logo/UI reels** (~400–550).
- Pro plan and Founders' launch are designed in `docs/product/pro-plan-strategy.md` (read it before any Pro copy).
  Code: `src/lib/plan.ts` (`PRO_PRICE_TND` 10/month or 100/year, `FOUNDERS_CAP` 100, `TRIAL_DAYS` 30).
  Behind `VITE_PRO_PLAN`; payments behind `VITE_PAYMENTS`. **Check whether they are live before promising anything.**

## Rules (from the strategy — non-negotiable)
1. Never sell trust: Pro ≠ verified. Proof levels stay free and earned.
2. No promise of clients. Pro = better shop window, tools and reach.
3. The free plan stays genuinely useful; say so in ads ("ou restez gratuit").
4. Paid visibility is labelled "Mis en avant".
5. Ali's showcase work is described as his ("conçu par Ali, avec des outils d'IA" where true). No fake pros,
   fake reviews, fake counts or stock photos passed off as real users.
6. The free month starts when the pro's **first service is published**, not at sign-up.

## Voice
- Primary: Tunisian Derja in Arabic script, short, warm, direct (« يا سلام », « خدمتك », « صنعتك »). Secondary line in French.
- Talk to the pro about **their craft and pride**, not about "a platform". Hook = their problem
  (Facebook groups bury them, no page to send, clients ask "fama photos?").
- One CTA per piece. Link in bio / WhatsApp.

## Funnel to measure (weekly, from Supabase — aggregated only)
reach → profile visits → sign-ups → **first service published** (north-star) → Pro trial → paid.
Write numbers into the "Where we are" section above.

## Playbook for the first 100 pros
1. **Hand-onboard, don't advertise first.** Ali's own network, local shops, Facebook artisan/tutor/design groups:
   DM → offer to build their first service *with* them (15 min call/WhatsApp) → founder post on our Instagram.
   Each founder post is content *and* social proof for the next pro.
2. **Category focus:** pick 2–3 categories and one city first, so Explore looks full there instead of empty everywhere.
3. **Founder series reels:** "شكون [name]؟" — 20–30 s story of one real pro (their consent, their photos). This copies
   the format that already performs.
4. **Paid ads only after ~20 real services** and only with the honest ad text from the strategy doc.
5. Run each idea as a cheap test with a pass/fail number decided in advance (use the Growth Experiments plugin).

## Motion videos with Revid
- Revid MCP (`https://www.revid.ai/api/mcp`): `render_video` → `get_project_status` → `export_video` / `publish_now`.
- Renders **cost Ali's credits**: show the prompt/script and ask before every `render_video`; **never** `publish_now`
  without explicit approval of that exact video.
- Prompts: brand colours (navy background, lime green #C6F24E-style accent, orange infinity logo), vertical 9:16,
  Derja subtitles, real Tunisian settings (medina blue/white, workshops), end card with the SkillLoop logo.
- Revid output goes through `media-studio` for subtitles fixes, brand end card and music when needed.

## Output
Save campaign plans, calendars and copy under `marketing/campaigns/<yyyy-mm-dd>-<slug>.md`.
