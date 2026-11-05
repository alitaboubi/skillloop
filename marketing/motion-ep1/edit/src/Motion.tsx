import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AR, C, LAT } from "./theme";

// SkillLoop motion-graphics reel, 20 s at 30 fps, 120 BPM (one beat = 15 frames). No story, no voice.
// `words` adds four big kinetic words + the « DM PRO » chip; without it the only letters are the logo.
export const MOTION = { fps: 30, frames: 600, width: 1080, height: 1920 };
const BEAT = 15;
// Same mark as the app, but starting at the centre crossing so the dot draws it from the middle.
const LOOP_D = "M17 9c2-3.5 4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7s-4-7-8-7a7 7 0 1 0 0 14c4 0 6-3.5 8-7Z";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], ease = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: ease });
const pulse = (f: number, from: number) => (f < from ? 0 : Math.exp(-((f - from) % BEAT) / 4)); // decays after each beat

// Point on the brand loop (viewBox 0 0 34 18) at progress 0..1, measured with a hidden SVG path.
let probe: SVGPathElement | null = null;
function loopPoint(p: number) {
  if (!probe) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden");
    probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    probe.setAttribute("d", LOOP_D); svg.appendChild(probe); document.body.appendChild(svg);
  }
  const pt = probe.getPointAtLength(probe.getTotalLength() * Math.min(1, Math.max(0, p)));
  return { x: pt.x, y: pt.y };
}

const CATS = [
  { e: "💻", c: C.sea }, { e: "🎨", c: C.clay }, { e: "📚", c: C.lime }, { e: "🔧", c: "#8fb3ff" },
  { e: "🩺", c: C.success }, { e: "🚗", c: C.clay }, { e: "💼", c: C.sea }, { e: "🎉", c: C.lime },
];
const CARDS = [
  { cover: "ui", av: "ui-av", name: "aziz kouki" }, { cover: "web", av: "web-av", name: "Feres Hasni" },
  { cover: "logo", av: "logo-av", name: "Br9 Team" }, { cover: "cm", av: "", name: "Ahmed" },
];

