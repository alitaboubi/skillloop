import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { ArWords, Callout, Flash, Icon, LOOP_D, LoopMark, Rise, Sfx, Shake, Slam, Spark, Sparks, Stage, TypeLine, clamp, usePop } from "./kit";
import { AR, C, LAT, MONO, SERIF } from "./theme";

// French UI copy on screen is the app's own text (src/lib/i18n.tsx): categories, « Proposer un service »,
// « Votre service est publié ! », « Rechercher sur SkillLoop », hh_find_ph, « Proche / En ligne »,
// « Nouvelles demandes », « Accepter », tg_accepted, stat_accepted, hero_title_2/hl, hh_title.

const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
const mono = (size: number, color = `${C.white}99`): CSSProperties => ({ fontFamily: MONO, fontSize: size, color, letterSpacing: 1 });

/** 1 · A spark draws a line in the dark. « عندك صنعة؟ » */
export function IntroScene() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [2, 40], [120, 960], ease);
  return (
    <Stage grid={0.6}>
      <Sfx at={2} name="sparkle" volume={0.5} />
      {Array.from({ length: 10 }, (_, i) => <Sfx key={i} at={36 + i * 2} name={`key${i % 3}`} volume={0.35} />)}
      <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
        <line x1={120} y1={1060} x2={x} y2={1060} stroke={C.lime} strokeWidth={4} style={{ filter: `drop-shadow(0 0 10px ${C.lime})` }} />
        <line x1={120} y1={1000} x2={interpolate(frame, [10, 50], [120, 700], ease)} y2={1000} stroke={`${C.white}44`} strokeWidth={2} />
      </svg>
      <Spark x={x} y={1060} />
      <ArWords text="عندك صنعة؟" at={12} size={140} y={800} step={7} />
      <TypeLine text="un savoir-faire ?" prompt="> " at={36} cps={0.8} y={1110} size={46} />
    </Stage>
  );
}

const CATS = ["Tech & IT", "Design & Média", "Cours particuliers", "Services à domicile", "Beauté & Soins"];
const CODE = ["skill.owner   = 'toi'", "skill.ville   = 'Sfax'", "skill.mode    = 'En ligne'", "skill.vu_par  = 0", "skill.level   = ++"];

/** 2 · « SKILL » slams in with sparks; the categories flicker under it. */
export function SkillScene() {
  const frame = useCurrentFrame();
  const cat = CATS[Math.min(CATS.length - 1, Math.max(0, Math.floor((frame - 40) / 7)))];
  return (
    <Stage grid={0.8} glow={C.clay}>
      <Shake hits={[0]}>
        <div style={{ position: "absolute", left: 100, top: 300 }}>
          {CODE.map((l, i) => frame >= 4 + i * 5 && <div key={l} style={{ ...mono(28, `${C.white}66`), lineHeight: 1.6 }}>{l}<span style={{ color: C.clay }}>{"  // " + String(i + 1).padStart(2, "0")}</span></div>)}
        </div>
        <Slam text="SKILL" at={0} size={290} y={760} />
        <Sparks at={0} x={900} y={800} dir={-Math.PI / 3} n={46} />
        <Sparks at={2} x={180} y={1010} dir={-Math.PI * 0.8} n={24} color={C.clay} />
        <Callout x={110} y={1100} text="001 / savoir-faire" at={10} />
        <ArWords text="في يديك وفي راسك" at={20} size={96} y={1180} />
        {frame >= 40 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1420, textAlign: "center", ...mono(44, C.lime), fontWeight: 700 }}>
            <span style={{ color: `${C.white}55` }}>[ </span>{cat}<span style={{ color: `${C.white}55` }}> ]</span>
          </div>
        )}
      </Shake>
      {CATS.map((_, i) => <Sfx key={i} at={40 + i * 7} name={`key${i % 3}`} volume={0.45} />)}
    </Stage>
  );
}

