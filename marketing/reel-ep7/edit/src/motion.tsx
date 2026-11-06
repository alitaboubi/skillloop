import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { clamp, ease } from "./kit";
import { AR, LAT, LIGHT, MONO } from "./theme";

// Motion pieces for the showcase reel: the source's look (HUD corners, blur-in kinetic words, particle bursts,
// dark ember stage) rebuilt with SkillLoop's tokens.

export const NAVY = "#07101f";

/** 0→1 over `dur` frames from `at`, with the house ease-out. */
export function useIn(at: number, dur = 12) {
  const f = useCurrentFrame();
  return interpolate(f, [at, at + dur], [0, 1], ease);
}

/** Light stage: paper with a white center and a soft grey vignette, like the source's studio white. */
export function Paper({ children }: { children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(75% 55% at 50% 46%, #ffffff 0%, ${LIGHT.bg} 58%, #e4e6dd 100%)`, overflow: "hidden" }}>
      {children}
    </AbsoluteFill>
  );
}

/** Dark stage: deep navy, a clay glow in the middle, faint rings and drifting dust. */
export function Night({ glow = 1, cy = 50, children }: { glow?: number; cy?: number; children?: ReactNode }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: NAVY, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(55% 32% at 50% ${cy}%, rgba(219,112,59,${0.42 * glow}) 0%, rgba(219,112,59,${0.1 * glow}) 45%, transparent 75%)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[180, 330, 520, 760, 1040].map((r, i) => (
          <circle key={r} cx={540} cy={(1920 * cy) / 100} r={r * (1 + 0.03 * Math.sin(f / 30 + i))} fill="none"
            stroke="#db703b" strokeOpacity={0.13 * glow} strokeWidth={2} />
        ))}
      </svg>
      <Dust />
      {children}
    </AbsoluteFill>
  );
}

/** Tiny specks drifting up, twinkling. */
export function Dust({ n = 70, color = "#ffffff", ember = false }: { n?: number; color?: string; ember?: boolean }) {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const sp = ember ? 2.2 + random(`dv${i}`) * 3 : 0.3 + random(`dv${i}`) * 0.6;
        const y = ((random(`dy${i}`) * 2100 - f * sp) % 2100 + 2100) % 2100 - 90;
        const x = random(`dx${i}`) * 1080 + Math.sin(f / 25 + i) * (ember ? 14 : 4);
        const sz = ember ? 3 + random(`ds${i}`) * 6 : 2 + random(`ds${i}`) * 3;
        const op = (ember ? 0.5 : 0.25) * (0.5 + 0.5 * Math.sin(f / 6 + i * 1.7)) + 0.1;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz, borderRadius: 99, background: color, opacity: op,
          boxShadow: ember ? `0 0 ${sz * 2}px ${color}` : undefined }} />;
      })}
    </>
  );
}

/** Particle burst plus a shockwave ring from (x, y), like the source's logo reveals. */
export function Burst({ at = 0, x, y, n = 80, spread = 760, colors }: { at?: number; x: number; y: number; n?: number; spread?: number; colors: string[] }) {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 60) return null;
  const ring = interpolate(t, [0, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <>
      <div style={{ position: "absolute", left: x - 760 * ring, top: y - 760 * ring, width: 1520 * ring, height: 1520 * ring, borderRadius: "50%",
        border: `3px solid ${colors[0]}`, opacity: interpolate(t, [0, 26], [0.55, 0], clamp) }} />
      <div style={{ position: "absolute", left: x - 420 * ring, top: y - 420 * ring, width: 840 * ring, height: 840 * ring, borderRadius: "50%",
        border: `2px solid ${colors[1 % colors.length]}`, opacity: interpolate(t, [2, 24], [0.45, 0], clamp) }} />
      {Array.from({ length: n }, (_, i) => {
        const a = random(`ba${i}`) * Math.PI * 2;
        const v = spread * (0.2 + random(`bv${i}`) * 0.8);
        const k = 1 - Math.exp(-t / 8);
        const px = x + Math.cos(a) * v * k;
        const py = y + Math.sin(a) * v * k * 0.85 + t * t * 0.02;
        const sz = 5 + random(`bs${i}`) * 11;
        const op = interpolate(t, [0, 3, 30, 60], [0, 1, 0.75, 0], clamp);
        const kind = i % 3;
        return <div key={i} style={{ position: "absolute", left: px - sz / 2, top: py - sz / 2, width: kind === 1 ? sz * 2.6 : sz, height: kind === 1 ? sz * 0.6 : sz,
          borderRadius: kind === 0 ? 99 : 2, background: colors[i % colors.length], opacity: op, transform: `rotate(${a + t * 0.05}rad)` }} />;
      })}
    </>
  );
}

export type Seg = { t: string; c?: string };

/**
 * Kinetic words: each word arrives out of focus and a bit large, then snaps sharp, one after another.
 * `lines` is a list of lines, each a list of colored segments.
 */