// ── Shared layers ──
function Backdrop() {
  const f = useCurrentFrame();
  const grid = lerp(f, [30, 70], [0, 1]) * lerp(f, [500, 520], [1, 0.35]);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% 42%, ${C.ink2}, ${C.ink} 70%)` }} />
      {/* Perspective floor grid, scrolling toward the camera. */}
      <div style={{
        position: "absolute", left: -1200, right: -1200, top: 1050, height: 1800, opacity: grid * 0.55,
        backgroundImage: `linear-gradient(${C.lime}55 2px, transparent 2px), linear-gradient(90deg, ${C.lime}55 2px, transparent 2px)`,
        backgroundSize: "120px 120px", backgroundPosition: `0 ${(f * 6) % 120}px`,
        transform: "perspective(700px) rotateX(72deg)", transformOrigin: "50% 0%",
        maskImage: "linear-gradient(180deg, transparent, black 30%, black 60%, transparent)",
      }} />
      <div style={{
        position: "absolute", left: -1200, right: -1200, bottom: 1050, height: 1800, opacity: grid * 0.18,
        backgroundImage: `linear-gradient(${C.sea}66 2px, transparent 2px), linear-gradient(90deg, ${C.sea}66 2px, transparent 2px)`,
        backgroundSize: "120px 120px", backgroundPosition: `0 ${-(f * 6) % 120}px`,
        transform: "perspective(700px) rotateX(-72deg)", transformOrigin: "50% 100%",
        maskImage: "linear-gradient(0deg, transparent, black 30%, black 60%, transparent)",
      }} />
      <Dust />
    </AbsoluteFill>
  );
}

function Dust() {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 46 }, (_, i) => {
        const x = random(`dx${i}`) * 1080, y0 = random(`dy${i}`) * 1920, sp = 0.3 + random(`ds${i}`) * 1.2;
        const y = (y0 - f * sp * 2 + 1920 * 4) % 1920, s = 2 + random(`dz${i}`) * 5;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, borderRadius: 99, background: i % 3 ? C.lime : C.clay, opacity: 0.12 + random(`do${i}`) * 0.3, filter: "blur(0.5px)" }} />;
      })}
    </>
  );
}

function Flash({ at, len = 8, strength = 0.8, color = C.white }: { at: number; len?: number; strength?: number; color?: string }) {
  const f = useCurrentFrame();
  const o = f < at ? 0 : interpolate(f, [at, at + len], [strength, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen", pointerEvents: "none" }} />;
}

function Shockwave({ at, x = 540, y = 900, size = 1400, color = C.lime }: { at: number; x?: number; y?: number; size?: number; color?: string }) {
  const f = useCurrentFrame();
  if (f < at || f > at + 24) return null;
  const p = lerp(f, [at, at + 24], [0, 1], Easing.out(Easing.cubic));
  return <div style={{ position: "absolute", left: x - (size * p) / 2, top: y - (size * p) / 2, width: size * p, height: size * p, borderRadius: 9999, border: `${10 * (1 - p) + 1}px solid ${color}`, opacity: 1 - p, boxShadow: `0 0 60px ${color}` }} />;
}

function Burst({ at, x = 540, y = 900, n = 36, dist = 700 }: { at: number; x?: number; y?: number; n?: number; dist?: number }) {
  const f = useCurrentFrame();
  if (f < at || f > at + 40) return null;
  const p = lerp(f, [at, at + 40], [0, 1], Easing.out(Easing.exp));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`ba${at}${i}`) * 0.3, d = dist * (0.4 + random(`bd${at}${i}`) * 0.6) * p, s = 6 + random(`bs${at}${i}`) * 10;
        return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * d - s / 2, top: y + Math.sin(a) * d - s / 2, width: s, height: s, borderRadius: 99, background: i % 2 ? C.lime : C.clay, opacity: 1 - p, boxShadow: `0 0 18px ${i % 2 ? C.lime : C.clay}` }} />;
      })}
    </>
  );
}

function Word({ ar, from, to, y = 300 }: { ar: string; from: number; to: number; y?: number }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps, config: { damping: 11, stiffness: 220 } });
  const out = lerp(f, [to - 8, to], [1, 0]);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center", opacity: out, transform: `scale(${0.4 + s * 0.6}) translateY(${(1 - s) * 80}px)` }}>
      <span dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 160, color: C.white, textShadow: `0 0 40px ${C.lime}aa, 0 10px 0 ${C.ink2}` }}>{ar}</span>
    </div>
  );
}

// ── 1. The dot draws the loop (0–3 s) ──
function LoopDraw({ start, drawFrom, drawTo, cx = 540, cy = 900, w = 900, flyAt }: { start: number; drawFrom: number; drawTo: number; cx?: number; cy?: number; w?: number; flyAt?: number }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < start) return null;
  const k = w / 34, h = 18 * k;
  const p = lerp(f, [drawFrom, drawTo], [0, 1]);
  const dotIn = spring({ frame: f - start, fps, config: { damping: 9, stiffness: 160 } });
  const head = loopPoint(p);
  const fly = flyAt === undefined ? 1 : Math.pow(16, lerp(f, [flyAt, flyAt + 22], [0, 1], Easing.in(Easing.cubic)));
  const flyO = flyAt === undefined ? 1 : lerp(f, [flyAt + 12, flyAt + 22], [1, 0]);
  const beat = 1 + 0.08 * pulse(f, drawTo);
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `scale(${fly * beat})`, opacity: flyO, filter: `blur(${(fly - 1) * 0.6}px)` }}>
      <svg width={w} height={h} viewBox="-2 -2 38 22" style={{ overflow: "visible", filter: `drop-shadow(0 0 14px ${C.clay}) drop-shadow(0 0 30px ${C.clay}88)` }}>
        <path d={LOOP_D} pathLength={1} stroke={C.clay} strokeWidth={2.1} strokeLinecap="round" fill="none" strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={p > 0.002 ? 1 : 0} />
        <path d="M25 2c-4 0-6 3.5-8 7" stroke={C.lime} strokeWidth={2.1} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lerp(f, [drawTo - 12, drawTo + 4], [0, 1])} opacity={f > drawTo - 11 ? 1 : 0} style={{ filter: `drop-shadow(0 0 10px ${C.lime})` }} />
      </svg>
      {/* Comet head: the lime dot that travels the loop. */}
      {p < 1 && (
        <div style={{ position: "absolute", left: (head.x + 2) * (w / 38) - 22, top: (head.y + 2) * (h / 22) - 22, width: 44, height: 44, borderRadius: 99, background: C.lime, transform: `scale(${dotIn})`, boxShadow: `0 0 30px ${C.lime}, 0 0 80px ${C.lime}` }} />
      )}
    </div>
  );
}

// ── 2. Orbit of trades (3–7 s) ──
function Orbit({ from, to }: { from: number; to: number }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const grow = spring({ frame: f - from, fps, config: { damping: 14, stiffness: 90 } });
  const collapse = lerp(f, [to - 14, to], [1, 0], Easing.in(Easing.cubic));
  const R = 400 * grow * collapse, P = 1300, th0 = (f - from) * 0.035;
  const items = CATS.map((c, i) => {
    const a = th0 + (i / CATS.length) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R, y = Math.sin(a) * R * 0.5;
    const s = P / (P - z);
    return { ...c, i, x, y, z, s };
  }).sort((a, b) => a.z - b.z);
  return (
    <>
      {items.map(({ e, c, i, x, y, z, s }) => {
        const bounce = 1 + 0.12 * pulse(f, from + 2 + (i % 2) * 7);
        const pop = spring({ frame: f - from - 4 - i * 2, fps, config: { damping: 10, stiffness: 200 } });
        const size = 190 * s * bounce * pop;
        return (
          <div key={i} style={{
            position: "absolute", left: 540 + x * s - size / 2, top: 920 + y * s - size / 2, width: size, height: size, borderRadius: size * 0.28,
            background: `linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))`, border: `2px solid ${c}88`,
            boxShadow: `0 20px 50px rgba(0,0,0,0.45), 0 0 ${40 * s}px ${c}55, inset 0 0 30px ${c}22`, backdropFilter: "blur(6px)",
            display: "grid", placeItems: "center", fontFamily: LAT, fontSize: size * 0.48, opacity: 0.35 + 0.65 * ((z + 400) / 800), zIndex: Math.round(z + 1000),
          }}>{e}</div>
        );
      })}
      {/* Core: a glowing lime sphere in the middle of the orbit. */}
      <div style={{ position: "absolute", left: 540 - 70 * grow * collapse, top: 920 - 70 * grow * collapse, width: 140 * grow * collapse, height: 140 * grow * collapse, borderRadius: 999, background: `radial-gradient(circle at 35% 30%, #f3ffd0, ${C.lime} 45%, #5c7d12)`, boxShadow: `0 0 ${80 + 60 * pulse(f, from)}px ${C.lime}`, zIndex: 1000 }} />
    </>
  );
}

