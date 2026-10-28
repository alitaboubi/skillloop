# SkillLoop — design & experience upgrade (proposal, 2026-10-27)

Status: **Phase 1 and Phase 1.5 implemented locally (2026-10-27), awaiting your visual approval — not committed or deployed.** Prévenez-moi table prepared, NOT applied (form hidden). Earlier status:
**research + proposal only.** No code, dependency, database, email or deployment change. Builds on the approved
vision in `docs/product/vision.md` (“the carnet de confiance of Tunisian know-how”).

---

## 1. Research synthesis

### 1.1 What the best products teach (principles, not looks)
| Product | What it gets right | What SkillLoop takes |
|---|---|---|
| Airbnb | Host identity + two-sided reviews; reviews hidden until both sides write (field experiment: more reviews, less retaliation, lower — more honest — ratings) | **Retour à deux clés** with simultaneous reveal |
| Thumbtack | Shows *proof of activity* (“hired N times on the platform”), response time, price guidance before contact | Computed facts from real jobs, response time, honest price ranges |
| TaskRabbit | Clear task scope + time-slot booking for slot-shaped work | Slots only where work is slot-shaped |
| Upwork / Fiverr | Reputation computed from outcomes (job success, levels with published criteria); milestones/escrow | **Earned** badges with public criteria; payment *later* |
| Calendly | Availability is legible in one glance | Availability chip on every card |
| Stripe, Linear, Notion | Calm, precise typography; dense information without noise; docs-grade clarity | Calm hierarchy, fewer type sizes, no decorative motion |
| Monzo, Revolut | Plain-language money, transparent fees, status always visible | Accord + status written like a receipt |
| MasterClass, Coursera | Expert-led learning sells *the person and the method* | Workshops live on the expert's carnet |
| Duolingo | Progress that motivates | Only for the pro's profile completion — never gamify clients |

**Reject:** star-average leaderboards (inflation is well documented on two-sided platforms), endless feeds, urgency
nudges (“3 people are looking”), paid “top” placement shown as quality, generic stock imagery.

### 1.2 Tunisian reality (facts where found; hypotheses marked)
- **Cash dominates.** A June 2026 statement (CNUCED economist) puts ~86 % of online transactions as cash on delivery; a
  2024 barometer measured 56 % COD; only ~38 % of Tunisians have a bank account and ~8.7 % buy online (CONECT, 2026).
  → Pay-in-person must stay first-class; digital deposits are an option, never a gate.
- **Global rails are not available.** Stripe's official country list does not include Tunisia (a Tunisian business can't
  sign up directly); PayPal has long been restricted by the BCT, and a 2025 bill to lift limits is not confirmed as
  passed. Local options exist: Konnect (BCT payment-facilitator licence), Flouci, ClicToPay, e-Dinar.
- **Competitors exist.** Ijeni (home services, since 2020, profiles + reviews), ProTunisie (≈20 trades, solar-heavy,
  35 partners claimed mid-2026), a new “Khidme” app (unverified). → SkillLoop must not be “another directory”; its edge is
  **proof + expert pride + word of mouth**.
- **Hypotheses to validate in interviews** (no reliable public data found): people ask family/neighbours first, then
  Facebook groups and WhatsApp; voice notes and photos are the natural way to describe a problem; search mixes French,
  derja in Arabic script and franco-arabe (“klim”, “sbayki”); trust barriers = price surprises, no-shows, letting a
  stranger into the home, unverifiable claims.

### 1.3 What global products get wrong for Tunisia
Card-first payment flows; stars without context; English-first copy translated literally; calendars for work that is
really quote-based; “trust badges” that are bought; ignoring that the deal often finishes on WhatsApp and in cash.

### 1.4 Evidence of what makes trust work in local services
1. **Verifiable identity of the person** (face, name, place) beats brand logos.
2. **Proof of real work** (photos with context, jobs confirmed by the other side).
3. **Clear agreement before work** (scope, price, date) — most disputes are mismatched expectations.
4. **Honest, reciprocal-safe feedback** (simultaneous reveal; feedback only after a real job).
5. **Responsiveness** shown as a fact, not a claim.
6. **A visible, fair process when things go wrong.**

---

