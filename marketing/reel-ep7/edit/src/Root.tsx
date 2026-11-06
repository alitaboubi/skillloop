import { Composition } from "remotion";
import { Reel, TOTAL } from "./Reel";
import { FPS } from "./theme";

// « La vitrine » (ep7): the four real pros in a showreel-style ad, every frame built in code.
// Reel = 9:16 for Instagram / TikTok and phones; Wide = 16:9 for the showcase on the site (desktop).
export function RemotionRoot() {
  return (
    <>
      <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
      <Composition id="Wide" component={Reel} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    </>
  );
}