// ── 3. The real services, 3-D carousel (7–12 s) ──
function Carousel({ from, to, words }: { from: number; to: number; words: boolean }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const enter = spring({ frame: f - from, fps, config: { damping: 15, stiffness: 80 } });
  const leave = lerp(f, [to - 12, to], [1, 0], Easing.in(Easing.cubic));
  // Snap 90° on every second beat, springy.
  let turn = 0;
  for (let k = 1; k <= 3; k++) turn += spring({ frame: f - (from + 18 + k * 30), fps, config: { damping: 13, stiffness: 140 } });
  const R = 470;
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1900, perspectiveOrigin: "50% 45%" }}>
      <div style={{ position: "absolute", left: 540, top: 900, transformStyle: "preserve-3d", transform: `translateZ(${-R}px) rotateX(-6deg) rotateY(${-turn * 90 + (1 - enter) * 160}deg) scale(${1.3 * enter * leave})` }}>
        {CARDS.map((c, i) => (
          <div key={c.cover} style={{ position: "absolute", left: -330, top: -300, width: 660, transformStyle: "preserve-3d", transform: `rotateY(${i * 90}deg) translateZ(${R}px)` }}>
            <div style={{ borderRadius: 40, overflow: "hidden", border: `3px solid ${C.lime}66`, boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 70px ${C.lime}33` }}>
              <Img src={staticFile(`stills/${c.cover}.jpg`)} style={{ width: 660, height: 495, objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: -60, marginLeft: 30 }}>
              {c.av
                ? <Img src={staticFile(`stills/${c.av}.jpg`)} style={{ width: 130, height: 130, borderRadius: 999, border: `6px solid ${C.lime}`, objectFit: "cover" }} />
                : <div style={{ width: 130, height: 130, borderRadius: 999, border: `6px solid ${C.lime}`, background: C.clay, display: "grid", placeItems: "center", fontFamily: LAT, fontWeight: 800, fontSize: 60, color: C.white }}>A</div>}
              {words && <span style={{ fontFamily: LAT, fontWeight: 800, fontSize: 40, color: C.white, background: "rgba(17,27,49,0.85)", padding: "8px 22px", borderRadius: 999, marginTop: 50 }}>{c.name}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. A pro page assembles, then is shared everywhere (12–16 s) ──
function PhoneBuild({ from, to }: { from: number; to: number }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const t = f - from;
  const outline = lerp(f, [from, from + 22], [0, 1]);
  const fill = lerp(f, [from + 16, from + 26], [0, 1]);
  const pop = (d: number) => spring({ frame: t - d, fps, config: { damping: 11, stiffness: 190 } });
  const leave = lerp(f, [to - 30, to - 4], [1, 0], Easing.in(Easing.back(1.6)));
  const W = 540, H = 1080, x0 = 540 - W / 2, y0 = 900 - H / 2;
  const press = f >= from + 78 && f < from + 86 ? 0.9 : 1;
  const sway = Math.sin(t / 22) * 10;
  const tiles = ["ui", "web", "logo", "cm", "ui-av", "web-av"];
  const NODES = [[150, 330], [930, 380], [110, 1500], [960, 1460], [120, 920], [970, 960]];
  const shareAt = from + 84;
  return (
    <>
      {/* Share lines + receiving nodes */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: leave }}>
        {NODES.map(([nx, ny], i) => {
          const p = lerp(f, [shareAt + i * 2, shareAt + 14 + i * 2], [0, 1], Easing.out(Easing.cubic));
          return <line key={i} x1={540} y1={1290} x2={540 + (nx - 540) * p} y2={1290 + (ny - 1290) * p} stroke={C.lime} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 16" style={{ filter: `drop-shadow(0 0 8px ${C.lime})` }} />;
        })}
      </svg>
      {NODES.map(([nx, ny], i) => {
        const s = spring({ frame: f - (shareAt + 14 + i * 2), fps, config: { damping: 9, stiffness: 200 } }) * leave;
        return (
          <div key={i} style={{ position: "absolute", left: nx - 70, top: ny - 70, width: 140, height: 140, transform: `scale(${s})` }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.ink2, border: `5px solid ${C.lime}`, boxShadow: `0 0 40px ${C.lime}88`, display: "grid", placeItems: "center", fontFamily: LAT, fontSize: 64 }}>{["💬", "📱", "🤝", "💬", "📱", "🤝"][i]}</div>
            <div style={{ position: "absolute", inset: -20, borderRadius: 999, border: `3px solid ${C.lime}`, opacity: Math.max(0, 1 - ((f - shareAt - 16) % 30) / 30), transform: `scale(${1 + ((f - shareAt - 16) % 30) / 40})` }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, perspective: 1600 }}>
        <div style={{ position: "absolute", left: x0, top: y0, width: W, height: H, transform: `rotateY(${sway}deg) rotateX(6deg) scale(${leave})`, transformStyle: "preserve-3d" }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <rect x={4} y={4} width={W - 8} height={H - 8} rx={78} pathLength={1} fill="none" stroke={C.lime} strokeWidth={6} strokeDasharray="1 1" strokeDashoffset={1 - outline} style={{ filter: `drop-shadow(0 0 16px ${C.lime})` }} />
          </svg>
          <div style={{ position: "absolute", inset: 14, borderRadius: 66, overflow: "hidden", background: C.paper, opacity: fill }}>
            <div style={{ height: 270, background: `linear-gradient(135deg, ${C.ink}, ${C.sea})`, transform: `scaleY(${pop(24)})`, transformOrigin: "top" }} />
            <Img src={staticFile("stills/ui-av.jpg")} style={{ position: "absolute", left: 36, top: 190, width: 170, height: 170, borderRadius: 999, border: `8px solid ${C.paper}`, transform: `scale(${pop(30)})` }} />
            <div style={{ position: "absolute", left: 40, top: 380, width: 300 * pop(35), height: 34, borderRadius: 99, background: C.ink }} />
            <div style={{ position: "absolute", left: 40, top: 430, width: 220 * pop(38), height: 22, borderRadius: 99, background: "#c9cfdb" }} />
            <div style={{ position: "absolute", left: 40, top: 474, display: "flex", gap: 12 }}>
              {[C.lime, "#e3ebff", "#ffe5d6"].map((bg, i) => <div key={i} style={{ width: 120, height: 44, borderRadius: 99, background: bg, transform: `scale(${pop(41 + i * 2)})` }} />)}
            </div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 548, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {tiles.map((s, i) => <Img key={s} src={staticFile(`stills/${s}.jpg`)} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 20, transform: `scale(${pop(46 + i * 3)}) rotate(${(1 - pop(46 + i * 3)) * 12}deg)` }} />)}
            </div>
            <div style={{ position: "absolute", left: 40, right: 40, bottom: 44, height: 92, borderRadius: 99, background: C.lime, transform: `scale(${pop(70) * press})`, boxShadow: `0 0 ${30 + 50 * pulse(f, from + 72)}px ${C.lime}` }} />
          </div>
        </div>
      </div>
      <Shockwave at={shareAt} x={540} y={1290} size={900} />
    </>
  );
}

// ── 5. Implode → loop → logo (16–20 s) ──
function Finale({ from, words }: { from: number; words: boolean }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < from) return null;
  const up = spring({ frame: f - (from + 26), fps, config: { damping: 14, stiffness: 120 } });
  const letters = "SkillLoop".split("");
  const chip = spring({ frame: f - (from + 50), fps, config: { damping: 10, stiffness: 180 } });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-up * 170}px) scale(${1 - up * 0.38})` }}>
        <LoopDraw start={from - 2} drawFrom={from} drawTo={from + 22} w={860} />
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {letters.map((l, i) => {
          const s = spring({ frame: f - (from + 30 + i * 2), fps, config: { damping: 12, stiffness: 200 } });
          return <span key={i} style={{ fontFamily: LAT, fontWeight: 800, fontSize: 150, color: i < 5 ? C.white : C.lime, display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * 90}px) rotate(${(1 - s) * -14}deg)`, textShadow: i < 5 ? "none" : `0 0 30px ${C.lime}88` }}>{l}</span>;
        })}
      </div>
      {words && (
        <div style={{ position: "absolute", top: 1260, left: 0, right: 0, textAlign: "center", transform: `scale(${chip})` }}>
          <span style={{ fontFamily: LAT, fontWeight: 800, fontSize: 56, color: C.ink, background: C.lime, padding: "18px 46px", borderRadius: 999, boxShadow: `0 0 50px ${C.lime}88` }}>📩 DM « PRO »</span>
        </div>
      )}
    </>
  );
}

function Shake({ hits, children }: { hits: number[]; children: ReactNode }) {
  const f = useCurrentFrame();
  const amp = hits.reduce((a, h) => a + (f >= h ? 22 * Math.exp(-(f - h) / 4) : 0), 0);
  const style: CSSProperties = { position: "absolute", inset: 0, transform: `translate(${Math.sin(f * 2.1) * amp}px, ${Math.cos(f * 2.7) * amp}px)` };
  return <div style={style}>{children}</div>;
}

export function Motion({ words }: { words: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile("audio/motion.wav")} />
      <Shake hits={[90, 210, 444, 510]}>
        <Backdrop />
        <LoopDraw start={4} drawFrom={22} drawTo={80} flyAt={88} />
        <Shockwave at={82} y={900} />
        <Orbit from={96} to={214} />
        <Burst at={90} y={920} />
        <Carousel from={212} to={362} words={words} />
        <PhoneBuild from={360} to={498} />
        <Finale from={510} words={words} />
        <Burst at={510} y={900} n={48} dist={900} />
        <Shockwave at={510} y={900} size={1800} color={C.clay} />
        {words && <>
          <Word ar="صنعتك" from={120} to={200} y={240} />
          <Word ar="خدمتك" from={225} to={350} y={180} />
          <Word ar="صفحتك" from={372} to={440} y={150} />
          <Word ar="في كل بلاصة" from={448} to={496} y={150} />
        </>}
      </Shake>
      <Flash at={90} />
      <Flash at={210} strength={0.6} />
      <Flash at={510} strength={0.9} />
      <AbsoluteFill style={{ background: "radial-gradient(75% 60% at 50% 48%, transparent 55%, rgba(0,0,0,0.55))", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
}
