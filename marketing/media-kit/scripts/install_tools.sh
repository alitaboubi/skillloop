#!/usr/bin/env bash
# Install the kit's local tools without sudo, in their own places (nothing touches system Python).
#   Python tools → ~/.local/share/skillloop-media/venv   (run them with: $MEDIA_PY or the venv's bin/)
#   ncnn binaries → ~/.local/share/skillloop-media/bin  (Real-ESRGAN, RIFE)
#   Vulkan (WSL)  → ~/.local/share/skillloop-media/vulkan (Mesa "dozen" driver over D3D12, extracted from .deb)
# Usage: install_tools.sh [python|ncnn|vulkan|all]   (default all). Safe to re-run.
set -euo pipefail
M=~/.local/share/skillloop-media
mkdir -p "$M/bin" "$M/dl"
what=${1:-all}

if [[ $what == python || $what == all ]]; then
  [ -x "$M/venv/bin/python" ] || uv venv --python 3.10 "$M/venv"
  # CPU torch keeps the download small (~200 MB); the 4 GB GPU would gain little for these tools.
  uv pip install --python "$M/venv/bin/python" --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 torchaudio==2.5.1
  # Pins checked on this machine (Ubuntu 22.04, glibc 2.35, Ryzen 7 7435HS):
  #   pedalboard ≥ 0.9.2x crashes with "Illegal instruction" → 0.9.16; rembg ≥ 2.0.70 needs Python 3.11 → 2.0.69;
  #   auto-editor 29 needs glibc 2.38 and 23.x no longer builds → not installed (use ffmpeg silencedetect).
  uv pip install --python "$M/venv/bin/python" demucs==4.0.1 pedalboard==0.9.16 scenedetect==0.7.1 opencv-python-headless "rembg[cpu]==2.0.69" soundfile
fi

if [[ $what == vulkan || $what == all ]]; then
  mkdir -p "$M/vulkan/deb"
  ( cd "$M/vulkan/deb" && apt-get download mesa-vulkan-drivers libvulkan1 vulkan-tools libllvm15 libxcb-randr0 libxcb-dri3-0 libxcb-present0 libxcb-sync1 libxshmfence1 libwayland-client0 libx11-xcb1 libxcb-xfixes0 2>/dev/null || true
    for d in *.deb; do dpkg-deb -x "$d" ../root; done )
  # Point the lavapipe ICD at the extracted library. Use: VK_ICD_FILENAMES=$M/vulkan/lvp_icd.json LD_LIBRARY_PATH=$M/vulkan/root/usr/lib/x86_64-linux-gnu
  R="$M/vulkan/root"
  sed "s|/usr/lib/x86_64-linux-gnu/libvulkan_lvp.so|$R/usr/lib/x86_64-linux-gnu/libvulkan_lvp.so|" "$R/usr/share/vulkan/icd.d/lvp_icd.x86_64.json" > "$M/vulkan/lvp_icd.json"
fi

if [[ $what == ncnn || $what == all ]]; then
  cd "$M/dl"
  # Linux builds need Vulkan: on this WSL only Mesa lavapipe (CPU) exists → fine for stills, far too slow for video.
  [ -f realesrgan.zip ] || curl -fsSL -o realesrgan.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip
  curl -fsSL -C - -o rife.zip https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-ubuntu.zip
  mkdir -p "$M/bin/realesrgan"
  unzip -oq realesrgan.zip -d "$M/bin/realesrgan"; chmod +x "$M/bin/realesrgan/realesrgan-ncnn-vulkan"
  unzip -oq rife.zip -d "$M/bin"; chmod +x "$M"/bin/rife-ncnn-vulkan-*/rife-ncnn-vulkan
fi
echo "done: $what"
