#!/usr/bin/env bash
# Upscale a Veo clip to 1080×1920 with the kit's common grade. One file at a time (3 GB RAM).
# Usage: upscale.sh in.mp4 out.mp4
set -euo pipefail
ffmpeg -v error -y -threads 4 -i "$1" \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,eq=contrast=1.04:saturation=1.06,format=yuv420p" \
  -c:v libx264 -preset medium -crf 16 -c:a aac -b:a 192k "$2"
echo "$2"
