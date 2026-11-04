import { Composition } from "remotion";
import { Reel, TOTAL } from "./Reel";
import { FPS, H, W } from "./theme";

// « الدورة » (ep3): kinetic-type HUD reel, every shot built in code.
export function RemotionRoot() {
  return <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
}
