#!/usr/bin/env bash
# Integrated loudness and duration of a file.
set -euo pipefail
ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" | xargs printf "duration %.2f s\n"
ffmpeg -v info -i "$1" -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | tail -1