## 2. Product-design principles
1. **Proof before claims.** Every statement carries its level of proof (see §5 *Niveaux de preuve*).
2. **The person before the listing.** A face, a name, a method — then the services.
3. **Calm confidence.** Quiet surfaces, one primary action per screen, no glow for its own sake.
4. **Local first.** Dinars, neighbourhoods, derja-friendly words, cash-friendly flows, WhatsApp as a channel not an enemy.
5. **No fake signals.** No invented counts, no bought badges, no urgency theatre. Empty is honest.
6. **Write like a trusted neighbour.** Short, respectful, concrete; Arabic written natively, not translated.
7. **Agreement over chat.** Messages serve a request; decisions become records (accord, completion).
8. **One screen, one job.** Mobile first; every step understandable in 5 seconds.
9. **Motion explains, never decorates.** Reveal state changes; ambient effects only on the hero.
10. **Accessible by default.** 4.5:1 text, ≥16 px body on mobile, RTL-native, reduced-motion respected, SSR content.

---

## 3. UI audit (current live product + code)
**Supports the vision:** clear role-based palette (ink/lime/sea/clay); honest empty states (no fake listings); write →
review → send request; SSR/SEO; RTL and dark mode throughout; real founder presence; request statuses; ShareKit.

**Weakens it (highest impact first):**
1. **The marketplace feels empty** — Explore and home show “Aucun service publié” today; the empty state invites
   publishing but doesn't help a *client* (no “ask your network”, no “we'll tell you when”).
2. **Cards are listing-first** — provider is a small text line; no face, no proof, no availability.
3. **Profiles are a page, not a carnet** — bio + services + portfolio; no method, standards, zone, proof level.
4. **The request ends at “accepted”** — no agreement record, no completion, nothing to recommend.
5. **Too much decorative motion after the redesign phases** — 24 PointerField placements (footer, auth, empty states,
   CTA bands, banners) plus highlight frames and glows; individually subtle, together they contradict “calm”. Challenge
   to my own earlier work: keep the hero spark and the founder card; remove ambient motion elsewhere.
6. **Small text** — 84 `text-xs` and several 10–11 px sizes (badges, nav labels) hurt mobile readability.
7. **Inconsistent vocabulary** — French copy uses “professionnel” (38×) and “prestataire” (21×) for the same person; the
   word “expert” is never used although the vision is expert-first.
8. **Shape drift** — 7 radius values (lg, xl, 2xl, 3xl, full, 1.25rem, 2px); badges vs tags vs chips overlap in meaning.
9. **Trust signals have no hierarchy** — “Nouveau”, category tag, status badge and verified badge share similar styling.
10. **Legal pages in MSA vs UI in derja** — fine for legal, but the tone shift should be intentional and explained.

---

## 4. Design-system proposal (evolution, same brand)
**Colour — semantic tokens on top of the existing palette**
| Token | Role | Light / dark direction |
|---|---|---|
| `surface` / `surface-raised` / `surface-sunken` | page / cards & menus / wells | sand-white / ink tones (as today) |
| `text` / `text-muted` / `text-subtle` | body / secondary / metadata (≥4.5:1 all) | — |
| `action` (lime) + `on-action` (ink) | the one primary action, current step, selection | unchanged |
| `link` (sea) | links, focus ring, info | unchanged |
| `human` (clay) | eyebrows, people, the loop | unchanged |
| **`proof-confirmed`** (sea-deep) | facts confirmed by a client on a real job | new semantic, sea family |
| **`proof-verified`** (ink + lime check) | facts SkillLoop checked (ID, activity) | new semantic |
| `declared` (neutral outline) | what the pro states about themselves | new semantic, deliberately quiet |
| `status-success` / `warning` / `danger` / `muted` | request & accord states, always with text | existing |

**Type** — keep Plus Jakarta Sans + Noto Sans Arabic. Scale (mobile → desktop): Display 40→64 (800, hero only) ·
H1 32→48 (700) · H2 24→32 (700) · H3 20→22 (600) · Body 16→17 (400/500, line-height 1.6; Arabic 1.75) · Small 14 (500) ·
**no text under 14 px** (badges included). Tabular numbers for prices, dates and counts.

