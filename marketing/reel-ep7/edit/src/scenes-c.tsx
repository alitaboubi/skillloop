import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { clamp, ease, LoopMark } from "./kit";
import { Burst, Typed, Words } from "./motion";
import { PROS, REQUEST } from "./data";
import { Ar, Avatar, Field, InkStage, Mono, Pointer, ServiceCard, useDims, useSpring } from "./parts";
import { AR, CLAY, INK, INK_FG, INK_MUTED, LAT, LIGHT, LIME, LIME_DEEP, MONO, SEA, SEA_HI } from "./theme";

// ---------- 06 · Particles stream in, lock into a ring, burst, and the showcase coverflow (the home page's stage) turns.

export function Flow() {
  const f = useCurrentFrame();
  const { W, H, V, cx, cy } = useDims();
  const R = V ? 360 : 300;
  const ocy = V ? cy + 120 : cy + 70;
  const BURST = 18;
  const n = 180;
  const cols = ["#ffffff", LIME, CLAY, SEA_HI, "#ffffff"];
  const streaks = f < BURST + 4 ? Array.from({ length: n }, (_, i) => {
    const a0 = random(`fa${i}`) * Math.PI * 2;
    const r0 = (V ? 1300 : 1200) * (0.7 + random(`fr${i}`) * 0.6);
    const pos = (t: number) => {
      const e = interpolate(t, [0, 15], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
      const r = r0 + (R - r0) * e;
      const a = a0 + e * 1.6 + Math.max(0, t - 15) * 0.06;
      return [cx + Math.cos(a) * r, ocy + Math.sin(a) * r * (V ? 1 : 0.9)];
    };
    const [x1, y1] = pos(f), [x0, y0] = pos(f - 2.2);
    return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={cols[i % cols.length]} strokeWidth={1.5 + random(`fw${i}`) * 2.5} strokeLinecap="round"
      opacity={interpolate(f, [0, 3, BURST, BURST + 4], [0, 0.9, 0.9, 0], clamp)} />;
  }) : null;

  // Coverflow after the burst: the centre slides through the four cards.
  const pos = interpolate(f, [BURST, 50], [-0.4, 3.4], { ...clamp, easing: Easing.out(Easing.quad) });
  const cardW = V ? 600 : 470;
  const appear = useSpring(BURST, 15, 150);
  const cards = PROS.map((p, i) => ({ p, o: i - pos })).sort((a, b) => Math.abs(b.o) - Math.abs(a.o));
  return (
    <InkStage glow={0.8}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{streaks}</svg>
      <Burst at={BURST} x={cx} y={ocy} n={70} spread={V ? 820 : 900} colors={[LIME, CLAY, "#ffffff", SEA_HI]} />
      {f >= BURST && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: V ? 230 : 100, textAlign: "center" }}>
            <Mono color={LIME} size={24} style={{ opacity: appear }}>LA VITRINE</Mono>
            <Words lines={[[{ t: "Des pros prêts à travailler" }], [{ t: "pour vous", c: LIME }]]} at={BURST + 2} step={2} size={V ? 74 : 66} color={INK_FG}
              align="center" style={{ marginTop: 14 }} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 1800 }}>
            {cards.map(({ p, o }) => {
              const ao = Math.abs(o);
              const x = cx + Math.sign(o) * Math.min(ao, 2.2) * cardW * (V ? 0.5 : 0.72) - cardW / 2;
              return (
                <div key={p.id} style={{ position: "absolute", left: x, top: ocy - cardW * 0.55 + (V ? 60 : 40), width: cardW,
                  transform: `translateY(${(1 - appear) * 300}px) rotateY(${-Math.max(-1.3, Math.min(1.3, o)) * 38}deg) scale(${1 - Math.min(ao, 2) * 0.16})`,
                  opacity: Math.min(appear * 1.5, 1) * (ao > 2.4 ? 0 : 1), filter: `brightness(${1 - Math.min(ao, 1.5) * 0.3})` }}>
                  <ServiceCard pro={p} w={cardW} />
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: cx - 120, width: 240, top: ocy + cardW * 0.98 + (V ? 120 : 60), height: 6, borderRadius: 9, background: "rgba(255,255,255,0.15)" }}>
            <div style={{ width: `${interpolate(pos, [-0.4, PROS.length - 1], [0.1, 1], clamp) * 100}%`, height: "100%", borderRadius: 9, background: LIME }} />
          </div>
        </>
      )}
    </InkStage>
  );
}