export function Words({ lines, at = 0, step = 3, size = 100, color = LIGHT.fg, font = LAT, weight = 800, align = "flex-start", lh = 1.04, ls = -3, rtl = false, style }:
  { lines: Seg[][]; at?: number; step?: number; size?: number; color?: string; font?: string; weight?: number; align?: CSSProperties["justifyContent"];
    lh?: number; ls?: number; rtl?: boolean; style?: CSSProperties }) {
  const f = useCurrentFrame();
  let wi = 0;
  return (
    <div style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: rtl ? 0 : ls, color, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: align, columnGap: size * 0.24, direction: rtl ? "rtl" : "ltr" }}>
          {line.flatMap((seg, si) => seg.t.split(" ").filter(Boolean).map((w, k) => {
            const d = at + wi++ * step;
            const p = interpolate(f, [d, d + 10], [0, 1], ease);
            return (
              <span key={`${si}-${k}`} style={{ display: "inline-block", color: seg.c ?? color, opacity: p, filter: `blur(${(1 - p) * 18}px)`,
                transform: `translateY(${(1 - p) * size * 0.25}px) scale(${1.22 - 0.22 * p})` }}>{w}</span>
            );
          }))}
        </div>
      ))}
    </div>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_+";
/** Mono caps that resolve left to right out of scrambled glyphs. */
export function Scramble({ text, at = 0, cps = 1.6, style }: { text: string; at?: number; cps?: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const n = Math.max(0, (f - at) * cps);
  if (f < at) return null;
  const out = text.split("").map((ch, i) => {
    if (i < n) return ch;
    if (i < n + 5 && ch !== " ") return GLYPHS[Math.floor(random(`g${i}-${f}`) * GLYPHS.length)];
    return " ";
  }).join("");
  return <span style={{ fontFamily: MONO, whiteSpace: "pre", ...style }}>{out}</span>;
}

/** Small mono-caps label in clay, with a short bar in front (the source's section eyebrow). */
export function Eyebrow({ text, at = 0, color = LIGHT.clay, style }: { text: string; at?: number; color?: string; style?: CSSProperties }) {
  const p = useIn(at, 10);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: p, ...style }}>
      <span style={{ width: 34 * p, height: 4, borderRadius: 4, background: color }} />
      <Scramble text={text} at={at} cps={2} style={{ fontWeight: 700, fontSize: 26, letterSpacing: 7, color }} />
    </div>
  );
}

/** Typed text with a blinking caret. */
export function Typed({ text, at, cps = 1.2, caret = LIGHT.sea, style }: { text: string; at: number; cps?: number; caret?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor((f - at) * cps));
  const done = n >= text.length;
  const on = done ? Math.floor(f / 15) % 2 === 0 : true;
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: 3, height: "1.05em", marginLeft: 3, verticalAlign: "text-bottom", background: caret, opacity: f >= at && on ? 1 : 0 }} />
    </span>
  );
}

/** Corner brackets, brand tag, chapter, timecode and handle, all in tiny mono caps (the source's HUD frame). */
export function Hud({ frame, chapter, dark }: { frame: number; chapter: string; dark: boolean }) {
  const c = dark ? "rgba(255,255,255,0.62)" : "rgba(19,24,50,0.5)";
  const ss = Math.floor(frame / 30);
  const tc = `00:00:${String(ss).padStart(2, "0")}:${String(frame % 30).padStart(2, "0")}`;
  const txt: CSSProperties = { position: "absolute", fontFamily: MONO, fontWeight: 500, fontSize: 21, letterSpacing: 4, color: c, whiteSpace: "nowrap" };
  const L = (s: CSSProperties) => <div style={{ position: "absolute", width: 30, height: 30, borderColor: c, borderStyle: "solid", borderWidth: 0, ...s }} />;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {L({ left: 34, top: 34, borderLeftWidth: 2, borderTopWidth: 2 })}
      {L({ right: 34, top: 34, borderRightWidth: 2, borderTopWidth: 2 })}
      {L({ left: 34, bottom: 34, borderLeftWidth: 2, borderBottomWidth: 2 })}
      {L({ right: 34, bottom: 34, borderRightWidth: 2, borderBottomWidth: 2 })}
      <div style={{ ...txt, left: 78, top: 44 }}>SKILLLOOP</div>
      <div style={{ ...txt, right: 78, top: 44 }}>{chapter}</div>
      <div style={{ ...txt, left: 78, bottom: 44 }}>{tc}</div>
      <div style={{ ...txt, right: 78, bottom: 44 }}>@SKILLLOOP_TUNISIA</div>
    </AbsoluteFill>
  );
}

/** Derja line under a headline. */
export function Derja({ text, at, size = 46, color = LIGHT.clay, align = "left", style }: { text: string; at: number; size?: number; color?: string; align?: CSSProperties["textAlign"]; style?: CSSProperties }) {
  const p = useIn(at, 12);
  return (
    <div style={{ fontFamily: AR, fontWeight: 800, fontSize: size, lineHeight: 1.4, color, direction: "rtl", textAlign: align, opacity: p,
      filter: `blur(${(1 - p) * 10}px)`, transform: `translateY(${(1 - p) * 20}px)`, ...style }}>{text}</div>
  );
}
