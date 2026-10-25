import { describe, expect, it } from "vitest";
import { INTENT_STOP, nearestFraction, pathFractions, wrapDelta } from "@/components/brand";

// Same lemniscate as the hero (cx 600, cy 360, a 480), sampled finely.
const pts: Array<[number, number]> = Array.from({ length: 161 }, (_, i) => {
  const t = (i / 160) * Math.PI * 2;
  const d = 1 + Math.sin(t) ** 2;
  return [600 + (480 * Math.cos(t)) / d, 360 + (480 * 1.15 * Math.sin(t) * Math.cos(t)) / d];
});
const fr = pathFractions(pts);

describe("hero loop geometry", () => {
  it("measures the path from 0 to 1", () => {
    expect(fr[0]).toBe(0);
    expect(fr[fr.length - 1]).toBeCloseTo(1);
  });

  it("rests the spark on the matching intent node", () => {
    expect(nearestFraction(pts, fr, 120, 360)).toBeCloseTo(INTENT_STOP.find, 2); // start-side lime node
    expect(nearestFraction(pts, fr, 1080, 360)).toBeCloseTo(INTENT_STOP.offer, 2); // end-side violet node
  });

  it("travels the short way around the closed loop", () => {
    expect(wrapDelta(0.95, 0.05)).toBeCloseTo(0.1);
    expect(wrapDelta(0.05, 0.95)).toBeCloseTo(-0.1);
    expect(wrapDelta(0.2, 0.5)).toBeCloseTo(0.3);
  });
});
