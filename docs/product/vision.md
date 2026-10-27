# SkillLoop — product vision (approved 2026-10-27; strategy only, nothing implemented)

## Context
SkillLoop today (live, free stack): explore/search, service pages with a written request (write → review → send), provider
profiles + portfolio, request statuses (pending/accepted/declined/cancelled), request-bound messaging, 3 languages + RTL,
SSR/SEO. Ali asks for a bold but realistic vision: become **the most trusted way in Tunisia to find, book and trust real
local expertise**, where experts are proud of their presence and great work travels by word of mouth — without becoming a
messaging app, classified ads, a generic course marketplace or a cold directory. Deliverable = vision, ranked concepts,
roadmap, non-goals, metrics, risks. No code, no dependencies now.

Research notes (2026): Tunisian online payment exists but is fragmented — Konnect (BCT payment-facilitator licence, ~1.6 %
local cards), Flouci (wallet + cards), ClicToPay (bank cards, slow onboarding), e-Dinar (La Poste). No public source found
on marketplace split-payments/payouts, nor solid data on how Tunisians find home-service pros (Facebook groups / WhatsApp /
family are a strong *hypothesis*, to validate with interviews). Sources: kolonell.com 2026 gateway comparison, dabafinance
(Konnect), kapitalis (payment habits), trade.gov Tunisia e-commerce guide.

## Challenging the assumptions first
1. **"Book" is the wrong first verb for most Tunisian services.** Repairs, renovation, events, design work are *quote-based*
   (diagnose → price → date). Fixed-slot booking fits lessons, coaching, beauty, some health-adjacent. → The core
   transaction should be an **accepted quote (un accord)**, with slots only where the service is truly slot-shaped.
2. **Payment is not the trust engine — proof is.** Most clients will keep paying cash for a long time; holding money
   brings licensing (BCT), disputes and support load. Trust can be built first with **verified completions**; money later.
3. **"Most trusted in Tunisia" starts as "most trusted in one city for three trades".** A marketplace with 400 empty
   categories feels dead. Density beats breadth.
4. **Stars are culturally fragile** (family pressure, revenge, politeness inflation). Structured, evidence-based feedback
   tied to a real job is stronger than a 4.8 average.
5. **Courses are a distraction until reputation exists.** They should be an expert's *extension*, not a second product.
6. **People will move to WhatsApp — let them.** Don't fight disintermediation with blocking; win by owning what WhatsApp
   can't: the **record** (agreement, proof of completion, reputation, recommendation).

## 1. Vision
**SkillLoop is the *carnet de confiance* of Tunisian know-how: every real job well done leaves a verifiable trace that
travels from one satisfied client to the next.**
For experts: a proud professional home (method, standards, work, availability) whose reputation grows with every
completed job. For clients: "who do I call?" answered by *proof from real people*, in their language, on their phone.
For both: an honest record of agreements and outcomes that makes the next recommendation effortless.

## 2. Feature concepts — ranked (impact × feasibility)
| # | Concept | Impact | Feasibility |
|---|---|---|---|
| 1 | Travaux vérifiés (verified completion) | ★★★★★ | ★★★★ |
| 2 | Carnet de l'expert (profile as a mini-site) | ★★★★★ | ★★★★★ |
| 3 | Recommander ce pro (job-backed recommendation) | ★★★★★ | ★★★★ |
| 4 | L'accord (structured quote = the booking) | ★★★★★ | ★★★ |
| 5 | Retour à deux clés (fair post-job feedback) | ★★★★ | ★★★ |
| 6 | Badges mérités (public, computed criteria) | ★★★★ | ★★★★ |
| 7 | Demande guidée (category briefs, photos of the problem) | ★★★★ | ★★★★ |
| 8 | Disponibilité simple → créneaux | ★★★ | ★★★★ |
| 9 | Qualité & litiges transparents | ★★★★ | ★★★ |
| 10 | Explore par la preuve (Experts à la une, fair rotation) | ★★★ | ★★★★ |
| 11 | Recherche en vrai tunisien (derja/français/franco-arabe) | ★★★ | ★★★ |
| 12 | Acompte sécurisé (deposit via a Tunisian gateway) | ★★★★ | ★★ |
| 13 | Confiance de quartier (aggregated local signals) | ★★★ | ★★★ |
| 14 | Ateliers & cours d'expert | ★★★ | ★★ |

