import { describe, expect, it } from "vitest";
import { updateService, applyContactOps, deletePortfolioItem, publishService, savePortfolioItem, saveProfile, setServiceArchived, submitRequest, validatePortfolio, validateProfile } from "@/lib/marketplace-writes";

type Resp = { data?: unknown; error?: { message: string } | null; count?: number | null };
type Call = { table: string; op: string; args: unknown[] };

/** Minimal chainable stand-in for the Supabase client; `respond` decides each terminal result. */
function fakeDb(respond: (c: Call) => Resp) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    let call: Call | null = null;
    const b: Record<string, unknown> = {};
    const rec = (op: string) => (...args: unknown[]) => { if (!call) { call = { table, op, args }; calls.push(call); } return b; };
    for (const op of ["insert", "update", "delete", "select"]) b[op] = rec(op);
    b["eq"] = () => b;
    b["single"] = () => b;
    b["then"] = (res: (v: Resp) => void, rej: (e: unknown) => void) => Promise.resolve({ error: null, ...respond(call!) }).then(res, rej);
    return b;
  };
  const storage = {
    from: (bucket: string) => ({
      upload: async (...args: unknown[]) => { const c = { table: `storage:${bucket}`, op: "upload", args }; calls.push(c); return { error: null, ...respond(c) }; },
      remove: async (...args: unknown[]) => { const c = { table: `storage:${bucket}`, op: "remove", args }; calls.push(c); return { error: null, ...respond(c) }; },
    }),
  };
  return { db: { from: builder, storage } as never, calls };
}

const req = { serviceId: "s1", clientId: "c1", providerId: "p1", message: "  Bonjour, besoin d'aide  " };

describe("submitRequest", () => {
  it("does not add a second opening message when the trigger already wrote one", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "requests" ? { data: { id: "r1" } } : c.op === "select" ? { count: 1 } : {}));
    expect(await submitRequest(db, req)).toEqual({ data: { id: "r1" }, error: null });
    expect(calls.filter((c) => c.table === "messages" && c.op === "insert")).toHaveLength(0);
  });

  it("adds the opening message once when none exists", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "requests" ? { data: { id: "r1" } } : c.op === "select" ? { count: 0 } : {}));
    await submitRequest(db, req);
    const inserts = calls.filter((c) => c.table === "messages" && c.op === "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.args[0]).toEqual({ request_id: "r1", sender_id: "c1", body: "Bonjour, besoin d'aide" });
  });

  it("returns the error and writes no message when the request is refused", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "requests" ? { data: null, error: { message: "rls" } } : {}));
    expect(await submitRequest(db, req)).toEqual({ data: null, error: "rls" });
    expect(calls.some((c) => c.table === "messages")).toBe(false);
  });

  it("still reports success once the request exists, so the user does not resubmit", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "requests" ? { data: { id: "r1" } } : { error: { message: "net" } }));
    expect((await submitRequest(db, req)).data).toEqual({ id: "r1" });
    expect(calls.filter((c) => c.table === "messages" && c.op === "insert")).toHaveLength(0);
  });
});

const svc = { title: "Cours de maths", description: "Cours particuliers niveau lycée", category: "tutoring", price_model: "hourly", price: 30, city: "Tunis", remote: false };
const file = new File(["x"], "p.png", { type: "image/png" });

describe("publishService", () => {
  it("removes the uploaded photo when the insert fails", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "services" ? { data: null, error: { message: "guard" } } : {}));
    expect((await publishService(db, "u1", svc, file)).error).toBe("guard");
    const up = calls.find((c) => c.op === "upload")!;
    const rm = calls.find((c) => c.op === "remove")!;
    expect(up.args[0]).toMatch(/^u1\/[0-9a-f-]{36}\.png$/);
    expect(rm.args[0]).toEqual([up.args[0]]);
  });

  it("keeps the photo and links it on success", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "services" ? { data: { id: "s9" } } : {}));
    expect(await publishService(db, "u1", svc, file)).toEqual({ data: { id: "s9" }, error: null });
    expect(calls.some((c) => c.op === "remove")).toBe(false);
    const ins = calls.find((c) => c.table === "services")!.args[0] as Record<string, unknown>;
    expect(ins).toMatchObject({ owner_id: "u1", image_url: calls.find((c) => c.op === "upload")!.args[0] });
  });

  it("stops before inserting when the upload fails", async () => {
    const { db, calls } = fakeDb((c) => (c.op === "upload" ? { error: { message: "quota" } } : {}));
    expect((await publishService(db, "u1", svc, file)).error).toBe("upload");
    expect(calls.some((c) => c.table === "services")).toBe(false);
  });
});

describe("setServiceArchived", () => {
  it("archives with an update and never deletes", async () => {
    const { db, calls } = fakeDb(() => ({}));
    expect(await setServiceArchived(db, "s1", true)).toBeNull();
    expect(calls).toEqual([{ table: "services", op: "update", args: [{ archived: true }] }]);
  });
});

