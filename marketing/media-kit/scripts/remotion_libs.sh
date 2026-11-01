#!/usr/bin/env bash
# Make Remotion's Chrome run on this WSL without sudo: NSS libs + the emoji font, inside the project.
# Usage: remotion_libs.sh <remotion-project-dir>   then: export LD_LIBRARY_PATH=<dir>/node_modules/.remotion/libs/root/usr/lib/x86_64-linux-gnu
set -euo pipefail
cd "$1"
L=node_modules/.remotion/libs
mkdir -p "$L/deb" public/fonts
( cd "$L/deb" && apt-get download libnspr4 libnss3 fonts-noto-color-emoji && for d in *.deb; do dpkg-deb -x "$d" ../root; done )
cp "$L"/root/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf public/fonts/
echo "export LD_LIBRARY_PATH=$PWD/$L/root/usr/lib/x86_64-linux-gnu"
