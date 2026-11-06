"""Original music bed for « La vitrine » (ep7), synthesised from scratch (no samples, no licence issues).

Same arc and tempo as the source showreel (144 BPM, one beat = 12.5 frames at 30 fps): sub drone and spark under the
boot, a hit on the lime title, a filtered build under the 3D wave, a drop with one hit per word, a bright groove under
the pros, a riser into the particle burst, the groove again under the showcase and the request, a half-time break under
the blobs, a short riser on the ring and a big major hit on the end logo. Times follow src/Reel.tsx (T).
Usage: python3 scripts/music.py public/audio
"""
import sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
BPM = 144
BEAT = 60 / BPM
rng = np.random.default_rng(707)


def t_(d): return np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return lfilter(*butter(2, [lo, hi], btype="band", fs=SR), x)
def lp(x, fc): return lfilter(*butter(2, fc, fs=SR), x)
def hp(x, fc): return lfilter(*butter(2, fc, btype="high", fs=SR), x)
def hz(n): return 440 * 2 ** ((n - 69) / 12)


def place(buf, x, at, gain=1.0):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf): buf[i:j] += x[: j - i] * gain


def pluck(note, d=0.25, fc=4000):
    t = t_(d); f = hz(note)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.3 for k in (1, 2, 3, 4)) * np.exp(-t * 14)
    return lp(x * np.minimum(1, t / 0.002), fc)


def bell(note, d=2.0):
    t = t_(d); f = hz(note)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec) for r, a, dec in [(1, 1, 1.4), (2.76, 0.35, 3.5), (5.4, 0.15, 7)])
    return x * np.minimum(1, t / 0.003)


def pad(notes, d, fc=2200):
    t = t_(d)
    x = sum(sum(np.sin(2 * np.pi * hz(n) * k * t * (1 + 0.004 * s)) / k for k in (1, 2, 3)) for n in notes for s in (-1, 1))
    env = np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4)
    return lp(x, fc) * env


def kick(punch=1.0, d=0.4):
    t = t_(d); f = 46 + 130 * punch * np.exp(-t * 32)
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8))


def clap():
    t = t_(0.24); n = rng.normal(0, 1, t.size)
    return bp(n, 900, 6500) * (np.exp(-t * 22) + 0.6 * np.exp(-((t - 0.012) % 0.011) * 300) * (t < 0.035))


def hat(open_=False):
    d = 0.22 if open_ else 0.05; t = t_(d)
    return hp(rng.normal(0, 1, t.size), 7000) * np.exp(-t * (14 if open_ else 90))


def snare():
    t = t_(0.18)
    return bp(rng.normal(0, 1, t.size), 1500, 7000) * np.exp(-t * 26) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


def crash(d=1.8):
    t = t_(d)
    return hp(rng.normal(0, 1, t.size), 3500) * np.exp(-t * 2.6)


def bass(note, d, fc=420, drive=1.0):
    t = t_(d); f = hz(note)
    x = np.tanh(drive * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)))
    return lp(x, fc) * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.02)


def noise_rise(d, lo=400, hi=9000):
    t = t_(d)
    return bp(rng.normal(0, 1, t.size), lo, hi) * (t / d) ** 2.2


def chirp(f0, f1, d):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * np.minimum(1, t / 0.003)



F = lambda fr: fr / 30
TITLE, WAVE, DROP, PROS, FLOW, BURST, GROOVE2, BLOBS, RING, OUTRO, END = (F(x) for x in (45, 100, 150, 213, 413, 431, 438, 513, 563, 575, 663))
WORDS = (F(150), F(163), F(175), F(188))


