import { beforeEach, describe, expect, it } from "vitest";
import { RETURN_TTL, authContext, markOAuthReturn, peekReturnTo, safeReturnPath, setReturnTo, takeOAuthReturn, takeReturnTo } from "@/lib/return-to";
import { postAuthPath, saveOfferDraft, takePostAuthTarget } from "@/lib/offer-draft";

const SVC = "/services/0f8fad5b-d9cb-469f-a165-70867728950e";

describe("safe return paths", () => {
  it("accepts the app areas a sign-in prompt can come from, with query and hash", () => {
    expect(safeReturnPath(`${SVC}#request`)).toBe(`${SVC}#request`);
    expect(safeReturnPath("/messages?r=abc")).toBe("/messages?r=abc");
    expect(safeReturnPath("/offer?edit=0f8fad5b-d9cb-469f-a165-70867728950e")).toBe("/offer?edit=0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(safeReturnPath("/dashboard?mode=client")).toBe("/dashboard?mode=client");
  });
  it("rejects anything that could leave the app or reach an unlisted page", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/%2F%2Fevil.com", "/admin", "/services/nope", "/login", "dashboard", "/messages\n", 42, null])
      expect(safeReturnPath(bad), String(bad)).toBeNull();
  });
});

describe("return target storage", () => {
  beforeEach(() => sessionStorage.clear());
  it("is used once", () => {
    setReturnTo(`${SVC}#request`, 0);
    expect(peekReturnTo(1)).toBe(`${SVC}#request`);
    expect(takeReturnTo(1)).toBe(`${SVC}#request`);
    expect(takeReturnTo(2)).toBeNull();
  });
  it("ignores unsafe paths and expires after 30 minutes", () => {
    setReturnTo("https://evil.com", 0);
    expect(peekReturnTo(1)).toBeNull();
    setReturnTo("/messages", 0);
    expect(peekReturnTo(RETURN_TTL + 1)).toBeNull();
  });
  it("only hands an OAuth return to the app listener once it was flagged", () => {
    setReturnTo("/messages?r=x");
    expect(takeOAuthReturn()).toBeNull();
    markOAuthReturn();
    expect(takeOAuthReturn()).toBe("/messages?r=x");
    expect(peekReturnTo()).toBeNull();
  });
  it("after sign-in, a remembered page wins over the default landing and is reported as resumed", () => {
    saveOfferDraft({ title: "Plomberie", description: "" });
    setReturnTo(`${SVC}#request`);
    expect(postAuthPath()).toBe(`${SVC}#request`);
    expect(takePostAuthTarget()).toEqual({ path: `${SVC}#request`, resumed: true });
    expect(takePostAuthTarget()).toEqual({ path: "/offer", resumed: false });
  });
});

describe("why you're signing in", () => {
  it("names the reason from the remembered page", () => {
    expect(authContext(`${SVC}#request`, false)).toBe("request");
    expect(authContext("/offer?edit=x", false)).toBe("offer");
    expect(authContext(null, true)).toBe("offer");
    expect(authContext("/messages?r=1", false)).toBe("messages");
    expect(authContext("/dashboard", true)).toBeNull();
    expect(authContext(null, false)).toBeNull();
  });
});
