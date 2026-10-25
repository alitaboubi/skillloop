import { describe, expect, it } from "vitest";
import { addPromptLine, clientNextStep, dayKey, lastByRequest, relativeDay, sortByActivity, withDaySeparators } from "@/lib/conversations";

describe("conversation list", () => {
  const msgs = [
    { request_id: "a", body: "latest a", created_at: "2026-10-20T10:00:00Z" },
    { request_id: "b", body: "only b", created_at: "2026-10-18T10:00:00Z" },
    { request_id: "a", body: "older a", created_at: "2026-10-19T10:00:00Z" },
  ];
  it("keeps the latest message per conversation", () => {
    const m = lastByRequest(msgs);
    expect(m.get("a")?.body).toBe("latest a");
    expect(m.get("b")?.body).toBe("only b");
  });
  it("orders by latest activity, falling back to the request date", () => {
    const reqs = [
      { id: "a", created_at: "2026-10-01T00:00:00Z" },
      { id: "b", created_at: "2026-10-02T00:00:00Z" },
      { id: "c", created_at: "2026-10-19T12:00:00Z" }, // new request, no message yet
    ];
    expect(sortByActivity(reqs, lastByRequest(msgs)).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
});

describe("thread days", () => {
  it("inserts one separator before each new local day", () => {
    const a = new Date(2026, 9, 20, 9).toISOString(), b = new Date(2026, 9, 20, 18).toISOString(), c = new Date(2026, 9, 21, 8).toISOString();
    const out = withDaySeparators([{ id: "1", created_at: a }, { id: "2", created_at: b }, { id: "3", created_at: c }]);
    expect(out.map((x) => x.kind)).toEqual(["day", "msg", "msg", "day", "msg"]);
    expect(dayKey(a)).toBe(dayKey(b));
  });
  it("labels today and yesterday, otherwise leaves the date to the caller", () => {
    const now = new Date(2026, 9, 24, 15);
    expect(relativeDay(new Date(2026, 9, 24, 1).toISOString(), now)).toBe("day_today");
    expect(relativeDay(new Date(2026, 9, 23, 23).toISOString(), now)).toBe("day_yesterday");
    expect(relativeDay(new Date(2026, 9, 20).toISOString(), now)).toBeNull();
  });
});

describe("client next step", () => {
  it("gives one clear action per status", () => {
    expect(clientNextStep("accepted")).toEqual({ key: "trk_accepted", action: "chat" });
    expect(clientNextStep("declined")).toEqual({ key: "trk_declined", action: "similar" });
    expect(clientNextStep("cancelled")).toEqual({ key: "trk_cancelled", action: "similar" });
    expect(clientNextStep("pending")).toEqual({ key: "tl_waiting", action: null });
  });
});

describe("request prompt lines", () => {
  it("starts an empty message with the prompt", () => expect(addPromptLine("", "Lieu :")).toEqual({ value: "Lieu : ", added: true }));
  it("puts each prompt on its own line", () => expect(addPromptLine("Bonjour", "Quand :").value).toBe("Bonjour\nQuand : "));
  it("never adds the same prompt twice", () => expect(addPromptLine("Besoin : fuite\nLieu : Sousse", "Lieu :")).toEqual({ value: "Besoin : fuite\nLieu : Sousse", added: false }));
  it("doesn't add a blank line after an existing newline", () => expect(addPromptLine("Bonjour\n", "Lieu :").value).toBe("Bonjour\nLieu : "));
});
