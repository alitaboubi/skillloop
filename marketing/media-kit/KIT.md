# SkillLoop Media Studio Kit

_Generated from `kit.yaml` by `build.py` — edit the YAML, not this file._

Query it: `graphify query --graph marketing/media-kit/graphify-out/graph.json "how do I fix a wrong word?"`

## Machine

- **os**: WSL2 Ubuntu 22.04 (no sudo password)
- **gpu**: NVIDIA RTX 2050, 4 GB VRAM — too small for local video diffusion models
- **ram**: ~3 GB visible to WSL (raise with %UserProfile%\.wslconfig memory=10GB, then wsl --shutdown)
- **network**: can be slow (~100 KB/s seen): avoid multi-GB model downloads during a session
- **python**: system python3.10, user site-packages; graphify has its own venv
- **media_tools**: ~/.local/share/skillloop-media (venv + ncnn binaries + lavapipe Vulkan): install with scripts/install_tools.sh, use with `source scripts/env.sh`

## Workflow

### Brief & story
Pick the pain point, the hook, the characters and the CTA.
- [Story structure that gets views](#episode_structure)

### Generate footage
Write Veo prompts, generate 2–4 takes per scene, pick the best.
- [Write Veo prompts that cut together](#veo_prompting)

### Ingest
Rename, upscale to 1080×1920, grade, extract stills.
- [Ingest and upscale clips](#ingest_upscale)

### Source QA
Contact sheets, transcripts, spectrograms: find every Veo mistake before editing.
- [See every clip at a glance](#contact_sheet)
- [Know exactly what each clip says](#transcribe_dialogue)
- [Find words and vowels on a spectrogram](#spectrogram_read)

### Repair
Fix wrong words, missing lines, fake text, blank props.
- [Fix a mispronounced word and keep lip sync](#fix_wrong_word)
- [Add a line Veo forgot](#reuse_voice_line)
- [Put the real QR on a blank sticker or paper](#track_overlay)
- [Hide invented text](#hide_fake_text)

### Edit & motion
Remotion edit list: cuts, titles, subtitles, app screens, overlays.
- [Cut out a person for posts and thumbnails](#cutout_portrait)
- [Arabic + French burned-in subtitles](#subtitles_ar_fr)
- [Show the real app in the video](#app_screen_scene)
- [Carousel from the same story](#carousel_stills)

### Sound
Dialogue, music bed with ducking, sound effects.
- [Music bed that never covers dialogue](#music_ducking)
- [Sound effects that keep it alive](#sfx_layer)

### Render & master
Render, loudness to -14 LUFS, faststart MP4.
- [Master for Instagram](#master_loudness)
- [Render Remotion on this WSL](#remotion_wsl)

### Final QA
Contact sheet of the render, loudness check, honesty check.

### Publish & measure
Caption, first comment, timing, then read the views.
- [Publish so the algorithm helps](#publish_instagram)

## Tools

| Tool | Status | What for | Limits |
|---|---|---|---|
| FFmpeg | verified | Cut, scale, encode, filter, mix, loudness, spectrograms, contact sheets. The backbone of every step. | Run encodes one by one on this machine: 11 in parallel got killed (out of memory). |
| [Remotion 4](https://www.remotion.dev) | verified | Video and stills as React: edit list, titles, subtitles, phone UI scenes, tracked overlays, carousels. | Needs the Chrome libs fix on WSL (lesson wsl_chrome_libs). Bundle once, then render many stills. |
| Chrome headless shell (Remotion) | verified | The browser Remotion renders with. | Missing libnspr4/libnss3 on this WSL; no emoji font. |
| [faster-whisper (small)](https://github.com/SYSTRAN/faster-whisper) | verified | Transcribe dialogue with word timestamps (Arabic). | Hallucinates on silence; word times can be off by 0.5–2 s; 'medium' is 1.5 GB (too slow to download here). |
| [WhisperX](https://github.com/m-bain/whisperX) | planned | Forced alignment: exact word boundaries for subtitles and surgical audio edits. | Deferred: the Arabic alignment model is ~1.2 GB (too slow on this network); faster-whisper + spectrogram covers it. |
| NumPy synthesis (music.py) | verified | Original music bed (darbuka maqsoum, hijaz bass, Karplus-Strong qanun) and SFX, no licence issues. |  |
| [Demucs](https://github.com/facebookresearch/demucs) | verified | Split voice from music/ambience in Veo clips, so dialogue can be cleaned or re-mixed. | CPU: ~1 min of compute per 10 s clip (+80 MB model on first run). |
| [Pedalboard (Spotify)](https://github.com/spotify/pedalboard) | verified | Studio effects in Python: EQ, compressor, reverb, limiter for a pro mix. | Pinned 0.9.16: 0.9.2x crashes with 'Illegal instruction' on this CPU. |
| [F5-TTS / Habibi-TTS](https://github.com/SWivid/F5-TTS) | planned | Voice cloning and speech editing: re-say one word in the same voice. Arabic checkpoint (Habibi). | Needs GPU memory; check consent before cloning a real person's voice. |
| ACE-Step | external | Full songs with lyrics (closest open model to Suno). Rent a GPU. |  |
| MusicGen / AudioGen (AudioCraft) | external | Instrumental beds (MusicGen) and foley sound effects (AudioGen). |  |
| Stable Audio Open | external | Loops, textures and sound design. | Check the licence before commercial use. |
| [Real-ESRGAN (ncnn-vulkan)](https://github.com/xinntao/Real-ESRGAN) | verified | AI upscale 720p → 1080p+ with real detail instead of lanczos. | ncnn-vulkan build runs on small GPUs; Vulkan inside WSL must be checked. Linux build runs on Mesa lavapipe (CPU Vulkan): ~10 s for 220 px ×2, minutes per 720p frame → stills only. The Windows .exe would use the RTX 2050 from WSL, but running it needs the user's permission. |
| RIFE (ncnn-vulkan) | installed | Frame interpolation: smooth slow motion, 24 → 60 fps. | Installed (lavapipe, CPU); running downloaded binaries needs the user's permission in this setup — not benchmarked yet. |
| [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | verified | Finds cuts inside a clip (Veo sometimes starts with a stray shot). | Found the stray first shot of the sheep clip (0–1.29 s) and Karim's cuts. |
| auto-editor | incompatible | Cuts silences and dead air automatically (talking-head content). | 29.x needs glibc 2.38 (Ubuntu 22.04 has 2.35); 23.x no longer builds. Use ffmpeg silencedetect. |
| [SAM 2](https://github.com/facebookresearch/sam2) | external | Segment and track any object through a video from one click: masks for overlays and removal. |  |
| ProPainter | external | Video inpainting: really erases fake text, logos or objects (with a SAM 2 mask). |  |
| Bright-blob tracker (track_blob.py) | verified | Tracks a bright flat object (blank sticker, paper) frame by frame and prints its box per time. | Light objects only; the subject's clothes can merge with the blob: always check on a grid frame. |
| Blender (VSE + compositor, bpy) | planned | 3D titles, compositing, camera tracking, headless renders from Python. |  |
| rembg / BiRefNet | verified | Background removal for avatars and cut-outs. | Use the Python API (the CLI needs extra packages). u2netp = 4.6 MB model, ~3 s per image. |
| Veo 3 (Google Flow) | external | 8–10 s photoreal clips with dialogue and sound, 9:16. | Derja comes out as MSA or with long vowels; drops off-screen voices; invents text; blank props become rectangles. |
| ComfyUI (Wan, LTX, HunyuanVideo) | external | Open video/image generation pipelines on a rented GPU. |  |
| graphify | verified | Queryable graph of this kit: `graphify query --graph marketing/media-kit/graphify-out/graph.json "…"`. |  |
| SkillLoop pro card (src/lib/pro-card.ts) | verified | The app's real QR sticker/card as SVG, reused in videos and posts. |  |

## Recipes

<a id="cutout_portrait"></a>
### Cut out a person for posts and thumbnails
_Problem:_ Need Karim/avatars on a brand background.  
_Tools:_ rembg, real_esrgan

1. rembg Python API with u2netp (fast) or isnet-general-use (better hair, bigger download).
2. Composite on the lime/ink background; upscale the still with Real-ESRGAN if it will be printed big.

<a id="veo_prompting"></a>
### Write Veo prompts that cut together
_Problem:_ Faces change between clips; clips don't match; screens show gibberish.  
_Tools:_ veo3

1. Paste one STYLE block and one block per character verbatim in every prompt.
2. For a montage, ask for the same locked-off framing in every prompt (Veo still drifts: plan badges/flashes to hide it).
3. Phone screens away from camera, signs/stickers blank: the real UI and QR are composited later.
4. Write dialogue in Arabic script and say 'Tunisian Arabic dialect'; keep each line short.
5. Ask for 2–4 takes per scene; note which take you keep.

_Lessons:_ veo_mistakes

<a id="ingest_upscale"></a>
### Ingest and upscale clips
_Problem:_ Veo delivers 720×1280 at 24 fps.  
_Tools:_ ffmpeg, real_esrgan

1. Rename to v01_*, v02a_* … in story order.
2. marketing/media-kit/scripts/upscale.sh in.mp4 out.mp4 (lanczos + light unsharp + common grade), one file at a time.
3. Later: Real-ESRGAN for real detail.

_Lessons:_ parallel_encode_oom

<a id="contact_sheet"></a>
### See every clip at a glance
_Problem:_ Need to spot stray shots, continuity errors and fake text fast.  
_Tools:_ ffmpeg, pyscenedetect

1. PySceneDetect first: it lists Veo's internal cuts (stray first shot) with exact times.
2. marketing/media-kit/scripts/contact_sheet.sh clip.mp4 sheet.png (6 frames per clip, numbered).
3. Re-check any interesting moment with a full-resolution frame: thumbnail times are approximate.

_Lessons:_ thumbnail_timing

<a id="transcribe_dialogue"></a>
### Know exactly what each clip says
_Problem:_ Veo may say the wrong words or nothing at all.  
_Tools:_ faster_whisper, ffmpeg, whisperx, demucs

1. Run transcribe.py on the clips folder (small model, word timestamps).
2. Cross-check with ffmpeg silencedetect: words inside silence are hallucinations.
3. Unclear clip: rerun with a hint prompt of the expected line.
4. Confirm timings on a spectrogram before cutting.
5. Noisy clip: separate the voice first with Demucs (vocals.wav) and transcribe that.

_Lessons:_ whisper_hallucination, whisper_timing, python_isolated_flag

<a id="spectrogram_read"></a>
### Find words and vowels on a spectrogram
_Problem:_ Need cut points precise to ~10 ms.  
_Tools:_ ffmpeg

1. marketing/media-kit/scripts/spectrogram.sh clip.mp4 start dur out.png
2. Fricatives (sh, kh) = broad noise; vowels = stacked harmonics; stops = short gaps.

<a id="fix_wrong_word"></a>
### Fix a mispronounced word and keep lip sync
_Problem:_ Salma said « خادمتو » instead of « خدمتو » (long vowel).  
_Tools:_ ffmpeg, f5_tts

1. Locate the vowel on the spectrogram.
2. Cut its steady middle (keep the transitions), 10–12 ms crossfades.
3. Insert the same length of room tone right after the word, so everything after stays in sync.
4. Mute the clip in the edit and play the fixed WAV from the same source second.
5. Better later: F5-TTS speech edit re-says the word in her voice.

_Lessons:_ veo_mistakes

<a id="reuse_voice_line"></a>
### Add a line Veo forgot
_Problem:_ The phone's answer « غدوة إن شاء الله » was missing in the winter shot.  
_Tools:_ ffmpeg

1. Take the same voice from another clip (the promise).
2. Phone filter: highpass 350 Hz, lowpass 3200 Hz, compressor, a short echo.
3. Place it as a sound effect with its subtitle; it doubles as a callback joke.

<a id="track_overlay"></a>
### Put the real QR on a blank sticker or paper
_Problem:_ Veo shows blank paper; a scan of blank paper reads as a mistake.  
_Tools:_ blob_tracker, remotion, app_pro_card, sam2

1. Measure the box per frame with track_blob.py, then verify on a grid frame.
2. Interpolate keyframes in a component drawn inside the Clip (it shares the push-in).
3. Match the plate: slight blur, lower contrast, perspective (clip-path + skew).
4. Cut before anything passes in front of it (phone, hand), or use SAM 2 masks.

_Lessons:_ occlusion_cut

<a id="hide_fake_text"></a>
### Hide invented text
_Problem:_ Veo writes fake Arabic on signs and meter boxes.  
_Tools:_ remotion, propainter, sam2

1. Quick: backdrop-filter blur box that follows the same camera drift as the tracked object.
2. Clean: SAM 2 mask + ProPainter inpaint on a rented GPU.

_Lessons:_ veo_mistakes

<a id="subtitles_ar_fr"></a>
### Arabic + French burned-in subtitles
_Problem:_ Every line readable without sound, in derja and French.  
_Tools:_ remotion

1. Subtitle component: Arabic 64 px over French 38 px lime, spring pop.
2. Font stack: Arabic font, then the Latin font, then Noto Color Emoji.

_Lessons:_ arabic_space_glyph, emoji_font

<a id="app_screen_scene"></a>
### Show the real app in the video
_Problem:_ Viewers must see what SkillLoop actually does.  
_Tools:_ remotion

1. Rebuild the screen in Remotion with the app's own French copy (src/lib/i18n.tsx).
2. Only show features that exist and are switched on in production.
3. Show cause then effect: the character takes out the phone before the app screen.

_Lessons:_ honesty_rules, cause_effect

<a id="music_ducking"></a>
### Music bed that never covers dialogue
_Problem:_ Silent video dies; loud music hides the lines.  
_Tools:_ numpy_synth, remotion

1. Generate the bed with section times from the edit (break for sad moments).
2. Volume 0.38, ducked to 0.13 from 4 frames before to 4 frames after each subtitle.

<a id="sfx_layer"></a>
### Sound effects that keep it alive
_Problem:_ Cuts and UI moments feel flat.  
_Tools:_ numpy_synth, ffmpeg

1. whoosh + flash on montage cuts, clock under waiting, rain in winter.
2. pop on UI changes, buzz + notification on push, ding-dong before the door, success on the result.
3. riser into the end card, thump on the title.

<a id="master_loudness"></a>
### Master for Instagram
_Problem:_ Consistent loudness across reels.  
_Tools:_ ffmpeg, pedalboard

1. marketing/media-kit/scripts/master.sh raw.mp4 final.mp4 (loudnorm I=-14 TP=-1.5, AAC 256k, faststart).
2. Check with loudness.sh: integrated ≈ -14 LUFS.

<a id="remotion_wsl"></a>
### Render Remotion on this WSL
_Problem:_ Chrome won't start; emojis are boxes.  
_Tools:_ remotion, chrome_headless

1. marketing/media-kit/scripts/remotion_libs.sh <project> once (libnspr4, libnss3, emoji font, no sudo).
2. export LD_LIBRARY_PATH=<project>/node_modules/.remotion/libs/root/usr/lib/x86_64-linux-gnu
3. npx remotion bundle once, then render/still from out/bundle.

_Lessons:_ wsl_chrome_libs, emoji_font, bundle_once

<a id="carousel_stills"></a>
### Carousel from the same story
_Problem:_ A post that explains what the reel only shows.  
_Tools:_ remotion

1. Still compositions 1080×1350, counter n/8, swipe chip, same palette as the reel.
2. Hook → pain → solution (real app) → result → pros (vitrine, QR, themes) → CTA steps.
3. Label AI characters' pages « Exemple »; tag Pro-only features « SkillLoop Pro ».

_Lessons:_ honesty_rules

<a id="episode_structure"></a>
### Story structure that gets views
_Problem:_ Hold attention for 35 s and turn viewers into followers.  
_Tools:_ veo3, remotion

1. Hook in 2 s (relatable Tunisian pain + punch title).
2. Exaggerated montage of the pain (seasons, counters).
3. Turn: someone shows SkillLoop; show the real flow.
4. Payoff with a laugh, then the pro side (vitrine, QR).
5. End on a question for comments + DM 'PRO' + follow. ≤ 35 s.

_Lessons:_ reel_ghodwa_result, keep_it_short

<a id="publish_instagram"></a>
### Publish so the algorithm helps
_Problem:_ Reach.  
_Tools:_ —

1. Reel alone (Reels tab reaches non-followers); carousel 1–2 days later or the same evening.
2. 19–21 h; first comment from the account asking the question; trending sound at 10–15 % if wanted.
3. Note views at 4 h and 24 h in this kit (lesson reel_ghodwa_result).

## Lessons

- **pedalboard_illegal_instruction** — pedalboard 0.9.2x dies with 'Illegal instruction' on the Ryzen 7 7435HS: pin 0.9.16.
- **glibc_235** — Ubuntu 22.04 = glibc 2.35: prebuilt binaries needing 2.38 (auto-editor 29) fail; check before choosing a tool.
- **wsl_vulkan_cpu_only** — No GPU Vulkan inside this WSL (Mesa 23.2 has no D3D12 'dozen' driver): ncnn tools fall back to lavapipe on CPU. For GPU, run the Windows build — needs the user's permission.
- **downloaded_binary_permission** — Running binaries downloaded from GitHub (RIFE, Windows .exe) was blocked by the permission classifier: ask the user to allow it instead of working around it.
- **wsl_chrome_libs** — Remotion's Chrome needs libnspr4/libnss3: apt-get download + dpkg-deb -x into node_modules/.remotion/libs, then LD_LIBRARY_PATH. No sudo needed.
- **emoji_font** — The render browser has no emoji font: ship NotoColorEmoji.ttf (apt-get download fonts-noto-color-emoji) and load it with FontFace.
- **arabic_space_glyph** — Google Fonts Arabic subsets have no space glyph: with the emoji font next in the stack, Arabic words get huge gaps. Put the Latin font between them.
- **bundle_once** — remotion still re-bundles on every call: run `remotion bundle` once and point still/render at out/bundle.
- **parallel_encode_oom** — 11 ffmpeg 1080p encodes in parallel were killed (≈3 GB RAM). Encode sequentially or 2 at a time.
- **python_isolated_flag** — python3 -I ignores user site-packages (faster-whisper not found). Run from the scratch folder with python3 -E instead.
- **pkill_self** — pkill -f 'pattern' also matched the shell running it and killed the command. Use pgrep first or a narrower pattern.
- **whisper_hallucination** — Whisper writes « اشتركوا في القناة », « موسيقى », « بخير » over silence or noise. Trust only words inside detected speech.
- **whisper_timing** — Whisper word times were off by up to 2 s (« جيت » placed at 3.5 s, really 3.15 s; « بالحق جيت » at 5.9 s). Confirm on a spectrogram.
- **thumbnail_timing** — Times read from fps-filtered tiles were off by ~1 s. Measure on full-resolution frames before placing overlays.
- **veo_mistakes** — Veo 3 checklist: stray shot at clip start; MSA (« مرحبا ») instead of derja; long vowels (« خادمتو »); missing off-screen voice; blank props drawn as rectangles; fake Arabic on signs; wrong pronunciation of brand names.
- **occlusion_cut** — When a phone or hand passes in front of the tracked paper, cut to a POV/screen shot instead of fighting occlusion.
- **cause_effect** — User feedback: after « مازلت تستنى؟ » show him taking the phone out before the app screen; never show a scan of blank paper.
- **keep_it_short** — User feedback: 46 s was too long; 35 s worked. Cut duplicate words (keep « بالحق جيت », drop the first « جيت »).
- **honesty_rules** — Show only real, enabled features; no stars/reviews (none exist); don't say « gratuit » unless confirmed; label AI characters' pages « Exemple »; mark Pro-only features.
- **reel_ghodwa_result** — « غدوة إن شاء الله » (Veo characters + relatable story, 35 s): ~1.2k views in 4 h — best start of the account (2026-11-01).
- **slow_downloads** — Network gave ~100 KB/s: Whisper medium (1.5 GB) would take hours. Prefer small models + hint prompts, or download overnight.

## Episodes

- **غدوة إن شاء الله** (2026-11-01, `marketing/reel-ep1`): ~1.2k views in 4 h
