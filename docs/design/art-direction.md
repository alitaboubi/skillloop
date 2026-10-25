# SkillLoop art direction — "Mapped loop" (proposal, 2026-10-25)

Status: **proposal + proof** (home page, listing card, service detail). Rollout to every page waits for approval.

## 1. Audit (from the code; rendered pages still need a browser pass)

**Generic / weak**
- **Violet is the de-facto primary** (`--primary`/`--violet` oklch(0.56 0.21 281); ~140 uses): links, prices, category badges,
  selected chips, icons, step lines, the hero glow, the loop line. That is the generic SaaS purple, and because it is on
  everything it carries no meaning — price, navigation, category and selection all look the same.
- **Hero = navy + violet radial glow** — the purple-gradient pattern the brief rules out.
- **One weight everywhere**: `font-extrabold`/800 on display, section titles, card titles and prices → flat hierarchy;
  in Arabic 800 is heavy.
- **Same box repeated**: `rounded-2xl/3xl + border + shadow-card` panels; the service detail sidebar stacks three
  equal panels (request, trust, provider) so the action doesn't stand out.
- **Home rhythm**: 9 sections with the same "title + grey subtitle" pattern; discovery is split across hero jump chips,
  category tiles, "needs" chips and location chips.

**Usability / flow**
- Service detail on mobile: price shown twice (inline card + sticky bar); the sticky bar sits *above* the bottom nav,
  so two fixed bars take ~7.5rem of a small screen.
- Primary actions alternate between violet and lime buttons with no rule.

**Worth keeping (the brand)**
- The **infinity loop** logo + spark, and **BrandBackdrop**'s topographic contour lines (local ground) — a real
  signature. Deep navy/ink surfaces + **lime** — distinctive and high-contrast. The find/offer intent switch.
  Category icons. Honest content (no fake stats/reviews). The motion system (reduced-motion safe, no hidden content).

**Mobile / RTL / dark (code-level)**
- RTL basics are right (logical properties, mirrored arrows, letter-spacing reset, taller Arabic display line-height).
- Dark mode works by token, but violet text on dark violet-soft surfaces is low-contrast-prone; needs a browser check.
- Arabic headings at weight 800 → use 700.

## 2. Direction: "Mapped loop"
A local map with one bright route through it: calm ink and sand surfaces, a single high-energy colour for action,
warm clay for human/editorial accents, sea blue for navigation. The loop line is the route.

| Role | Token | Light | Dark | Used for |
|---|---|---|---|---|
| Base / brand surface | `--ink` | oklch(0.20 0.045 255) | oklch(0.14 0.03 255) | hero, footer, strong text on chips |
| **Action** | `--lime` | oklch(0.89 0.20 128) | same | primary CTA, selected/active, progress — nothing else |
| Navigation / info | `--sea` | oklch(0.50 0.13 245) | oklch(0.76 0.11 238) | links, focus ring, info notes, secondary icons |
| Human accent | `--clay` / `--clay-strong` | oklch(0.66 0.15 45) / 0.52 | oklch(0.74 0.13 48) / 0.78 | eyebrows, category icons, "New", editorial highlights (text uses `clay-strong`) |
| Success / warning / danger | `--success` `--warning` `--destructive` | existing / oklch(0.78 0.15 80) / existing | adjusted | status only, always with icon + text |
| Surfaces | `--background` (sand), `--card`, `--surface-sunken` | warm off-white / white / 0.955 sand | ink tones | |

Price is **ink** (not a brand colour). Violet is retired (migrated to sea/clay/ink by role during rollout).

**Typography** — keep Plus Jakarta Sans + Noto Sans Arabic (already loaded; no new font fetch). Display 800 tight
(Arabic 700, line-height 1.3); headings 700; body 400/500, 16px, line-height 1.55 (Arabic 1.75); prices tabular.
Eyebrows: small caps-style uppercase in Latin, normal case in Arabic.