**Spacing** 4-pt base: 4 8 12 16 24 32 48 64 96. Sections 64 mobile / 96 desktop.
**Radii** reduced to four: 8 (chips-small, inputs inner) · 12 (buttons, fields) · 16 (cards) · 24 (panels, sheets) ·
full only for avatars and pills.
**Borders & elevation** — level 0 flat + hairline (default) · level 1 raised (primary panel, menus, sticky bars) ·
level 2 overlay (dialogs, sheets). Shadows soft and low; no coloured glows.
**Iconography** — lucide line icons at 16/20/24, 1.75 stroke; one icon per meaning (proof = check-seal, declared =
pencil-line, availability = calendar-dot). **Illustration** — the contour-map + loop line only; real photos of real work;
no stock, no mosaic/jasmine clichés: “Tunisian” comes from words, places, dinars and people, not ornaments.

**Components (spec summaries)**
- **Expert card** — face (1:1), name, trade, city/zone, availability chip, 1–2 proof facts (“12 travaux confirmés”),
  languages; tap → carnet. Services secondary.
- **Service card** — work photo or category tile, title, price (or “sur devis”), expert mini-row (face + name),
  availability; proof fact if any.
- **Trust badge** — three tiers by shape and colour: *Déclaré* (outline), *Confirmé* (filled sea), *Vérifié* (ink + lime
  seal); tap shows the criterion and date. Never decorative.
- **Status chip** — request/accord states with icon + word (en attente, accord proposé, accepté, terminé, confirmé).
- **Availability chip** — “Disponible cette semaine” / “Prochaine dispo : 12 nov.” / “Complet”, computed or declared.
- **Form field** — label above, help below, error in text + icon, 48 px touch height, voice/photo attachments where useful.
- **Empty state** — what's missing, why, and one useful next step for *this* viewer (client vs pro).
- **CTA** — one lime per view; secondary ink/outline; destructive red with confirmation.
- **Section header** — eyebrow (clay) + H2 + optional one-line lead; left-aligned (start-aligned in RTL).
- **Accord card** — receipt-like: parties, scope, price (TND), date/place, payment mode (“sur place”), version, status,
  actions (accepter / proposer une modification).
- **Review card** — criteria rows (qualité, ponctualité, prix respecté, propreté, communication) with words, short text,
  job context (category · month · city), pro's single reply; no stars as the headline.

**Motion** — three tiers: feedback (≤150 ms, press/hover), transition (200–300 ms, state changes, sheets), entrance
(once, below the fold only). Ambient motion only on the home hero and the presentation cover. Every effect opacity/
transform, instant under reduced motion.

---

## 5. Experience concepts (14)
Ratings: impact / feasibility, each 1–5.

1. **Niveaux de preuve** *(original, 5/5)* — Problem: users can't tell a claim from a fact. Experience: every fact on a
   carnet or card is labelled *Déclaré*, *Confirmé par un client* or *Vérifié par SkillLoop*, with a consistent visual
   language and a one-tap explanation. Builds trust honestly and lets new pros look good without faking. MVP: label
   existing profile fields as Déclaré; Confirmé arrives with #2. Risk: confusing at first → short legend on first view.
2. **Travaux vérifiés** (5/4) — provider marks done, client confirms in one tap; becomes a job entry (category, city,
   month; photos only with client consent). MVP: `completed` status + confirmation + count on carnet. Risk: collusion →
   only SkillLoop requests, anomaly checks.
3. **Carnet de l'expert** (5/5) — the profile as a mini-site: identity, “Ma méthode” (3 steps), “Mes engagements”
   (declared commitments), zone & languages, before/after, confirmed jobs, services, availability, workshops later.
   MVP: method + commitments stored in the existing profile details JSON (no schema change), before/after as portfolio
   pairs. Risk: empty carnets → guided completion with LoopProgress.
4. **Recommander ce pro** (5/4) — after a confirmed job: share card for WhatsApp with the pro's name, trade, city and
   “Recommandé par un client confirmé”; attributed requests counted for the pro. MVP: link + Open Graph card + count.
   Risk: spam → only from confirmed jobs, no cash rewards.
5. **QR du pro** *(original, 4/5)* — a printable QR card/sticker for the van, shop or business card that opens the carnet
   and, after a job, the “confirmer & recommander” screen. Brings offline word of mouth online. MVP: QR generated
   client-side (needs approval: tiny dependency or hand-written encoder) + print layout. Risk: low use → pilot with 10 pros.
