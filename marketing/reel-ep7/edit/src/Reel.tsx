import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Sfx } from "./kit";
import { PROS } from "./data";
import { Hud } from "./motion";
import { Boot, Title, Wave } from "./scenes-a";
import { Pros, WordClick, WordDerja, WordPaper, WordWall } from "./scenes-b";
import { Blobs, End, Flow, Request, RingBeat } from "./scenes-c";

// The source cuts on a 144 BPM grid (one beat = 12.5 frames at 30 fps). Scene starts in frames; scripts/music.py
// uses the same times in seconds, so change both together.
export const T = { boot: 0, title: 45, wave: 100, w1: 150, w2: 163, w3: 175, ar: 188, pros: 213, flow: 413, req: 463, blobs: 513, ring: 563, end: 575 };
export const TOTAL = 663;

const SCENES: { at: number; to: number; C: ComponentType; chapter: string; dark: boolean }[] = [
  { at: T.boot, to: T.title, C: Boot, chapter: "00 / INTRO", dark: true },
  { at: T.title, to: T.wave, C: Title, chapter: "01 / LA VITRINE", dark: false },
  { at: T.wave, to: T.w1, C: Wave, chapter: "02 / 13 CATÉGORIES", dark: true },
  { at: T.w1, to: T.w2, C: WordPaper, chapter: "03 / SAVOIR-FAIRE", dark: false },
  { at: T.w2, to: T.w3, C: WordWall, chapter: "03 / SAVOIR-FAIRE", dark: true },
  { at: T.w3, to: T.ar, C: WordClick, chapter: "03 / SAVOIR-FAIRE", dark: true },
  { at: T.ar, to: T.pros, C: WordDerja, chapter: "03 / SAVOIR-FAIRE", dark: false },
  { at: T.pros, to: T.flow, C: Pros, chapter: "04 / LES PROS", dark: false },
  { at: T.flow, to: T.req, C: Flow, chapter: "05 / LA VITRINE", dark: true },
  { at: T.req, to: T.blobs, C: Request, chapter: "06 / LA DEMANDE", dark: true },
  { at: T.blobs, to: T.ring, C: Blobs, chapter: "07 / LA BOUCLE", dark: false },
  { at: T.ring, to: T.end, C: RingBeat, chapter: "07 / LA BOUCLE", dark: true },
  { at: T.end, to: TOTAL, C: End, chapter: "SKILLLOOP", dark: true },
];

const keys = (from: number, to: number, every = 2) =>
  Array.from({ length: Math.floor((to - from) / every) }, (_, i) => <Sfx key={`k${from}-${i}`} at={from + i * every} name={`key${i % 3}`} volume={0.22} />);

export function Reel() {
  const f = useCurrentFrame();
  const sc = [...SCENES].reverse().find((s) => f >= s.at) ?? SCENES[0]!;
  const fade = interpolate(f, [TOTAL - 8, TOTAL], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#07162a" }}>
      {SCENES.map(({ at, to, C }) => (
        <Sequence key={at} from={at} durationInFrames={to - at}><C /></Sequence>
      ))}
      {f < T.end + 30 && <Hud frame={f} chapter={sc.chapter} dark={sc.dark} />}
      <AbsoluteFill style={{ background: "#07162a", opacity: 1 - fade, pointerEvents: "none" }} />

      <Audio src={staticFile("audio/music.wav")} volume={0.9} />
      {/* Boot: the spark lands, the slate types, the line and the lime panel. */}
      <Sfx at={10} name="pop" volume={0.5} />
      {keys(13, 34, 3)}
      <Sfx at={26} name="whoosh" volume={0.3} />
      <Sfx at={38} name="whoosh" volume={0.45} />
      {/* Title slam, the ink disc. */}
      <Sfx at={T.title + 2} name="thump" volume={0.7} />
      <Sfx at={T.title + 43} name="whoosh" volume={0.5} />
      <Sfx at={T.wave} name="scan" volume={0.4} />
      <Sfx at={T.wave + 9} name="sparkle" volume={0.3} />
      {/* One hit per word. */}
      {[T.w1, T.w2, T.w3, T.ar].map((t) => <Sfx key={t} at={t} name="thump" volume={0.55} />)}
      <Sfx at={T.w3 + 8} name="ding" volume={0.4} />
      {/* The pros: a pop per card. */}
      {PROS.map((p, i) => <Sfx key={p.id} at={T.pros + i * 25} name="pop" volume={0.55} />)}
      {PROS.map((p, i) => <Sfx key={`w${p.id}`} at={T.pros + i * 25} name="whoosh" volume={0.22} />)}
      {/* Particles → burst → coverflow. */}
      <Sfx at={T.flow} name="riser" volume={0.3} />
      <Sfx at={T.flow + 18} name="thump" volume={0.6} />
      <Sfx at={T.flow + 18} name="sparkle" volume={0.35} />
      {/* Request: typing, tap, sent. */}
      {keys(T.req + 4, T.req + 26, 2)}
      <Sfx at={T.req + 31} name="pop" volume={0.5} />
      <Sfx at={T.req + 40} name="success" volume={0.45} />
      <Sfx at={T.req + 41} name="notif" volume={0.35} />
      {/* Blobs split and merge, the ring, the end logo. */}
      <Sfx at={T.blobs + 2} name="pop" volume={0.45} />
      <Sfx at={T.blobs + 46} name="thump" volume={0.5} />
      <Sfx at={T.ring} name="scan" volume={0.4} />
      <Sfx at={T.end} name="thump" volume={0.7} />
      <Sfx at={T.end + 4} name="sparkle" volume={0.35} />
      <Sfx at={T.end + 36} name="dingdong" volume={0.3} />
    </AbsoluteFill>
  );
}
