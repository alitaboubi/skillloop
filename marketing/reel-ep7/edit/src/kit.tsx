import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, LAT, LIGHT, type Pal } from "./theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) };

// Lucide strokes on a 24px grid (the app uses lucide-react).
const PATHS: Record<string, ReactNode> = {
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  book: <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" />,
  laptop: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" /></>,
  palette: <><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1 3.7A1.6 1.6 0 0 1 12 22z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15.5" cy="7.5" r="1" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></>,
  pin: <><path d="M12 22s8-6 8-12a8 8 0 0 0-16 0c0 6 8 12 8 12z" /><circle cx="12" cy="10" r="3" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  pen: <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.6 7.6" /><circle cx="11" cy="11" r="2" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
};

export function Icon({ name, size = 28, color = LIGHT.fg, width = 2.2, style }: { name: string; size?: number; color?: string; width?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PATHS[name]}
    </svg>
  );
}

/** Spring 0→1 starting at `delay` frames. */
export function usePop(delay = 0, config = { damping: 14, stiffness: 180 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

export function Rise({ delay = 0, children, style, dist = 40 }: { delay?: number; children: ReactNode; style?: CSSProperties; dist?: number }) {
  const p = usePop(delay, { damping: 16, stiffness: 170 });
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * dist}px)`, ...style }}>{children}</div>;
}

/** The SkillLoop logo loop (src/components/site.tsx). `draw` traces the clay loop; the lime spark rides on top. */
const LOOP_D = "M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z";
export function LoopMark({ size = 120, draw = 1, spark = -1, clay = LIGHT.clay }: { size?: number; draw?: number; spark?: number; clay?: string }) {
  return (
    <svg width={size} height={size * (18 / 34)} viewBox="-1 -1 36 20" fill="none" style={{ overflow: "visible" }}>
      <path d={LOOP_D} stroke={clay} strokeWidth="3.2" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      {spark < 0 ? (
        draw >= 1 && <path d="M25 2c-4 0-6 3.5-8 7" stroke={LIGHT.lime} strokeWidth="3.2" strokeLinecap="round" />
      ) : (
        <path d={LOOP_D} stroke={LIGHT.lime} strokeWidth="3.4" strokeLinecap="round" pathLength={1} strokeDasharray="0.16 0.84" strokeDashoffset={-spark} />
      )}
    </svg>
  );
}

export function Wordmark({ size = 120, fg = LIGHT.fg }: { size?: number; fg?: string }) {
  return (
    <span dir="ltr" style={{ fontFamily: LAT, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.03, color: fg }}>
      Skill<span style={{ color: "#8fcf2a" }}>Loop</span>
    </span>
  );
}

/** Wavy topographic rings, the "Mapped loop" backdrop of the site (src/components/brand.tsx). */
function contour(cx: number, cy: number, r: number, k: number, seed: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const rr = r * (1 + 0.07 * Math.sin(3 * a + k * 0.55 + seed) + 0.04 * Math.cos(5 * a - k * 0.35 + seed));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * 0.72 * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}
const RINGS = [
  ...Array.from({ length: 7 }, (_, k) => contour(1000, 220, 90 + k * 70, k, 0.4)),
  ...Array.from({ length: 6 }, (_, k) => contour(60, 1700, 80 + k * 66, k, 2.1)),
];

/** Soft paper stage: drifting lime / sea / clay glows, contour lines. `dark` 0→1 fades to the dark theme. */
export function Stage({ P = LIGHT, children }: { P?: Pal; children?: ReactNode }) {
  const frame = useCurrentFrame();
  const d = P === LIGHT ? 0 : 1;
  const a = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return (
    <AbsoluteFill style={{ background: P.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{
        background: [
          `radial-gradient(45% 28% at ${82 + Math.sin(frame / 40) * 6}% ${12 + Math.cos(frame / 50) * 3}%, ${P.lime}${a(d ? 0.14 : 0.42)}, transparent 70%)`,
          `radial-gradient(50% 30% at ${12 + Math.cos(frame / 45) * 6}% ${46 + Math.sin(frame / 60) * 4}%, ${P.sea}${a(d ? 0.22 : 0.16)}, transparent 70%)`,
          `radial-gradient(55% 30% at ${80 + Math.sin(frame / 55) * 5}% ${88 + Math.cos(frame / 35) * 3}%, ${P.clay}${a(d ? 0.2 : 0.22)}, transparent 70%)`,
        ].join(","),
      }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `translateY(${Math.sin(frame / 70) * 10}px)` }}>
        {RINGS.map((p, i) => <path key={i} d={p} fill="none" stroke={P.fg} strokeOpacity={d ? 0.07 : 0.06} strokeWidth={2} />)}
      </svg>
      {children}
    </AbsoluteFill>
  );
}

/** Four-point twinkles bursting around (x, y), like confetti stars. */
export function Sparkles({ x, y, r = 220, at = 0, n = 12, colors }: { x: number; y: number; r?: number; at?: number; n?: number; colors: string[] }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + random(`sa${i}`) * 0.5;
        const out = interpolate(t, [0, 18], [0.3, 1], ease) * (r * (0.75 + random(`sr${i}`) * 0.5));
        const tw = 0.6 + 0.4 * Math.sin(frame / 5 + i * 2);
        const sz = (14 + random(`ss${i}`) * 16) * interpolate(t, [0, 8], [0, 1], clamp) * tw;
        return (
          <svg key={i} width={sz * 2} height={sz * 2} viewBox="-1 -1 2 2"
            style={{ position: "absolute", left: x + Math.cos(ang) * out - sz, top: y + Math.sin(ang) * out * 0.9 - sz, transform: `rotate(${frame * 2 + i * 30}deg)` }}>
            <path d="M0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Q-0.12 -0.12 0 -1Z" fill={colors[i % colors.length]} />
          </svg>
        );
      })}
    </>
  );
}

/**
 * Feature title in the source's layout: small mono-caps eyebrow, a two-line headline that rises word by word
 * with one phrase on a lime marker, a muted sub line, and the Tunisian derja line under it.
 */
export function Headline({ P = LIGHT, eyebrow, lines, hl, sub, ar, delay = 4, top = 170 }:
  { P?: Pal; eyebrow: string; lines: string[]; hl?: string; sub?: string; ar?: string; delay?: number; top?: number }) {
  const frame = useCurrentFrame();
  let wi = 0;
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, fontFamily: LAT, color: P.fg, zIndex: 5 }}>
      <Rise delay={delay - 2} dist={16} style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 700, fontSize: 26, letterSpacing: 5, color: P.sea }}>
        <span style={{ width: 30, height: 4, borderRadius: 4, background: P.clay }} />{eyebrow}
      </Rise>
      <div style={{ marginTop: 22, fontWeight: 800, fontSize: 86, lineHeight: 1.06, letterSpacing: -2.5 }}>
        {lines.map((ln, li) => {
          const words = ln.split(" ");
          const hlStart = hl && ln.includes(hl) ? ln.indexOf(hl) : -1;
          let pos = 0;
          return (
            <div key={li} style={{ display: "flex", flexWrap: "wrap", columnGap: 22 }}>
              {words.map((w) => {
                const inHl = hlStart >= 0 && pos >= hlStart && pos < hlStart + hl!.length;
                pos += w.length + 1;
                const d = delay + 2 + wi++ * 3;
                const p = interpolate(frame, [d, d + 12], [0, 1], ease);
                const mark = inHl ? interpolate(frame, [d + 6, d + 18], [0, 1], ease) : 0;
                return (
                  <span key={w + d} style={{ position: "relative", display: "inline-block", overflow: "hidden", paddingBottom: 6 }}>
                    {inHl && <span style={{ position: "absolute", left: -8, right: -8, bottom: 8, height: "46%", borderRadius: 10,
                      background: P.lime, opacity: P === LIGHT ? 0.9 : 0.35, transformOrigin: "left", transform: `scaleX(${mark})` }} />}
                    <span style={{ position: "relative", display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{w}</span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      {sub && <Rise delay={delay + 10 + wi * 3} dist={20} style={{ marginTop: 18, fontWeight: 500, fontSize: 34, lineHeight: 1.35, color: P.mutedFg }}>{sub}</Rise>}
      {ar && <Rise delay={delay + 14 + wi * 3} dist={20} style={{ marginTop: 14, fontFamily: AR, fontWeight: 800, fontSize: 46, lineHeight: 1.35, color: P.clay, direction: "rtl", textAlign: "left" }}>{ar}</Rise>}
    </div>
  );
}

export const SCREEN = { w: 604, h: 1164 };
export const PHONE_TOP = 700;

/** Phone frame. `enter` slides it up from below; it then floats gently. Children are laid out on the 604×1164 screen. */
export function Phone({ P = LIGHT, children, enter = false, x = 0 }: { P?: Pal; children: ReactNode; enter?: boolean; x?: number }) {
  const frame = useCurrentFrame();
  const pop = usePop(0, { damping: 17, stiffness: 110 });
  const p = enter ? pop : 1;
  const float = Math.sin(frame / 22) * 7;
  return (
    <div style={{ position: "absolute", left: 540 - 320 + x, top: PHONE_TOP, width: 640, height: 1200,
      transform: `translateY(${(1 - p) * 1100 + float}px) rotate(${(1 - p) * 8}deg)`,
      borderRadius: 92, background: "#0d1120", padding: 18, boxSizing: "border-box",
      boxShadow: `0 50px 120px rgba(19,24,50,0.30), 0 12px 30px rgba(19,24,50,0.18), inset 0 0 0 3px #2c3350` }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 76, overflow: "hidden", background: P.bg, fontFamily: LAT, color: P.fg }}>
        <StatusBar P={P} />
        {children}
      </div>
    </div>
  );
}

