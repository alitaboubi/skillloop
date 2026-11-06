"""Site files for the showcase ad: out/wide.mp4 → public/media/skillloop-vitrine.mp4 (1280×720, H.264 CRF 27, AAC 96k,
faststart) and the poster (end-card frame) → src/assets/home/vitrine-poster.webp. Run from this folder."""
import subprocess

ROOT = "../../.."
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "out/wide.mp4", "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow",
                "-crf", "27", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                f"{ROOT}/public/media/skillloop-vitrine.mp4"], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "21.2", "-i", "out/wide.mp4", "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos",
                "-c:v", "libwebp", "-quality", "78", f"{ROOT}/src/assets/home/vitrine-poster.webp"], check=True)
print("ok")
