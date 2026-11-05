"""Original music bed for « الدورة » (ep3), synthesised from scratch (no samples, no licence issues).

Tense ticking pulse and a low drone while the skill goes unseen, a riser into a drop when the loop is drawn,
a driving four-on-the-floor groove with a minor arp under the platform scenes, then drums out for the closing button.
Section times follow src/Reel.tsx. Usage: python3 scripts/music.py public/audio
"""
import sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
BPM = 120
BEAT = 60 / BPM
DROP, OUTRO, END = 8.0, 29.0, 35.0
CLICK = 30.6  # the button click in the end scene
rng = np.random.default_rng(303)


def t_(d): return np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return lfilter(*butter(2, [lo, hi], btype="band", fs=SR), x)
def lp(x, fc): return lfilter(*butter(2, fc, fs=SR), x)
def hp(x, fc): return lfilter(*butter(2, fc, btype="high", fs=SR), x)
def hz(n): return 440 * 2 ** ((n - 69) / 12)


def place(buf, x, at, gain=1.0):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += x[: j - i] * gain


def pluck(note, d=0.35, bright=1.0):
    t = t_(d); f = hz(note)
    saw = sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (6 + k * 3 / bright)) for k in range(1, 7))
    return saw * np.minimum(1, t / 0.003)


def bell(note, d=3.0):
    t = t_(d); f = hz(note)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec) for r, a, dec in [(1, 1, 1.2), (2.76, 0.4, 3), (5.4, 0.2, 6)])
    return x * np.minimum(1, t / 0.004)


def pad(notes, d, fc=1600):
    t = t_(d)
    x = sum(sum(np.sin(2 * np.pi * hz(n) * k * t * (1 + 0.003 * s)) / k for k in (1, 2, 3, 4)) for n in notes for s in (-1, 1))
    env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5)
    return lp(x, fc) * env


def kick(punch=1.0):
    t = t_(0.45); f = 42 + 110 * punch * np.exp(-t * 32)
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7))


def clap():
    t = t_(0.25); n = rng.normal(0, 1, t.size)
    return bp(n, 900, 5000) * (np.exp(-t * 22) + 0.6 * np.exp(-((t - 0.012) % 0.011) * 300) * (t < 0.035))


def hat(open_=False):
    t = t_(0.2 if open_ else 0.04)
    return hp(rng.normal(0, 1, t.size), 8000) * np.exp(-t * (16 if open_ else 90))


def tick():
    t = t_(0.03)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200)


def sub(note, d):
    t = t_(d); f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.45 * np.sign(np.sin(2 * np.pi * f * t)) * 0.4
    return lp(x, 380) * np.exp(-t * 3) * np.minimum(1, t / 0.004)


def impact():
    t = t_(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    air = hp(rng.normal(0, 1, t.size), 2500) * np.exp(-t * 3.5) * 0.25
    return boom + air


def build():
    n = int(END * SR) + SR
    mus, drums = np.zeros(n), np.zeros(n)
    PROG = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]   # Am F G Em
    bar = 4 * BEAT

    # Unseen: low drone, a clock-like tick on every eighth, a pulse on each beat, sparse plucks.
    place(mus, pad([33, 45, 52], DROP + 0.3, fc=700), 0, 0.11)
    for i, t0 in enumerate(np.arange(0, DROP, BEAT / 2)):
        place(drums, tick(), t0, 0.10 if i % 2 else 0.18)
    for i, t0 in enumerate(np.arange(2.5, DROP, BEAT)):
        place(drums, kick(0.35), t0, 0.25)
    for i, t0 in enumerate(np.arange(0, DROP - 1, BEAT)):
        place(mus, pluck([69, 72, 76, 72][i % 4], 0.4, 0.5), t0 + BEAT / 2, 0.07)
    # Slams at 2.5 s (SKILL) and 5 s (chart).
    place(drums, impact(), 2.5, 0.55); place(drums, impact(), 5.0, 0.35)

    # Riser into the drop: noise sweep + rising tone + snare roll.
    rd = 2.0; t = t_(rd)
    place(mus, bp(rng.normal(0, 1, t.size), 400, 7000) * (t / rd) ** 2 * 0.35, DROP - rd)
    place(mus, np.sin(2 * np.pi * np.cumsum(180 + 1000 * (t / rd) ** 2) / SR) * (t / rd) ** 3 * 0.1, DROP - rd)
    for k in range(16):
        place(drums, clap(), DROP - 1.0 + k / 16, 0.05 + 0.25 * k / 16)
    place(drums, impact(), DROP, 0.9)

    # Groove: four-on-the-floor, claps on 2 and 4, offbeat open hats, 16th arp, sub bass, pad.
    for i, t0 in enumerate(np.arange(DROP, OUTRO, BEAT)):
        bi = i % 4
        ch = PROG[(i // 4) % 4]
        place(drums, kick(), t0, 0.95)
        if bi in (1, 3): place(drums, clap(), t0, 0.32)
        place(drums, hat(True), t0 + BEAT / 2, 0.10)
        for k in range(4):
            place(drums, hat(), t0 + k * BEAT / 4, 0.05)
            arp = (ch + [ch[0] + 12])[(i * 4 + k) % 4] + 12
            place(mus, pluck(arp, 0.22), t0 + k * BEAT / 4, 0.06)
        place(mus, sub(ch[0] - 24, BEAT * 0.95), t0, 0.4)
        if bi == 0: place(mus, pad(ch, bar + 0.3), t0, 0.035)
    # Accent hits on the scene changes inside the groove.
    for at in (11.5, 15.5, 19.0, 22.0, 26.0):
        place(drums, impact(), at, 0.3)

    # Outro: drums out, held Am pad, then a bright chord + bell on the button click.
    place(mus, pad([45, 57, 64], CLICK - OUTRO + 0.4, fc=900), OUTRO, 0.07)
    for i, t0 in enumerate(np.arange(OUTRO, CLICK, BEAT / 2)):
        place(drums, tick(), t0, 0.12)
    place(drums, impact(), CLICK, 0.7)
    for k, nt in enumerate([48, 55, 60, 64, 67, 72]):
        place(mus, bell(nt + 12, END - CLICK + 0.5), CLICK + k * 0.05, 0.07)
    place(mus, pad([48, 55, 64, 67], END - CLICK), CLICK, 0.07)

    # Sidechain pump on the music during the groove.
    tt = np.arange(n) / SR
    duck = np.where((tt >= DROP) & (tt < OUTRO), 1 - 0.5 * np.exp(-((tt - DROP) % BEAT) * 9), 1)
    x = mus * duck + drums
    fade = np.clip((END - tt) / 1.2, 0, 1)
    return (x * fade)[: int(END * SR)]


x = build()
x = x / np.abs(x).max() * 0.89
st = np.stack([x, np.roll(x, 120)], axis=1)  # a touch of width
with wave.open(f"{sys.argv[1].rstrip('/')}/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
