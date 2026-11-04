"""Masters out/reel_raw.mp4 → out/reel.mp4 at about -14 LUFS (Instagram) with a -1.5 dBTP limiter.
The limiter eats some loudness, so the gain is nudged until the result lands within 0.4 LU of the target."""
import re, subprocess

def lufs(path, af=None):
    cmd = ["ffmpeg", "-i", path] + (["-af", af + ",ebur128"] if af else ["-af", "ebur128"]) + ["-f", "null", "-"]
    out = subprocess.run(cmd, capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])

chain = lambda g: f"volume={g:.2f}dB,alimiter=limit=0.70:attack=2:release=60:level=false"
gain = -14 - lufs("out/reel_raw.mp4")
for _ in range(4):
    got = lufs("out/reel_raw.mp4", chain(gain))
    if abs(got + 14) < 0.4: break
    gain += -14 - got
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "out/reel_raw.mp4", "-c:v", "copy", "-af", chain(gain), "-ar", "48000",
                "-c:a", "aac", "-b:a", "256k", "out/reel.mp4"], check=True)
print(f"gain {gain:+.2f} dB → {lufs('out/reel.mp4'):.1f} LUFS")
