import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { clamp, ease, LoopMark } from "./kit";
import { Scramble } from "./motion";
import { Ar, Dust, Field, InkStage, Marquee, Mono, Slam, useDims, useSpring } from "./parts";
import { CLAY, INK, INK_MUTED, LAT, LIME, MONO } from "./theme";

/** 01 · Boot: ink grid, a lime spark drops and types the slate, then stretches into a line; the lime panel rises. */
export function Boot() {
  const f = useCurrentFrame();
  const { W, H, cx, cy } = useDims();
  const fall = interpolate(f, [1, 10], [-cy - 40, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const land = useSpring(10, 8, 260);
  const sq = f >= 10 ? 1 - Math.sin(Math.min(1, land) * Math.PI) * 0.35 : 1;
  const line = interpolate(f, [26, 40], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const half = (W / 2 + 40) * line;
  const wave = (x: number) => cy + Math.sin((x / W) * Math.PI * 2 + f * 0.25) * 22 * line;
  const pts = Array.from({ length: 41 }, (_, i) => { const x = cx - half + (2 * half * i) / 40; return `${x.toFixed(1)},${wave(x).toFixed(1)}`; }).join(" ");
  const panel = interpolate(f, [38, 45], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <InkStage grid glow={0.4}>
      {f < 28 && (
        <div style={{ position: "absolute", left: cx - 13 * (2 - sq), top: cy - 13 * sq + fall - 13 * (1 - sq), width: 26 * (2 - sq), height: 26 * sq, borderRadius: 99,
          background: LIME, boxShadow: `0 0 30px ${LIME}, 0 0 80px rgba(180,242,78,0.5)` }} />
      )}
      {f < 10 && <div style={{ position: "absolute", left: cx - 1.5, top: cy - 60, width: 3, height: 24, background: LIME, opacity: 0.6 }} />}
      {line > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <polyline points={pts} fill="none" stroke={LIME} strokeWidth={4} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${LIME})` }} />
        </svg>
      )}
      <div style={{ position: "absolute", top: cy + 46, width: "100%", textAlign: "center", opacity: interpolate(f, [34, 40], [1, 0.35], clamp) }}>
        <Scramble text="skillloop / la vitrine — 2026" at={12} cps={1.3} style={{ fontSize: 26, fontWeight: 500, letterSpacing: 3, color: INK_MUTED }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * panel, background: LIME,
        boxShadow: `0 -40px 80px 30px rgba(180,242,78,${0.45 * panel})` }} />
    </InkStage>
  );
}

/** 02 · Title on a lime field: « LA VITRINE. » slams in, flips thin and back, with the showcase line; an ink disc swallows it. */
export function Title() {
  const f = useCurrentFrame();
  const { W, H, V, cx, cy } = useDims();
  const size = V ? 196 : 236;
  const disc = interpolate(f, [43, 55], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const dx = W * 0.8, dy = cy + H * 0.06;
  const R = Math.hypot(Math.max(dx, W - dx), Math.max(dy, H - dy)) * 1.15 * disc;
  const push = 1 + f * 0.0012;
  return (
    <Field c0="#cdf87a" c1={LIME} c2="#8fcf2a">
      <Marquee text="LA VITRINE ✦ SKILLLOOP ✦" size={V ? 210 : 190} y={V ? 70 : 10} speed={3} />
      <Marquee text="LA VITRINE ✦ SKILLLOOP ✦" size={V ? 210 : 190} y={H - (V ? 280 : 200)} speed={3} dir={-1} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: V ? "flex-start" : "center",
        padding: V ? "0 70px" : 0, transform: `scale(${push})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26, alignSelf: V ? "flex-start" : "center", marginLeft: V ? 0 : -560 }}>
          <span style={{ width: 70 * interpolate(f, [4, 14], [0, 1], ease), height: 3, background: INK }} />
          <Scramble text="SKILLLOOP — 2026" at={4} cps={1.6} style={{ fontWeight: 700, fontSize: 24, letterSpacing: 6, color: INK }} />
        </div>
        {V ? (
          <>
            <Slam text="LA" size={size} at={2} thin={[22, 30]} />
            <Slam text="VITRINE." size={size} at={5} thin={[24, 32]} />
          </>
        ) : (
          <Slam text="LA VITRINE." size={size} at={2} thin={[22, 30]} />
        )}
        <div style={{ marginTop: 34, alignSelf: V ? "flex-start" : "center", textAlign: V ? "left" : "center" }}>
          <div style={{ fontFamily: LAT, fontWeight: 600, fontSize: V ? 46 : 44, color: INK, opacity: interpolate(f, [14, 22], [0, 1], clamp),
            filter: `blur(${interpolate(f, [14, 22], [10, 0], clamp)}px)` }}>Des pros prêts à travailler pour vous</div>
          <Ar text="محترفين حاضرين يخدمولك" at={20} size={V ? 60 : 54} color={INK} style={{ marginTop: 6, textAlign: V ? "left" : "center" }} />
        </div>
      </AbsoluteFill>
      {disc > 0 && <div style={{ position: "absolute", left: dx - R, top: dy - R, width: 2 * R, height: 2 * R, borderRadius: "50%", background: INK,
        boxShadow: `0 0 60px 30px rgba(7,22,42,0.6)` }} />}
    </Field>
  );
}

// ---------- 03 · Wave: a field of brand tiles rising in rings around the loop orb (SVG, own projection, painter's order).

const RAMP = ["#1a2740", "#1f4f7d", "#2f78b8", CLAY, "#f2a36b", LIME];
const RAMP_AT = [0, 0.3, 0.5, 0.52, 0.78, 1];
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export function Wave() {
  const f = useCurrentFrame();
  const { W, H, V, cx, cy } = useDims();
  const N = 15;
  const cell = V ? 62 : 66;
  const pitch = interpolate(f, [0, 20], [16, 54], { ...clamp, easing: Easing.out(Easing.cubic) }) * (Math.PI / 180);
  const yaw = interpolate(f, [0, 50], [-12, -44], { ...clamp, easing: Easing.inOut(Easing.sin) }) * (Math.PI / 180);
  const zoom = interpolate(f, [0, 50], [V ? 0.92 : 0.88, V ? 1.06 : 1.0], clamp);
  const amp = interpolate(f, [5, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const colorOn = interpolate(f, [3, 14], [0, 1], clamp);
  const HMAX = cell * 3.6;
  const ox = cx, oy = cy + (V ? 60 : 100);
  const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const P = (x: number, y: number, z: number) => {
    const x1 = x * cy0 - y * sy0, y1 = x * sy0 + y * cy0;
    const depth = y1 * sp + z * cp;
    const k = zoom * (4200 / (4200 - depth));
    return { X: ox + x1 * k, Y: oy + (y1 * cp - z * sp) * k, d: y1 };
  };
  const hOf = (u: number, v: number) => {
    const d = Math.hypot(u, v);
    const ring = 0.5 + 0.5 * Math.sin(d * 0.85 - f * 0.3);
    const env = Math.exp(-d * 0.085);
    const hole = d < 1.2 ? 0.2 : 1;
    return amp * (0.08 + 0.92 * ring * env * hole);
  };
  // Which side faces look at the camera for this yaw.
  const sx = Math.sin(yaw) > 0 ? 1 : -1, sy = Math.cos(yaw) > 0 ? 1 : -1;
  const cols: { d: number; polys: { pts: string; fill: string }[] }[] = [];
  const half = (N - 1) / 2;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = i - half, v = j - half;
    const h01 = Math.min(1, hOf(u, v));
    const z = 8 + h01 * HMAX;
    const x0 = u * cell - cell * 0.46, x1 = u * cell + cell * 0.46, y0 = v * cell - cell * 0.46, y1 = v * cell + cell * 0.46;
    const top = interpolateColors(colorOn * h01, RAMP_AT, RAMP);
    const base = interpolateColors(colorOn, [0, 1], ["#1b2536", top]);
    const q = (a: [number, number, number][]) => a.map(([x, y, zz]) => { const p = P(x, y, zz); return `${p.X.toFixed(1)},${p.Y.toFixed(1)}`; }).join(" ");
    const xe = sx > 0 ? x1 : x0, ye = sy > 0 ? y1 : y0;
    cols.push({
      d: P(u * cell, v * cell, 0).d,
      polys: [
        { pts: q([[xe, y0, 0], [xe, y1, 0], [xe, y1, z], [xe, y0, z]]), fill: shade(base.startsWith("rgb") ? rgbHex(base) : base, 0.55) },
        { pts: q([[x0, ye, 0], [x1, ye, 0], [x1, ye, z], [x0, ye, z]]), fill: shade(base.startsWith("rgb") ? rgbHex(base) : base, 0.72) },
        { pts: q([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]), fill: base },
      ],
    });
  }
  cols.sort((a, b) => a.d - b.d);
  const orbIn = useSpring(9, 12, 140);
  const zc = HMAX * 0.5;
  const top = P(0, 0, zc);
  const R = (V ? 98 : 88) * orbIn;
  const oyOrb = top.Y - R * 0.7 + Math.sin(f / 8) * 8;
  const spin = f * 4;
  return (
    <InkStage glow={0.5}>
      <AbsoluteFill style={{ background: `radial-gradient(45% 35% at 50% ${(oy / H) * 100}%, rgba(219,112,59,${0.25 * amp}), transparent 70%)` }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {cols.map((c, k) => c.polys.map((p, m) => <polygon key={`${k}-${m}`} points={p.pts} fill={p.fill} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />))}
        {R > 1 && (
          <g>
            <defs>
              <radialGradient id="chrome" cx="36%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="28%" stopColor="#dfe4ea" />
                <stop offset="58%" stopColor="#8a96a8" />
                <stop offset="82%" stopColor="#2b3446" />
                <stop offset="100%" stopColor="#5d6b80" />
              </radialGradient>
            </defs>
            <ellipse cx={top.X} cy={top.Y} rx={R * 1.1} ry={R * 0.32} fill={LIME} opacity={0.28} style={{ filter: "blur(10px)" }} />
            <path d={arc(top.X, oyOrb, R * 1.75, R * 0.5, -18, true)} fill="none" stroke={LIME} strokeWidth={3} strokeOpacity={0.6} />
            <circle cx={top.X} cy={oyOrb} r={R} fill="url(#chrome)" />
            <ellipse cx={top.X - R * 0.32} cy={oyOrb - R * 0.42} rx={R * 0.3} ry={R * 0.16} fill="#ffffff" opacity={0.8} transform={`rotate(-30 ${top.X - R * 0.32} ${oyOrb - R * 0.42})`} />
            <path d={arc(top.X, oyOrb, R * 1.75, R * 0.5, -18, false)} fill="none" stroke={LIME} strokeWidth={4} strokeDasharray="40 14" strokeDashoffset={-spin} />
          </g>
        )}
      </svg>
      {R > 1 && (
        <div style={{ position: "absolute", left: top.X - R * 0.62, top: oyOrb - R * 0.33, opacity: orbIn }}>
          <LoopMark size={R * 1.24} clay={INK} spark={(f % 30) / 30} />
        </div>
      )}
      <Dust n={30} op={0.2} />
      <div style={{ position: "absolute", left: V ? 70 : 110, top: V ? 250 : 120, opacity: interpolate(f, [14, 22], [0, 1], clamp) }}>
        <Mono color={LIME} size={22}>13 CATÉGORIES · SUR PLACE OU À DISTANCE</Mono>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 4, color: INK_MUTED, marginTop: 10 }}>TUNIS · SOUSSE · SFAX · …</div>
      </div>
    </InkStage>
  );
}

function rgbHex(rgb: string) {
  const m = rgb.match(/\d+/g)!.map(Number);
  return `#${m.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Half of a rotated ellipse: the back half (`back`) is drawn under the orb, the front half over it. */
function arc(cx: number, cy: number, rx: number, ry: number, rotDeg: number, back: boolean) {
  const r = (rotDeg * Math.PI) / 180;
  const pt = (a: number) => {
    const x = rx * Math.cos(a), y = ry * Math.sin(a);
    return `${(cx + x * Math.cos(r) - y * Math.sin(r)).toFixed(1)} ${(cy + x * Math.sin(r) + y * Math.cos(r)).toFixed(1)}`;
  };
  const [a0, a1] = back ? [Math.PI, 2 * Math.PI] : [0, Math.PI];
  return `M ${pt(a0)} A ${rx} ${ry} ${rotDeg} 0 1 ${pt(a1)}`;
}