const prof = { display_name: " Amel ", title: "", bio: "", city: "", preferred_lang: "fr", accepting: true, professional_details: { languages: "fr" } };

describe("saveProfile", () => {
  it("uploads a new photo, saves it and only then removes the previous one", async () => {
    const { db, calls } = fakeDb(() => ({}));
    const r = await saveProfile(db, "u1", prof, { file, removePhoto: false, previous: "u1/avatar/old.png" });
    const path = calls.find((c) => c.op === "upload")!.args[0] as string;
    expect(path).toMatch(/^u1\/avatar\/[0-9a-f-]{36}\.png$/);
    expect(r).toEqual({ data: { avatar_url: path }, error: null });
    const upd = calls.find((c) => c.table === "profiles")!.args[0] as Record<string, unknown>;
    expect(upd).toMatchObject({ display_name: "Amel", title: null, bio: null, city: null, avatar_url: path, professional_details: { languages: "fr", accepting: true } });
    expect(calls.map((c) => c.op)).toEqual(["upload", "update", "remove"]);
    expect(calls.at(-1)!.args[0]).toEqual(["u1/avatar/old.png"]);
  });

  it("removes the new upload and keeps the old photo when the update fails", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "profiles" ? { error: { message: "rls" } } : {}));
    expect((await saveProfile(db, "u1", prof, { file, removePhoto: false, previous: "u1/avatar/old.png" })).error).toBe("rls");
    const removed = calls.filter((c) => c.op === "remove").map((c) => c.args[0]);
    expect(removed).toEqual([[calls.find((c) => c.op === "upload")!.args[0]]]);
  });

  it("clears the photo and the availability flag when asked", async () => {
    const { db, calls } = fakeDb(() => ({}));
    await saveProfile(db, "u1", { ...prof, accepting: null, professional_details: { accepting: false } }, { file: null, removePhoto: true, previous: "u1/avatar/old.png" });
    const upd = calls.find((c) => c.table === "profiles")!.args[0] as Record<string, unknown>;
    expect(upd).toMatchObject({ avatar_url: null, professional_details: {} });
    expect(calls.find((c) => c.op === "remove")!.args[0]).toEqual(["u1/avatar/old.png"]);
  });

  it("keeps the current photo untouched when nothing changes", async () => {
    const { db, calls } = fakeDb(() => ({}));
    await saveProfile(db, "u1", prof, { file: null, removePhoto: false, previous: "u1/avatar/old.png" });
    expect(calls.some((c) => c.op === "upload" || c.op === "remove")).toBe(false);
    expect((calls[0]!.args[0] as Record<string, unknown>)["avatar_url"]).toBe("u1/avatar/old.png");
  });
});

describe("validateProfile", () => {
  it("requires a name of 2–80 characters and bounds title and bio", () => {
    expect(validateProfile({ display_name: " ", title: "", bio: "" })).toEqual({ display_name: { key: "err_required" } });
    expect(validateProfile({ display_name: "A", title: "", bio: "" })).toEqual({ display_name: { key: "err_short", n: 2 } });
    expect(validateProfile({ display_name: "Amel", title: "x".repeat(81), bio: "y".repeat(1001) })).toEqual({ title: { key: "err_long", n: 80 }, bio: { key: "err_long", n: 1000 } });
    expect(validateProfile({ display_name: "Amel", title: "Plombière", bio: "" })).toEqual({});
  });
});

describe("portfolio writes", () => {
  it("requires a photo and a 2–120 character title", () => {
    expect(validatePortfolio({ title: "", description: "", hasImage: false })).toEqual({ title: { key: "err_required" }, image: { key: "err_image_required" } });
    expect(validatePortfolio({ title: "Cuisine rénovée", description: "", hasImage: true })).toEqual({});
  });

  it("creates an item under the owner's portfolio folder", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "portfolio_items" ? { data: { id: "pi1" } } : {}));
    expect(await savePortfolioItem(db, "u1", { title: " Salle de bain ", description: "", previousImage: null }, file)).toEqual({ data: { id: "pi1" }, error: null });
    const path = calls.find((c) => c.op === "upload")!.args[0] as string;
    expect(path).toMatch(/^u1\/portfolio\/[0-9a-f-]{36}\.png$/);
    expect(calls.find((c) => c.table === "portfolio_items")).toMatchObject({ op: "insert", args: [{ title: "Salle de bain", description: null, image_url: path, owner_id: "u1" }] });
  });

  it("replacing the photo removes the old file only after the update succeeds", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "portfolio_items" ? { data: { id: "pi1" } } : {}));
    await savePortfolioItem(db, "u1", { id: "pi1", title: "Salle de bain", description: "Avant / après", previousImage: "u1/portfolio/old.png" }, file);
    expect(calls.map((c) => c.op)).toEqual(["upload", "update", "remove"]);
    expect(calls.at(-1)!.args[0]).toEqual(["u1/portfolio/old.png"]);
  });

  it("keeps the old photo and drops the new upload when the update fails", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "portfolio_items" ? { data: null, error: { message: "rls" } } : {}));
    expect((await savePortfolioItem(db, "u1", { id: "pi1", title: "Salle de bain", description: "", previousImage: "u1/portfolio/old.png" }, file)).error).toBe("rls");
    const removed = calls.filter((c) => c.op === "remove").map((c) => c.args[0]);
    expect(removed).toEqual([[calls.find((c) => c.op === "upload")!.args[0]]]);
  });

  it("editing text only never touches storage", async () => {
    const { db, calls } = fakeDb(() => ({ data: { id: "pi1" } }));
    await savePortfolioItem(db, "u1", { id: "pi1", title: "Nouveau titre", description: "", previousImage: "u1/portfolio/old.png" }, null);
    expect(calls.some((c) => c.table.startsWith("storage:"))).toBe(false);
  });

  it("removes the row before its image, and keeps the image if the row delete fails", async () => {
    const ok = fakeDb(() => ({}));
    expect(await deletePortfolioItem(ok.db, { id: "pi1", image_url: "u1/portfolio/a.png" })).toBeNull();
    expect(ok.calls.map((c) => c.op)).toEqual(["delete", "remove"]);
    const ko = fakeDb((c) => (c.op === "delete" ? { error: { message: "rls" } } : {}));
    expect(await deletePortfolioItem(ko.db, { id: "pi1", image_url: "u1/portfolio/a.png" })).toBe("rls");
    expect(ko.calls.some((c) => c.op === "remove")).toBe(false);
  });
});

