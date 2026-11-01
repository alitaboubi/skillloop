// Template edit list (copied by media-kit/scripts/new_episode.sh). The machinery below is the same as reel-ep1:
// shots back to back, subtitles, SFX, tracked overlays, music ducked under dialogue, grain + vignette, progress bar.
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
  // One entry per shot, in order. Examples (delete them):
  // { id: "hook", src: "v01_xxx", from: 1.5, len: 2.3, zoom: [1.08, 1.0], sfx: [{ file: "thump", at: 0.12 }],
  //   overlay: () => <Sequence from={4}><PunchTitle ar="…" fr="…" /></Sequence>,
  //   subs: [{ at: 0, len: 2.3, ar: "…", fr: "…" }] },
  // { id: "app", len: 3.6, scene: () => <TrackingScene />, sfx: [{ file: "pop", at: 0.8 }] },
  // { id: "end", src: "v08_xxx", from: 2.9, len: 5.4, overlay: () => <EndCard start={s(2.75)} /> },
  { id: "placeholder", len: 2, scene: () => <AbsoluteFill style={{ background: C.ink }} /> },
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