**Shape & depth** — radius 10px controls, 16px cards, 20px feature panels; pills only for chips/tags. Two depth
levels: flat + hairline border (default), raised (`--shadow-raised`) only for the one primary panel per page,
overlays and sticky bars. No glass.

**Icons** — lucide at 16/20px; tinted icon tiles only for categories (clay) and info rows (sea).

**Motion** — existing system: mount-only entrances (≤200 ms stagger), 150 ms hover/press, `translateY(-2px)` +
border tint on hoverable cards (hover-capable pointers only), opacity/transform only, reduced-motion respected,
no infinite loops, nothing hidden before JS.

**Signature** — the **loop route**: contour-map ground + the infinity loop drawn in clay with the lime spark that
follows the visitor's intent; a lime loop stroke under the hero highlight; the same loop as progress (LoopProgress,
wizard, request timeline) during rollout.

## 3. CSP
All of this is CSS tokens, inline SVG and existing fonts — no new external assets, no new script/style sources.

## 4. Proof batch (2026-10-25) — APPROVED by you
Changed:
- `src/styles.css`: Mapped-loop tokens in light + dark (ink, sea, clay, warning, surface-sunken, gradient-ink,
  shadow-raised); utilities `bg-ink-hero`, `eyebrow`, `listing-card`, `tag`/`tag-ink`/`tag-sea`/`tag-new`,
  `panel`/`panel-action`, `icon-well-clay`/`icon-well-sea`, `link-sea`; `cat-tile`, `steps-line`, `media-fallback`,
  `info-icon` recoloured; Arabic display weight 700. Violet tokens still defined (rest of the app unchanged).
- Home (`home-hero.tsx`, `routes/index.tsx`), listing card + skeleton (`site.tsx`), service detail incl. request
  box states (`routes/services.$id.tsx`).
- Spill-over by design (brand signature): the loop in `BrandBackdrop` and the logo loop are clay on every page.
- `src/test/theme-tokens.test.ts`: enforces the :root/.dark token rule.
Verified by me: typecheck, 300 tests, build, lint (no new rules), server-rendered HTML of /, /services/<id>, /explore
(200, titles unchanged, new classes present), WCAG contrast of every new colour pair in both themes ≥ 5.1:1.
NOT verified: how it looks — needs a browser pass (light/dark, fr/ar, desktop/phone).

## 5. Batch 3 — shared design system (2026-10-25)
- Tokens: primary = ink (inverse in dark), secondary = sea-soft, accent (menu hover) = neutral sand (was lime),
  ring = sea, navy = ink values, gradient-hero = gradient-ink; violet aliases sea (retired).
- Components (src/styles.css): btn (12px radius; hover/focus/pressed/disabled/busy), btn-lime, btn-ink (new),
  btn-outline, btn-danger (new), btn-violet/badge-violet kept as aliases; field (sea focus ring, danger invalid ring);
  chip (selected = lime); segment (selected = lime); card-interactive (flat); badge-warning/badge-muted (new);
  kicker = clay; section-title 700; bubble-own (new).
- Status tones by meaning: pending = warning, accepted = success, closed = muted (statusTone + test updated).
- Overlays (ui/dialog, alert-dialog, sheet, drawer): ink scrim, card surface, raised, 20px radius, faster sheet,
  RTL fixes (close button end-4, text-start headers, gap footers). Toasts: card, raised, status edge (border-s) + icon.
- Avatar fallback = clay. All violet classes in routes/components migrated by role (0 left).
Verified by me: typecheck, 300 tests, build, lint; server render of all 16 routes (status codes unchanged, 0 violet);
WCAG contrast of every new state pair ≥ 5.26:1 in both themes. NOT verified: the rendered look (browser).

