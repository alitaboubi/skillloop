"""Masters out/<name>_raw.mp4 → out/<name>.mp4 at about -14 LUFS (Instagram) with a -1.5 dBTP limiter.
The limiter eats some loudness, so the gain is nudged until the result lands within 0.4 LU of the target.
Usage: python3 scripts/master.py Reel reel  (raw name, output name)"""
import re, subprocess, sys

src, dst = f"out/{sys.argv[1]}_raw.mp4", f"out/{sys.argv[2]}.mp4"

def lufs(path, af=None):
    cmd = ["ffmpeg", "-i", path] + (["-af", af + ",ebur128"] if af else ["-af", "ebur128"]) + ["-f", "null", "-"]
    out = subprocess.run(cmd, capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])

chain = lambda g: f"volume={g:.2f}dB,alimiter=limit=0.70:attack=2:release=60:level=false"
gain = -14 - lufs(src)
for _ in range(4):
    got = lufs(src, chain(gain))
    if abs(got + 14) < 0.4: break
    gain += -14 - got
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-c:v", "copy", "-af", chain(gain), "-ar", "48000",
                "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", dst], check=True)
print(f"{dst}: gain {gain:+.2f} dB → {lufs(dst):.1f} LUFS")