/** 3 · A flat "views" signal crawls along… then shoots straight up. « أما شكون يعرف بيك؟ » */
export function SignalScene() {
  const frame = useCurrentFrame();
  const X0 = 110, X1 = 970, BASE = 1330;
  const pts = Array.from({ length: 58 }, (_, i) => [X0 + (i * (X1 - X0)) / 57, BASE + (random(`n${i}`) - 0.5) * 16] as const);
  const prog = interpolate(frame, [8, 58], [0, 1], clamp);
  const k = Math.max(1, Math.floor(prog * (pts.length - 1)) + 1);
  const shown = pts.slice(0, k).map(([x, y]) => [x, y]);
  const head = shown[shown.length - 1];
  const up = interpolate(frame, [60, 72], [head[1], -200], { ...clamp, easing: Easing.in(Easing.quad) });
  if (frame >= 60) shown.push([head[0] + 6, up]);
  const hx = shown[shown.length - 1][0], hy = shown[shown.length - 1][1];
  return (
    <Stage grid={0.5}>
      <Sfx at={60} name="riser" volume={0.4} />
      <Shake hits={[62]} amp={30}>
        <ArWords text="أما شكون يعرف بيك؟" at={2} size={86} y={330} />
        <TypeLine text="Mais qui vous connaît ?" at={20} cps={1.4} y={490} size={40} color={`${C.white}bb`} />
        <div style={{ position: "absolute", left: X0, top: 760, ...mono(26, C.lime) }}>visibilité · profil</div>
        <div style={{ position: "absolute", right: 110, top: 740, ...mono(70, C.white), fontWeight: 700 }}>
          {frame < 62 ? "0" : frame % 4 < 2 ? "?" : "↑"}<span style={{ fontSize: 28, color: `${C.white}77` }}> vue</span>
        </div>
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <line x1={X0} y1={860} x2={X0} y2={1450} stroke={`${C.white}44`} strokeWidth={2} />
          <line x1={X0} y1={1450} x2={X1} y2={1450} stroke={`${C.white}44`} strokeWidth={2} />
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={X0 + i * 107.5} y1={1450} x2={X0 + i * 107.5} y2={1462} stroke={`${C.white}66`} strokeWidth={2} />)}
          <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.lime} strokeWidth={4} strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 8px ${C.lime})` }} />
        </svg>
        <div style={{ position: "absolute", left: X0, top: 1480, ...mono(22) }}>J-30</div>
        <div style={{ position: "absolute", right: 110, top: 1480, ...mono(22) }}>aujourd'hui</div>
        <Spark x={hx} y={hy} size={frame >= 60 ? 1.4 : 1} />
      </Shake>
    </Stage>
  );
}

// Arc-length samples of the loop mark (34×18 units): left half-circle, S-curve, right half-circle, S-curve back.
function cubic(p: number[][], u: number) {
  const m = 1 - u;
  return [0, 1].map((d) => m * m * m * p[0][d] + 3 * m * m * u * p[1][d] + 3 * m * u * u * p[2][d] + u * u * u * p[3][d]);
}
const LOOP_PTS = (() => {
  const raw: number[][] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) { const th = (-90 - (180 * i) / N) * Math.PI / 180; raw.push([9 + 7 * Math.cos(th), 9 + 7 * Math.sin(th)]); }
  for (let i = 1; i <= N / 2; i++) raw.push(cubic([[9, 16], [13, 16], [15, 12.5], [17, 9]], i / (N / 2)));
  for (let i = 1; i <= N / 2; i++) raw.push(cubic([[17, 9], [19, 5.5], [21, 2], [25, 2]], i / (N / 2)));
  for (let i = 1; i <= N; i++) { const th = (-90 + (180 * i) / N) * Math.PI / 180; raw.push([25 + 7 * Math.cos(th), 9 + 7 * Math.sin(th)]); }
  for (let i = 1; i <= N / 2; i++) raw.push(cubic([[25, 16], [21, 16], [19, 12.5], [17, 9]], i / (N / 2)));
  for (let i = 1; i <= N / 2; i++) raw.push(cubic([[17, 9], [15, 5.5], [13, 2], [9, 2]], i / (N / 2)));
  const len = [0];
  for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  return { raw, len, total: len[len.length - 1] };
})();

/** 4 · DROP. The spark traces the SkillLoop loop, the name lands. */
export function LoopScene() {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 36], [0, 1], ease);
  const target = draw * LOOP_PTS.total;
  const k = Math.max(1, LOOP_PTS.len.findIndex((l) => l >= target));
  const pts = LOOP_PTS.raw.slice(0, k === -1 ? LOOP_PTS.raw.length : k + 1);
  const SCALE = 26, OX = 540 - 17 * SCALE;
  const lift = interpolate(frame, [46, 62], [0, 1], ease);
  const oy = 720 - 9 * SCALE - lift * 190;
  const sc = 1 - lift * 0.35;
  const head = pts[pts.length - 1];
  const lime = interpolate(frame, [36, 46], [1, 0], clamp);
  return (
    <Stage grid={1} glow={C.lime}>
      <Sfx at={0} name="whoosh" volume={0.6} /><Sfx at={36} name="sparkle" volume={0.6} /><Sfx at={52} name="thump" volume={0.8} />
      {Array.from({ length: 14 }, (_, i) => <Sfx key={i} at={76 + i * 2} name={`key${i % 3}`} volume={0.3} />)}
      <Shake hits={[0, 52]}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${sc})`, transformOrigin: `540px ${oy + 9 * SCALE}px` }}>
          <svg style={{ position: "absolute", left: OX, top: oy, overflow: "visible" }} width={34 * SCALE} height={18 * SCALE} viewBox="0 0 34 18">
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.clay} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 0.6px ${C.clay}) drop-shadow(0 0 1.4px ${C.clay})` }} />
            {frame >= 36 && <path d="M25 2c-4 0-6 3.5-8 7" fill="none" stroke={C.lime} strokeWidth={2.6} strokeLinecap="round" pathLength={1} strokeDasharray={1}
              strokeDashoffset={lime} style={{ filter: `drop-shadow(0 0 1px ${C.lime})` }} />}
            {frame >= 36 && <path d={LOOP_D} fill="none" stroke={C.white} strokeWidth={0.4} opacity={interpolate(frame, [36, 50], [0.9, 0], clamp)} />}
          </svg>
          {frame < 40 && <Spark x={OX + head[0] * SCALE} y={oy + head[1] * SCALE} size={1.3} />}
        </div>
        <Sparks at={36} x={540} y={720 - 9 * SCALE + 9 * SCALE} n={50} spread={Math.PI * 2} dir={0} />
        {frame >= 52 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: LAT, fontWeight: 800, fontSize: 170, letterSpacing: -5, zIndex: 20 }}>
            {"SkillLoop".split("").map((ch, i) => {
              const t = frame - 52 - i * 1.5;
              const p = interpolate(t, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
              return <span key={i} style={{ display: "inline-block", color: i < 5 ? C.white : C.lime, opacity: p, transform: `translateY(${(1 - p) * -80}px) scale(${0.5 + p * 0.5})`,
                textShadow: i < 5 ? undefined : `0 0 40px ${C.lime}88` }}>{ch}</span>;
            })}
          </div>
        )}
        <ArWords text="صنعتك توصل للي يلوّج عليها" at={64} size={66} y={1110} step={4} />
        <TypeLine text="Le savoir-faire près de chez vous, ou à un clic." at={76} cps={2.4} y={1290} size={32} color={`${C.white}cc`} />
      </Shake>
      <Flash strength={0.9} />
    </Stage>
  );
}

function Box({ on, x = false }: { on: number; x?: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 38, height: 38, border: `3px solid ${C.ink}`, marginRight: 14, verticalAlign: "-0.2em", flexShrink: 0 }}>
      {x && (
        <svg width={38} height={38} viewBox="0 0 24 24" style={{ position: "absolute", left: -3, top: -3 }}>
          <path d="M4 4L20 20M20 4L4 20" stroke={C.clay} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - on} fill="none" />
        </svg>
      )}
    </span>
  );
}

/** 5 · A printed form gets filled in and stamped « PUBLIÉ ». « حطّها في الفيترينة » */
export function FormScene() {
  const frame = useCurrentFrame();
  const enter = usePop(0, { damping: 16, stiffness: 120 });
  const pick = interpolate(frame, [16, 22], [0, 1], clamp);
  const online = interpolate(frame, [60, 66], [0, 1], clamp);
  const TITLE = "Cours de maths · lycée";
  const typed = TITLE.slice(0, Math.round(interpolate(frame, [28, 54], [0, TITLE.length], clamp)));
  const city = "Sfax".slice(0, Math.round(interpolate(frame, [68, 76], [0, 4], clamp)));
  const st = interpolate(frame - 84, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const label: CSSProperties = { ...mono(24, C.ink), fontWeight: 700, letterSpacing: 3, marginTop: 44 };
  const field: CSSProperties = { borderBottom: `3px solid ${C.ink}`, minHeight: 60, ...mono(40, C.sea), fontWeight: 700, display: "flex", alignItems: "flex-end", paddingBottom: 6 };
  const opt: CSSProperties = { display: "flex", alignItems: "center", fontFamily: LAT, fontWeight: 700, fontSize: 30, color: C.ink };
  return (
    <Stage grid={0.5} glow={C.clay}>
      <Sfx at={0} name="whoosh" volume={0.5} /><Sfx at={16} name="pop" /><Sfx at={60} name="pop" /><Sfx at={84} name="thump" volume={0.9} /><Sfx at={86} name="success" volume={0.6} />
      {Array.from({ length: 12 }, (_, i) => <Sfx key={i} at={28 + i * 2} name={`key${i % 3}`} volume={0.4} />)}
      {Array.from({ length: 4 }, (_, i) => <Sfx key={`c${i}`} at={68 + i * 2} name={`key${i % 3}`} volume={0.4} />)}
      <ArWords text="حطّها في الفيترينة" at={2} size={100} y={210} />
      <Shake hits={[84]} amp={26}>
        <AbsoluteFill style={{ perspective: 1600 }}>
          <div style={{ position: "absolute", left: 90, top: 440, width: 900, height: 1180, background: C.paper, boxShadow: `0 60px 140px rgba(0,0,0,0.6), 0 0 80px ${C.lime}22`,
            transform: `translateY(${(1 - enter) * 1100}px) rotateX(${(1 - enter) * 30}deg) rotate(${-1.5 + Math.sin(frame / 30) * 0.4}deg)`, padding: "0 56px", boxSizing: "border-box" }}>
            <div style={{ margin: "0 -56px", background: C.ink, padding: "30px 56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: LAT, fontWeight: 800, fontSize: 48, color: C.white }}>Proposer un service</span>
              <span style={{ ...mono(20, C.lime), textAlign: "right", lineHeight: 1.4 }}>SKILLLOOP<br />FORM · 01</span>
            </div>
            <div style={{ ...mono(22, "#5b6477"), marginTop: 24, lineHeight: 1.5 }}>Présentez votre savoir-faire et touchez des clients dans votre région.</div>
            <div style={label}>1. CATÉGORIE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 22, marginTop: 20 }}>
              {["Tech & IT", "Design & Média", "Cours particuliers", "Services à domicile"].map((c) => (
                <div key={c} style={opt}><Box on={pick} x={c === "Cours particuliers"} />{c}</div>
              ))}
            </div>
            <div style={label}>2. TITRE DU SERVICE</div>
            <div style={field}>{typed}{frame >= 26 && frame < 58 && <span style={{ width: 3, height: 40, background: C.sea, marginLeft: 3 }} />}</div>
            <div style={label}>3. MODE</div>
            <div style={{ display: "flex", gap: 60, marginTop: 20 }}>
              <div style={opt}><Box on={0} />En personne</div>
              <div style={opt}><Box on={online} x />En ligne</div>
            </div>
            <div style={label}>4. VILLE</div>
            <div style={field}>{city}</div>
            {frame >= 84 && (
              <div style={{ position: "absolute", right: 50, bottom: 70, transform: `rotate(-9deg) scale(${2.6 - 1.6 * st})`, opacity: st, border: `7px solid ${C.clay}`, borderRadius: 14,
                padding: "16px 34px", color: C.clay, textAlign: "center", mixBlendMode: "multiply" }}>
                <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: 96, letterSpacing: 4, lineHeight: 1 }}>PUBLIÉ</div>
                <div style={{ ...mono(20, C.clay), marginTop: 8, fontWeight: 700 }}>Votre service est publié !</div>
              </div>
            )}
          </div>
        </AbsoluteFill>
      </Shake>
    </Stage>
  );
}

/** 6 · Somewhere else, someone types the search. « وفي بلاصة أخرى… واحد يلوّج عليك » */
export function SearchScene() {
  const frame = useCurrentFrame();
  const Q = "cours de maths pour un lycéen à Sfax";
  const drop = usePop(54, { damping: 18, stiffness: 200 });
  const hi = frame >= 64 ? 2 : 0;
  const found = usePop(76, { damping: 15, stiffness: 170 });
  const press = frame >= 92 && frame < 97 ? 0.94 : 1;
  const sent = frame >= 97;
  const rows = [
    { icon: "book", t: "Cours particuliers", k: "catégorie" },
    { icon: "pin", t: "Sfax", k: "ville" },
    { icon: "search", t: "Rechercher « cours de maths… »", k: "↵" },
  ];
  return (
    <Stage grid={0.3}>
      <Sfx at={0} name="whoosh" volume={0.5} /><Sfx at={54} name="pop" volume={0.5} /><Sfx at={64} name="pop" volume={0.4} /><Sfx at={74} name="thump" volume={0.6} />
      <Sfx at={92} name="pop" /><Sfx at={97} name="success" volume={0.6} />
      {Array.from({ length: 18 }, (_, i) => <Sfx key={i} at={24 + i * 1.5 | 0} name={`key${i % 3}`} volume={0.35} />)}
      <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
        {Array.from({ length: 14 }, (_, i) => {
          const r = (i * 70 + frame * 5) % 980;
          return <ellipse key={i} cx={540} cy={1000} rx={r} ry={r * (0.92 + 0.05 * Math.sin(frame / 10 + i))} fill="none" stroke={C.white} strokeWidth={2}
            opacity={0.22 * (1 - r / 980)} />;
        })}
      </svg>
      <ArWords text="وفي بلاصة أخرى…" at={2} size={80} y={250} color={`${C.white}cc`} />
      <ArWords text="واحد يلوّج عليك" at={14} size={112} y={360} />
      <div style={{ position: "absolute", left: 70, top: 890, ...mono(24, C.lime), fontWeight: 700, letterSpacing: 3 }}>RECHERCHER SUR SKILLLOOP</div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 940, height: 124, background: "rgba(29,44,77,0.9)", border: `2px solid ${C.lime}88`,
        display: "flex", alignItems: "center", padding: "0 30px", gap: 20, boxShadow: `0 0 60px ${C.lime}22`, zIndex: 20 }}>
        <span style={{ color: C.lime, fontFamily: MONO, fontSize: 40, fontWeight: 700 }}>›</span>
        <TypeLine text={Q} at={22} cps={1.4} size={33} color={C.white} center={false} style={{ left: 0, right: 0 }} />
      </div>
      {frame >= 54 && frame < 76 && (
        <div style={{ position: "absolute", left: 70, right: 70, top: 1080, background: "rgba(17,27,49,0.95)", border: `1px solid ${C.white}33`, opacity: drop,
          transform: `translateY(${(1 - drop) * -30}px)`, zIndex: 19 }}>
          {rows.map((r, i) => (
            <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 30px", background: hi === i ? `${C.lime}` : "transparent",
              color: hi === i ? C.ink : C.white, fontFamily: LAT, fontWeight: 700, fontSize: 32 }}>
              <Icon name={r.icon} size={36} color={hi === i ? C.ink : C.lime} />
              <span style={{ flex: 1 }}>{r.t}</span>
              <span style={mono(22, hi === i ? C.ink : `${C.white}77`)}>{r.k}</span>
            </div>
          ))}
        </div>
      )}
      {frame >= 76 && (
        <div style={{ position: "absolute", left: 70, right: 70, top: 1100, background: C.paper, padding: "34px 36px", opacity: found, zIndex: 19,
          transform: `translateY(${(1 - found) * 80}px)`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)` }}>
          <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: 46, color: C.ink }}>Cours de maths · lycée</div>
          <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
            {[["book", "Cours particuliers"], ["globe", "En ligne"], ["pin", "Sfax"]].map(([ic, t]) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#e3eef9", color: C.sea, borderRadius: 999, padding: "8px 18px",
                fontFamily: LAT, fontWeight: 700, fontSize: 24 }}><Icon name={ic} size={24} color={C.sea} />{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 30, height: 96, borderRadius: 999, background: sent ? C.lime : C.ink, color: sent ? C.ink : C.white, display: "grid", placeItems: "center",
            fontFamily: LAT, fontWeight: 800, fontSize: 36, transform: `scale(${press})` }}>{sent ? "Demande envoyée ✓" : "Envoyer la demande"}</div>
        </div>
      )}
      <Sparks at={97} x={540} y={1380} n={30} spread={Math.PI * 2} dir={0} />
      <Flash at={74} strength={0.25} />
    </Stage>
  );
}

