import { describe, expect, it, vi } from "vitest";
import { DAILY_LIMITS, limitKindOf, limitMessage, uploadLimitReached, UPLOAD_LIMIT_ERROR } from "@/lib/limits";
import { publishService, savePortfolioItem, submitRequest } from "@/lib/marketplace-writes";
import { dictionaries } from "@/lib/i18n";

describe("limitKindOf: only the database's quota refusal is a daily limit", () => {
  it("recognises each quota", () => {
    expect(limitKindOf("daily_limit_reached:services")).toBe("services");
    expect(limitKindOf({ message: "daily_limit_reached:requests" })).toBe("requests");
    expect(limitKindOf({ message: "daily_limit_reached:messages" })).toBe("messages");
    expect(limitKindOf(UPLOAD_LIMIT_ERROR)).toBe("uploads");
  });

  it("never treats other errors as a limit", () => {
    for (const e of ["upload", "insert failed", "new row violates row-level security policy for table \"objects\"", "Provider is not accepting requests",
      "daily_limit_reached", "daily_limit_reached:other", "x daily_limit_reached:services", "Invalid login credentials", "", null, undefined, { message: undefined }]) {
      expect(limitKindOf(e as never)).toBeNull();
    }
  });

  it("message key carries the approved number", () => {
    expect(limitMessage("daily_limit_reached:services")).toEqual({ key: "limit_services", vars: { n: 20 } });
    expect(limitMessage("daily_limit_reached:uploads")).toEqual({ key: "limit_uploads", vars: { n: 40 } });
    expect(limitMessage("upload")).toBeNull();
    expect(DAILY_LIMITS).toEqual({ services: 20, requests: 30, messages: 300, uploads: 40 });
  });

  it("every language has all four messages with the {n} placeholder", () => {
    for (const lang of ["fr", "en", "ar"] as const) {
      for (const k of ["limit_services", "limit_requests", "limit_messages", "limit_uploads"] as const) {
        expect(dictionaries[lang][k]).toContain("{n}");
      }
    }
  });
});

describe("uploadLimitReached: asked only after a failed upload", () => {
  const rpc = (r: unknown) => ({ rpc: vi.fn(async () => r) }) as never;
  it("true only when the database says 0 uploads are left", async () => {
    expect(await uploadLimitReached(rpc({ data: 0, error: null }))).toBe(true);
    expect(await uploadLimitReached(rpc({ data: 12, error: null }))).toBe(false);
  });
  it("any doubt (function missing before the migration, network) is not a limit", async () => {
    expect(await uploadLimitReached(rpc({ data: null, error: { message: "function not found" } }))).toBe(false);
    expect(await uploadLimitReached({ rpc: vi.fn(async () => { throw new Error("offline"); }) } as never)).toBe(false);
  });
});

/** Fake client: storage upload result, rpc result and the table write result are chosen per test. */
function fakeDb(o: { upload?: { message: string } | null; quotaLeft?: number; write?: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  for (const op of ["insert", "update", "select", "eq", "single"]) chain[op] = () => chain;
  chain["then"] = (res: (v: unknown) => void) => Promise.resolve(o.write ? { data: null, error: o.write } : { data: { id: "new" }, error: null, count: 1 }).then(res);
  return {
    from: () => chain,
    rpc: vi.fn(async () => ({ data: o.quotaLeft ?? 5, error: null })),
    storage: { from: () => ({ upload: async () => ({ error: o.upload ?? null }), remove: async () => ({ error: null }) }) },
  } as never;
}
const svc = { title: "Cours", description: "Cours particuliers niveau lycée", category: "tutoring", price_model: "hourly", price: 30, city: "Tunis", remote: false };
const photo = new File(["x"], "p.jpg", { type: "image/jpeg" });

describe("write paths report the limit, and only the limit", () => {
  it("a refused upload with 0 uploads left → upload limit", async () => {
    const r = await publishService(fakeDb({ upload: { message: "new row violates row-level security policy" }, quotaLeft: 0 }), "u1", svc, photo);
    expect(limitKindOf(r.error)).toBe("uploads");
  });
  it("a refused upload with uploads left → the usual upload error", async () => {
    const r = await publishService(fakeDb({ upload: { message: "network" }, quotaLeft: 7 }), "u1", svc, photo);
    expect(r.error).toBe("upload");
  });
  it("the database's service quota refusal reaches the UI unchanged", async () => {
    const r = await publishService(fakeDb({ write: { message: "daily_limit_reached:services" } }), "u1", svc, null);
    expect(limitKindOf(r.error)).toBe("services");
  });
  it("request quota refusal reaches the UI unchanged; other refusals don't look like a limit", async () => {
    const req = { serviceId: "s", clientId: "c", providerId: "p", message: "Bonjour, une demande" };
    expect(limitKindOf((await submitRequest(fakeDb({ write: { message: "daily_limit_reached:requests" } }), req)).error)).toBe("requests");
    expect(limitKindOf((await submitRequest(fakeDb({ write: { message: "Provider is not accepting requests" } }), req)).error)).toBeNull();
  });
  it("portfolio photo over the upload quota → upload limit", async () => {
    const r = await savePortfolioItem(fakeDb({ upload: { message: "rls" }, quotaLeft: 0 }), "u1", { title: "Projet", description: "", previousImage: null }, photo);
    expect(limitKindOf(r.error)).toBe("uploads");
  });
});
