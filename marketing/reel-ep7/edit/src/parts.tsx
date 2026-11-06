import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ease, Icon, LoopMark } from "./kit";
import { PROS, priceHead, priceShort, type Pro } from "./data";
import { AR, CLAY, INK, INK2, LAT, LIGHT, LIME, MONO } from "./theme";

// Shared pieces of the « La vitrine » reel. Every scene lays itself out from the composition size, so the same code
// renders the 9:16 reel (Instagram, phone) and the 16:9 cut for the site's showcase.

export function useDims() {
  const { width: W, height: H } = useVideoConfig();
  const V = H > W;
  return { W, H, V, cx: W / 2, cy: H / 2 };
}

/** 0→1 spring from `delay`. */
export function useSpring(delay = 0, damping = 14, stiffness = 170) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, stiffness } });
}

/** The ink brand surface (.bg-ink-hero): ink → ink-2, a warm clay light low on the start side, a faint lime light up top. */
export function InkStage({ grid = false, glow = 1, children }: { grid?: boolean; glow?: number; children?: ReactNode }) {
  const { W, H } = useDims();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${INK} 0%, ${INK2} 120%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{
        background: [
          `radial-gradient(60% 45% at 8% 100%, rgba(219,112,59,${0.28 * glow}), transparent 70%)`,
          `radial-gradient(50% 35% at 85% 0%, rgba(180,242,78,${0.12 * glow}), transparent 70%)`,
        ].join(","),
      }} />
      {grid && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: Math.ceil(W / 60) + 1 }, (_, i) => <line key={`x${i}`} x1={i * 60} y1={0} x2={i * 60} y2={H} stroke="#ffffff" strokeOpacity={0.045} />)}
          {Array.from({ length: Math.ceil(H / 60) + 1 }, (_, i) => <line key={`y${i}`} x1={0} y1={i * 60} x2={W} y2={i * 60} stroke="#ffffff" strokeOpacity={0.045} />)}
        </svg>
      )}
      {children}
    </AbsoluteFill>
  );
}

/** Bright color field with a soft vignette (the source's orange / blue / white stages, in SkillLoop colors). */
export function Field({ c0, c1, c2, children }: { c0: string; c1: string; c2: string; children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(75% 60% at 50% 48%, ${c0} 0%, ${c1} 55%, ${c2} 100%)`, overflow: "hidden" }}>
      {children}
    </AbsoluteFill>
  );
}

/** Specks drifting up. */
export function Dust({ n = 50, color = "#ffffff", op = 0.25 }: { n?: number; color?: string; op?: number }) {
  const f = useCurrentFrame();
  const { W, H } = useDims();
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const sp = 0.4 + random(`dv${i}`) * 0.8;
        const y = ((random(`dy${i}`) * (H + 100) - f * sp) % (H + 100) + H + 100) % (H + 100) - 50;
        const x = random(`dx${i}`) * W + Math.sin(f / 25 + i) * 4;
        const sz = 2 + random(`ds${i}`) * 3;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz, borderRadius: 99, background: color,
          opacity: op * (0.5 + 0.5 * Math.sin(f / 6 + i * 1.7)) + 0.05 }} />;
      })}
    </>
  );
}

/**
 * Big display word that slams in letter by letter (out of focus, oversized → sharp), like the source's title.
 * `thin` is a [from, to] frame window where the letters flip to the thin weight one after another.
 */
export function Slam({ text, size, at = 0, step = 1.5, color = INK, thin, style, ls = -0.045 }:
  { text: string; size: number; at?: number; step?: number; color?: string; thin?: [number, number]; style?: CSSProperties; ls?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: LAT, fontSize: size, lineHeight: 0.92, letterSpacing: size * ls, color, whiteSpace: "nowrap", ...style }}>
      {text.split("").map((ch, i) => {
        const p = spring({ frame: f - at - i * step, fps, config: { damping: 13, stiffness: 210 } });
        const thinNow = thin && f >= thin[0] + i * 0.9 && f < thin[1] + i * 0.9;
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", fontWeight: thinNow ? 200 : 800, opacity: Math.min(1, p * 1.5),
            filter: `blur(${Math.max(0, 1 - p) * 16}px)`, transform: `translateY(${(1 - p) * size * 0.35}px) scale(${1.45 - 0.45 * p})` }}>{ch}</span>
        );
      })}
    </div>
  );
}

/** Rows of outlined words scrolling left / right (the source's background type). */
export function Marquee({ text, size, y, speed = 4, stroke = "rgba(7,22,42,0.14)", fill = "transparent", dir = 1, font = LAT }:
  { text: string; size: number; y: number; speed?: number; stroke?: string; fill?: string; dir?: 1 | -1; font?: string }) {
  const f = useCurrentFrame();
  const { W } = useDims();
  const row = Array.from({ length: 6 }, () => text).join("  ");
  return (
    <div style={{ position: "absolute", top: y, left: -W * 0.5 + ((dir * f * speed) % (W * 0.5)), whiteSpace: "nowrap", fontFamily: font, fontWeight: 800,
      fontSize: size, lineHeight: 1, letterSpacing: -size * 0.03, color: fill, WebkitTextStroke: `2px ${stroke}` }}>{row}</div>
  );
}

/** Avatar disc: the pro's illustration, or the initial on clay-soft like the app does when there is no photo. */
export function Avatar({ pro, size, ring }: { pro: Pro; size: number; ring?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, overflow: "hidden", flexShrink: 0, background: LIGHT.claySoft, display: "grid", placeItems: "center",
      boxShadow: ring ? `0 0 0 ${Math.max(3, size * 0.05)}px ${ring}` : undefined }}>
      {pro.av
        ? <Img src={staticFile(`stills/${pro.av}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ fontFamily: LAT, fontWeight: 800, fontSize: size * 0.44, color: LIGHT.clay }}>{pro.initial}</span>}
    </div>
  );
}

