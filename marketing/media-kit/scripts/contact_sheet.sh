#!/usr/bin/env bash
# Six frames of a clip side by side (or N with FRAMES=N), to spot stray shots, continuity errors and fake text.
# Usage: contact_sheet.sh clip.mp4 sheet.png
set -euo pipefail
n=${FRAMES:-6}
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
fps=$(python3 -c "print($n/$dur)")
ffmpeg -v error -y -i "$1" -vf "fps=$fps,scale=180:320,tile=${n}x1" -frames:v 1 "$2"
echo "$2 (frame k ≈ k*$dur/$n s; confirm exact times on a full-resolution frame)"