6. **L'accord** (5/3) — structured quote → acceptance → dated record; changes = new version; payment mode explicit
   (“paiement sur place”). Shareable summary to WhatsApp so the deal can continue there *with* a record. MVP: quote message
   type + accept + accord page. Risk: friction for tiny jobs → “accord rapide”.
7. **Retour à deux clés** (4/3) — feedback only after a confirmed job, both sides within 14 days, revealed together;
   criteria in words; one public reply. MVP: criteria + text + reveal. Risk: low response → one-tap criteria first.
8. **Badges mérités** (4/4) — computed and revocable: “10 travaux confirmés”, “Répond en moins de 24 h”, “Accords
   respectés”; later “Identité vérifiée”, “Activité déclarée” (manual checks). Criteria public. MVP: 2 computed badges.
9. **Demande guidée** (4/4) — category questions + up to 3 photos (+ voice note later) so the first message is
   complete. MVP: templates for the 3 launch trades in the existing composer. Risk: long forms → max 4 questions.
10. **Disponibilité honnête** (3/4) — status chip (computed from recent replies or declared) everywhere; real slots only
    for lessons/coaching/beauty. MVP: declared status + “dernière réponse il y a 2 h”.
11. **Explore par la preuve** (3/4) — default sort by confirmed jobs and response quality, with a fixed “Nouveaux
    talents” row so newcomers get seen; filters city, neighbourhood, language, available this week. MVP: sort + row.
12. **Recherche en vrai tunisien** (3/3) — curated synonyms (FR, derja Arabic script, franco-arabe) → categories;
    zero-result queries reviewed weekly; “we don't have this yet — tell us” capture. MVP: synonym list + capture.
13. **Mode famille** *(original, 3/4)* — “Je demande pour un proche” (a parent's address, their phone for the day):
    reflects how Tunisians often organise help for family. MVP: a flag + contact note on the request. Risk: privacy →
    consent text, data minimal.
14. **Ateliers d'expert** (3/2) — live/group workshops on the carnet (date, places, price, place/online); recorded
    content only for experts with confirmed reputation. MVP later: workshop as a special service with seats.

(Also in the vision and kept: transparent quality & disputes; neighbourhood trust signals with ≥3 aggregation.)

---

## 6. Screen-level redesign
**Home** — *Weak:* many sections, empty listings, search-heavy hero, decorative motion. *Proposal:* hero = one
question (“De quoi avez-vous besoin ?”) + intent switch + 3 trade shortcuts for the launch city; then “Comment la
confiance se construit” (3 proof levels, 1 line each); then real experts (only when ≥6 exist, else “Nous démarrons à
Sousse — invitez un pro que vous recommandez”); FAQ. *Mobile:* hero question first, shortcuts as chips, no side text.
*RTL:* intent switch mirrored, numerals Western, names `dir=auto`. *Dark:* ink hero continues; cards raised one step.
*States:* loading = skeleton cards; empty = invite flow; error = retry.

**Explore** — *Weak:* filter-heavy, listing-first, dead empty state. *Proposal:* top: query + city/neighbourhood +
“disponible cette semaine”; toggle Experts | Services; results as expert cards by default for trades, service cards for
lessons; “Nouveaux talents” row; empty result = synonyms tried + “Prévenez-moi” + “Recommander un pro”. *Mobile:*
sticky search, filters as a bottom sheet with live count (exists). *States:* skeletons; zero-result capture; error retry.

**Provider profile — Carnet** — *Weak:* bio + lists. *Proposal (top → bottom):* identity header (face, name, trade,
zone, languages, availability, proof summary “12 confirmés · répond en ~3 h”) · primary action “Demander un devis” ·
**Ma méthode** (3 steps) · **Mes engagements** (declared, labelled) · **Travaux** (before/after pairs + confirmed jobs
timeline) · **Services** · **Retours** (two-key reviews) · **Ateliers** (later) · share/QR. *Mobile:* sticky bottom action
bar (as on service pages); sections as anchors. *RTL:* before/after order reads start→end. *Dark:* photos on sunken
surfaces. *Empty:* the pro sees a guided checklist; the public never sees empty sections (hidden).

**Service page** — *Weak:* service-centric, proof absent. *Proposal:* photo/work, title, price (“à partir de” / “sur
devis” with what changes the price), what's included, expert mini-carnet (face, proof, availability), request panel
(guided), similar *experts*. *States:* unavailable service → link to the expert's other services.

**Request flow** — *Proposal:* 1) guided questions + photos, 2) review (exact text the pro will see — keep), 3) sent →
timeline: envoyée → réponse → accord → terminé → confirmé → recommandé. Each step one screen on mobile. Copy explains
what happens next and when.