/** Brand cover for a service without a safe photo: ink card, category, icon, the pro's own service title, the loop. */
export function BrandCover({ pro, w, h }: { pro: Pro; w: number; h: number }) {
  const k = w / 860;
  const acc = [LIME, CLAY, "#2a8fd6", LIME][PROS.filter((p) => !p.cover).indexOf(pro)] ?? LIME;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: LAT,
      background: `radial-gradient(70% 80% at 85% 20%, ${acc}33, transparent 60%), linear-gradient(160deg, ${INK} 0%, ${INK2} 100%)` }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={w * 0.82} cy={h * 0.3} r={(70 + i * 70) * k} fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={2} />)}
      </svg>
      <div style={{ position: "absolute", left: 56 * k, top: 52 * k, display: "flex", alignItems: "center", gap: 12 * k, fontFamily: MONO, fontWeight: 700,
        fontSize: 22 * k, letterSpacing: 4 * k, color: acc }}>
        <span style={{ width: 28 * k, height: 3 * k, background: acc }} />{pro.cat.toUpperCase()}
      </div>
      <div style={{ position: "absolute", left: 56 * k, top: 110 * k, width: w * 0.62, fontWeight: 800, fontSize: 58 * k, lineHeight: 1.08, letterSpacing: "-0.03em",
        color: "#f8f6f0" }}>{pro.title}</div>
      <div style={{ position: "absolute", right: 70 * k, top: h * 0.3 - 90 * k, width: 180 * k, height: 180 * k, borderRadius: 44 * k, background: acc,
        display: "grid", placeItems: "center", transform: "rotate(-8deg)", boxShadow: `0 30px 60px rgba(0,0,0,0.35)` }}>
        <Icon name={pro.icon} size={96 * k} color={INK} width={2} />
      </div>
      <div style={{ position: "absolute", left: 56 * k, bottom: 48 * k, display: "flex", gap: 12 * k }}>
        {[pro.city, "À distance"].map((c) => <span key={c} style={{ padding: `${8 * k}px ${18 * k}px`, borderRadius: 99, border: `2px solid rgba(255,255,255,0.25)`,
          color: "#f8f6f0", fontWeight: 600, fontSize: 22 * k }}>{c}</span>)}
      </div>
      <div style={{ position: "absolute", right: 56 * k, bottom: 52 * k }}><LoopMark size={70 * k} clay={CLAY} /></div>
    </div>
  );
}

