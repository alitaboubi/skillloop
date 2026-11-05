import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, C, LAT, KUFI, s } from "./theme";

/** One source clip: starts at `from` seconds, slow push-in for life, optional audio level. */
export function Clip({ src, from, zoom = [1, 1.06], volume = 1, style, children, origin = "50% 50%" }: {
  src: string; from: number; zoom?: [number, number]; volume?: number; style?: CSSProperties; children?: ReactNode; origin?: string;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = interpolate(frame, [0, durationInFrames], zoom, { extrapolateRight: "clamp" });
  // Children share the push-in transform, so tracked overlays stay glued to the picture.
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: origin }}>
        <OffthreadVideo src={staticFile(`clips/${src}.mp4`)} startFrom={s(from)} volume={volume}
          style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Cinematic finish over every shot: soft vignette + fine grain. */
export function Finish() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
      <AbsoluteFill style={{
        opacity: 0.07, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${(frame * 37) % 220}px ${(frame * 53) % 220}px`,
      }} />
    </AbsoluteFill>
  );
}

/** Burned-in subtitle: Tunisian Arabic line + French line, word-pop entrance. */
export function Subtitle({ ar, fr, y = 1380 }: { ar: string; fr?: string; y?: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const out = interpolate(frame, [durationInFrames - 5, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", opacity: out,
      transform: `translateY(${(1 - pop) * 30}px) scale(${0.9 + pop * 0.1})` }}>
      <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 64, lineHeight: 1.35, color: C.white,
        textShadow: "0 4px 18px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)" }}>{ar}</div>
      {fr && <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 38, marginTop: 6, color: C.lime,
        textShadow: "0 3px 14px rgba(0,0,0,0.85)" }}>{fr}</div>}
    </div>
  );
}

/** Big hook title that slams in and shakes once. */
export function PunchTitle({ ar, fr, y = 260 }: { ar: string; fr: string; y?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, stiffness: 220, mass: 0.7 } });
  const shake = frame < 10 ? Math.sin(frame * 2.2) * (10 - frame) * 1.6 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center",
      transform: `translateX(${shake}px) scale(${2.2 - slam * 1.2}) rotate(${-3 + slam * 3}deg)`, opacity: Math.min(1, slam * 2) }}>
      <div dir="rtl" style={{ display: "inline-block", fontFamily: KUFI, fontWeight: 700, fontSize: 118, color: C.ink,
        background: C.lime, padding: "6px 44px 22px", borderRadius: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>{ar}</div>
      <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: 44, color: C.white, marginTop: 18, letterSpacing: 1,
        textShadow: "0 4px 16px rgba(0,0,0,0.8)" }}>{fr}</div>
    </div>
  );
}

/** Time-passing badge for the waiting montage: flips in like a calendar page. */
export function SeasonBadge({ ar, fr, emoji }: { ar: string; fr: string; emoji: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", perspective: 900 }}>
      <div style={{ transform: `rotateX(${(1 - flip) * -90}deg)`, transformOrigin: "top", background: C.paper, borderRadius: 26,
        boxShadow: "0 22px 50px rgba(0,0,0,0.45)", overflow: "hidden", minWidth: 430, textAlign: "center" }}>
        <div style={{ background: C.clay, height: 26 }} />
        <div style={{ padding: "14px 40px 22px" }}>
          <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 76, color: C.ink, lineHeight: 1.25 }}>{emoji} {ar}</div>
          <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 34, color: C.ink2, opacity: 0.75 }}>{fr}</div>
        </div>
      </div>
    </div>
  );
}

/** White flash used on hard cuts (whoosh moments). */
export function Flash({ len = 6 }: { len?: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, len], [0.85, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return <AbsoluteFill style={{ backgroundColor: "white", opacity: o, pointerEvents: "none" }} />;
}

/** The SkillLoop loop mark (same path as the app's card). */
export function LoopMark({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 34 18" fill="none">
      <path d="M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z" stroke={C.clay} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 2c-4 0-6 3.5-8 7" stroke={C.lime} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 64 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3, justifyContent: "center" }}>
      <LoopMark size={size * 1.6} />
      <span style={{ fontFamily: LAT, fontWeight: 800, fontSize: size, color: C.white }}>Skill<span style={{ color: C.lime }}>Loop</span></span>
    </div>
  );
}

/** Rises in from below with a spring; `delay` in frames. */
export function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 170 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.94 + p * 0.06})`, ...style }}>{children}</div>;
}