**Accord & verified completion (future)** — accord card in the thread; accept/modify; on the date, the pro marks done;
client gets “Le travail est terminé ?” (Oui / Pas encore / Un problème); “Oui” → feedback (two keys) → “Recommander”.
“Un problème” → quality process with visible steps and timing.

**Header / footer / forms / buttons / badges** — header: logo, search, Explorer, Pour les pros, account; footer: trust
& policies first (“Comment nous vérifions”, “En cas de problème”), then company. Forms 48 px fields, labels above.
Badges ≥14 px.

---

## 7. Copy & tone
**Voice:** respectful (“vous” in French), concrete, warm, never salesy; say what happens next; no exclamation stacks; no
“révolutionnaire”. **Vocabulary:** one word per role — **“pro”** in UI (short, natural in FR/derja/EN; “expert” for the
carnet concept and marketing headlines), **“client”**, **“demande”**, **“accord”**, **“travail confirmé”**.
**Arabic:** written in Tunisian derja first, Arabic script, short sentences; MSA only for legal; keep حريف for client.

| Moment | Français | English | العربية (تونسي) |
|---|---|---|---|
| Hero | Trouvez la bonne personne, sur la foi de vrais travaux. | Find the right person, backed by real work. | لقى الشخص المناسب، بشهادة خدمات تمّت فعلاً. |
| Proof legend | Confirmé par un client après un vrai travail. | Confirmed by a client after a real job. | أكّدها حريف بعد خدمة حقيقية. |
| Completion | Le travail est terminé ? | Is the job done? | الخدمة كملت؟ |
| Recommend | Recommander Karim à un proche | Recommend Karim to someone close | انصح بـ Karim لحد تعرفو |
| Accord | Voici ce qui est convenu. | Here's what you agreed. | هذا اللي تفاهمتو عليه. |
| Empty Explore | Pas encore de pro ici. Vous en connaissez un bon ? Invitez-le. | No pros here yet. Know a good one? Invite them. | مازال ما ثمّاش محترفين هوني. تعرف واحد باهي؟ استدعيه. |
| Declared label | Déclaré par le pro | Stated by the pro | صرّح بيها المحترف |

---

## 8. Phased implementation plan
**Phase 1 — Design foundations & quick wins (no DB change)**
- Goals: calmer, more legible, consistent; honest empty states that help clients.
- Screens: all shared components; home/explore empty states.
- Work: semantic tokens + proof tokens; type scale (no text < 14 px); 4 radii; remove ambient PointerField except hero;
  vocabulary pass in i18n (pro/client/demande); trust-badge component with three tiers (only *Déclaré* used yet);
  expert mini-row on service cards; empty states with “invite a pro / notify me” (notify = mailto or saved locally until
  a backend exists — decision).
- Files: `src/styles.css`, `src/components/site.tsx`, `states.tsx`, `brand.tsx`, `src/lib/i18n.tsx`, tests
  (`theme-tokens`, i18n completeness, a11y unit tests).
- Checks: contrast, 200 % zoom, RTL snapshots, reduced motion, SSR output unchanged in meaning.
- Success: search → request rate; profile views → request; no regression in Lighthouse a11y/perf.
- Approve: vocabulary (“pro”), motion reduction, type scale.

**Phase 1 — approved decisions (2026-10-27)**
- UI word for providers: **“pro”** (FR/EN); Arabic: **صنايعي** for trade categories (home, automotive), **محترف**
  otherwise; “expert” only for the carnet concept and marketing headlines.
