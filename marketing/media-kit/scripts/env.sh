# Source this to use the kit's local tools:  source marketing/media-kit/scripts/env.sh
# (installed by install_tools.sh; nothing here touches system Python)
export MEDIA_HOME=~/.local/share/skillloop-media
export MEDIA_PY=$MEDIA_HOME/venv/bin/python          # demucs, pedalboard, scenedetect, rembg, torch (CPU)
export PATH=$MEDIA_HOME/venv/bin:$PATH                # demucs, scenedetect CLIs
# Vulkan on this WSL = Mesa lavapipe (CPU) for the ncnn tools (Real-ESRGAN, RIFE): stills only, too slow for video.
export MEDIA_VK="VK_ICD_FILENAMES=$MEDIA_HOME/vulkan/lvp_icd.json LD_LIBRARY_PATH=$MEDIA_HOME/vulkan/root/usr/lib/x86_64-linux-gnu"
export REALESRGAN=$MEDIA_HOME/bin/realesrgan/realesrgan-ncnn-vulkan
export RIFE=$(ls -d $MEDIA_HOME/bin/rife-ncnn-vulkan-*/ 2>/dev/null | head -1)rife-ncnn-vulkan
