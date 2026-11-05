import { Still } from "remotion";
import { POST, PROS, SLIDES } from "./pros";

// One carousel per pro: ids like cm-1 … cm-5.
export function RemotionRoot() {
  return (
    <>
      {PROS.flatMap((p) => SLIDES.map((S, i) => (
        <Still key={`${p.id}-${i}`} id={`${p.id}-${i + 1}`} component={() => <S p={p} />} width={POST.width} height={POST.height} />
      )))}
    </>
  );
}