/** The service's cover: the brand illustration file, or the brand cover. */
export function Cover({ pro, w, h }: { pro: Pro; w: number; h: number }) {
  return pro.cover
    ? <Img src={staticFile(`stills/${pro.cover}.jpg`)} style={{ display: "block", width: w, height: h, objectFit: "cover" }} />
    : <BrandCover pro={pro} w={w} h={h} />;
}

/** Service card in the app's ServiceCard layout: cover, title, pro, place, price. */
export function ServiceCard({ pro, w, style }: { pro: Pro; w: number; style?: CSSProperties }) {
  const k = w / 480;
  return (
    <div style={{ width: w, borderRadius: 26 * k, overflow: "hidden", background: "#ffffff", fontFamily: LAT, color: LIGHT.fg,
      boxShadow: "0 30px 80px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.18)", ...style }}>
      <Cover pro={pro} w={w} h={w * 0.625} />
      <div style={{ padding: `${20 * k}px ${22 * k}px ${22 * k}px` }}>
        <div style={{ fontWeight: 800, fontSize: 27 * k, lineHeight: 1.2, height: 27 * k * 2.4, overflow: "hidden" }}>{pro.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * k, marginTop: 14 * k }}>
          <Avatar pro={pro} size={44 * k} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 22 * k }}>{pro.name}</div>
            <div style={{ fontWeight: 500, fontSize: 19 * k, color: LIGHT.mutedFg }}>{pro.city} · À distance</div>
          </div>
        </div>
        <div style={{ marginTop: 16 * k, paddingTop: 14 * k, borderTop: `2px solid ${LIGHT.border}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, fontSize: 19 * k, color: LIGHT.mutedFg }}>{pro.kind === "quote" ? "" : priceHead(pro)}</span>
          <span style={{ fontWeight: 800, fontSize: 28 * k }}>{priceShort(pro)}</span>
        </div>
      </div>
    </div>
  );
}

/** Desktop pointer that glides between points and clicks (ripple) at `taps`. */
export function Pointer({ path, taps = [], color = LIME }: { path: { f: number; x: number; y: number }[]; taps?: number[]; color?: string }) {
  const f = useCurrentFrame();
  if (f < path[0]!.f) return null;
  const e = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const fs = path.map((p) => p.f);
  const x = path.length > 1 ? interpolate(f, fs, path.map((p) => p.x), e) : path[0]!.x;
  const y = path.length > 1 ? interpolate(f, fs, path.map((p) => p.y), e) : path[0]!.y;
  const press = taps.reduce((m, t) => Math.max(m, 1 - Math.abs(f - t) / 3), 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 60, pointerEvents: "none" }}>
      {taps.filter((t) => f >= t && f < t + 14).map((t) => {
        const r = interpolate(f, [t, t + 14], [0.2, 1.8], { easing: Easing.out(Easing.quad) });
        return <div key={t} style={{ position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 99, border: `5px solid ${color}`,
          transform: `scale(${r})`, opacity: interpolate(f, [t, t + 14], [0.9, 0]) }} />;
      })}
      <svg width={54} height={54} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 4, transform: `scale(${1 - press * 0.18})`,
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}>
        <path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#ffffff" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Small mono caps label. */
export function Mono({ children, size = 22, color, style }: { children: ReactNode; size?: number; color: string; style?: CSSProperties }) {
  return <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: size * 0.22, color, whiteSpace: "nowrap", ...style }}>{children}</div>;
}

/** Arabic (derja) line that blurs in. */
export function Ar({ text, at = 0, size, color, style }: { text: string; at?: number; size: number; color: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 10], [0, 1], ease);
  return <div style={{ fontFamily: AR, fontWeight: 800, fontSize: size, lineHeight: 1.45, color, direction: "rtl", opacity: p, filter: `blur(${(1 - p) * 10}px)`,
    transform: `translateY(${(1 - p) * 16}px)`, ...style }}>{text}</div>;
}

export { CLAY };
