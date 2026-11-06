import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, ease } from "./kit";
import { Scramble } from "./motion";
import { PROS, priceHead } from "./data";
import { Avatar, Cover, Field, Marquee, Mono, Pointer, useDims, useSpring } from "./parts";
import { AR, CLAY, INK, INK_FG, LAT, LIGHT, LIME, MONO, PAPER, SEA, SEA_HI } from "./theme";

// 04 · Three one-beat words (the source's EVERY / SINGLE / FRAME), here the home page's
// « Le savoir-faire / près de chez vous, / ou à un clic. », then the same line in derja.

export function WordPaper() {
  const f = useCurrentFrame();
  const { V } = useDims();
  const s = interpolate(f, [0, 12], [1.1, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ls = interpolate(f, [0, 8], [0.04, -0.045], ease);
  const word = (t: string) => <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: V ? 205 : 250, lineHeight: 0.95, letterSpacing: `${ls}em`, color: INK }}>{t}</div>;
  return (
    <Field c0="#ffffff" c1={PAPER} c2="#e2e4da">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${s})` }}>
        <Mono color={CLAY} size={26} style={{ alignSelf: "center", marginBottom: 18 }}>LE</Mono>
        {V ? <>{word("SAVOIR-")}{word("FAIRE")}</> : word("SAVOIR-FAIRE")}
      </AbsoluteFill>
    </Field>
  );
}

export function WordWall() {
  const f = useCurrentFrame();
  const { H, V } = useDims();
  const rowH = V ? 150 : 128;
  const rows = Math.ceil(H / rowH) + 1;
  const pop = interpolate(f, [0, 6], [0.85, 1], ease);
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      {Array.from({ length: rows }, (_, i) => (
        <Marquee key={i} text="PRÈS DE CHEZ VOUS ·" size={rowH * 0.92} y={i * rowH - 30} speed={i % 2 ? 9 : -9} stroke="rgba(255,255,255,0.16)" />
      ))}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: INK, padding: "10px 40px", boxShadow: `0 0 80px 40px ${INK}`, transform: `scale(${pop})`, textAlign: "center",
          fontFamily: LAT, fontWeight: 800, fontSize: V ? 150 : 170, lineHeight: 0.98, letterSpacing: "-0.04em", color: LIME }}>
          {V ? <>PRÈS DE<br />CHEZ VOUS</> : "PRÈS DE CHEZ VOUS"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function WordClick() {
  const f = useCurrentFrame();
  const { V, cx, cy } = useDims();
  const size = V ? 230 : 260;
  const bw = V ? 860 : 1020, bh = size * 1.25;
  const snap = interpolate(f, [0, 6], [1.35, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const pulse = 1 + 0.05 * Math.max(0, 1 - Math.abs(f - 8) / 3);
  const corner = (sx: number, sy: number) => (
    <div style={{ position: "absolute", left: cx + sx * (bw / 2) * snap - 32 + sx * 32 * 0, top: cy + sy * (bh / 2) * snap - 32, width: 64, height: 64,
      borderColor: LIME, borderStyle: "solid", borderWidth: 0,
      [sx < 0 ? "borderLeftWidth" : "borderRightWidth"]: 7, [sy < 0 ? "borderTopWidth" : "borderBottomWidth"]: 7,
      transform: `translate(${sx * 32}px, ${sy * 32}px)` }} />
  );
  return (
    <Field c0={SEA_HI} c1={SEA} c2="#003f68">
      <div style={{ position: "absolute", left: cx - bw / 2, top: cy - bh / 2 - 60, width: bw, fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: INK_FG, opacity: 0.85 }}>OU À</div>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: size, letterSpacing: "-0.045em", color: INK_FG, transform: `scale(${pulse})` }}>UN CLIC.</div>
      </AbsoluteFill>
      {corner(-1, -1)}{corner(1, -1)}{corner(-1, 1)}{corner(1, 1)}
      <div style={{ position: "absolute", left: cx + bw / 2 - 360, top: cy + bh / 2 + 34, width: 360, textAlign: "right", fontFamily: MONO, fontSize: 24, letterSpacing: 5, color: LIME }}>→ À DISTANCE</div>
      <Pointer path={[{ f: 0, x: cx + bw * 0.42, y: cy + bh * 0.7 }, { f: 7, x: cx + bw * 0.2, y: cy + 30 }]} taps={[8]} />
    </Field>
  );
}

export function WordDerja() {
  const f = useCurrentFrame();
  const { V } = useDims();
  const rev = interpolate(f, [2, 14], [100, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Field c0="#f08a52" c1={CLAY} c2="#b8552a">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", direction: "rtl", fontFamily: AR, color: INK }}>
        <div style={{ fontWeight: 800, fontSize: V ? 92 : 96, lineHeight: 1.3, opacity: interpolate(f, [0, 5], [0, 1], clamp) }}>الصنعة قريبة منك،</div>
        <div style={{ fontWeight: 800, fontSize: V ? 150 : 170, lineHeight: 1.3, color: PAPER, clipPath: `inset(0 0 0 ${rev}%)` }}>ولا بكليك برك</div>
      </AbsoluteFill>
    </Field>
  );
}

// ---------- 05 · The pros: one per two beats, laid out like the source's data board (big counter, ring, chart → cover).

const PER = 25;

export function Pros() {
  const f = useCurrentFrame();
  const { W, H, V } = useDims();
  const k = Math.min(PROS.length - 1, Math.floor(f / PER));
  const lf = f - k * PER;
  const pro = PROS[k]!;
  const prev = k > 0 ? PROS[k - 1]!.price ?? 0 : 0;
  const count = Math.round(interpolate(lf, [0, 12], [prev, pro.price ?? 0], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const nameP = interpolate(lf, [0, 9], [0, 1], ease);
  const ringP = interpolate(f, [0, PER * PROS.length - 6], [0, 1], clamp);
  const enter = useSpring(0, 16, 160);

  // Cover deck: the current card flies in from the side, the earlier ones stay stacked behind.
  const cardW = V ? 900 : 860, cardH = cardW * 0.75;
  const deckX = V ? (W - cardW) / 2 : W - cardW - 130, deckY = V ? 690 : (H - cardH) / 2 + 30;
  const cards = PROS.slice(0, k + 1).map((p, i) => {
    const age = k - i;
    const sp = i === k ? interpolate(lf, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) }) : 1;
    const rot = i === k ? (1 - sp) * 10 : -3 * age * (i % 2 ? -1 : 1);
    return (
      <div key={p.id} style={{ position: "absolute", left: deckX + (1 - sp) * (V ? 700 : 900) - age * 18, top: deckY + age * 14, width: cardW, height: cardH,
        transform: `rotate(${rot}deg) scale(${1 - age * 0.04})`, borderRadius: 36, overflow: "hidden", opacity: age > 2 ? 0 : 1,
        boxShadow: "0 40px 90px rgba(19,24,50,0.28), 0 8px 24px rgba(19,24,50,0.14)", zIndex: 10 + i, filter: age ? `brightness(${1 - age * 0.12})` : undefined }}>
        <Cover pro={p} w={cardW} h={cardH} />
      </div>
    );
  });

  const left = V ? 70 : 130;
  const bars = (
    <div style={{ position: "absolute", left: deckX, top: deckY - 34, width: cardW, display: "flex", gap: 8, zIndex: 30 }}>
      {PROS.map((p, i) => (
        <div key={p.id} style={{ flex: 1, height: 7, borderRadius: 9, background: "rgba(19,24,50,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(i < k ? 1 : i > k ? 0 : interpolate(lf, [0, PER], [0, 1], clamp)) * 100}%`, background: i === k ? CLAY : INK }} />
        </div>
      ))}
    </div>
  );

  const R = V ? 70 : 74;
  const ring = (
    <div style={{ position: "relative", width: R * 2 + 24, height: R * 2 + 24, flexShrink: 0 }}>
      <svg width={R * 2 + 24} height={R * 2 + 24} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke="rgba(19,24,50,0.1)" strokeWidth={7} />
        <circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke={CLAY} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (R + 6)} strokeDashoffset={2 * Math.PI * (R + 6) * (1 - ringP)} />
      </svg>
      <div style={{ position: "absolute", left: 12, top: 12, transform: `scale(${0.85 + 0.15 * nameP})` }}><Avatar pro={pro} size={R * 2} /></div>
    </div>
  );

  const counter = (
    <div style={{ fontFamily: LAT, color: INK }}>
      <div style={{ fontWeight: 600, fontSize: V ? 30 : 28, color: LIGHT.mutedFg }}>{priceHead(pro)}</div>
      {pro.kind === "quote" ? (
        <div style={{ fontWeight: 800, fontSize: V ? 150 : 132, lineHeight: 1.05, letterSpacing: "-0.045em", opacity: nameP,
          transform: `translateY(${(1 - nameP) * 30}px)` }}>Sur <span style={{ color: CLAY }}>devis</span></div>
      ) : (
        <div style={{ fontWeight: 800, fontSize: V ? 190 : 170, lineHeight: 0.95, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>
          {count}<span style={{ color: CLAY, fontSize: "0.6em", marginLeft: 14, letterSpacing: "-0.02em" }}>DT{pro.kind === "hourly" ? " / h" : ""}</span>
        </div>
      )}
    </div>
  );

  const name = (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: (V ? 84 : 92) * (pro.name.length > 12 ? (V ? 0.92 : 0.8) : 1), lineHeight: 1, letterSpacing: "-0.035em", color: INK, opacity: nameP,
        filter: `blur(${(1 - nameP) * 12}px)`, transform: `translateY(${(1 - nameP) * 24}px)`, whiteSpace: "nowrap" }}>{pro.name}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, opacity: nameP }}>
        <span style={chip(LIGHT.claySoft, CLAY)}>{pro.city} · À distance</span>
      </div>
    </div>
  );

  const title = (
    <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: V ? 44 : 44, lineHeight: 1.2, color: LIGHT.fg, maxWidth: V ? 940 : 640,
      opacity: interpolate(lf, [3, 11], [0, 1], clamp), transform: `translateX(${interpolate(lf, [3, 11], [-20, 0], ease)}px)` }}>{pro.title}</div>
  );

  return (
    <Field c0="#ffffff" c1={PAPER} c2="#e2e4da">
      <div style={{ position: "absolute", left, top: V ? 190 : 120, opacity: enter }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 34, height: 4, borderRadius: 4, background: CLAY }} />
          <Scramble key={k} text={`LA VITRINE — PRO ${String(k + 1).padStart(2, "0")} / ${String(PROS.length).padStart(2, "0")}`} at={k * PER} cps={2.4} style={{ fontWeight: 700, fontSize: 24, letterSpacing: 6, color: CLAY }} />
        </div>
      </div>
      {V ? (
        <>
          <div style={{ position: "absolute", left, right: 70, top: 262, display: "flex", alignItems: "center", gap: 30 }}>{ring}{name}</div>
          <div style={{ position: "absolute", left, top: 470 }}>{title}</div>
          {bars}{cards}
          <div style={{ position: "absolute", left, top: deckY + cardH + 90 }}>{counter}</div>
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left, top: 200, display: "flex", alignItems: "center", gap: 30 }}>{ring}{name}</div>
          <div style={{ position: "absolute", left, top: 420 }}>{title}</div>
          <div style={{ position: "absolute", left, top: 640 }}>{counter}</div>
          {bars}{cards}
        </>
      )}
      <div style={{ position: "absolute", right: V ? 70 : 130, top: V ? 190 : 120, fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: LIGHT.mutedFg }}>
        {String(k + 1).padStart(2, "0")} / {String(PROS.length).padStart(2, "0")}
      </div>
    </Field>
  );
}

const chip = (bg: string, fg: string) => ({ display: "inline-flex", alignItems: "center", padding: "8px 18px", borderRadius: 999, background: bg, color: fg,
  fontFamily: LAT, fontWeight: 700, fontSize: 24, whiteSpace: "nowrap" as const });
