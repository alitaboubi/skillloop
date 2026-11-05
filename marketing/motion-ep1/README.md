# Motion graphics « The Loop » (20 s, 9:16)

Rendered from code with Remotion, with no AI video and no credits used. Music and sound effects are synthesised (`edit/scripts/motion_music.py`) and mastered at −14 LUFS.

| Time | Scene |
|---|---|
| 0–3 s | A lime dot draws the SkillLoop loop from the middle, over a 3-D grid. Shockwave. |
| 3–7 s | The camera flies through the loop and an orbit of 8 trades turns in 3-D (💻 🎨 📚 🔧 🩺 🚗 💼 🎉). |
| 7–12 s | A 3-D carousel of the 4 real services (aziz kouki, Feres Hasni, Br9 Team, Ahmed) turns on the beat. |
| 12–16 s | A pro page assembles in a phone, the button is pressed, and the link goes out to 6 contacts. |
| 16–20 s | Everything collapses, the loop redraws, and the SkillLoop logo appears (+ « DM PRO »). |

Two versions:
- `MotionWords` adds 4 kinetic words: « صنعتك », « خدمتك », « صفحتك », « في كل بلاصة ». It also shows the pros' names and « DM PRO ».
- `MotionClean` has no words. The only letters are the logo and the text already on the service covers.

```bash
cd marketing/motion-ep1/edit
npm install && bash ../../media-kit/scripts/remotion_libs.sh .
python3 scripts/motion_music.py public/        # → public/audio/motion.wav (then loudnorm to −14 LUFS)
export LD_LIBRARY_PATH=$PWD/node_modules/.remotion/libs/root/usr/lib/x86_64-linux-gnu
npx remotion bundle src/index.ts --out-dir=out/bundle
npx remotion render out/bundle MotionWords out/skillloop-MotionWords.mp4 --concurrency=2 --crf=17 --audio-codec=aac
```
On this machine Remotion sometimes hangs after a `still` (a network call at exit). Render one preview video and build a contact sheet with ffmpeg instead of rendering many stills.
