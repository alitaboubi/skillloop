import { Composition } from "remotion";
import { MOTION, Motion } from "./Motion";

export function RemotionRoot() {
  return (
    <>
      <Composition id="MotionWords" component={Motion} defaultProps={{ words: true }} durationInFrames={MOTION.frames} fps={MOTION.fps} width={MOTION.width} height={MOTION.height} />
      <Composition id="MotionClean" component={Motion} defaultProps={{ words: false }} durationInFrames={MOTION.frames} fps={MOTION.fps} width={MOTION.width} height={MOTION.height} />
    </>
  );
}