- Ambient/decorative motion removed everywhere except the home hero and the founder card.
- No text below 14 px; calm system: semantic tokens, four radii, three elevation levels, refined type scale.
- Trust badge tiers — FR: Déclaré / Confirmé par un client / Vérifié par SkillLoop · EN: Declared / Confirmed by a client /
  Verified by SkillLoop · AR: مُعلَن / مؤكَّد من زبون / مُتحقَّق منه من SkillLoop. Only “Déclaré” is used until verified
  completions exist.
- Expert mini-row on service cards (face, name, trade, availability when known).
- Empty states explain SkillLoop to a first-time visitor with one clear next action.
- “Prévenez-moi”: email + confirmation; storage = a prepared Supabase table (insert-only, rate-limited, readable only by
  the operator) **not applied**; the form stays hidden on the live site until that migration is approved. No backend
  notifications yet.

**Phase 1.5 — Auth experience upgrade (approved 2026-10-27)**
- Split screen on desktop: form on one side; identity & trust story on the other (logo; “Trouvez la bonne personne, sur la
  foi de vrais travaux.”; three trust points: Des pros près de chez vous · Des travaux confirmés par de vrais clients ·
  Des recommandations qui voyagent; restrained contour/loop art; “Découvrir SkillLoop” → Explore).
- Sign-in: email, password, inline validation, “Mot de passe oublié ?”, “Se connecter”, link to sign-up, clear error and
  success states, language switcher (existing).
- Sign-up: role choice “Je cherche un pro” (client) / “Je propose mes services” (pro) with what each unlocks; email,
  password with visible requirements; terms & privacy acknowledgement; post-sign-up next step per role (client → Explore,
  pro → publish a service) using the existing return-to mechanism — no change to authentication logic, no new provider
  (existing Google sign-in kept as is, no new OAuth).
- Mobile: form first; identity becomes a compact header (logo + one trust line); 48 px fields; no layout shift.
- No ambient motion on auth pages; reduced motion respected; native RTL; SSR/SEO, keyboard and auth behaviour preserved.
- Recommendation-link context (“Vous avez été invité à découvrir Karim”): **future enhancement** — today's routing has no
  recommendation links; it lands with Phase 3's “Recommander ce pro”.

**Phase 2 — Carnet de l'expert & Explore par la preuve**
- Screens: `/pros/$id`, profile editors, Explore, cards.
- Work: méthode + engagements (in `professional_details` JSON, size-capped already), before/after pairs (portfolio
  extension → small migration), availability chip, Experts | Services toggle, “Nouveaux talents”, guided requests for 3
  trades, synonym search list.
- Files: `src/routes/pros.$id.tsx`, `src/components/profile-editors.tsx`, `src/routes/explore.tsx`,
  `src/lib/explore-filters.ts`, request composer; 1 migration (portfolio pairs) with tests.
- Success: % pros with complete carnet; time to first request for new pros; search success.
- Approve: carnet fields, before/after consent wording, migration.

**Phase 3 — Accord, verified completion, recommendations, availability, payment-ready**
- Work: request states `quote_sent/accepted/completed/confirmed`; accord records with versions; completion
  confirmation; two-key feedback; recommendation links + OG cards; computed badges; report & quality flow; payment mode
  field (“sur place”) ready for a future gateway.
- Files: new migrations (accords, completions, feedback, recommendations) + pgTAP tests; `request-actions.tsx`,
  `messages.tsx`, `request-timeline.ts`, `share.ts`.
- Success: verified completion rate; recommendation-driven requests; dispute rate/resolution time.
- Approve: each migration; feedback policy; dispute policy text; badge criteria.

**Phase 4 — Learning, referrals, advanced discovery**
- Workshops on the carnet; QR du pro; mode famille; neighbourhood signals (≥3 aggregation); deposit pilot with a licensed
  Tunisian gateway (separate legal/commercial decision).

---

## 9. Non-goals
Open chat between strangers · social feed · star-average leaderboards · paid ranking presented as quality · reviews
without completed jobs · generic video-course catalogue · full escrow wallet in v1 · native apps before product-market
fit · any fake verification, fake counts or invented social proof · decorative motion outside the hero.

## 10. Metrics (honest)
Verified completion rate · recommendation-driven requests (% of new requests) · repeat & referral clients (90 days) ·
time to first verified job for new pros · provider response quality (median first reply, % within 24 h) · agreement
integrity (% accords completed as agreed, dispute rate, resolution time) · search success (search → request,
zero-result rate) · provider retention by cohort · carnet completeness → first request. Not goals: page views,
sign-ups, listing count, average rating.

