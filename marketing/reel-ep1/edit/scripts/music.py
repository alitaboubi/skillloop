"""Original music bed + sound effects for the reel, synthesised from scratch (no samples, no licence issues).

Darbuka maqsoum groove, hijaz bass and qanun-like plucks (Karplus-Strong). Section times follow src/Reel.tsx.
Usage: python3 scripts/music.py public/   → public/audio/music.wav and public/sfx/*.wav
"""
import sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(7)
OUT = sys.argv[1].rstrip("/")


def write(path, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    x = x / max(1e-9, np.abs(x).max()) * 0.89
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def t_(d): return np.arange(int(d * SR)) / SR


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc = (1 - a) * v + a * acc; y[i] = acc
    return y


def hp(x, fc): return x - onepole_lp(x, fc)


def doum():
    t = t_(0.45); f = 55 + 70 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * 1.0 + rng.normal(0, 1, t.size) * np.exp(-t * 90) * 0.15


def tek(level=1.0):
    t = t_(0.12); n = hp(rng.normal(0, 1, t.size), 2500)
    return (n * 0.6 + np.sin(2 * np.pi * 820 * t) * 0.5) * np.exp(-t * 55) * level


def clap():
    t = t_(0.25); n = hp(rng.normal(0, 1, t.size), 900); n = n - hp(n, 3500)
    env = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.011, 0.023)) + np.exp(-t * 18) * 0.4
    return n * env * 0.5


def hat():
    t = t_(0.05); return hp(rng.normal(0, 1, t.size), 7000) * np.exp(-t * 120) * 0.25


def bass(freq, dur):
    t = t_(dur); env = np.minimum(1, t * 80) * np.exp(-t * 2.2)
    return (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)) * env * 0.55


def pluck(freq, dur=0.9, bright=0.996):
    n = int(SR / freq); buf = rng.uniform(-1, 1, n); out = np.empty(int(dur * SR))
    for i in range(out.size):
        out[i] = buf[i % n]; buf[i % n] = bright * 0.5 * (buf[i % n] + buf[(i + 1) % n])
    return out * np.exp(-np.arange(out.size) / SR * 2.5) * 0.45


def pad(freqs, dur):
    t = t_(dur); x = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.2 * t) * 0.6) for f in freqs)
    env = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8)
    return onepole_lp(x, 1400) * env * 0.12


def place(track, clip, at):
    i = int(at * SR); j = min(track.size, i + clip.size)
    if i < track.size: track[i:j] += clip[: j - i]


# ── Music ──
LEN, BPM = 36.0, 100
E = 60 / BPM / 2  # one eighth note
music = np.zeros(int(LEN * SR))
WINTER = (7.6, 11.6)        # sad break: pad + rain only
END = 35.7
D2, Eb2, Fs2, G2, A2 = 73.42, 77.78, 92.50, 98.00, 110.0
BASS = [(0, D2), (2, D2), (3, Fs2), (4, G2), (6, Fs2), (7, Eb2)]
HIJAZ = [293.7, 311.1, 370.0, 392.0, 440.0, 392.0, 370.0, 311.1]  # D Eb F# G A G F# Eb
bars = int(LEN / (8 * E)) + 1
for b in range(bars):
    t0 = b * 8 * E
    if WINTER[0] - 0.05 <= t0 < WINTER[1] - 0.2 or t0 >= END:
        continue
    for k in range(8):
        tk = t0 + k * E
        if WINTER[0] <= tk < WINTER[1] or tk >= END: continue
        if k in (0, 4): place(music, doum(), tk)
        if k in (1, 3, 6): place(music, tek(), tk)
        if k in (2, 5, 7): place(music, tek(0.35), tk)
        place(music, hat(), tk + E / 2)
    if t0 >= 3.4:
        for k, f in BASS:
            if not (WINTER[0] <= t0 + k * E < WINTER[1]): place(music, bass(f, E * 1.6), t0 + k * E)
        place(music, clap(), t0 + 2 * E); place(music, clap(), t0 + 6 * E)
    if t0 >= 11.6 and b % 2 == 0:
        for k, f in enumerate(HIJAZ):
            place(music, pluck(f), t0 + k * E)
place(music, pad([146.8, 185.0, 220.0], WINTER[1] - WINTER[0] + 0.6), WINTER[0])
place(music, pad([146.8, 185.0, 220.0, 293.7], 3.5), END - 3.5)
for hit in (0.0, 11.6):
    place(music, doum() * 1.4, hit); place(music, clap(), hit)
fade = np.ones_like(music); n = int(0.6 * SR); fade[-n:] = np.linspace(1, 0, n)
write(f"{OUT}/audio/music.wav", music * fade)

# ── Sound effects ──
t = t_(0.06); tick = hp(rng.normal(0, 1, t.size), 3000) * np.exp(-t * 160) + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200) * 0.6
tock = np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 180)
clock = np.zeros(int(4.4 * SR))
for i in range(9): place(clock, tick if i % 2 == 0 else tock * 0.8, i * 0.5)
write(f"{OUT}/sfx/clock.wav", clock * 0.6)

t = t_(4.2); rain = onepole_lp(rng.normal(0, 1, t.size), 2500) - onepole_lp(rng.normal(0, 1, t.size), 300)
drops = np.zeros_like(rain)
for at in rng.uniform(0, 4.1, 120): place(drops, tek(0.15), at)
write(f"{OUT}/sfx/rain.wav", (rain * 0.5 + drops) * np.minimum(1, t / 0.4) * np.minimum(1, (4.2 - t) / 0.4))

t = t_(0.12); write(f"{OUT}/sfx/pop.wav", np.sin(2 * np.pi * (500 + 900 * t / 0.12) * t) * np.exp(-t * 35))
t = t_(0.7); ok = np.zeros(t.size); place(ok, np.sin(2 * np.pi * 1047 * t_(0.25)) * np.exp(-t_(0.25) * 12), 0)
place(ok, np.sin(2 * np.pi * 1568 * t_(0.45)) * np.exp(-t_(0.45) * 8), 0.12)
write(f"{OUT}/sfx/success.wav", ok)
t = t_(0.18); write(f"{OUT}/sfx/scan.wav", np.sin(2 * np.pi * 1900 * t) * (t < 0.08) * np.exp(-t * 10) + np.sin(2 * np.pi * 2500 * t) * (t >= 0.09) * np.exp(-(t - 0.09) * 25))
t = t_(1.2); riser = hp(rng.normal(0, 1, t.size), 600) * (t / 1.2) ** 2
write(f"{OUT}/sfx/riser.wav", riser * 0.6)
t = t_(0.5); buzz = np.sign(np.sin(2 * np.pi * 160 * t)) * (np.sin(2 * np.pi * 9 * t) > 0) * 0.3
write(f"{OUT}/sfx/buzz.wav", onepole_lp(buzz, 900))
print("ok")
