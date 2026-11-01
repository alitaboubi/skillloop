# SkillLoop Media Studio Kit

What we know about making SkillLoop reels and posts, in a form Claude (and people) can query.

| File | What |
|---|---|
| `kit.yaml` | Source of truth: tools, recipes, lessons, workflow stages, episodes. Edit this. |
| `build.py` | `python3 marketing/media-kit/build.py` → `KIT.md` + `graphify-out/graph.json` (+ report, HTML) |
| `KIT.md` | Generated, readable version |
| `scripts/` | Tested helpers: `upscale.sh`, `contact_sheet.sh`, `silences.sh`, `spectrogram.sh`, `transcribe.py`, `track_blob.py`, `master.sh`, `loudness.sh`, `remotion_libs.sh`, `new_episode.sh` |
| `template/Reel.tsx` | Empty edit list used by `new_episode.sh` |

Ask the graph:

```bash
graphify query "the QR overlay looks pasted on" --graph marketing/media-kit/graphify-out/graph.json
```

The Claude Code skill `.claude/skills/media-studio/SKILL.md` loads this kit for any video or post request.
