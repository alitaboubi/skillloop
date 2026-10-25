# Redesign — route-by-route browser checklist (2026-10-25)

Status of every row: **implemented, NOT visually verified** (my checks: typecheck, 300 tests, build, lint, server render
status codes). Tick a row only after you've seen it in a browser. For each route check: light + dark, French + Arabic (RTL),
desktop + phone (360px), keyboard focus visible, nothing overlapping.

Mouse motion (PointerField) = faint dot grid that lights up around a mouse; click ring. Must be absent on touch and with
"reduce motion" (Windows: Settings → Accessibility → Visual effects → Animation effects off).

| Route | What to look at | Batch | ✓ |
|---|---|---|---|
| `/` | hero spark + loop underline; search bar; category tiles (clay → ink hover); final CTA band with mouse motion | 2, 7 | |
| `/explore` | intro banner motion; filter panel; selected chip lime + readable count; removable filters; phone filter sheet + lime "show N" button; empty/no-match state with motion | 4, 7 | |
| `/services/<id>` | header tags; request panel (lime edge); phone: no bottom nav, only the request bar, footer visible, form not hidden; unknown id → 404 with nav | 2, 4 | |
| `/pros/<id>` | framed photo opens the lightbox; cover motion + spark; tags/statuses; details panel | 4, 5, 6 | |
| `/about`, `/how-it-works`, `/professionals` | intro motion, clay eyebrow, steps, notes, final CTA motion | 4, 7 | |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | background motion behind the card; Turnstile fully visible on a phone; busy buttons; error/notice boxes | 5, 7 | |
| `/offer` (+ `?edit=`) | page hero motion; wizard panel lime edge; steps; options; review; success; `?ai_demo=1` suggestion label | 5 | |
| `/dashboard` | hero motion; mode switch; statuses (pending amber, accepted green, draft grey); "ready" card; become-provider band motion; preview photo frame | 6, 7 | |
| `/profile` (settings, services, portfolio, contacts) | round photo picker frame; save busy; delete = red; tabs | 6 | |
| `/messages` | list rows (selected = sea outline); own bubbles; failed message; empty state motion | 6, 7 | |
| any confirmation (accept/decline request, replace AI text) | ink scrim, dialog, button order in Arabic, red decline | 3, 6 | |
| toasts | top-centre, coloured edge + icon | 3 | |
| header menus | sand hover, menu photo with clay ring | 3, 6 | |
| footer (every page) | mouse motion; on phones fully visible above the bottom nav | 4, 7 | |
| `/nope` (404) | big 404 + light motion; real 404 status | 7 | |
