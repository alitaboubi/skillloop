#!/usr/bin/env bash
# Instagram master: loudness -14 LUFS (true peak -1.5), AAC 256k, video copied, faststart.
# Usage: master.sh raw.mp4 final.mp4
set -euo pipefail
ffmpeg -v error -y -i "$1" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 256k -movflags +faststart "$2"
"$(dirname "$0")/loudness.sh" "$2"
