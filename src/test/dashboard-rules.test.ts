import { describe, expect, it } from "vitest";
import { clientRequestSummary, profileChecklist, requestGate, resolveDashboardMode, statusTone, threadGuidance, timelineSteps } from "@/lib/request-timeline";

describe("request timeline", () => {
  it("pending shows waiting as current and accepted as upcoming", () => {
    expect(timelineSteps("pending", "2026-10-01").map((s) => [s.key, s.state])).toEqual([["tl_sent", "done"], ["tl_waiting", "current"], ["st_accepted", "upcoming"]]);
  });
  it("declined ends the timeline", () => expect(timelineSteps("declined", "x").at(-1)?.key).toBe("st_declined"));
  it("sent step carries the creation timestamp", () => expect(timelineSteps("accepted", "2026-10-01T10:00:00Z")[0]?.at).toBe("2026-10-01T10:00:00Z"));
});

describe("profile checklist", () => {
  it("a brand-new provider has nothing done", () => expect(profileChecklist({ publishedServices: 0 }).every((x) => !x.done)).toBe(true));
  it("one published service completes the service step", () => expect(profileChecklist({ publishedServices: 1 }).find((x) => x.key === "db_check_service")?.done).toBe(true));
  it("accepting=false still counts as availability set", () => expect(profileChecklist({ publishedServices: 0, professional_details: { accepting: false } }).find((x) => x.key === "db_check_availability")?.done).toBe(true));
});

describe("account home rules", () => {
  it("opens the client side for accounts without services, unless a mode is chosen", () => {
    expect(resolveDashboardMode(undefined, 0)).toBe("client");
    expect(resolveDashboardMode(undefined, 2)).toBe("provider");
    expect(resolveDashboardMode("client", 2)).toBe("client");
    expect(resolveDashboardMode("provider", 0)).toBe("provider");
  });
  it("gives each request status a distinct tone", () => {
    expect([statusTone("pending"), statusTone("accepted"), statusTone("declined"), statusTone("cancelled")]).toEqual(["badge-warning", "badge-success", "badge-muted", "badge-muted"]);
  });
  it("summarises client requests from real statuses only", () => {
    expect(clientRequestSummary([{ status: "pending" }, { status: "accepted" }, { status: "declined" }, { status: "cancelled" }, { status: "pending" }])).toEqual({ pending: 2, accepted: 1, closed: 2 });
  });
});

describe("request pre-flight", () => {
  const base = { userId: "c1", ownerId: "p1", serviceId: "s1", accepting: true, myRequests: [] as { id: string; service_id: string; client_id: string; status: string; created_at: string }[] };
  const r = (id: string, status: string, created_at = "2026-10-01", service_id = "s1") => ({ id, service_id, client_id: "c1", status, created_at });
  it("lets a client request when nothing is open and the provider accepts", () => expect(requestGate(base)).toEqual({ kind: "can_request" }));
  it("recognises the owner", () => expect(requestGate({ ...base, userId: "p1" })).toEqual({ kind: "own" }));
  it("points to the open conversation instead of a duplicate request", () => {
    expect(requestGate({ ...base, myRequests: [r("a", "declined"), r("b", "pending", "2026-10-02")] })).toEqual({ kind: "open", requestId: "b", status: "pending" });
    expect(requestGate({ ...base, myRequests: [r("c", "accepted")] })).toEqual({ kind: "open", requestId: "c", status: "accepted" });
  });
  it("closed requests or other services don't block a new one", () => {
    expect(requestGate({ ...base, myRequests: [r("a", "declined"), r("b", "cancelled"), r("x", "pending", "2026-10-01", "s2")] })).toEqual({ kind: "can_request" });
  });
  it("shows the not-accepting state only when the provider said so explicitly", () => {
    expect(requestGate({ ...base, accepting: false })).toEqual({ kind: "not_accepting" });
    expect(requestGate({ ...base, accepting: undefined })).toEqual({ kind: "can_request" });
  });
});

describe("thread guidance", () => {
  it("speaks to each side for each status", () => {
    expect(threadGuidance("pending", "client")).toBe("tg_pending_client");
    expect(threadGuidance("pending", "provider")).toBe("tg_pending_provider");
    expect(threadGuidance("accepted", "client")).toBe("tg_accepted");
    expect(threadGuidance("declined", "client")).toBe("tg_declined_client");
    expect(threadGuidance("cancelled", "provider")).toBe("tg_cancelled_provider");
  });
});
