"""Original soundtrack for src/Motion.tsx (20 s, 120 BPM, synthesised — no samples, no licence issues).

Hits follow the visual cuts: 3.0 s fly-through, 7.0 s carousel, 14.8 s share, 17.0 s logo.
Reuses the instruments of scripts/music.py (darbuka doum/tek, hijaz bass, qanun-like plucks).
Usage: python3 scripts/motion_music.py public/   → public/audio/motion.wav
"""
import sys
from pathlib import Path

import numpy as np

# Load only the instrument definitions from music.py (everything above its "Music" section).
_src = (Path(__file__).parent / "music.py").read_text().split("# ── Music ──")[0]
_ns: dict = {"__name__": "music_lib"}
sys_argv, sys.argv = sys.argv, [sys.argv[0], "/dev/null"]
exec(compile(_src, "music.py", "exec"), _ns)
sys.argv = sys_argv
SR, rng, write, t_, onepole_lp, hp = (_ns[k] for k in ("SR", "rng", "write", "t_", "onepole_lp", "hp"))
doum, tek, clap, hat, bass, pluck, pad, place = (_ns[k] for k in ("doum", "tek", "clap", "hat", "bass", "pluck", "pad", "place"))

OUT = sys.argv[1].rstrip("/")
LEN, BPM = 20.0, 120
B = 60 / BPM          # beat = 0.5 s
E = B / 2             # eighth
DROP, CARDS, SHARE, BREAK, LOGO = 3.0, 7.0, 14.8, 16.0, 17.0
mix = np.zeros(int(LEN * SR))

D2, Eb2, Fs2, G2, A2 = 73.42, 77.78, 92.50, 98.00, 110.0
HIJAZ = [293.7, 311.1, 370.0, 392.0, 440.0, 392.0, 370.0, 311.1]


def kick():
    t = t_(0.5); f = 45 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 1.1


def impact(level=1.0):
    t = t_(2.5)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 8)) / SR) * np.exp(-t * 1.6)
    crash = hp(rng.normal(0, 1, t.size), 3000) * np.exp(-t * 2.2) * 0.35
    return (boom + crash) * level


def riser(dur):
    t = t_(dur); n = hp(rng.normal(0, 1, t.size), 400) * (t / dur) ** 2.5
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR) * (t / dur) ** 2 * 0.25
    return (n * 0.5 + tone)


def whoosh(dur=0.6):
    t = t_(dur); n = rng.normal(0, 1, t.size)
    return (onepole_lp(n, 2500) - onepole_lp(n, 250)) * np.sin(np.pi * t / dur) ** 2 * 0.9


def blip(freq, dur=0.12):
    t = t_(dur); return np.sin(2 * np.pi * freq * t) * np.exp(-t * 30) * 0.4


# Intro (0–3 s): pad + heartbeat sub on each beat + riser.
place(mix, pad([146.8, 220.0, 293.7], DROP + 0.4), 0)
for k in range(int(DROP / B)):
    place(mix, kick() * (0.35 + 0.1 * k), k * B)
place(mix, riser(1.6), DROP - 1.6)
for i, f in enumerate([587.3, 740.0, 880.0]):  # sparkle while the loop draws
    place(mix, pluck(f, 0.8, 0.997) * 0.6, 0.8 + i * 0.5)

# Groove (3–16 s): darbuka + kick + hijaz bass; plucks from the carousel on.
t = DROP
while t < BREAK - 1e-6:
    bar = int((t - DROP) / (8 * E))
    for k in range(8):
        tk = t + k * E
        if tk >= BREAK: break
        if k in (0, 4): place(mix, kick(), tk); place(mix, doum() * 0.6, tk)
        if k in (1, 3, 6): place(mix, tek(), tk)
        if k in (2, 5, 7): place(mix, tek(0.35), tk)
        if k in (2, 6): place(mix, clap() * 0.8, tk)
        place(mix, hat(), tk + E / 2)
    for k, f in [(0, D2), (2, D2), (3, Fs2), (4, G2), (6, Fs2), (7, Eb2)]:
        if t + k * E < BREAK: place(mix, bass(f, E * 1.6), t + k * E)
    if t >= CARDS and bar % 1 == 0:
        for k, f in enumerate(HIJAZ):
            if t + k * E < BREAK: place(mix, pluck(f * (2 if t >= 12 else 1), 0.7), t + k * E)
    t += 8 * E

# Accents on the cuts.
for at, lvl in ((DROP, 1.0), (CARDS, 0.6), (LOGO, 1.25)):
    place(mix, impact(lvl), at)
for at in (DROP - 0.3, CARDS - 0.35, SHARE - 0.2, BREAK + 0.4):
    place(mix, whoosh(), at)
for i in range(3):  # carousel snaps
    place(mix, whoosh(0.35) * 0.6, CARDS + 0.6 + (i + 1) * 1.0 - 0.1)
for i in range(6):  # share nodes pinging
    place(mix, blip(1320 + i * 110), SHARE + 0.47 + i * 0.067)
# Break (16–17 s): drums out, riser into the logo, then final chord.
place(mix, riser(1.0), BREAK)
place(mix, pad([146.8, 185.0, 220.0, 293.7], LEN - LOGO), LOGO)
for i, f in enumerate([293.7, 370.0, 440.0, 587.3]):
    place(mix, pluck(f, 2.0, 0.998), LOGO + 0.05 + i * 0.09)
place(mix, blip(1568, 0.5) * 0.8, LOGO + 1.7)  # « ding » on the chip

fade = np.ones_like(mix); n = int(0.8 * SR); fade[-n:] = np.linspace(1, 0, n)
write(f"{OUT}/audio/motion.wav", mix * fade)
print("ok", f"{OUT}/audio/motion.wav")
