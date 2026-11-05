import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, LAT } from "../theme";

// Blank sticker on Karim's window, measured frame by frame in v06_sticker (1080×1920): source second → box.
const T = [6.97, 7.97, 8.97, 9.8];
const X = [691, 680, 663, 659];
const Y = [675, 683, 695, 702];
const W = [103, 99, 94, 93];
const H = [151, 145, 140, 139];
// Veo wrote fake Arabic on the meter box (bottom right); it follows the same camera drift, so blur it.
const BOX = { dx: 218, dy: 590, w: 180, h: 190 };

/** The app's real QR sticker laid onto the blank one, plus a callout. `from` = source second where the shot starts. */
export function ShopSticker({ from }: { from: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = from + frame / fps;
  const at = (v: number[]) => interpolate(t, T, v, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = at(X), y = at(Y), w = at(W), h = at(H);
  const k = w / 93;
  const ring = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 5) * 0.04;
  return (
    <>
      <div style={{ position: "absolute", left: x + BOX.dx * k, top: y + BOX.dy * k, width: BOX.w * k, height: BOX.h * k,
        backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)", borderRadius: 6 }} />
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "#f4f1ea", borderRadius: 3,
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)", display: "grid", placeItems: "center" }}>
        <Img src={staticFile("sticker.svg")} style={{ width: w * 0.94, height: w * 0.94, filter: "saturate(0.9) brightness(0.96)" }} />
      </div>
      {/* callout */}
      <div style={{ position: "absolute", left: x - 30, top: y - 30, width: w + 60, height: h + 60, borderRadius: 26,
        border: `6px solid ${C.lime}`, opacity: ring, transform: `scale(${(0.6 + ring * 0.4) * pulse})`, boxShadow: `0 0 30px ${C.lime}` }} />
      <div style={{ position: "absolute", left: x - 260, top: y - 150, opacity: ring, transform: `translateY(${(1 - ring) * 30}px)`,
        background: C.lime, color: C.ink, fontFamily: LAT, fontWeight: 800, fontSize: 40, padding: "14px 28px", borderRadius: 999,
        boxShadow: "0 16px 40px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>QR SkillLoop ↘</div>
    </>
  );
}

// Blank paper on the window in v07_salma, measured frame by frame: source second → left edge (top stays ~732).
const PT = [3.4, 3.63, 3.8, 3.97, 4.13, 4.3, 4.47, 4.63, 4.8];
const PX = [90, 118, 131, 137, 142, 140, 141, 132, 139];

/** The QR sticker on the paper Salma scans. The paper is seen at an angle: its top edge drops ~30 px to the right. */
export function PaperSticker({ from }: { from: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = interpolate(from + frame / fps, PT, PX, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w = 186, h = 298;
  return (
    <div style={{ position: "absolute", left: x, top: 732, width: w, height: h, background: "#d9d5cc",
      clipPath: "polygon(0 0, 100% 10%, 100% 98%, 0 100%)", display: "grid", placeItems: "center", filter: "blur(1.3px) contrast(0.92)" }}>
      <Img src={staticFile("sticker.svg")} style={{ width: w * 0.9, height: w * 0.9, transform: "skewY(8deg) translateY(10px)",
        filter: "saturate(0.85) brightness(0.92) blur(0.6px)" }} />
    </div>
  );
}
