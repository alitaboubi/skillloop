"""Transcribe clips with word timestamps (faster-whisper, Arabic).

  python3 -E transcribe.py <clip.mp4 | folder> [model=small] [hint]

`hint` is an initial prompt with the expected line (helps derja). Cross-check with silences.sh: words that fall
inside silence are hallucinations (« اشتركوا في القناة », « موسيقى »…). Run with -E, not -I (user site-packages).
"""
import glob, os, sys
from faster_whisper import WhisperModel

target, model = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "small")
hint = sys.argv[3] if len(sys.argv) > 3 else None
files = sorted(glob.glob(os.path.join(target, "*.mp4"))) if os.path.isdir(target) else [target]
m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=8)
for f in files:
    segs, _ = m.transcribe(f, language="ar", word_timestamps=True, beam_size=5, initial_prompt=hint,
                           vad_filter=bool(hint), vad_parameters={"min_silence_duration_ms": 200})
    print("==", os.path.basename(f), flush=True)
    for sg in segs:
        print(f"  [{sg.start:5.2f}-{sg.end:5.2f}] {sg.text.strip()}", flush=True)
        print("     " + " ".join(f"{w.word.strip()}@{w.start:.2f}-{w.end:.2f}" for w in sg.words), flush=True)