def build():
    n = int(END * SR) + SR
    mus, drums = np.zeros(n), np.zeros(n)
    PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G

    # Boot: sub drone, the spark chirp, bells while the slate types, a riser into the lime panel.
    t = t_(TITLE + 0.1)
    place(mus, lp(np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 110 * t), 300) * np.minimum(1, t / 0.6), 0, 0.22)
    place(mus, chirp(2200, 500, 0.3), 0.02, 0.07)
    for k, nt in enumerate([81, 88, 93]):
        place(mus, bell(nt, 1.0), 0.45 + k * 0.14, 0.04)
    place(mus, noise_rise(0.7), TITLE - 0.7, 0.16)

    # Title hit, half-time plucks that open up under the wave, snare roll into the drop.
    place(drums, kick(1.2, 0.5), TITLE, 1.0)
    place(drums, crash(1.4), TITLE, 0.1)
    place(mus, bell(81, 1.5), TITLE, 0.05)
    for i, t0 in enumerate(np.arange(TITLE, DROP, BEAT / 2)):
        fc = 600 + 4800 * ((t0 - TITLE) / (DROP - TITLE)) ** 1.6
        place(mus, pluck([69, 72, 76, 79][i % 4], 0.2, fc), t0, 0.18)
        place(mus, pluck([57, 57, 60, 64][i % 4], 0.2, fc * 0.6), t0, 0.09)
    for t0 in np.arange(TITLE + 2 * BEAT, WAVE, 2 * BEAT):
        place(drums, kick(0.9), t0, 0.6)
    place(mus, bass(33, 0.5, 220, 1.4), WAVE, 0.45)
    for t0 in np.arange(WAVE, DROP - 1.0, BEAT):
        place(drums, kick(0.9), t0, 0.55)
    for k in range(16):
        place(drums, snare(), DROP - 1.0 + k / 16, 0.04 + 0.22 * k / 16)
    place(mus, noise_rise(1.4), DROP - 1.4, 0.22)

    def groove(a, b):
        for i, t0 in enumerate(np.arange(a, b - 1e-6, BEAT)):
            bi = i % 4
            ch = PROG[(i // 4) % 4]
            place(drums, kick(1.0), t0, 0.85)
            if bi in (1, 3): place(drums, clap(), t0, 0.3)
            for k in range(4):
                place(drums, hat(open_=(k == 2)), t0 + k * BEAT / 4, (0.08 if k % 2 else 0.05) if k != 2 else 0.06)
                arp = (ch + [ch[0] + 12])[(i * 4 + k) % 4] + 12
                place(mus, pluck(arp, 0.18, 5200), t0 + k * BEAT / 4, 0.07)
            for k in range(2):
                place(mus, bass(ch[0] - 24 + (12 if k else 0), BEAT / 2 * 0.9, 460, 1.3), t0 + k * BEAT / 2, 0.5)
            if bi == 0: place(mus, pad(ch + [ch[0] + 12], 4 * BEAT + 0.2, 2400), t0, 0.04)

    # Drop on the words (a hit on each), then the groove under the pros.
    place(drums, crash(), DROP, 0.13)
    for w in WORDS:
        place(drums, kick(1.3, 0.45), w, 0.5)
        place(mus, bell(84, 0.6), w, 0.035)
    groove(DROP, FLOW)
    for i in range(8):
        place(drums, crash(0.7), PROS + i * 2 * BEAT, 0.05)

    # Flow: drums drop out, riser and pitch climb into the burst, then the groove again under the showcase + request.
    rd = BURST - FLOW; t = t_(rd)
    place(mus, noise_rise(rd, 600, 9000), FLOW, 0.24)
    place(mus, np.sin(2 * np.pi * np.cumsum(220 * 4 ** (t / rd)) / SR) * (t / rd) ** 2, FLOW, 0.05)
    place(mus, pad([57, 64, 69, 72], rd + 0.1, 1500), FLOW, 0.05)
    place(drums, kick(1.4, 0.6), BURST, 1.0)
    place(drums, crash(1.6), BURST, 0.16)
    place(mus, bell(88, 1.2), BURST, 0.05)
    groove(GROOVE2, BLOBS)

    # Blobs: half-time break, a short riser into the ring.
    place(mus, bass(33, 0.6, 200, 1.6), BLOBS, 0.6)
    for i, t0 in enumerate(np.arange(BLOBS, RING - 1e-6, BEAT)):
        if i % 2 == 0: place(drums, kick(0.9), t0, 0.6)
        if i % 4 == 2: place(drums, clap(), t0, 0.3)
        place(mus, pluck([76, 72, 69, 72][i % 4], 0.3, 2400), t0, 0.08)
        place(drums, hat(), t0 + BEAT / 2, 0.05)
    place(mus, pad([45, 52, 57, 60, 64], RING - BLOBS, 1600), BLOBS, 0.05)
    place(mus, noise_rise(OUTRO - RING + 0.3), RING - 0.3, 0.22)
    place(mus, chirp(400, 1800, OUTRO - RING), RING, 0.05)

    # End logo: big major hit, crash, bells, then a soft pulse that rings out.
    place(drums, kick(1.4, 0.6), OUTRO, 1.0)
    place(drums, crash(2.6), OUTRO, 0.2)
    place(mus, pad([48, 55, 60, 64, 67, 71, 76], END - OUTRO, fc=3000), OUTRO, 0.1)
    place(mus, bass(36, 2.6, 300, 1.4), OUTRO, 0.55)
    for k, nt in enumerate([72, 76, 79, 84, 88, 91]):
        place(mus, bell(nt, 2.4), OUTRO + 0.12 + k * 0.07, 0.05)
    for i, t0 in enumerate(np.arange(OUTRO + 0.8, END - 0.6, BEAT / 2)):
        place(mus, pluck([84, 79, 76, 79][i % 4], 0.3, 3500), t0, 0.04 * (1 - (t0 - OUTRO) / (END - OUTRO)))
    for t0 in np.arange(OUTRO + 1.6, END - 0.8, BEAT * 2):
        place(drums, kick(0.6), t0, 0.22)

    # Sidechain pump on the music under the grooves.
    tt = np.arange(n) / SR
    on = ((tt >= DROP) & (tt < FLOW)) | ((tt >= GROOVE2) & (tt < BLOBS))
    duck = np.where(on, 1 - 0.4 * np.exp(-((tt - DROP) % BEAT) * 10), 1)
    x = mus * duck + drums
    fade = np.clip((END - tt) / 1.2, 0, 1)
    return (x * fade)[: int(END * SR)]


x = build()
x = x / np.abs(x).max() * 0.89
st = np.stack([x, np.roll(x, 140)], axis=1)
with wave.open(f"{sys.argv[1].rstrip('/')}/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