const CITIES = "SFAX · TUNIS · SOUSSE · BIZERTE · GABÈS · NABEUL · KAIROUAN · ";

/** 7 · A glowing ring, Tunisian cities orbiting it. « قريب ولا أونلاين » */
export function RingScene() {
  const frame = useCurrentFrame();
  const enter = usePop(0, { damping: 14, stiffness: 110 });
  const pin = usePop(12, { damping: 9, stiffness: 200 });
  const CY = 880;
  return (
    <Stage grid={0.9} warp={62}>
      <Sfx at={0} name="whoosh" volume={0.5} /><Sfx at={12} name="pop" /><Sfx at={30} name="sparkle" volume={0.5} />
      <div style={{ position: "absolute", left: 540 - 420, top: CY - 420, width: 840, height: 840, transform: `scale(${0.4 + enter * 0.6})`, opacity: enter }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: `radial-gradient(circle, transparent 30%, ${C.lime}33 38%, ${C.clay}22 50%, transparent 68%)` }} />
        <div style={{ position: "absolute", inset: 160, borderRadius: 999, transform: `rotate(${frame * 4}deg)`,
          background: `conic-gradient(from 0deg, ${C.lime}, transparent 25%, ${C.clay} 50%, transparent 75%, ${C.lime})`,
          WebkitMaskImage: "radial-gradient(circle, transparent 54%, black 56%, black 66%, transparent 70%)", filter: "blur(3px)" }} />
        <div style={{ position: "absolute", inset: 218, borderRadius: 999, background: "#000", boxShadow: `0 0 0 5px ${C.white}, 0 0 50px 12px ${C.lime}aa, inset 0 0 60px ${C.lime}33` }} />
        <div style={{ position: "absolute", left: 420 - 60, top: 420 - 75, transform: `scale(${pin})` }}><Icon name="pin" size={120} color={C.lime} width={2} /></div>
        <svg style={{ position: "absolute", inset: 0, transform: `rotate(${frame * 1.4}deg)` }} width={840} height={840} viewBox="0 0 840 840">
          <defs><path id="orbit" d="M420,420 m-330,0 a330,330 0 1,1 660,0 a330,330 0 1,1 -660,0" /></defs>
          <text fill={C.white} style={{ fontFamily: LAT, fontWeight: 800, fontSize: 42 }}>
            <textPath href="#orbit" textLength={2060} lengthAdjust="spacing">{CITIES}</textPath>
          </text>
        </svg>
      </div>
      <ArWords text="قريب ولا أونلاين" at={28} size={120} y={1360} />
      <TypeLine text="Proche / En ligne" at={44} cps={1} y={1540} size={46} />
    </Stage>
  );
}

