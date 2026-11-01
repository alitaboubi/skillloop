#!/usr/bin/env bash
# Speech vs silence per clip: words Whisper places inside silence are hallucinations.
# Usage: silences.sh clip.mp4 [threshold_dB=-32]
set -euo pipefail
ffmpeg -v info -i "$1" -af "silencedetect=n=${2:--32}dB:d=0.35" -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+" | tr '\n' ' '; echo