// ---------- 07 · The request card on the sea field (the source's "Render queue" card): type, send, sent.

export function Request() {
  const f = useCurrentFrame();
  const { V, cx, cy } = useDims();
  const pro = PROS[0]!;
  const w = V ? 860 : 760;
  const pop = useSpring(0, 15, 170);
  const TAP = 31, SENT = 40;
  const fill = interpolate(f, [TAP, SENT], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const sent = f >= SENT;
  const k = w / 760;
  const h = 560 * k;
  const top = cy - h / 2 + (V ? 40 : 30);
  const btnY = top + h - 112 * k;
  const toast = interpolate(f, [SENT, SENT + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  return (
    <Field c0={SEA_HI} c1={SEA} c2="#003f68">
      {[-7, 6].map((r, i) => (
        <div key={r} style={{ position: "absolute", left: cx - w / 2 + (i ? 70 : -70), top: top + (i ? -30 : 40), width: w, height: h, borderRadius: 34 * k,
          background: "rgba(255,255,255,0.13)", border: "2px solid rgba(255,255,255,0.18)", transform: `rotate(${r * pop}deg)` }} />
      ))}
      <div style={{ position: "absolute", left: cx - w / 2, top, width: w, height: h, borderRadius: 34 * k, background: "#ffffff", fontFamily: LAT, color: LIGHT.fg,
        boxShadow: "0 50px 100px rgba(0,30,60,0.45)", transform: `translateY(${(1 - pop) * 200}px) scale(${0.9 + 0.1 * pop})`, opacity: Math.min(1, pop * 1.6),
        padding: 38 * k, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 * k }}>
          <Avatar pro={pro} size={76 * k} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 32 * k }}>{pro.title}</div>
            <div style={{ fontWeight: 600, fontSize: 24 * k, color: LIGHT.mutedFg }}>{pro.name} · {pro.city}</div>
          </div>
          <span style={{ padding: `${8 * k}px ${18 * k}px`, borderRadius: 99, background: sent ? LIGHT.claySoft : LIGHT.successSoft, color: sent ? CLAY : LIGHT.success,
            fontWeight: 700, fontSize: 22 * k, whiteSpace: "nowrap" }}>{sent ? "En attente" : `${pro.price} DT`}</span>
        </div>
        <div style={{ marginTop: 34 * k, fontWeight: 700, fontSize: 25 * k }}>Décrivez votre besoin</div>
        <div style={{ marginTop: 12 * k, height: 170 * k, borderRadius: 18 * k, border: `2.5px solid ${f > 3 && f < TAP ? LIGHT.sea : LIGHT.border}`, padding: 22 * k,
          boxSizing: "border-box", fontWeight: 500, fontSize: 29 * k, lineHeight: 1.4 }}>
          <Typed text={REQUEST} at={4} cps={2.1} caret={LIGHT.sea} />
        </div>
        <div style={{ position: "absolute", left: 38 * k, right: 38 * k, bottom: 38 * k, height: 84 * k, borderRadius: 99, overflow: "hidden",
          background: sent ? LIME : INK, color: sent ? INK : "#ffffff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 29 * k,
          transform: `scale(${1 - 0.04 * Math.max(0, 1 - Math.abs(f - TAP) / 3)})` }}>
          {!sent && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: LIME_DEEP }} />}
          <span style={{ position: "relative" }}>{sent ? "✓ Demande envoyée" : "Envoyer la demande"}</span>
        </div>
      </div>
      <Pointer path={[{ f: 16, x: cx + w * 0.5, y: btnY + 240 }, { f: TAP - 1, x: cx + w * 0.12, y: btnY + 40 * k }, { f: 50, x: cx + w * 0.2, y: btnY + 110 }]} taps={[TAP]} />
      {toast > 0 && (
        <div style={{ position: "absolute", left: cx - (V ? 440 : 420), top: V ? 260 : 70, width: V ? 880 : 840, borderRadius: 26, background: INK, color: INK_FG,
          padding: "22px 28px", display: "flex", alignItems: "center", gap: 20, boxShadow: "0 30px 60px rgba(0,0,0,0.35)", fontFamily: LAT,
          transform: `translateY(${(1 - toast) * -140}px)`, opacity: Math.min(1, toast * 2), boxSizing: "border-box" }}>
          <span style={{ width: 52, height: 52, borderRadius: 99, background: LIME, color: INK, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 30, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: V ? 28 : 27, lineHeight: 1.3 }}><b>Demande envoyée</b> — en attente de confirmation du pro.</span>
        </div>
      )}
    </Field>
  );
}

