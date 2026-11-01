---
name: media-studio
description: SkillLoop video and social-post production (Instagram reels, carousels, Veo 3 clips, Remotion edits, subtitles, music, sound effects). Use for any request to make, fix, edit, re-cut or publish a reel, video, post, carousel, caption or marketing visual for SkillLoop, or to fix mistakes in AI-generated clips.
---

# SkillLoop Media Studio

Everything learned on past episodes lives in `marketing/media-kit/`:

- `kit.yaml` — single source of truth: tools (verified on this machine or not), recipes, lessons, workflow stages, episodes.
- `KIT.md` — the same, readable. Recipes have anchors (`#fix_wrong_word`, `#track_overlay`, …).
- `graphify-out/graph.json` — graph of the kit. Build it if missing: `python3 marketing/media-kit/build.py`.
- `scripts/` — tested helpers (upscale, contact sheet, silences, spectrogram, transcribe, track_blob, master, loudness, remotion_libs, new_episode).
- `template/Reel.tsx` + `marketing/reel-ep1/edit` — the Remotion template (brand, subtitles, badges, phone scenes, tracked stickers, end card, carousel, music).

## Before doing anything

1. Ask the graph about the problem, then read only the recipe it points to:
   `graphify query "<problem in plain words>" --graph marketing/media-kit/graphify-out/graph.json --budget 1200`
   (`--graph` goes after the question.) Then `grep -n -A12 'id="<recipe_id>"' marketing/media-kit/KIT.md`.
2. Respect the machine limits in `kit.yaml → machine` (≈3 GB RAM, 4 GB GPU, no sudo, slow downloads): encode one file at a time, no multi-GB model downloads mid-session, heavy models go to a rented GPU.

## Workflow (stages in kit.yaml)

brief → generate (Veo prompts) → ingest (`scripts/upscale.sh`) → **source QA** → repair → edit (Remotion edit list) → sound (music ducked + SFX) → render & master (`scripts/master.sh`) → **final QA** → publish.

New episode: `marketing/media-kit/scripts/new_episode.sh <name>`, then `npm install`, `scripts/remotion_libs.sh <dir>`, and
`export LD_LIBRARY_PATH=<dir>/node_modules/.remotion/libs/root/usr/lib/x86_64-linux-gnu`. Bundle once, render from `out/bundle`.

## QA is mandatory — never send a file that skipped it

Source QA (every clip): contact sheet, `silences.sh`, `transcribe.py` (cross-check words against speech), spectrogram for any cut
inside dialogue, and the Veo checklist (lesson `veo_mistakes`): stray first shot, MSA instead of derja, long vowels, missing
off-screen voice, blank props, fake text.

Final QA: contact sheet of the render (every ~1.5 s), stills of every overlay at full resolution, `loudness.sh` ≈ -14 LUFS,
duration ≤ 35 s for reels, honesty check (lesson `honesty_rules`). You cannot listen: say so and ask the user to listen.

## House rules (from the user's feedback)

- Copy mixes Tunisian Arabic (Arabic script) and French; subtitles in both.
- Reels ≤ 35 s; hook in 2 s; end on a question for comments + DM « PRO » + follow.
- Show cause then effect (phone out → app screen); never a scan of blank paper; cut repeated words.
- Music + SFX on every reel, ducked under dialogue; original music (scripts/music.py) or properly licensed tracks only.
- Only real, enabled app features; no stars/reviews; no « gratuit » unless the user confirms; AI characters' pages say « Exemple ».

## After each episode

Add what you learned to `kit.yaml` (new lesson, recipe change, tool status `planned → verified`, the episode with its view
count), run `python3 marketing/media-kit/build.py`, and keep reel media out of git (see `marketing/reel-ep1/.gitignore`).
