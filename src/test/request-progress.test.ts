import { describe, expect, it } from "vitest";
import { fromLocalInput, isValidAppointment, latestStep, nextStep, progressChain, toLocalInput } from "@/lib/request-progress";
import { threadGuidance, timelineSteps } from "@/lib/request-timeline";

const T = "2026-11-01T10:00:00Z";

describe("request progress steps", () => {
  it("an on-site job goes en route → started → completed", () => {
    expect(nextStep({}, false)).toBe("on_the_way");
    expect(nextStep({ on_the_way_at: T }, false)).toBe("started");
    expect(nextStep({ on_the_way_at: T, started_at: T }, false)).toBe("completed");
    expect(nextStep({ completed_at: T }, false)).toBeNull();
  });
  it("a remote job has no en route step", () => {
    expect(nextStep({}, true)).toBe("started");
    expect(progressChain({}, true).map((s) => s.step)).toEqual(["started", "completed"]);
  });
  it("the latest recorded step wins", () => {
    expect(latestStep({})).toBeNull();
    expect(latestStep({ on_the_way_at: T, started_at: T })).toBe("started");
  });
  it("a skipped step before the latest one is left out", () => {
    expect(progressChain({ started_at: T }, false).map((s) => s.step)).toEqual(["started", "completed"]);
  });
});

describe("timeline with progress", () => {
  it("without progress, accepted stays as before", () => {
    expect(timelineSteps("accepted", T).map((s) => [s.key, s.state])).toEqual([["tl_sent", "done"], ["st_accepted", "current"]]);
  });
  it("accepted with no step yet shows what's ahead", () => {
    expect(timelineSteps("accepted", T, {}).map((s) => [s.key, s.state])).toEqual([
      ["tl_sent", "done"], ["st_accepted", "current"], ["pg_on_the_way", "upcoming"], ["pg_started", "upcoming"], ["pg_completed", "upcoming"],
    ]);
  });
  it("en route is current with its database time", () => {
    const steps = timelineSteps("accepted", T, { on_the_way_at: T });
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ["tl_sent", "done"], ["st_accepted", "done"], ["pg_on_the_way", "current"], ["pg_started", "upcoming"], ["pg_completed", "upcoming"],
    ]);
    expect(steps[2]?.at).toBe(T);
  });
  it("completed ends on a positive step", () => {
    const last = timelineSteps("accepted", T, { on_the_way_at: T, started_at: T, completed_at: T }).at(-1);
    expect([last?.key, last?.state, last?.tone]).toEqual(["pg_completed", "current", "positive"]);
  });
  it("guidance no longer says bookings aren't handled once progress is on", () => {
    expect(threadGuidance("accepted", "client")).toBe("tg_accepted");
    expect(threadGuidance("accepted", "client", {})).toBe("tg_accepted_progress");
    expect(threadGuidance("accepted", "provider", { completed_at: T })).toBe("tg_completed");
  });
});

describe("appointment input", () => {
  it("round-trips through the datetime-local value", () => {
    expect(Date.parse(fromLocalInput(toLocalInput(T)) ?? "")).toBe(Date.parse(T));
    expect(fromLocalInput("")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });
  it("matches the database window (upcoming, within a year)", () => {
    const now = Date.parse(T);
    expect(isValidAppointment(new Date(now + 86_400_000).toISOString(), now)).toBe(true);
    expect(isValidAppointment(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe(false);
    expect(isValidAppointment(new Date(now + 400 * 86_400_000).toISOString(), now)).toBe(false);
    expect(isValidAppointment(null, now)).toBe(false);
  });
});