// ---------- 08 · Blobs on lime: one dot splits into a gooey family inside a morphing superformula, then merges back.

function superformula(cx: number, cy: number, r: number, m: number, n1: number, n2: number, n3: number, rot: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const a = Math.pow(Math.abs(Math.cos((m * t) / 4)), n2), b = Math.pow(Math.abs(Math.sin((m * t) / 4)), n3);
    const rr = r * Math.pow(a + b, -1 / n1);
    pts.push(`${(cx + rr * Math.cos(t + rot)).toFixed(1)},${(cy + rr * Math.sin(t + rot)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}

export function Blobs() {
  const f = useCurrentFrame();
  const { W, H, V, cx, cy } = useDims();
  const ocx = cx, ocy = V ? cy + 230 : cy + 150;
  const R = V ? 330 : 270;
  const split = interpolate(f, [2, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const merge = interpolate(f, [36, 48], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const spread = split * (1 - merge);
  const m = interpolate(f, [0, 16, 30, 46], [3, 3, 5, 7], clamp);
  const n1 = interpolate(f, [0, 30, 46], [1.2, 0.6, 1.8], clamp);
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + f * 0.05 + random(`ba${i}`) * 0.4;
    const rr = R * (0.38 + random(`br${i}`) * 0.32) * spread;
    const sz = (V ? 46 : 38) * (0.6 + random(`bz${i}`) * 0.8);
    return { x: ocx + Math.cos(a) * rr, y: ocy + Math.sin(a) * rr, r: sz };
  });
  const core = (V ? 70 : 60) * (1 - spread * 0.35);
  return (
    <Field c0="#cdf87a" c1={LIME} c2="#8fcf2a">
      <div style={{ position: "absolute", left: 0, right: 0, top: V ? 220 : 90, textAlign: "center" }}>
        <Words lines={[[{ t: "Talents locaux." }], [{ t: "Vraies opportunités." }]]} at={2} step={3} size={V ? 104 : 92} color={INK} align="center" />
        <Ar text="مهارات محلية. فرص حقيقية." at={12} size={V ? 58 : 50} color={INK} style={{ marginTop: 10, textAlign: "center" }} />
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="goo"><feGaussianBlur stdDeviation="16" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" /></filter>
        </defs>
        <path d={superformula(ocx, ocy, R * (0.6 + 0.4 * split) * (1 - merge * 0.75), m, n1, 1.7, 1.7, f * 0.02)} fill="none" stroke={INK} strokeWidth={2.5} opacity={0.75} />
        <g filter="url(#goo)">
          <circle cx={ocx} cy={ocy} r={core} fill={INK} />
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={INK} />)}
        </g>
      </svg>
      <Mono color={INK} size={20} style={{ position: "absolute", left: V ? 70 : 110, bottom: V ? 120 : 90, opacity: 0.7 }}>
        CLIENTS ↔ PROS · m = {m.toFixed(2)}
      </Mono>
    </Field>
  );
}

/** 09 · Cut to ink: the dot is now the brand's lime spark inside a closing clay ring. */
export function RingBeat() {
  const f = useCurrentFrame();
  const { cx, cy } = useDims();
  const r = interpolate(f, [0, 12], [150, 44], { ...clamp, easing: Easing.out(Easing.cubic) });
  const d = interpolate(f, [0, 12], [60, 22], ease);
  return (
    <InkStage glow={0.3}>
      <div style={{ position: "absolute", left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: 99, border: `2px solid ${CLAY}`, opacity: 0.8 }} />
      <div style={{ position: "absolute", left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: 99, background: LIME, boxShadow: `0 0 30px ${LIME}` }} />
    </InkStage>
  );
}

// ---------- 10 · End card: the loop draws, the wordmark resolves, the home page lines, the two CTAs.

export function End() {
  const f = useCurrentFrame();
  const { V, cx, cy, W } = useDims();
  const draw = interpolate(f, [0, 14], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const word = "SkillLoop";
  const markSize = V ? 230 : 220;
  const base = V ? cy - 300 : cy - 250;
  const line = interpolate(f, [22, 34], [0, 1], ease);
  const cta = useSpring(36, 14, 170);
  const free = useSpring(46, 14, 170);
  return (
    <InkStage glow={1}>
      <div style={{ position: "absolute", left: cx - markSize / 2, top: base - markSize * 0.55 }}>
        <LoopMark size={markSize} draw={draw} spark={draw < 1 ? draw * 0.9 : -1} clay={CLAY} />
      </div>
      <div dir="ltr" style={{ position: "absolute", left: 0, right: 0, top: base + markSize * 0.25, textAlign: "center", fontFamily: LAT, fontWeight: 800,
        fontSize: V ? 150 : 170, letterSpacing: "-0.04em", color: INK_FG }}>
        {word.split("").map((ch, i) => {
          const p = interpolate(f, [8 + i * 1.2, 18 + i * 1.2], [0, 1], ease);
          return <span key={i} style={{ display: "inline-block", color: i >= 5 ? LIME : INK_FG, opacity: p, filter: `blur(${(1 - p) * 14}px)`,
            transform: `translateY(${(1 - p) * 30}px)` }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: V ? 60 : 0, right: V ? 60 : 0, top: base + markSize * 0.25 + (V ? 200 : 215), textAlign: "center", fontFamily: LAT,
        fontWeight: 600, fontSize: V ? 42 : 38, lineHeight: 1.3, color: INK_MUTED, opacity: interpolate(f, [16, 26], [0, 1], clamp) }}>
        Le savoir-faire près de chez vous, <span style={{ color: LIME }}>ou à un clic.</span>
      </div>
      <div style={{ position: "absolute", left: cx - 300 * line, width: 600 * line, top: base + markSize * 0.25 + (V ? 340 : 292), height: 2, background: "rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: base + markSize * 0.25 + (V ? 372 : 318), textAlign: "center", fontFamily: MONO, fontWeight: 700,
        fontSize: V ? 24 : 22, letterSpacing: 5, lineHeight: 1.7, color: LIME }}>
        {V ? (<><Typed text="TROUVEZ LE BON SERVICE." at={26} cps={2.4} caret="transparent" /><br /><Typed text="PARTAGEZ CE QUE VOUS SAVEZ FAIRE." at={36} cps={2.6} caret={LIME} /></>)
          : <Typed text="TROUVEZ LE BON SERVICE. PARTAGEZ CE QUE VOUS SAVEZ FAIRE." at={26} cps={3} caret={LIME} />}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: base + markSize * 0.25 + (V ? 520 : 386), display: "flex", justifyContent: "center", gap: 22,
        flexDirection: V ? "column" : "row", alignItems: "center", transform: `translateY(${(1 - cta) * 60}px)`, opacity: Math.min(1, cta * 1.5) }}>
        <span style={btn(LIME, INK, V)}>Explorer les services <span style={{ marginLeft: 10 }}>→</span></span>
        <span style={{ ...btn("transparent", INK_FG, V), boxShadow: "inset 0 0 0 2.5px rgba(255,255,255,0.4)" }}>Proposer un service</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: base + markSize * 0.25 + (V ? 760 : 492), display: "flex", justifyContent: "center",
        transform: `scale(${0.8 + 0.2 * free})`, opacity: free }}>
        <span style={{ display: "inline-flex", gap: 16, alignItems: "center", padding: "12px 26px", borderRadius: 99, border: `2px solid ${CLAY}`, color: "#f6b58f",
          fontFamily: LAT, fontWeight: 700, fontSize: V ? 28 : 25 }}>
          Page pro gratuite <span style={{ opacity: 0.5 }}>·</span> <span style={{ fontFamily: AR, fontWeight: 800 }}>صفحة محترف بلاش</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, width: W, bottom: V ? 120 : 84, textAlign: "center", fontFamily: MONO, fontSize: 19, letterSpacing: 5,
        color: "rgba(255,255,255,0.45)", opacity: interpolate(f, [44, 54], [0, 1], clamp) }}>
        TALENTS LOCAUX · VRAIES OPPORTUNITÉS · TUNISIE
      </div>
    </InkStage>
  );
}

const btn = (bg: string, fg: string, V: boolean) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: V ? "26px 52px" : "22px 44px",
  minWidth: V ? 560 : undefined, borderRadius: 999, background: bg, color: fg, fontFamily: LAT, fontWeight: 800, fontSize: V ? 38 : 32, whiteSpace: "nowrap" as const });