**1. Travaux vérifiés.** *Problem:* reputation today is hearsay; anyone can claim experience. *Experience:* when a request
is done, the provider marks "travail terminé" (date, short scope); the client confirms in one tap ("Oui, c'est fait").
The job becomes a verified entry on the profile (category, city, month — never the client's identity without consent;
optional before/after photos with explicit client consent). *Trust/pride:* proof comes from both sides of a real
request; the expert's history becomes an asset. *Risks:* collusion (friends confirming) → only requests that went through
SkillLoop, rate limits, anomaly checks. *MVP:* add a `completed` state to the existing request flow + client confirmation
+ "N travaux vérifiés" on the profile.

**2. Carnet de l'expert.** *Problem:* a listing doesn't show *how* someone works. *Experience:* the profile becomes a
calm mini-site: identity and photo, "Ma méthode" (3 steps), "Mes engagements" (chosen from a short list: devis avant
intervention, je laisse propre, garantie X jours — self-declared, labelled as such), zone and languages, before/after
work, verified jobs, availability, services, and later workshops. Shareable as `skillloop/pros/<nom>`. *Pride:* looks
like a professional site they'd show family. *Risks:* empty profiles look sad → guided completion (existing
LoopProgress/checklist). *MVP:* method + engagements + before/after pairs on top of the current /pros page.