function StatusBar({ P }: { P: Pal }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 92, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 52px 0" }}>
      <span style={{ fontWeight: 700, fontSize: 26, color: P.fg }}>9:41</span>
      <div style={{ position: "absolute", left: "50%", top: 22, width: 180, height: 50, marginLeft: -90, borderRadius: 30, background: "#0d1120" }} />
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {[10, 15, 20, 25].map((h) => <span key={h} style={{ width: 6, height: h, borderRadius: 2, background: P.fg }} />)}
        <span style={{ marginLeft: 8, width: 42, height: 20, borderRadius: 6, border: `2.5px solid ${P.fg}`, padding: 2, boxSizing: "border-box" }}>
          <span style={{ display: "block", width: "78%", height: "100%", borderRadius: 2, background: P.fg }} />
        </span>
      </span>
    </div>
  );
}

/** App header strip inside the phone: logo and the account dot. */
export function AppBar({ P, title }: { P: Pal; title?: string }) {
  return (
    <div style={{ position: "absolute", top: 96, left: 0, right: 0, height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px",
      borderBottom: `2px solid ${P.border}` }}>
      {title ? (
        <span style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 800, fontSize: 32 }}><Icon name="back" size={30} color={P.fg} />{title}</span>
      ) : (
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><LoopMark size={50} clay={P.clay} /><Wordmark size={32} fg={P.fg} /></span>
      )}
      <span style={{ width: 52, height: 52, borderRadius: 99, background: P.claySoft, color: P.clay, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 }}>S</span>
    </div>
  );
}

