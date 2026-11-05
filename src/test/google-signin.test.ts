import { describe, expect, it } from "vitest";
import { GOOGLE_CLIENT_ID, makeNonce, readClientId } from "@/lib/google-signin";

describe("Google sign-in config", () => {
  it("is off unless a well-formed public Web client ID is configured", () => {
    expect(GOOGLE_CLIENT_ID).toBeNull();
    expect(readClientId("")).toBeNull();
    expect(readClientId("not-a-client")).toBeNull();
    expect(readClientId("https://evil.example/x.apps.googleusercontent.com")).toBeNull();
    expect(readClientId(" 123-abc.apps.googleusercontent.com ")).toBe("123-abc.apps.googleusercontent.com");
  });
  it("gives Google the SHA-256 of the nonce and keeps the raw value for Supabase", async () => {
    const { raw, hashed } = await makeNonce();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    expect(hashed).toBe(Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join(""));
    expect((await makeNonce()).raw).not.toBe(raw);
  });
});
