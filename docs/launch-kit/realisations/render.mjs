// Renders the concept portfolio: 4:3 JPEG presentations + 12 s videos, MP4 (H.264) and WebM (VP9) (portfolio limit: 15 s, 8 MB).
// WebM is for browsers without H.264 (open-source Chromium builds): there the upload check says it cannot read the MP4.
// Needs Playwright (Chromium) and ffmpeg. Serve src/ over http so iframes stay same-origin:
//   python3 -m http.server 8765 -d docs/launch-kit/realisations/src &
//   NODE_PATH=<dir with node_modules/playwright> [ONLY=app] node docs/launch-kit/realisations/render.mjs
// src/fonts/noto-color-emoji.woff2 is not committed: fontsource noto-color-emoji emoji-400-normal.woff2.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)(join(process.env.NODE_PATH ?? "", "playwright"));
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const BASE = "http://127.0.0.1:8765/";
const FPS = 30, SECONDS = 12;

const site = (file, o) => `present-site.html?${new URLSearchParams({ site: file, ...o })}`;
const JOBS = [
  { name: "site-dar-yasmine", url: site("site-dar-yasmine.html", { name: "Dar Yasmine", url: "dar-yasmine.tn", bg: "#f6efe2", fg: "#0f3672", accent: "#c8553d",
      desc: "Site vitrine d'un restaurant à Sidi Bou Saïd : carte, horaires et réservation WhatsApp, pensé mobile d'abord." }), kind: "site" },
  { name: "site-koach", url: site("site-koach.html", { name: "Koach", url: "koach.tn", bg: "#0d0f12", fg: "#f2f3f5", accent: "#d4ff3f",
      desc: "Landing page d'un coach sportif : programmes, formules et séance d'essai en un clic." }), kind: "site" },
  { name: "app-louage-live", url: "app-louage.html", kind: "app" },
  { name: "app-souk-fresh", url: "app-souk-fresh.html", kind: "app" },
];

/** Scroll timeline for site videos: hold, glide down in steps, glide back to the top. */
function scrollAt(t) {
  const keys = [[0, 0], [1.2, 0], [3.2, 0.35], [4.4, 0.35], [6.4, 0.7], [7.6, 0.7], [9.2, 1], [10.2, 1], [11.6, 0], [12, 0]];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    if (t <= t1) { const x = (t - t0) / (t1 - t0); const e = x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; return v0 + (v1 - v0) * e; }
  }
  return 0;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
for (const job of JOBS.filter((j) => !process.env.ONLY || j.name.startsWith(process.env.ONLY))) {
  await page.goto(BASE + job.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${job.name}.jpg`), type: "jpeg", quality: 90 });

  const frames = join(OUT, `.frames-${job.name}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames);
  await page.goto(BASE + job.url + "#video", { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" }); // hash-only navigation does not rerun the page script
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  for (let f = 0; f < FPS * SECONDS; f++) {
    const t = f / FPS;
    if (job.kind === "site") await page.evaluate((v) => window.scrollTo01(v), scrollAt(t));
    else await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * 1000);
    await page.screenshot({ path: join(frames, `${String(f).padStart(4, "0")}.png`) });
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%04d.png"),
    "-vf", "scale=1200:900:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", join(OUT, `${job.name}.mp4`)]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, `${job.name}.mp4`), "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33",
    "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", join(OUT, `${job.name}.webm`)]);
  rmSync(frames, { recursive: true, force: true });
  console.log("done", job.name);
}
await browser.close();
