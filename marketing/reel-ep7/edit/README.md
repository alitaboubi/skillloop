# Reel ep7 « La vitrine » — showreel-style ad for the pros (Remotion)

A short-form repurpose of a 15 s motion-designer showreel. The source's core idea (a fast reel of many motion styles, all
on a 144 BPM cut grid) and its pacing are kept; everything you see is SkillLoop's own: the eight pros with a published service (see `src/data.ts`:
the first four agreed on 2026-11-05, the four newer ones were added at Ali's request on 2026-11-06), the home page copy from `src/lib/i18n.tsx` (FR + Tunisian derja), the app's ink / lime /
clay / sea tokens and fonts, and original synth music (`scripts/music.py`). No invented numbers: prices are the pros' real
listings, « 13 catégories » comes from `src/lib/data.ts`, « Page pro gratuite » was confirmed by Ali on 2026-11-05.

Two compositions from the same code: `Reel` 1080×1920 (Instagram / TikTok) and `Wide` 1920×1080 (the ad in the home
showcase, `src/components/showcase-ad.tsx`). 22.1 s · 30 fps · 144 BPM (one beat = 12.5 frames).

| s | source beat | ours | copy |
|---|---|---|---|
| 0–1.5 | dark grid, dot, slate, line | lime spark drops, types the slate, stretches into a line, lime panel rises | skillloop / la vitrine — 2026 |
| 1.5–3.3 | name slam on orange, weight flip, black disc | « LA VITRINE. » slams on lime, flips thin, ink disc | Des pros prêts à travailler pour vous · محترفين حاضرين يخدمولك |
| 3.3–5.0 | 3D cube wave + chrome orb | tile field rising in rings (own SVG projection) around a chrome orb with the loop mark | 13 catégories · sur place ou à distance |
| 5.0–6.3 | EVERY / SINGLE / FRAME | SAVOIR-FAIRE / PRÈS DE CHEZ VOUS (word wall) / UN CLIC. (brackets + click) | home hero `hh_title` |
| 6.3–7.1 | « on purpose » | the same line in derja on clay | الصنعة قريبة منك، ولا بكليك برك |
| 7.1–13.8 | data board (+312 %, ring, bars) | the 8 pros, 2 beats each: name, ring, price counter (or « Sur devis »), cover deck, story bars | real prices |
| 13.8–15.4 | particles → ring → burst | streaks → ring → burst → the home showcase coverflow of the 8 service cards | `sc_title` |
| 15.4–17.1 | « Render queue » card on blue | request card on sea: type the need, Envoyer la demande → Demande envoyée | real request copy |
| 17.1–18.8 | blobs in a superformula | gooey ink blobs split and merge on lime | Talents locaux. Vraies opportunités. |
| 18.8–22.1 | dot → ring → logo end card | spark in a clay ring → loop draws, wordmark, CTAs | hero lines, Explorer les services / Proposer un service, Page pro gratuite |

## Run
1. `node_modules` is hard-linked from reel-ep6 (`cp -al`); otherwise `npm install`, `npm run libs`, and copy
   `node_modules/.remotion/chrome-headless-shell` from a worktree that has it.
2. `python3 scripts/music.py public/audio` (music is not committed). Scene times live in `src/Reel.tsx` (T) and `music.py`.
3. `npm run studio`, or `npm run render` → `out/reel.mp4` + `out/wide.mp4` (mastered to -14 LUFS), then
   `python3 scripts/web.py` for the site file and poster.

Covers: the first four pros' covers are brand illustrations (`public/stills`). The four newer pros get `BrandCover`
(`src/parts.tsx`): their uploaded photos show clients' business cards with phone numbers, so they stay out of the ad.