/** Touch point that glides between screen points and ripples on each tap. */
export function Finger({ path, taps, P = LIGHT }: { path: { f: number; x: number; y: number }[]; taps: number[]; P?: Pal }) {
  const frame = useCurrentFrame();
  if (frame < path[0].f - 6) return null;
  const fs = path.map((p) => p.f);
  const e = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const x = path.length > 1 ? interpolate(frame, fs, path.map((p) => p.x), e) : path[0].x;
  const y = path.length > 1 ? interpolate(frame, fs, path.map((p) => p.y), e) : path[0].y;
  const appear = interpolate(frame, [path[0].f - 6, path[0].f, path[path.length - 1].f, path[path.length - 1].f + 6], [0, 1, 1, 0], clamp);
  const press = taps.reduce((m, t) => Math.max(m, 1 - Math.abs(frame - t) / 4), 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 40, pointerEvents: "none" }}>
      {taps.filter((t) => frame >= t && frame < t + 16).map((t) => {
        const r = interpolate(frame, [t, t + 16], [0.3, 2.2], { easing: Easing.out(Easing.quad) });
        return <div key={t} style={{ position: "absolute", left: x - 44, top: y - 44, width: 88, height: 88, borderRadius: 99,
          border: `5px solid ${P.sea}`, transform: `scale(${r})`, opacity: interpolate(frame, [t, t + 16], [0.8, 0]) }} />;
      })}
      <div style={{ position: "absolute", left: x - 38, top: y - 38, width: 76, height: 76, borderRadius: 99, opacity: appear * 0.9,
        transform: `scale(${1 - press * 0.22})`, background: "rgba(255,255,255,0.6)", border: "3px solid rgba(255,255,255,0.95)",
        boxShadow: "0 8px 24px rgba(19,24,50,0.35)" }} />
    </div>
  );
}