const STEPS = ["PROFIL", "SERVICE", "DEMANDE", "ACCEPTER"];

/** 8 · Milestones light up one by one, then the first request lands and gets accepted. « وجات أوّل دمندة » */
export function TimelineScene() {
  const frame = useCurrentFrame();
  const X = [160, 387, 613, 840], Y = 860;
  const sx = interpolate(frame, [6, 54], [100, 840], ease);
  const card = usePop(56, { damping: 15, stiffness: 160 });
  const press = frame >= 88 && frame < 93 ? 0.93 : 1;
  const ok = usePop(93, { damping: 12, stiffness: 180 });
  const cur = interpolate(frame, [70, 86], [0, 1], ease);
  return (
    <Stage grid={0.7}>
      {X.map((x, i) => <Sfx key={i} at={Math.round(interpolate(x, [100, 840], [6, 54]))} name={i === 2 ? "notif" : "pop"} volume={0.6} />)}
      <Sfx at={88} name="pop" /><Sfx at={93} name="success" volume={0.7} />
      <Shake hits={[93]} amp={14}>
        <div style={{ position: "absolute", left: 100, top: 250, ...mono(24, `${C.white}88`), letterSpacing: 3 }}>PARCOURS PRO · v1.0 <span style={{ color: C.lime }}>— EN COURS</span></div>
        <ArWords text="وجات أوّل دمندة" at={4} size={116} y={420} />
        <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
          <line x1={100} y1={Y} x2={980} y2={Y} stroke={`${C.white}33`} strokeWidth={3} strokeDasharray="10 10" />
          <line x1={100} y1={Y} x2={sx} y2={Y} stroke={C.lime} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${C.lime})` }} />
        </svg>
        {X.map((x, i) => {
          const done = sx >= x - 2;
          const last = i === 3;
          return (
            <div key={i} style={{ position: "absolute", left: x - 40, top: Y - 40, width: 80, height: 80 }}>
              <div style={{ width: 56, height: 56, margin: 12, transform: `rotate(45deg) scale(${done ? 1.12 : 1})`, border: `3px solid ${done ? (last ? C.clay : C.lime) : `${C.white}66`}`,
                background: done ? (last ? C.clay : C.lime) : C.night, boxShadow: done ? `0 0 30px ${last ? C.clay : C.lime}` : undefined }} />
              {done && !last && <Icon name="check" size={40} color={C.ink} width={3.4} style={{ position: "absolute", left: 20, top: 20 }} />}
              <div style={{ position: "absolute", top: 96, left: -60, right: -60, textAlign: "center", ...mono(22, done ? C.white : `${C.white}66`), fontWeight: 700 }}>{STEPS[i]}</div>
            </div>
          );
        })}
        {frame < 56 && <Spark x={sx} y={Y} />}
        {frame >= 56 && (
          <div style={{ position: "absolute", left: 80, right: 80, top: 1080, background: C.paper, padding: "34px 36px", opacity: card,
            transform: `translateY(${(1 - card) * 120}px) scale(${0.9 + card * 0.1})`, boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 80px ${(ok > 0.5 ? C.lime : C.clay)}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ background: ok > 0.5 ? C.lime : C.clay, color: ok > 0.5 ? C.ink : C.white, padding: "6px 16px", borderRadius: 999, fontFamily: LAT, fontWeight: 800, fontSize: 24 }}>
                {ok > 0.5 ? "Demande acceptée" : "Nouvelle demande"}</span>
              <span style={mono(22, "#5b6477")}>il y a 1 min</span>
            </div>
            <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: 44, color: C.ink, marginTop: 20 }}>Cours de maths · lycée</div>
            <div style={{ fontFamily: LAT, fontWeight: 600, fontSize: 28, color: "#5b6477", marginTop: 8 }}>Client · Sfax · En ligne le soir</div>
            {ok < 0.5 ? (
              <div style={{ marginTop: 30, height: 96, borderRadius: 999, background: C.ink, color: C.white, display: "grid", placeItems: "center",
                fontFamily: LAT, fontWeight: 800, fontSize: 36, transform: `scale(${press})` }}>Accepter</div>
            ) : (
              <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 18, opacity: ok }}>
                <div style={{ width: 80, height: 80, borderRadius: 999, background: C.lime, display: "grid", placeItems: "center", transform: `scale(${ok})`, flexShrink: 0 }}>
                  <Icon name="check" size={48} color={C.ink} width={3.4} /></div>
                <div style={{ fontFamily: LAT, fontWeight: 600, fontSize: 26, color: C.ink, lineHeight: 1.35 }}>Convenez ici de la date, du lieu et du prix final.</div>
              </div>
            )}
          </div>
        )}
        {frame >= 66 && frame < 100 && (
          <svg style={{ position: "absolute", left: interpolate(cur, [0, 1], [880, 560]), top: interpolate(cur, [0, 1], [1700, 1400]), zIndex: 40,
            transform: `scale(${press})` }} width={64} height={80} viewBox="0 0 16 20">
            <path d="M1 1v15l4-4 3 7 3-1.5-3-6.5h6z" fill={C.white} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
          </svg>
        )}
        <Sparks at={93} x={540} y={1400} n={36} spread={Math.PI * 2} dir={0} />
      </Shake>
    </Stage>
  );
}

/** 9 · « Demandes acceptées » races up, then turns into the loop: la boucle = ∞. « وحدة، زوز، عشرة… » */
export function CounterScene() {
  const frame = useCurrentFrame();
  const v = Math.max(1, Math.round(interpolate(frame, [4, 52], [1, 12], { ...clamp, easing: Easing.in(Easing.quad) })));
  const out = interpolate(frame, [54, 60], [1, 0], clamp);
  const inf = usePop(58, { damping: 11, stiffness: 160 });
  const ticks = Array.from({ length: 12 }, (_, i) => Math.round(4 + 48 * Math.sqrt(i / 11)));
  return (
    <Stage grid={0.4} glow={C.clay}>
      {ticks.map((t, i) => <Sfx key={i} at={t} name={`key${i % 3}`} volume={0.55} />)}
      <Sfx at={58} name="thump" volume={0.9} /><Sfx at={60} name="sparkle" volume={0.6} />
      <Shake hits={[58]} amp={28}>
        <ArWords text="وحدة، زوز، عشرة…" at={2} size={100} y={320} />
        <div style={{ position: "absolute", left: 100, top: 640, opacity: out }}>
          <div style={{ ...mono(30, C.lime), fontWeight: 700, letterSpacing: 6 }}>DEMANDES ACCEPTÉES</div>
          <div style={{ fontFamily: MONO, fontWeight: 400, fontSize: 340, color: C.white, lineHeight: 1.1, textShadow: `0 0 50px ${C.white}55` }}>{String(v).padStart(2, "0")}</div>
        </div>
        <svg style={{ position: "absolute", left: 0, top: 1150, opacity: out }} width={1080} height={80}>
          <line x1={0} y1={30} x2={1080} y2={30} stroke={`${C.white}33`} strokeWidth={2} />
          <line x1={0} y1={30} x2={(v / 12) * 900} y2={30} stroke={C.clay} strokeWidth={5} style={{ filter: `drop-shadow(0 0 8px ${C.clay})` }} />
          {[1, 5, 10].map((n) => <g key={n}><line x1={(n / 12) * 900} y1={22} x2={(n / 12) * 900} y2={38} stroke={C.white} strokeWidth={2} />
            <text x={(n / 12) * 900} y={70} fill={`${C.white}aa`} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 22 }}>{n}</text></g>)}
        </svg>
        {frame >= 56 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", alignItems: "center", justifyContent: "center", gap: 30, opacity: inf,
            transform: `scale(${0.6 + inf * 0.4})` }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 150, color: C.lime }}>la boucle</span>
            <span style={{ fontFamily: LAT, fontWeight: 500, fontSize: 120, color: C.white }}>=</span>
          </div>
        )}
        {frame >= 56 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1000, display: "flex", justifyContent: "center", opacity: inf, transform: `scale(${0.6 + inf * 0.4}) rotate(${(1 - inf) * -30}deg)`,
            filter: `drop-shadow(0 0 30px ${C.clay}88)` }}>
            <LoopMark size={560} />
          </div>
        )}
        <Sparks at={58} x={540} y={1150} n={50} spread={Math.PI * 2} dir={0} color={C.clay} />
      </Shake>
      <Flash at={58} strength={0.5} />
    </Stage>
  );
}

/** 10 · Dark again. One button, one click, the brand and the ask. */
export function EndScene() {
  const frame = useCurrentFrame();
  const btn = usePop(12, { damping: 14, stiffness: 160 });
  const CLICK = 48;
  const cur = interpolate(frame, [20, 44], [0, 1], ease);
  const clicked = frame >= CLICK;
  const press = frame >= CLICK - 2 && frame < CLICK + 3 ? 0.92 : 1;
  const away = interpolate(frame, [60, 74], [0, 1], ease);
  return (
    <Stage grid={0.3}>
      <Sfx at={12} name="pop" volume={0.5} /><Sfx at={CLICK} name="pop" /><Sfx at={CLICK} name="success" volume={0.6} /><Sfx at={74} name="whoosh" volume={0.4} />
      {Array.from({ length: 16 }, (_, i) => <Sfx key={i} at={96 + i * 2} name={`key${i % 3}`} volume={0.3} />)}
      {frame < 16 && <Spark x={540} y={900} size={0.8 + 0.2 * Math.sin(frame / 2)} />}
      <div style={{ position: "absolute", left: 0, right: 0, top: 840, display: "flex", justifyContent: "center", opacity: btn * (1 - away),
        transform: `translateY(${away * -200}px) scale(${(0.7 + btn * 0.3) * press})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "30px 54px", borderRadius: 18, border: `3px solid ${clicked ? C.lime : `${C.white}cc`}`,
          background: clicked ? C.lime : C.ink2, color: clicked ? C.ink : C.white, fontFamily: LAT, fontWeight: 800, fontSize: 52,
          boxShadow: clicked ? `0 0 90px ${C.lime}aa` : `0 0 40px ${C.white}11` }}>
          <Icon name="plus" size={52} color={clicked ? C.ink : C.white} width={3} />Proposer un service
        </div>
      </div>
      {frame >= CLICK && frame < CLICK + 20 && (
        <div style={{ position: "absolute", left: 540 - 200, top: 900 - 200, width: 400, height: 400, borderRadius: 999, border: `6px solid ${C.lime}`,
          transform: `scale(${interpolate(frame - CLICK, [0, 20], [0.3, 2.6])})`, opacity: interpolate(frame - CLICK, [0, 20], [1, 0]) }} />
      )}
      {frame >= 18 && frame < 62 && (
        <svg style={{ position: "absolute", left: interpolate(cur, [0, 1], [900, 600]), top: interpolate(cur, [0, 1], [1500, 915]), zIndex: 40, transform: `scale(${press})` }}
          width={64} height={80} viewBox="0 0 16 20">
          <path d="M1 1v15l4-4 3 7 3-1.5-3-6.5h6z" fill={C.white} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      )}
      <Sparks at={CLICK} x={540} y={900} n={60} spread={Math.PI * 2} dir={0} />
      {frame >= 62 && (
        <Rise delay={62} style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <LoopMark size={240} />
          <div style={{ fontFamily: LAT, fontWeight: 800, fontSize: 130, color: C.white, letterSpacing: -4 }}>Skill<span style={{ color: C.lime }}>Loop</span></div>
        </Rise>
      )}
      <ArWords text="صنعتك تستاهل تتشاف" at={78} size={84} y={990} />
      <TypeLine text="Partagez ce que vous savez faire." at={96} cps={1.6} y={1170} size={38} />
      {frame >= 124 && (
        <Rise delay={124} style={{ position: "absolute", left: 60, right: 60, top: 1340, display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
          border: `2px solid ${C.lime}66`, background: `${C.lime}14`, padding: "26px 20px" }}>
          <Icon name="message" size={54} color={C.lime} />
          <span dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 52, color: C.white }}>شنوّة صنعتك؟ قلّنا في الكومنتار</span>
        </Rise>
      )}
      <Flash at={CLICK} strength={0.5} />
    </Stage>
  );
}