**3. Recommander ce pro.** *Problem:* word of mouth is invisible and gets lost in WhatsApp. *Experience:* after a
confirmed job, the client gets "Recommander Karim" → a share card (WhatsApp/Messenger) with the pro's name, trade, city
and "Recommandé par un client vérifié" (or the client's first name if they opt in). The recipient lands on the profile;
a request from that link is attributed. The pro sees "3 recommandations" — never who received them. *Trust:* every
recommendation is backed by a real job. *Ethics:* rewards, if any, are non-cash and go to the *pro's visibility*, not
the client (no paid reviews). *MVP:* recommendation link + OG card + attribution count (builds on share-kit).

**4. L'accord.** *Problem:* misunderstandings on price/scope/date cause most disputes. *Experience:* the provider answers
a request with a structured quote (scope, price or range, date/slot, materials, validity); the client accepts → a dated
"accord" both can see (and print). Changes = a new version, both visible. This is the booking for quote-based work.
*Trust:* a shared written record; basis for disputes and later deposits. *Risks:* friction for tiny jobs → "accord
rapide" (price + date only). *MVP:* quote message type + accept/decline + accord page.

**5. Retour à deux clés.** *Problem:* fake, revenge and pressure reviews. *Experience:* only after a confirmed job; both
sides give feedback within 14 days, revealed together (or at deadline). Client criteria: qualité, ponctualité, prix
respecté, communication, propreté (yes/partly/no + short text); no star average front and centre. Provider can reply
once publicly. Disputed feedback is held during a quality review. *Risks:* low response rate → one-tap criteria first.
*MVP:* criteria + text, simultaneous reveal, reply.

**6. Badges mérités.** Public, computed, revocable, criteria shown on tap: "10 travaux vérifiés", "Répond en moins de
24 h (30 derniers jours)", "Accords respectés", "Identité vérifiée" (manual ID check, later), "Activité déclarée"
(patente/RNE checked, later). Never sold, never decorative. *MVP:* 2–3 computed badges.

**7. Demande guidée.** Category-specific brief (e.g. clim: marque, symptôme, étage, photos; cours: niveau, objectif,
fréquence) + up to 3 photos of the problem. Better first message = fewer back-and-forth = less WhatsApp leakage.
*MVP:* templates for the 3 launch categories (extends the existing request composer).

**8. Disponibilité simple → créneaux.** Phase A: "Disponible cette semaine / ce mois / complet" + working days/zone.
Phase B: real slots only for slot-shaped services (cours, coaching, beauté). *MVP:* availability status (already partly
in professional_details) shown on cards and filters.

**9. Qualité & litiges transparents.** Published policy, "Signaler un problème" on any accord, mediation within a stated
delay, a sanctions ladder (warning → badge removal → suspension), and a public "how we handle problems" page. *MVP:*
report form → admin queue → outcome message.

**10. Explore par la preuve.** "Experts à la une" ranked by verified jobs, recent activity, response quality — with a
fixed share of slots for new pros (fair rotation), never paid placement disguised as quality. Filters: ville, quartier,
langue, disponible cette semaine. *MVP:* sort by verified jobs + "nouveaux talents" row.

**11. Recherche en vrai tunisien.** Synonyms and spellings from real queries ("clim", "klimatiseur", "sbayki",
"prof math bac") mapped to categories; zero-result queries reviewed weekly. *MVP:* curated synonym list + search logs
(privacy-safe). AI only later and only to suggest, never to rewrite user text silently.

**12. Acompte sécurisé.** Optional deposit on an accord (e.g. 20–30 %) via a licensed Tunisian gateway, released on
completion or per policy. *Reality check:* holding/splitting funds needs a provider model that allows it (Konnect's
payment-facilitator route is the likeliest; confirm with providers + legal advice). *MVP:* none in phase 2a — first
"paiement direct au pro" with the accord as record; pilot deposits with a few pros only after demand is proven.

**13. Confiance de quartier.** "Recommandé à 4 voisins de Sahloul ce mois" — aggregated, delayed, never exposing who or
which conversation; opt-in neighbourhood on profiles. *Risk:* privacy (INPDP) → aggregate thresholds (≥3) only.

**14. Ateliers & cours d'expert.** Live group workshops first (date, places, price, location/online), booked with the same
accord/slot machinery; recorded courses only for experts with verified reputation, presenting their *method*; access
control + materials; feedback feeds reputation. *Risk:* becoming a course site → courses always live on the expert's
carnet, never a separate catalogue.

## 3. Roadmap
**Phase 1 — Foundation & trust (3–4 months, mostly existing stack, no money flows)**
- Pick a beachhead: **one city (Sousse or Tunis) × 3 trades** (e.g. clim/électricité, cours particuliers, design/digital);
  recruit 30–50 real pros by hand.
- Ship: #2 Carnet (méthode, engagements, avant/après) · #1 Travaux vérifiés · #7 Demande guidée · #6 two computed badges ·
  #9 report flow + policy page · legal pages filled · account deletion · cross-device read markers.
- Data: request `completed` state + confirmation, completion record table, before/after media with consent flags.

**Phase 2 — Accord, reputation & (careful) payment**
- #4 L'accord (quote → accept → record) · #5 Retour à deux clés · #3 Recommander ce pro (+ attribution) ·
  #8 availability status, then slots for lesson-type services · #10 Explore par la preuve.
- Payment pilot: research + contract with a Tunisian gateway; deposits for a small pro cohort; refunds/no-show policy.

**Phase 3 — Learning, referrals & advanced discovery**
- #14 workshops (then recorded courses for proven experts) · #11 search vocabulary + AI suggestions · #13 neighbourhood
  signals · second city/trades expansion driven by referral data · identity/activity verification badges.

## 4. Deliberately NOT build
Open chat between strangers or a social feed · star-average leaderboards · paid ranking presented as quality · reviews
without a completed job · points/gamification for clients · AI-written reviews or profiles published without the pro's
edit · a generic video-course catalogue · full escrow wallet in v1 · native apps before web product-market fit ·
regulated medical services without licence verification · scraping/importing "providers" who never signed up.

## 5. Metrics that prove it (no vanity)
- **Verified completion rate:** requests → accord → confirmed completion (per category, per city).
- **Recommendation share:** % of new requests coming from a "Recommander" link — *the* word-of-mouth metric.
- **Repeat & referral clients:** % of clients with a 2nd job or who recommended within 90 days.
- **Time to first verified job** for a new pro (and % reaching it within 30 days).
- **Provider response quality:** median first-response time; % requests answered within 24 h.
- **Agreement integrity:** % of accords completed as agreed; dispute rate and median resolution time.
- **Search success:** search → request in the same session; zero-result query rate.
- **Pro retention:** pros with ≥1 request per month, by cohort.
Not tracked as goals: page views, sign-ups, number of listings, average star rating.

## 6. Biggest risks → mitigation
1. **Cold start / empty marketplace** → beachhead density, hand-recruited pros, "Recommander" loop from day one.
2. **Disintermediation to WhatsApp** → keep the record valuable (accord, proof, reputation), don't block contact.
3. **Gamed reputation** → completion-only feedback, simultaneous reveal, anomaly checks, transparent sanctions.
4. **Payments/legal** (BCT, consumer law, INPDP) → no fund holding until a licensed partner + legal review.
5. **Moderation load** → narrow scope, clear policies, small admin tooling before scale.
6. **Privacy of homes and people** (before/after photos, neighbourhoods) → explicit consent, aggregation thresholds.
7. **Overbuilding** → each phase gated on the metrics above, not on feature count.

## 7. Single strongest recommendation
**Make the verified job the atom of SkillLoop.** Build everything around "a real job, confirmed by both sides" — it feeds
the expert's carnet (pride), the honest feedback (trust), the badges (earned), the recommendation link (word of mouth)
and later the deposit (payment). Launch it in one city with three trades before adding booking calendars, payments or
courses.

## Next step (after approval)
Turn Phase 1 into an implementation plan for the existing codebase (requests flow, profiles, media consent, policies),
with migrations prepared and approved one by one as before; validate the Tunisian-behaviour hypotheses with 10–15 short
interviews (5 clients, 10 pros) before Phase 2.