## 11. Risks → mitigations
- **Cold start:** one city × three trades; hand-recruit 30–50 pros; QR du pro + Recommander from day one; honest empty
  states that capture demand.
- **WhatsApp disintermediation:** embrace it — shareable accord summaries and recommendation cards; value stays in the
  record and reputation.
- **Gamed reputation:** completion-only feedback, simultaneous reveal, anomaly checks, public criteria, sanctions ladder.
- **Payment/legal:** cash-first; no fund holding until a licensed partner (Konnect/Flouci/ClicToPay) and legal advice;
  BCT and consumer-law review.
- **Moderation load:** narrow scope, report queue, templates, clear policies before scale.
- **Privacy of homes and people:** explicit consent for photos, no addresses public, neighbourhood signals aggregated.
- **Overbuilding:** each phase gated by the metrics above.

---

## Ending
1. **Strongest recommendation:** make SkillLoop the place where **a Tunisian pro's real work becomes visible proof** —
   the verified job, labelled by its level of proof, is the atom; the carnet is its home; the recommendation is how it
   travels.
2. **First design phase:** Phase 1 (foundations: calmer system, legible type, three-tier trust badge, expert-first
   cards, empty states that help clients) — no database change, fast, and it prepares every later surface.
3. **Decisions needed:** launch city and three trades · UI vocabulary (“pro” vs “expert” vs “professionnel”) · approval
   to remove ambient motion outside the hero · the three proof levels' names in FR/EN/AR · what “Prévenez-moi” stores
   before a backend exists · 10–15 interviews before Phase 3 (who and when).

Sources: stripe.com/global (Tunisia not listed); La Presse 2025 & African Manager on PayPal/BCT; La Presse Feb 2026 and
Tuniscope/Managers June 2026 on cash on delivery; kolonell.com 2026 gateway comparison; WeAreTech Africa on Ijeni;
Mosaïque FM on ProTunisie; Fradkin & Holtz / Columbia Business School on simultaneous-reveal reviews; U. Twente on
reputation inflation.

### Founder decision (2026-10-27, before deploy)
The pointer-driven flow comes back: PointerField (mouse-lit dot grid) on page heroes, CTA bands, footer, empty states, dashboard banner, 404 and the sign-in/sign-up story panel; the intro spark flow (useIntroFlow) on intros, the auth panel and the profile cover; the sliding lime nav indicator. Same safeguards: fine pointer only, nothing under reduced motion, transform/opacity only, decorative (aria-hidden). Scroll reveals, the home tile highlight and the logo spark stay removed.

### Phase 2 — decisions and status (2026-10-27)
- Carnet fields: **Ma méthode** (up to 3 short steps) + **Mes engagements** from a fixed list (devis avant intervention,
  je laisse propre, ponctuel ou je préviens, facture/reçu sur demande, je peux fournir le matériel, garantie de N jours).
  Stored in `professional_details`, labelled *Déclaré*, hidden publicly when empty. Built.
- Before/after consent wording (FR; EN/AR equivalent): « Le client m’a autorisé à publier ces photos. Elles ne montrent ni
  visage, ni adresse, ni plaque, ni document personnel. » Migration `20261028120000_portfolio_before_after.sql`
  **prepared, not applied**; UI behind `VITE_BEFORE_AFTER=on`.
- Guided requests: **all categories** (≤4 questions each). Built.
- Also built: Experts | Services toggle on Explore, “Nouveaux sur SkillLoop” row (fair rotation), Tunisian search
  vocabulary, availability chip on the profile header.
- Not in Phase 2 (needs a schema change, later): photos attached to a request, neighbourhood filter, “disponible cette
  semaine” (needs real availability data), default sort by confirmed jobs (needs Phase 3 verified completions).

### Honesty fix (2026-10-28)
The auth trust point « Des travaux confirmés par de vrais clients » is replaced by « Des pros qui montrent leur méthode et leur travail » until verified completions exist (Phase 3); the AI-draft mentions on How it works and the Pros FAQ are removed while AI is switched off.
