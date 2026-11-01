import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { DoneStamp, TrackingScene, VitrineScene } from "./scenes/phone";
import { EndCard } from "./scenes/end";
import { PaperSticker, ShopSticker } from "./scenes/sticker";
import { AR, C, LAT, s } from "./theme";
import { Clip, Finish, Flash, PunchTitle, Rise, SeasonBadge, Subtitle } from "./ui";

/**
 * Edit decision list. `src`/`from`/`len` are seconds in the source clip; each shot is placed back to back.
 * `subs` and `sfx` use seconds relative to the shot. Audio comes from the clip unless `mute` (then `audio` replaces it).
 * `tracked` overlays are drawn inside the clip so they follow its push-in.
 */
type Sub = { at: number; len: number; ar: string; fr?: string };
type Fx = { file: string; at: number; volume?: number; dir?: string };
type Shot = {
  id: string; len: number; src?: string; from?: number; zoom?: [number, number]; origin?: string; mute?: boolean;
  subs?: Sub[]; flash?: boolean; sfx?: Fx[]; overlay?: () => ReactNode; tracked?: () => ReactNode;
  scene?: () => ReactNode; audio?: { file: string; from: number };
};

export const SHOTS: Shot[] = [
  // ── Hook: the promise ──
  { id: "promise", src: "v01_phone", from: 1.6, len: 2.3, zoom: [1.08, 1.0], sfx: [{ file: "thump", at: 0.12 }],
    overlay: () => <Sequence from={4}><PunchTitle ar="غدوة إن شاء الله" fr="« Demain, inch’Allah »" /></Sequence>,
    subs: [{ at: 0, len: 2.3, ar: "غدوة الصباح نجيك إن شاء الله", fr: "Demain matin je viens, inch’Allah !" }] },
  { id: "kelma", src: "v01_phone", from: 6.1, len: 1.1, zoom: [1.18, 1.22],
    subs: [{ at: 0, len: 1.1, ar: "كلمة رجال!", fr: "Parole d’homme !" }] },

  // ── The wait: one season per cut, a clock ticking under it ──
  { id: "day3", src: "v02a_tea", from: 0.4, len: 0.9, flash: true,
    sfx: [{ file: "whoosh", at: 0 }, { file: "clock", at: 0, volume: 0.8 }],
    overlay: () => <SeasonBadge emoji="⏳" ar="اليوم 3" fr="Jour 3" /> },
  { id: "ramadan", src: "v02b_ramadan", from: 2.4, len: 0.9, flash: true, sfx: [{ file: "whoosh", at: 0 }],
    overlay: () => <SeasonBadge emoji="🌙" ar="رمضان" fr="Ramadan" /> },
  { id: "aid", src: "v02c_aid", from: 5.0, len: 1.5, flash: true, sfx: [{ file: "whoosh", at: 0 }],
    overlay: () => <SeasonBadge emoji="🐑" ar="العيد" fr="L’Aïd" /> },
  { id: "summer", src: "v02d_summer", from: 1.0, len: 0.9, flash: true, sfx: [{ file: "whoosh", at: 0 }],
    overlay: () => <SeasonBadge emoji="☀️" ar="الصيف" fr="L’été" /> },
  // Veo had him say « مرحبا؟ » and left out the phone's answer: the answer reuses the promise voice through a phone filter.
  { id: "winter", src: "v02e_winter", from: 3.35, len: 4.0, flash: true, zoom: [1, 1.1],
    sfx: [{ file: "whoosh", at: 0 }, { file: "rain", at: 0, volume: 0.7 }, { file: "phone_reply", at: 2.1, dir: "audio" }],
    overlay: () => <Sequence durationInFrames={s(1.2)}><SeasonBadge emoji="🌧️" ar="الشتاء" fr="L’hiver" /></Sequence>,
    subs: [
      { at: 0.85, len: 1.25, ar: "مرحبا؟… مرحبا؟", fr: "Allô ? Allô ?" },
      { at: 2.1, len: 1.9, ar: "غدوة إن شاء الله!", fr: "Demain, inch’Allah !" },
    ] },

  // ── Hachem: the line, then he pulls out his phone ──
  { id: "hachem", src: "v03_hachem", from: 5.15, len: 2.5, flash: true,
    subs: [{ at: 0.1, len: 2.4, ar: "خالي، إنت مازلت تستنى؟!", fr: "Tonton, t’attends encore ?!" }] },
  { id: "hachemPhone", src: "v03_hachem", from: 8.7, len: 1.0, zoom: [1.05, 1.5], origin: "420px 980px",
    sfx: [{ file: "whoosh", at: 0.6 }] },

  // ── SkillLoop: request → accepted → appointment → en route ──
  { id: "tracking", len: 3.6, scene: () => <TrackingScene />,
    sfx: [{ file: "pop", at: 0.8 }, { file: "pop", at: 1.6 }, { file: "buzz", at: 2.3, volume: 0.6 }, { file: "notif", at: 2.3, volume: 1.3 }] },
  { id: "onTheWay", src: "v06_sticker", from: 0.0, len: 0.8, flash: true,
    sfx: [{ file: "dingdong", at: 0.25, volume: 0.9 }], overlay: () => <Chip text="🚗 Karim est en route" /> },

  // ── He came: « بالحق جيت؟ », then the tap works ──
  { id: "fixing", src: "v05_tap", from: 5.45, len: 1.45,
    subs: [{ at: 0.3, len: 1.15, ar: "بالحق جيت؟!", fr: "Il est vraiment venu ?!" }] },
  { id: "water", src: "v05_tap", from: 8.5, len: 1.3, zoom: [1.04, 1.1], sfx: [{ file: "success", at: 0.15 }],
    overlay: () => <DoneStamp /> },

  // ── The pro's QR + vitrine ──
  { id: "stickerWide", src: "v06_sticker", from: 7.0, len: 1.7, zoom: [1, 1], flash: true,
    sfx: [{ file: "pop", at: 0.3 }], tracked: () => <ShopSticker from={7.0} />,
    overlay: () => <Caption ar="الـQR متاعو على الفيترينة" fr="Son QR SkillLoop sur la vitrine" /> },
  { id: "salmaScan", src: "v07_salma", from: 3.4, len: 1.3, mute: true, audio: { file: "salma_fixed", from: 3.4 },
    tracked: () => <PaperSticker from={3.4} /> },
  { id: "vitrine", len: 2.4, scene: () => <VitrineScene />,
    sfx: [{ file: "scan", at: 0.5 }, { file: "whoosh", at: 0.75 }] },
  { id: "salmaLine", src: "v07_salma", from: 7.25, len: 1.7, mute: true, audio: { file: "salma_fixed", from: 7.25 },
    subs: [{ at: 0.15, len: 1.55, ar: "شوف خدمتو!", fr: "Regarde son travail !" }] },

  // ── Ending: the question + CTA ──
  { id: "question1", src: "v08_final", from: 0.0, len: 0.95, flash: true,
    subs: [{ at: 0, len: 0.95, ar: "وإنتوما؟", fr: "Et vous ?" }] },
  { id: "question2", src: "v08_final", from: 2.95, len: 5.4, zoom: [1.06, 1.16],
    sfx: [{ file: "riser", at: 1.55, volume: 0.7 }, { file: "thump", at: 2.75 }],
    subs: [{ at: 0.05, len: 2.7, ar: "شكون قالكم غدوة وما جاش؟", fr: "Qui vous a dit « demain » sans jamais venir ?" }],
    overlay: () => <EndCard start={s(2.75)} /> },
];

