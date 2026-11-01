import { Composition, Still } from "remotion";
import { POST, SLIDES } from "./carousel";
import { Reel, TOTAL } from "./Reel";
import { FPS, H, W } from "./theme";

export function RemotionRoot() {
  return (
    <>
      <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
      {SLIDES.map((S, i) => <Still key={i} id={`Slide${i + 1}`} component={S} width={POST.width} height={POST.height} />)}
    </>
  );
}
