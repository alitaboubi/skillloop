import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, C, LAT, MONO } from "./theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Spring 0→1 starting at `delay` frames. */
export function usePop(delay = 0, config = { damping: 13, stiffness: 190 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

export function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const p = usePop(delay, { damping: 15, stiffness: 170 });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 50}px)`, ...style }}>{children}</div>;
}

/** One-shot sound effect at frame `at`. */
export function Sfx({ at, name, volume = 0.8 }: { at: number; name: string; volume?: number }) {
  return <Sequence from={at} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>;
}

// Lucide-style strokes on a 24px grid.
const PATHS: Record<string, ReactNode> = {
  check: <polyline points="20 6 9 17 4 12" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  pin: <><path d="M12 22s8-6 8-12a8 8 0 0 0-16 0c0 6 8 12 8 12z" /><circle cx="12" cy="10" r="3" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />,
};

export function Icon({ name, size = 40, color = C.ink, width = 2.2, style }: { name: string; size?: number; color?: string; width?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PATHS[name]}
    </svg>
  );
}

// The SkillLoop loop mark (34×18 viewBox), used both drawn-on and static.
export const LOOP_D = "M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z";
export function LoopMark({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 34 18" fill="none">
      <path d={LOOP_D} stroke={C.clay} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 2c-4 0-6 3.5-8 7" stroke={C.lime} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Glowing spark: a hot core with a soft halo, flickering. */
export function Spark({ x, y, size = 1, color = C.lime }: { x: number; y: number; size?: number; color?: string }) {
  const frame = useCurrentFrame();
  const f = 0.85 + 0.15 * Math.sin(frame * 1.7);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, zIndex: 30 }}>
      <div style={{ position: "absolute", left: -90 * size, top: -90 * size, width: 180 * size, height: 180 * size, borderRadius: 999,
        background: `radial-gradient(circle, ${color}aa 0%, ${color}33 30%, transparent 70%)`, opacity: f }} />
      <div style={{ position: "absolute", left: -11 * size, top: -11 * size, width: 22 * size, height: 22 * size, borderRadius: 999, background: C.white,
        boxShadow: `0 0 ${24 * size}px ${8 * size}px ${color}` }} />
    </div>
  );
}

/** Sparks spraying from (x, y) from frame `at`, like a grinder. */
export function Sparks({ at, x, y, n = 40, dir = -Math.PI / 2, spread = 1.4, color = C.lime, life = 26 }: { at: number; x: number; y: number; n?: number; dir?: number; spread?: number; color?: string; life?: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > life + 30) return null;
  return (
    <svg style={{ position: "absolute", inset: 0, zIndex: 31 }} width={1080} height={1920}>
      {Array.from({ length: n }, (_, i) => {
        const born = random(`b${i}${at}`) * 24;
        const age = t - born;
        if (age < 0 || age > life) return null;
        const a = dir + (random(`a${i}${at}`) - 0.5) * spread;
        const v = 18 + random(`v${i}${at}`) * 26;
        const px = x + Math.cos(a) * v * age;
        const py = y + Math.sin(a) * v * age + 0.9 * age * age;
        const len = 3 + v * 0.6;
        const fade = 1 - age / life;
        return <line key={i} x1={px} y1={py} x2={px - Math.cos(a) * len} y2={py - (Math.sin(a) * v + 1.8 * age) * 0.6}
          stroke={i % 4 ? color : C.white} strokeWidth={3} strokeLinecap="round" opacity={fade} />;
      })}
    </svg>
  );
}

/** Night stage: perspective-free blueprint grid, drifting glow, vignette, grain. */
export function Stage({ children, grid = 1, glow = C.lime, warp = 0 }: { children?: ReactNode; grid?: number; glow?: string; warp?: number }) {
  const frame = useCurrentFrame();
  const line = `rgba(196,238,87,${0.06 * grid})`;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% ${48 + Math.sin(frame / 40) * 3}%, ${glow}1c, transparent 70%)` }} />
      {grid > 0 && (
        <AbsoluteFill style={{ perspective: 900, perspectiveOrigin: "50% 40%" }}>
          <div style={{ position: "absolute", left: -540, right: -540, top: -400, bottom: -400,
            transform: `rotateX(${warp}deg) translateY(${(frame * 1.2) % 90}px)`,
            backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`, backgroundSize: "90px 90px" }} />
        </AbsoluteFill>
      )}
      {children}
    </AbsoluteFill>
  );
}

/** Always-on HUD frame: corner brackets, mono metadata, timecode, vignette and grain. */
export function Hud({ label }: { label: string }) {
  const frame = useCurrentFrame();
  const tc = `${String(Math.floor(frame / 30)).padStart(2, "0")}:${String(frame % 30).padStart(2, "0")}`;
  const mono: CSSProperties = { position: "absolute", fontFamily: MONO, fontSize: 24, color: `${C.white}88`, letterSpacing: 2 };
  const corner = (l: number | string, t: number | string, rot: number) => (
    <div style={{ position: "absolute", left: l, top: t, width: 46, height: 46, borderLeft: `3px solid ${C.white}55`, borderTop: `3px solid ${C.white}55`, transform: `rotate(${rot}deg)` }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${(frame * 37) % 220}px ${(frame * 53) % 220}px` }} />
      {corner(36, 36, 0)}{corner(1080 - 82, 36, 90)}{corner(1080 - 82, 1920 - 82, 180)}{corner(36, 1920 - 82, 270)}
      <div style={{ ...mono, left: 100, top: 50 }}>SKILLLOOP · EP03</div>
      <div style={{ ...mono, right: 100, top: 50, color: C.lime }}>{label}</div>
      <div style={{ ...mono, left: 100, bottom: 54 }}>36.80°N 10.18°E</div>
      <div style={{ ...mono, right: 100, bottom: 54 }}><span style={{ color: C.clay, opacity: frame % 30 < 18 ? 1 : 0.2 }}>●</span> REC {tc}</div>
    </AbsoluteFill>
  );
}

