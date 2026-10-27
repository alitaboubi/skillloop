import { beforeEach, describe, expect, it } from "vitest";
import { loadReadState, markRead, unreadThreads } from "@/lib/unread";

const me = "me";
const msg = (request_id: string, sender_id: string, created_at: string) => ({ request_id, sender_id, created_at, body: "x" });

beforeEach(() => localStorage.clear());

describe("unread conversations (device-local)", () => {
  it("never counts history from before the first run on this device", () => {
    const state = loadReadState(me, new Date("2026-10-26T10:00:00Z"));
    expect(unreadThreads([msg("r1", "other", "2026-10-26T09:00:00.123456+00:00")], me, state).size).toBe(0);
  });

  it("counts a conversation whose newest message is from the other person and newer than the last visit", () => {
    const state = loadReadState(me, new Date("2026-10-26T10:00:00Z"));
    const last = [msg("r1", "other", "2026-10-26T10:05:00+00:00"), msg("r2", "me", "2026-10-26T10:06:00+00:00"), msg("r2", "other", "2026-10-26T10:01:00+00:00")];
    expect([...unreadThreads(last, me, state)]).toEqual(["r1"]); // r2: I answered last
  });

  it("clears after the conversation is opened, and comes back with a newer message", () => {
    loadReadState(me, new Date("2026-10-26T10:00:00Z"));
    markRead(me, "r1", "2026-10-26T10:05:00+00:00");
    const after = loadReadState(me);
    expect(unreadThreads([msg("r1", "other", "2026-10-26T10:05:00+00:00")], me, after).size).toBe(0);
    expect(unreadThreads([msg("r1", "other", "2026-10-26T10:07:00+00:00")], me, after).size).toBe(1);
  });

  it("compares real times across formats (Z vs +00:00 in the same second)", () => {
    const state = loadReadState(me, new Date("2026-10-26T10:00:00.000Z"));
    expect(unreadThreads([msg("r1", "other", "2026-10-26T10:00:00.500+00:00")], me, state).size).toBe(1);
  });

  it("survives broken storage", () => {
    localStorage.setItem("skillloop.read.me", "{oops");
    expect(loadReadState(me).seen).toEqual({});
  });
});