## 6. Batch 4 — public discovery pages (2026-10-25)
- Behaviour change (approved by you): below 768px on a service detail page the request bar is the only fixed bottom bar —
  the bottom nav is hidden there (sticky header + breadcrumb stay). Pure CSS (`.app-shell:has(.request-bar)`), so it holds
  in the server HTML before JS; the 404 page keeps the nav. The bar sits on the safe area (padding includes
  `env(safe-area-inset-bottom)`), the shell reserves its height so it never covers the footer/content, and
  `scroll-padding-bottom` keeps focused form controls above it. Browsers without `:has()` keep the old stacked layout.
- Side fix on every page (phones): the bottom-nav space moved from `<main>` to the shell, so the nav no longer covers
  the end of the footer.
- Explore: filter column = flat `panel`; result counts inherit the chip colour (readable on lime); active-filter chips
  are sunken with an outline (distinct from lime "selected"); "clear" is a sea text link; sheet footer on the card surface.
- Provider profile: clay eyebrow, display-weight name, facts as sea tags, "not accepting" = muted status, details = `panel`,
  cover icons clay (lime kept for actions).
- Content pages: intro kicker clay on ink (5.5:1 light, 8.3:1 dark), process steps = clay icon well + sea number,
  final CTA uses the display title, notes on `surface-sunken`; /professionals intro matches PageIntro.
Verified by me: typecheck, 300 tests, build, lint (no new issues), server render via dev server (/, /explore,
/explore?category=tech, /about, /how-it-works, /professionals, /login 200; /nope and an unknown service 404;
service + profile titles, canonical and JSON-LD present; request bar only on a real service page). NOT verified: the look.

## 7. Batch 5 — auth and offer flows + profile photo (2026-10-25)
- Profile photo (your request): /pros/$id shows a framed portrait (`ProfilePhoto` in media-viewer.tsx; 128px, card mat,
  thin clay ring, raised) that opens the existing accessible lightbox (Esc/close, focus returns) with the full photo;
  a small ink "enlarge" badge shows it's tappable. No photo → initial letter in the same frame, not clickable.
  New strings pp_open_photo / pp_photo_alt (fr/en/ar).
- Auth (login, signup, forgot, reset): raised card, display title, line divider for "or"; on phones the card padding is
  16px so the inner width is ≥ 300px from a 360px screen up and the Turnstile widget (300px, settings unchanged) is never
  clipped; widget centred. Links = link-sea. Buttons show the busy state (aria-busy). Behaviour change: the
  "send link" button on /forgot-password is disabled while sending (prevents double sends; same messages).
  Known limit: on screens narrower than ~340px the 300px widget can still touch the card edge — fixing that would need
  the widget's compact size, which I did not change (CAPTCHA rendering option; needs your OK).
- Offer wizard: the form is the page's primary panel (panel-action, lime edge); success screen also panel-action; sign-in
  prompt = panel; quote note sunken; busy states via aria-busy; review "card preview" label = eyebrow. PageHero titles
  use the display style (offer, dashboard and other private pages).
- AI panel (still disabled): the suggestion box label is sea with the sparkle icon so a suggestion is visibly different
  from the user's own text; the replace confirmation is a sunken box. No flow change (Use/Add/Replace + confirm kept).
Verified by me: typecheck, 300 tests, build, lint (no new issues), dev-server render (/login, /signup, /forgot-password,
/reset-password, /offer, /explore, profile, service 200; /nope 404; profile photo button + canonical in the HTML; login
noindex). NOT verified: the look.

## 8. Batch 6 — dashboard, settings, requests, messages + your two requests (2026-10-25)
- One avatar frame everywhere (your request): `avatar-ring` (card mat + thin clay ring) on the header account menu
  (was a lime ring), Avatar (messages, service provider box) and the round photo picker in settings; the dashboard
  profile preview uses the same framed ProfilePhoto as /pros (clickable to enlarge). Initial fallback = clay.