/** Tunisian Arabic line: words pop in one by one from `at`, the newest glowing lime. */
export function ArWords({ text, at, size = 96, y, color = C.white, step = 5, style }: { text: string; at: number; size?: number; y: number; color?: string; step?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div dir="rtl" style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", fontFamily: AR, fontWeight: 800, fontSize: size, lineHeight: 1.3, color, zIndex: 20, ...style }}>
      {words.map((w, i) => {
        const p = spring({ frame: frame - at - i * step, fps, config: { damping: 11, stiffness: 260 } });
        const live = frame >= at + i * step && frame < at + (i + 1) * step + 4;
        return <span key={i} style={{ display: "inline-block", marginInline: size * 0.12, opacity: Math.min(1, p * 1.5), color: live ? C.lime : undefined,
          transform: `translateY(${(1 - p) * 40}px) scale(${0.6 + p * 0.4})`, filter: `blur(${(1 - Math.min(1, p)) * 8}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,0.7)" }}>{w}</span>;
      })}
    </div>
  );
}

/** French line typed out in mono, with a blinking block cursor. */
export function TypeLine({ text, at, cps = 1.2, y, size = 40, color = C.lime, prompt = "", center = true, style }: { text: string; at: number; cps?: number; y?: number; size?: number; color?: string; prompt?: string; center?: boolean; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const n = Math.min(text.length, Math.floor((frame - at) * cps));
  const typing = n < text.length;
  return (
    <div style={{ position: y === undefined ? "relative" : "absolute", left: 60, right: 60, top: y, textAlign: center ? "center" : "left", fontFamily: MONO, fontWeight: 700, fontSize: size, color, zIndex: 20, ...style }}>
      {prompt && <span style={{ color: `${C.white}77` }}>{prompt}</span>}
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: size * 0.55, height: size * 0.95, marginLeft: 4, verticalAlign: "-0.12em", background: color,
        opacity: typing || frame % 16 < 9 ? 1 : 0 }} />
    </div>
  );
}

/** Big Latin word slammed in: scales down from huge with blur and an RGB split that settles. */
export function Slam({ text, at, size = 300, y, color = C.lime, outline = false, style }: { text: string; at: number; size?: number; y: number; color?: string; outline?: boolean; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  const p = interpolate(t, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const split = interpolate(t, [0, 10], [18, 0], clamp);
  const base: CSSProperties = { position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: LAT, fontWeight: 800, fontSize: size,
    letterSpacing: -size * 0.03, lineHeight: 1, transform: `scale(${2.2 - 1.2 * p})`, opacity: p, filter: `blur(${(1 - p) * 14}px)`, zIndex: 20, ...style };
  return (
    <>
      <div style={{ ...base, color: C.clay, transform: `${base.transform} translateX(${split}px)`, opacity: p * 0.7, mixBlendMode: "screen" }}>{text}</div>
      <div style={{ ...base, color: C.sea, transform: `${base.transform} translateX(${-split}px)`, opacity: p * 0.7, mixBlendMode: "screen" }}>{text}</div>
      <div style={{ ...base, color: outline ? "transparent" : color, WebkitTextStroke: outline ? `4px ${color}` : undefined, textShadow: outline ? undefined : `0 0 60px ${color}66` }}>{text}</div>
    </>
  );
}

/** Camera shake that decays after each hit frame. */
export function Shake({ hits, children, amp = 22 }: { hits: number[]; children: ReactNode; amp?: number }) {
  const frame = useCurrentFrame();
  const e = hits.reduce((m, h) => (frame >= h ? Math.max(m, Math.exp(-(frame - h) / 4)) : m), 0);
  const dx = (random(`sx${frame}`) - 0.5) * amp * e;
  const dy = (random(`sy${frame}`) - 0.5) * amp * e;
  return <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${1 + 0.03 * e})` }}>{children}</AbsoluteFill>;
}

/** Small mono annotation with a leader line, like a HUD callout. */
export function Callout({ x, y, text, at, color = C.lime, align = "left" }: { x: number; y: number; text: string; at: number; color?: string; align?: "left" | "right" }) {
  const p = usePop(at, { damping: 18, stiffness: 200 });
  return (
    <div style={{ position: "absolute", left: align === "left" ? x : undefined, right: align === "right" ? 1080 - x : undefined, top: y, opacity: p, zIndex: 25,
      display: "flex", alignItems: "center", gap: 12, flexDirection: align === "left" ? "row" : "row-reverse", fontFamily: MONO, fontSize: 24, color }}>
      <div style={{ width: 70 * p, height: 2, background: color }} />
      <span style={{ background: `${color}22`, border: `1px solid ${color}88`, padding: "4px 10px", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

/** White flash that fades over a few frames. */
export function Flash({ at = 0, strength = 0.8, color = "white" }: { at?: number; strength?: number; color?: string }) {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 8) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: interpolate(frame - at, [0, 7], [strength, 0], clamp), pointerEvents: "none", zIndex: 60 }} />;
}
