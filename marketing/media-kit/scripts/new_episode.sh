#!/usr/bin/env bash
# Start a new reel from the SkillLoop Remotion template (brand, subtitles, badges, phone scenes, tracked stickers,
# end card, carousel, music script). Heavy media is not copied.
# Usage: new_episode.sh <name>      → marketing/<name>/edit with an empty edit list
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SRC="$ROOT/reel-ep1/edit"
DST="$ROOT/$1/edit"
[ -e "$DST" ] && { echo "$DST exists"; exit 1; }
mkdir -p "$DST" "$ROOT/$1/clips"
rsync -a --exclude node_modules --exclude out --exclude public/clips --exclude public/post --exclude public/stills \
  --exclude public/audio --exclude public/fonts "$SRC/" "$DST/"
mkdir -p "$DST/public/audio" "$DST/public/clips" "$DST/public/stills"
cp "$ROOT/media-kit/template/Reel.tsx" "$DST/src/Reel.tsx"
cp "$ROOT/reel-ep1/.gitignore" "$ROOT/$1/.gitignore"
echo "Created $DST. Next: npm install, ../../media-kit/scripts/remotion_libs.sh ., put clips in ../clips, upscale into public/clips."