- Pointer flow on the dark banners (your request): page intros and the profile cover (BrandBackdrop "intro") —
  with a mouse, a soft lime→clay glow follows the pointer, the lime spark glides along the small loop to the closest
  point, and the contour/loop layers shift a few px for depth (`useIntroFlow` in brand.tsx). Transform/opacity (+ the
  spark's dash offset, as on the home hero) only; frame loop stops when settled; touch devices and reduced motion keep
  the static artwork; nothing is hidden. No CSP impact (inline SVG, no new assets).
- Dashboard: panels flat (`panel`), the "ready to share" card is the primary panel (panel-action); become-provider band
  on the ink surface; draft = muted status, "waiting since" = warning; portfolio tiles flat (not hover-lifting, as they
  aren't links); mode switch / profile tabs on ink with lime selection.
- Requests: decline/delete = btn-danger; the confirm box is sunken with a border (confirmation step kept).
- Messages: conversation list rows bordered (selected = sea outline + sea-soft), thread = panel; own bubbles unchanged.
- Settings: busy save buttons (aria-busy).
Verified by me: typecheck, 300 tests, build, lint (no new issues), dev-server render (/, /explore, /about, /dashboard,
/profile, /messages, /offer, profile, service 200; /nope 404; glow + framed photo in profile HTML). NOT verified: the look.

## 9. Batch 7 — mouse motion on empty surfaces + consistency pass (2026-10-25)
- PointerField (brand.tsx, styles "Pointer field"): a faint map dot-grid on empty surfaces that lights up around a mouse —
  a lime "torch" that stretches slightly in the direction of travel, a slower clay trail, a wide halo and a ring on click
  (light surfaces: clay torch, sea trail). The grid is a static CSS mask; only the lights move (transform/opacity), one rAF
  loop that stops when settled. Touch and reduced motion: static grid only. No new assets/scripts (CSP unchanged).
  Placed on: page intros + profile cover (replaces the batch-6 glow; spark + parallax kept), PageHero (private pages),
  final CTA bands, home CTA, /professionals hero, auth background, dashboard become-provider band, footer, every
  EmptyState (light tone; icon now in a clay well) and the 404 page. Not on the home hero (it has the loop spark already)
  nor on error states (an alert shouldn't play).
- Consistency: explore search bar raised + bordered; last legacy badge-soft → tag-sea (sketch label, AI demo badge);
  crop "apply" busy state; home section/CTA headings 700/display. Header focus rings stay lime (on the dark header sea
  would be too low-contrast — intentional exception).
- Responsive scan: every fixed-width grid sits behind a breakpoint (no 360px horizontal scroll from layouts found).
Verified by me: typecheck, 300 tests, build, lint (same 22 pre-existing fast-refresh warnings), dev-server render of 21
routes (status codes unchanged: 404 for /nope and unknown service; robots/sitemap 200). Checklist:
docs/design/route-checklist.md. NOT verified: the look and the motion (browser).

### Remaining issues (honest list)
1. ~~Not visually verified~~ — you reported all checks done (2026-10-25).
2. No privacy / terms pages exist (/privacy, /terms → 404). Needed before launch; needs your operator/legal details —
   not written by me (no invented legal text).
3. Turnstile on screens < ~340px wide may touch the card edge (compact size needs your OK).
4. Pointer motion performance on low-end laptops not measured (one rAF loop per hovered surface; stops when idle).
5. 404 page has no `noindex` meta (real 404 status already keeps it out of search; pre-existing).
6. Concurrent-upload cleanup at the upload limit — still unresolved (runbook).
7. Lint: the repo doesn't follow its Prettier rule (2,600+ formatting errors, pre-existing); only non-format rules checked.
8. AI stays disabled; production deploy not approved.

## 10. Follow-ups (2026-10-25)
- Tab icon: public/favicon.svg redrawn in the Mapped-loop colours (ink #07162a, clay loop #ed905e, lime spark #b4f24e — the
  old one was the violet loop); linked as /favicon.svg?v=2 so browsers drop the cached violet icon.
- Home hero badge: a soft grey sheen crosses it and the lime dot pings, 3 times after load (every ~4 s) then rests;
  hovering the hero replays it once. Not endless, by the motion rule. Static under reduced motion.
