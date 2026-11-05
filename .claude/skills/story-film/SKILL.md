---
name: story-film
description: Wordless cinematic story films for SkillLoop (no on-screen text, no subtitles, no dialogue) — live-action or stylized 3D look, made with AI video models (Seedance, Kling, Veo, Grok via Higgsfield; Revid) and finished in Remotion/ffmpeg. Use for any request for a "story" video, a short film, a cinematic ad, a video without text, or the best prompts for AI video/3D/motion.
---

# SkillLoop Story Film

A 25–35 s vertical film that makes people *feel* something about a craft, told only with images and sound.
Production tooling, QA and the Remotion template stay in the `media-studio` skill (`marketing/media-kit/`); this skill
is the craft: story, shots, prompts, consistency, edit and sound. Read `media-studio` house rules too, except:
**this format has no subtitles and no words on screen** (the user asked for it). The only graphic is the SkillLoop logo
end card (no tagline).

## 1. Story (write it before any prompt)
- One person, one want, one obstacle, one turn, one payoff. 7–10 shots. Nothing else.
- Wordless means the **face, the hands and one object** carry the story. Pick a *story object* (a plate, a key, a
  tool) that appears in the setup and pays off at the end.
- Hook in the first 1.5 s with an image, not an explanation: macro detail, sudden motion, a strong face.
- Make a *sound motif* from the craft (hammer tap, saw, sewing machine) and build the music on its rhythm.
- The turn shows SkillLoop only through behaviour (someone photographs the work, someone arrives holding a phone).
  Phone screens face away from camera, or show a pure photo with no UI. Never fake app text.
- Honesty: dramatization with AI actors is fine; never fake a real pro, a review, a rating or a client count.
  Real people (the live pros) only with their consent.

## 2. Consistency pipeline (spend credits in this order)
1. **Style lock**: one STYLE block, pasted verbatim into every image and video prompt.
2. **Character sheets** (image model): each character front, 3/4 and profile on a neutral background, same outfit.
   One block of words per character, pasted verbatim.
3. **Location plates**: one establishing still per location, same light.
4. **Keyframes**: one still per shot (character sheet as reference). Review all keyframes as a contact sheet with the
   user **before** generating any video. This is the cheap stage, so fix the story here.
5. **Image-to-video** from each keyframe (start frame; end frame when the move must land somewhere exact). 2–3 takes.
6. Choose takes, edit, grade, sound, master, QA (`media-studio` final QA).

## 3. Models (Higgsfield MCP `models_explore` to check live specs and cost)
| Need | Model | Why |
|---|---|---|
| Same face across shots, references | **Seedance 2.0** (`std`, 1080p, `genre: drama`) | identity references, start + end frame, native audio |
| Big camera moves, multi-shot, action | **Kling 3.0** (`pro`) | motion quality, multi-shot |
| Photoreal people + ambient sound | **Veo 3** (used on past reels, see `veo_mistakes`) | realism; watch for fake text and stray first shot |
| Cheap tests | Seedance 2.0 Mini / Seedance 2.5 `draft` (480p) | iterate before paying for 1080p |
Generate with `generate_audio`/`sound` **off** when the score and foley will be made in the edit. Native audio adds
random voices and murmurs.

## 4. Prompt formulas
**Video shot** (one shot = one action, 5 s):
`[STYLE] [CHARACTER block]. [Shot size], [lens], [camera move]. [Subject] [one clear action, beginning → end].
[Setting], [time of day], [light direction/quality]. Performance: [emotion shown through face/body].
[Constraints].`

**Keyframe still**: same as above without the camera move, plus "film still, frame from a feature film".

**Constraints line (always)**: `No text, no letters, no writing on signs or objects, no subtitles, no logos, no
watermarks. Phone screens face away from camera. Natural hands with five fingers. One continuous shot, no cuts.`

**Camera vocabulary that works**: extreme macro · tight close-up · medium close-up · over-the-shoulder · wide
establishing · low angle · top-down · locked-off static · slow push-in · slow pull-back · handheld subtle sway ·
lateral dolly · rack focus from A to B · orbit 30° · whip pan (transition).
**Light**: low-angle golden hour through a doorway · dust motes in a sun shaft · single practical bulb · blue hour
window light · warm tungsten vs cool daylight contrast.
**Performance**: describe the visible sign, not the feeling ("eyes glisten, he swallows, a small proud smile
appears") rather than "he feels proud".

**Avoid**: several actions in one shot, "text that says…", brand names, famous people/films/studios as style
references, crowds with faces (they melt), rapid hand choreography, mirrors.

## 5. Two looks (one STYLE block each, never mix in one film)
- **LIVE**: `Vertical 9:16. Cinematic photorealism, shot on ARRI Alexa 35 with vintage anamorphic lenses, shallow depth
  of field, warm Mediterranean light, teal-and-amber grade, soft halation, fine 35mm film grain, natural skin texture,
  authentic Tunisian people and places.`
- **3D**: `Vertical 9:16. High-end stylized 3D animated feature-film look, soft rounded character design with
  expressive eyes, subsurface-scattering skin, hand-crafted textures, volumetric light, cinematic depth of field,
  warm Mediterranean palette with teal shadows, authentic Tunisian architecture and objects.`

## 6. Edit and sound (Remotion or ffmpeg, `media-studio` recipes)
- Shots of 1.5–3 s. Cut on action. Match cuts between story object appearances. Hold the payoff 2 s, the end card 1.5 s.
- One grade over all clips (same curves/LUT + grain) so different takes look like one camera.
- Upscale to 1080×1920 (`scripts/upscale.sh`), 30 fps.
- Sound is half the film: foley for every visible action, room tone per location, the craft motif as the beat,
  **silence for 0.5 s just before the payoff**, music lifts at the turn. Original music (`scripts/music.py`) or a
  licensed track. Master −14 LUFS (`scripts/loudness.sh`). You cannot listen: ask the user to.
- QA extra for this format: scan every frame of the contact sheet for **invented text** (signs, papers, screens) and
  blur or crop it; check hands and face drift between shots.

## 7. Money and publishing
Before any generation: show the keyframe or video prompt, the model, the settings and the credit cost, and wait for a
yes. Never publish (`publish_now`, TikTok publish, Instagram) without approval of the exact final file.
