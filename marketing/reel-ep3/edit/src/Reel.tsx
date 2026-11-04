import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Hud, clamp } from "./kit";
import { CounterScene, EndScene, FormScene, IntroScene, LoopScene, RingScene, SearchScene, SignalScene, SkillScene, TimelineScene } from "./scenes";
import { s } from "./theme";

// Shot list in seconds; scripts/music.py uses the same times (drop at 8 s, outro at 29 s, click at 30.6 s).
const SHOTS: [string, number, number, () => JSX.Element][] = [
  ["00 · INTRO", 0, 2.5, IntroScene],
  ["01 · SKILL", 2.5, 5, SkillScene],
  ["02 · SIGNAL", 5, 8, SignalScene],
  ["03 · LOOP", 8, 11.5, LoopScene],
  ["04 · PUBLIER", 11.5, 15.5, FormScene],
  ["05 · RECHERCHE", 15.5, 19, SearchScene],
  ["06 · TUNISIE", 19, 22, RingScene],
  ["07 · DEMANDE", 22, 26, TimelineScene],
  ["08 · BOUCLE", 26, 29, CounterScene],
  ["09 · TOI", 29, 35, EndScene],
];
export const TOTAL = s(35);
const DROP = 8, OUTRO = 29, BEAT = 0.5;

/** Kick-synced push-in on every beat of the groove. */
function Pulse({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const on = t >= DROP && t < OUTRO;
  const k = on ? 1 + 0.018 * Math.exp(-((t - DROP) % BEAT) * 12) : 1;
  return <AbsoluteFill style={{ transform: `scale(${k})` }}>{children}</AbsoluteFill>;
}

/** Short glitch on every cut: a horizontal slice offset and RGB tint for 3 frames. */
function Glitch({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 3) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 70 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: ((at * 37 + i * 613) % 1700), height: 40 + i * 30,
          background: i % 2 ? "rgba(196,238,87,0.35)" : "rgba(216,118,63,0.35)", transform: `translateX(${(i - 1) * 60}px)`, mixBlendMode: "screen" }} />
      ))}
    </AbsoluteFill>
  );
}

function Music() {
  return <Audio src={staticFile("audio/music.wav")} volume={(f) => 0.9 * interpolate(f, [0, 8], [0, 1], clamp)} />;
}

export function Reel() {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Music />
      <Pulse>
        {SHOTS.map(([label, a, b, Scene]) => (
          <Sequence key={label} from={s(a)} durationInFrames={s(b) - s(a)}>
            <Scene />
            <Hud label={label} />
          </Sequence>
        ))}
      </Pulse>
      {SHOTS.slice(1).map(([label, a]) => <Glitch key={label} at={s(a)} />)}
    </AbsoluteFill>
  );
}