export const TOTAL = SHOTS.reduce((t, x) => t + s(x.len), 0);

// Dialogue windows (global frames): the music ducks under them so every line stays clear.
const DIALOGUE: [number, number][] = (() => {
  const out: [number, number][] = []; let at = 0;
  for (const x of SHOTS) { for (const sb of x.subs ?? []) out.push([at + s(sb.at), at + s(sb.at + sb.len)]); at += s(x.len); }
  return out;
})();

function Music() {
  return <Audio src={staticFile("audio/music.wav")} volume={(f) => {
    const duck = DIALOGUE.some(([a, b]) => f >= a - 4 && f <= b + 4);
    const fadeOut = interpolate(f, [TOTAL - 15, TOTAL], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (duck ? 0.13 : 0.38) * fadeOut;
  }} />;
}

function Chip({ text }: { text: string }) {
  return (
    <Rise style={{ position: "absolute", top: 260, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <span style={{ background: C.lime, color: C.ink, fontFamily: LAT, fontWeight: 800, fontSize: 48, padding: "18px 36px", borderRadius: 999, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>{text}</span>
    </Rise>
  );
}

function Caption({ ar, fr }: { ar: string; fr: string }) {
  return (
    <Rise style={{ position: "absolute", top: 240, left: 50, right: 50, textAlign: "center" }}>
      <div dir="rtl" style={{ fontFamily: AR, fontWeight: 800, fontSize: 62, color: C.white, textShadow: "0 4px 18px rgba(0,0,0,0.85)" }}>{ar}</div>
      <div style={{ fontFamily: LAT, fontWeight: 700, fontSize: 36, color: C.lime, textShadow: "0 3px 14px rgba(0,0,0,0.85)" }}>{fr}</div>
    </Rise>
  );
}

/** Thin progress bar at the top: keeps people watching to the end. */
function Progress() {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [0, TOTAL], [0, 100]);
  return <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${w}%`, background: C.lime, boxShadow: `0 0 18px ${C.lime}` }} />;
}

export function Reel() {
  let at = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "black", fontFamily: LAT }}>
      {SHOTS.map((x) => {
        const start = at;
        const len = s(x.len);
        at += len;
        return (
          <Sequence key={x.id} from={start} durationInFrames={len} name={x.id}>
            {x.scene ? x.scene() : (
              <Clip src={x.src!} from={x.from!} zoom={x.zoom ?? [1.02, 1.08]} volume={x.mute ? 0 : 1} {...(x.origin ? { origin: x.origin } : {})}>
                {x.tracked?.()}
              </Clip>
            )}
            {x.audio && <Audio src={staticFile(`audio/${x.audio.file}.wav`)} startFrom={s(x.audio.from)} />}
            {x.overlay?.()}
            {(x.subs ?? []).map((sb, i) => (
              <Sequence key={i} from={s(sb.at)} durationInFrames={s(sb.len)}><Subtitle ar={sb.ar} fr={sb.fr} /></Sequence>
            ))}
            {(x.sfx ?? []).map((fx, i) => (
              <Sequence key={`fx${i}`} from={s(fx.at)}><Audio src={staticFile(`${fx.dir ?? "sfx"}/${fx.file}.wav`)} volume={fx.volume ?? 1} /></Sequence>
            ))}
            {x.flash && <Flash />}
          </Sequence>
        );
      })}
      <Music />
      <Finish />
      <Progress />
    </AbsoluteFill>
  );
}