/** Burst of brand-colored confetti from (x, y), starting at frame `at`. */
export function Confetti({ at, x, y, n = 54 }: { at: number; x: number; y: number; n?: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 70) return null;
  const colors = [LIGHT.lime, LIGHT.clay, LIGHT.sea, "#ffd166", "#8fcf2a"];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (random(`a${i}`) - 0.5) * Math.PI * 1.6;
        const v = 16 + random(`s${i}`) * 22;
        const px = x + Math.cos(a) * v * t * 0.9;
        const py = y + Math.sin(a) * v * t + 0.75 * t * t;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 16, height: i % 2 ? 16 : 28, borderRadius: i % 3 ? 4 : 99, zIndex: 35,
          background: colors[i % colors.length], transform: `rotate(${t * (8 + i)}deg)`, opacity: interpolate(t, [45, 70], [1, 0], clamp) }} />;
      })}
    </>
  );
}

/** One-shot sound effect at frame `at`. */
export function Sfx({ at, name, volume = 0.8 }: { at: number; name: string; volume?: number }) {
  return <Sequence from={at} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>;
}

export const pill = (bg: string, fg: string, size = 22): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999,
  background: bg, color: fg, fontFamily: LAT, fontWeight: 700, fontSize: size, whiteSpace: "nowrap" });

export const card = (P: Pal): CSSProperties => ({ background: P.card, border: `2px solid ${P.border}`, borderRadius: 26, boxShadow: P.bg === LIGHT.bg ? "0 10px 26px rgba(19,24,50,0.07)" : "none" });

/** Floating UI card outside the phone that flies in from off-screen and settles with a slight tilt. */
export function FlyCard({ at, from, to, rot = 0, children, w = 420 }: { at: number; from: [number, number]; to: [number, number]; rot?: number; children: ReactNode; w?: number }) {
  const frame = useCurrentFrame();
  const p = usePop(at, { damping: 15, stiffness: 120 });
  if (frame < at) return null;
  const x = from[0] + (to[0] - from[0]) * p;
  const y = from[1] + (to[1] - from[1]) * p + Math.sin((frame + at * 7) / 20) * 8;
  return <div style={{ position: "absolute", left: x, top: y, width: w, zIndex: 20, transform: `rotate(${rot * p}deg)`, opacity: Math.min(1, p * 2) }}>{children}</div>;
}
