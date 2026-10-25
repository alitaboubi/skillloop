/**
 * Photo framing math (pure, tested). The frame is W×H on screen; the image (natural iw×ih) is drawn at
 * scale s = cover × zoom with its top-left at (x, y) relative to the frame. The image always covers the frame.
 */
export type Size = { w: number; h: number };
export type Pos = { x: number; y: number };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

/** Smallest scale at which the image fully covers the frame. */
export const coverScale = (img: Size, frame: Size) => Math.max(frame.w / img.w, frame.h / img.h);

/** Keeps the image covering the frame (no empty edges). */
export function clampPos(p: Pos, img: Size, frame: Size, scale: number): Pos {
  const minX = frame.w - img.w * scale;
  const minY = frame.h - img.h * scale;
  return { x: Math.min(0, Math.max(minX, p.x)), y: Math.min(0, Math.max(minY, p.y)) };
}

/** Image centred in the frame at the given scale. */
export const centred = (img: Size, frame: Size, scale: number): Pos => ({ x: (frame.w - img.w * scale) / 2, y: (frame.h - img.h * scale) / 2 });

/** New position after a zoom change, keeping the point under the frame centre in place. */
export function zoomAround(p: Pos, frame: Size, from: number, to: number): Pos {
  const k = to / from;
  return { x: frame.w / 2 - (frame.w / 2 - p.x) * k, y: frame.h / 2 - (frame.h / 2 - p.y) * k };
}

/** The part of the original image that is inside the frame, in image pixels. */
export function sourceRect(p: Pos, frame: Size, scale: number) {
  return { sx: -p.x / scale, sy: -p.y / scale, sw: frame.w / scale, sh: frame.h / scale };
}

/** Output size: the frame's aspect ratio, never upscaled, at most maxW wide. */
export function outputSize(sw: number, aspect: number, maxW: number): Size {
  const w = Math.max(1, Math.round(Math.min(sw, maxW)));
  return { w, h: Math.max(1, Math.round(w / aspect)) };
}
