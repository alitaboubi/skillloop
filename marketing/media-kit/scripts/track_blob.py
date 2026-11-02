"""Track a bright, flat object (blank sticker, paper) through a clip and print its box per sample.

  python3 -E track_blob.py clip.mp4 start dur x y w h [fps=6] [min_level=190]

(x, y, w, h) is the search window in clip pixels. Prints `time x0-x1 y0-y1` in clip pixels, ready to become
keyframes in a Remotion overlay. Clothes or walls of the same colour can merge with the blob: check the result on a
full-resolution grid frame (ffmpeg drawgrid) before trusting it.
"""
import glob, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage

clip, start, dur, x, y, w, h = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), *map(int, sys.argv[4:8])
fps = float(sys.argv[8]) if len(sys.argv) > 8 else 6.0
level = int(sys.argv[9]) if len(sys.argv) > 9 else 190
with tempfile.TemporaryDirectory() as d:
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", clip, "-vf", f"fps={fps},crop={w}:{h}:{x}:{y}", f"{d}/f%04d.png"], check=True)
    for i, f in enumerate(sorted(glob.glob(f"{d}/f*.png"))):
        a = np.asarray(Image.open(f).convert("RGB")).astype(int)
        mask = (a.min(axis=2) > level) & (np.ptp(a, axis=2) < 30)
        lab, n = ndimage.label(mask)
        t = start + i / fps
        if n == 0:
            print(f"{t:.2f} none"); continue
        k = int(np.argmax(ndimage.sum(mask, lab, range(1, n + 1)))) + 1
        ys, xs = np.nonzero(lab == k)
        print(f"{t:.2f} x {x + xs.min()}-{x + xs.max()} y {y + ys.min()}-{y + ys.max()} px={len(xs)}")
