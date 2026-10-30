/**
 * "Portfolio en mouvement" (SkillLoop Pro): one short video per portfolio item, stored in <uid>/motion/<uuid>.<ext>
 * (portfolio_items.video_url, migration 20261030120000_pro_tools.sql). The item's normal image is a poster frame taken
 * from the video in the browser, so cards, the lightbox fallback and sharing keep working with a photo. Only while
 * PRO_TOOLS_ENABLED; the database refuses new videos for accounts without Pro ("plan_required:motion").
 */
export const MOTION_MAX_SECONDS = 15;
export const MOTION_MAX_BYTES = 8 * 1024 * 1024;
export const MOTION_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" } as const;
export type MotionType = keyof typeof MOTION_TYPES;

export type MotionError = "motion_err_type" | "motion_err_size" | "motion_err_long" | "motion_err_read";

/** Type and size, checked before reading the file. */
export function checkVideoFile(f: { type: string; size: number }): MotionError | null {
  if (!(f.type in MOTION_TYPES)) return "motion_err_type";
  if (f.size > MOTION_MAX_BYTES) return "motion_err_size";
  return null;
}

/** Duration rule (a little tolerance: phones round 15 s clips up to 15.0x s). */
export const checkDuration = (seconds: number): MotionError | null =>
  !Number.isFinite(seconds) || seconds <= 0 ? "motion_err_read" : seconds > MOTION_MAX_SECONDS + 0.5 ? "motion_err_long" : null;

export const motionPath = (userId: string, type: MotionType, id: string = crypto.randomUUID()) => `${userId}/motion/${id}.${MOTION_TYPES[type]}`;

/** "0:12" for a duration in seconds. */
export const formatDuration = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

/** Centre crop of a w×h frame to 4:3 (the portfolio frame), in source pixels. */
export function cropTo43(w: number, h: number): { sx: number; sy: number; sw: number; sh: number } {
  if (w / h > 4 / 3) { const sw = Math.round((h * 4) / 3); return { sx: Math.round((w - sw) / 2), sy: 0, sw, sh: h }; }
  const sh = Math.round((w * 3) / 4);
  return { sx: 0, sy: Math.round((h - sh) / 2), sw: w, sh };
}

export type ProbedVideo = { duration: number; poster: File; width: number; height: number };

/**
 * Browser only: reads the video's duration and grabs a 4:3 poster frame (JPEG, 1200 px wide) near the start.
 * Rejects with a MotionError when the browser can't decode the file (e.g. an HEVC clip on a browser without HEVC).
 */
export function probeVideo(file: File): Promise<ProbedVideo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (e?: MotionError, r?: ProbedVideo) => { URL.revokeObjectURL(url); v.removeAttribute("src"); v.load(); if (e) reject(new Error(e)); else resolve(r!); };
    const timer = window.setTimeout(() => done("motion_err_read"), 15_000);
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.onerror = () => { window.clearTimeout(timer); done("motion_err_read"); };
    v.onloadedmetadata = () => {
      const bad = checkDuration(v.duration);
      if (bad) { window.clearTimeout(timer); done(bad); return; }
      v.currentTime = Math.min(1, v.duration / 3);
    };
    v.onseeked = () => {
      window.clearTimeout(timer);
      const { videoWidth: w, videoHeight: h } = v;
      if (!w || !h) { done("motion_err_read"); return; }
      const c = cropTo43(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      canvas.getContext("2d")?.drawImage(v, c.sx, c.sy, c.sw, c.sh, 0, 0, 1200, 900);
      canvas.toBlob((b) => {
        if (!b) { done("motion_err_read"); return; }
        done(undefined, { duration: v.duration, width: w, height: h, poster: new File([b], "poster.jpg", { type: "image/jpeg" }) });
      }, "image/jpeg", 0.85);
    };
    v.src = url;
  });
}