describe("applyContactOps", () => {
  it("maps each planned change to one write and counts failures", async () => {
    const { db, calls } = fakeDb((c) => (c.op === "delete" ? { error: { message: "net" } } : {}));
    const failed = await applyContactOps(db, "u1", [
      { op: "insert", kind: "phone", value: "22 123 456", is_public: true },
      { op: "update", id: "w", value: "https://a.tn/", is_public: false },
      { op: "delete", id: "x" },
    ]);
    expect(failed).toBe(1);
    expect(calls.map((c) => [c.table, c.op])).toEqual([["profile_contacts", "insert"], ["profile_contacts", "update"], ["profile_contacts", "delete"]]);
    expect(calls[0]!.args[0]).toEqual({ owner_id: "u1", kind: "phone", value: "22 123 456", is_public: true });
  });
});

describe("updateService", () => {
  const svcRow = { ...svc, status: "published" as const, details: { duration: "1 h" } };
  it("replaces the photo: upload, update, then remove the old file", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "services" ? { data: { id: "s1" } } : {}));
    expect(await updateService(db, "u1", "s1", svcRow, { file, removePhoto: false, previous: "u1/old.png" })).toEqual({ data: { id: "s1" }, error: null });
    expect(calls.map((c) => c.op)).toEqual(["upload", "update", "remove"]);
    const upd = calls.find((c) => c.table === "services")!.args[0] as Record<string, unknown>;
    expect(upd).toMatchObject({ status: "published", details: { duration: "1 h" }, image_url: calls[0]!.args[0] });
    expect(calls.at(-1)!.args[0]).toEqual(["u1/old.png"]);
  });
  it("keeps the old photo and removes the new upload when the update is refused", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "services" ? { data: null, error: { message: "guard" } } : {}));
    expect((await updateService(db, "u1", "s1", svcRow, { file, removePhoto: false, previous: "u1/old.png" })).error).toBe("guard");
    expect(calls.filter((c) => c.op === "remove").map((c) => c.args[0])).toEqual([[calls[0]!.args[0]]]);
  });
  it("text-only edits keep the stored photo and never touch storage", async () => {
    const { db, calls } = fakeDb(() => ({ data: { id: "s1" } }));
    await updateService(db, "u1", "s1", svcRow, { file: null, removePhoto: false, previous: "u1/old.png" });
    expect(calls.some((c) => c.table.startsWith("storage:"))).toBe(false);
    expect((calls[0]!.args[0] as Record<string, unknown>)["image_url"]).toBe("u1/old.png");
  });
  it("removing the photo clears it, then deletes the file", async () => {
    const { db, calls } = fakeDb(() => ({ data: { id: "s1" } }));
    await updateService(db, "u1", "s1", svcRow, { file: null, removePhoto: true, previous: "u1/old.png" });
    expect((calls[0]!.args[0] as Record<string, unknown>)["image_url"]).toBeNull();
    expect(calls.map((c) => c.op)).toEqual(["update", "remove"]);
  });
  it("creating can save a draft with details", async () => {
    const { db, calls } = fakeDb((c) => (c.table === "services" ? { data: { id: "s2" } } : {}));
    await publishService(db, "u1", { ...svc, status: "draft", details: { duration: "2 h" } }, null);
    expect(calls[0]!.args[0]).toMatchObject({ status: "draft", details: { duration: "2 h" }, owner_id: "u1", image_url: null });
  });
});
