# Reel ep3 « الدورة / la boucle » — kinetic-type HUD reel (Remotion)

A short-form repurpose of a kinetic-typography motion piece (dark HUD grid, a glowing spark that draws shapes, words slammed in on the beat, a typed prompt, a stamped form, a milestone track, a racing counter, a closing button). The motion language is kept; the script, visuals and structure are new and about SkillLoop. Every shot is built in code, with no Veo clips.

35 s · 1080×1920 · 30 fps · original synth music at 120 BPM (`scripts/music.py`) · on-screen French copy taken from `src/lib/i18n.tsx`.

| s | scene | derja | FR (app copy) |
|---|---|---|---|
| 0–2.5 | spark draws a line | عندك صنعة؟ | un savoir-faire ? |
| 2.5–5 | SKILL slam + categories | في يديك وفي راسك | Tech & IT, Design & Média… |
| 5–8 | flat "views" signal, then a spike | أما شكون يعرف بيك؟ | Mais qui vous connaît ? |
| 8–11.5 | DROP: the spark draws the loop, SkillLoop lands | صنعتك توصل للي يلوّج عليها | Le savoir-faire près de chez vous, ou à un clic. |
| 11.5–15.5 | form « Proposer un service », stamped PUBLIÉ | حطّها في الفيترينة | Votre service est publié ! |
| 15.5–19 | « Rechercher sur SkillLoop », typed search, Envoyer la demande | وفي بلاصة أخرى… واحد يلوّج عليك | cours de maths pour un lycéen à Sfax |
| 19–22 | ring with cities orbiting | قريب ولا أونلاين | Proche / En ligne |
| 22–26 | milestones, Nouvelle demande, Accepter | وجات أوّل دمندة | Demande acceptée |
| 26–29 | DEMANDES ACCEPTÉES 01→12, then la boucle = ∞ (the loop mark) | وحدة، زوز، عشرة… | |
| 29–35 | one button « Proposer un service », click, logo, ask | صنعتك تستاهل تتشاف · شنوّة صنعتك؟ قلّنا في الكومنتار | Partagez ce que vous savez faire. |

## Run
1. `node_modules` is hard-linked from reel-ep2 (`cp -al`). Otherwise run `npm install`, then `npm run libs` (Chrome libs under WSL, without sudo), then copy `node_modules/.remotion/chrome-headless-shell` from a worktree that already has it.
2. `python3 scripts/music.py public/audio` (the music file is not committed; this regenerates it) (scene times are hard-coded in both `src/Reel.tsx` and `music.py`, so change both together).
3. `npm run studio` to preview, or `npm run render` → `out/reel.mp4` (mastered to -14 LUFS).
