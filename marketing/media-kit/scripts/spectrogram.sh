#!/usr/bin/env bash
# Spectrogram of a stretch of audio, to find words and vowels to ~10 ms.
# Usage: spectrogram.sh clip.mp4 start_sec dur_sec out.png
set -euo pipefail
ffmpeg -v error -y -ss "$2" -t "$3" -i "$1" -lavfi "showspectrumpic=s=1400x400:legend=1:scale=log:stop=6000:color=intensity" "$4"
echo "$4 (x axis starts at $2 s)"
