import { describe, expect, it, vi } from "vitest";
import { collectOwnFiles, deleteMyAccount, type DeletionClient } from "@/lib/account-deletion";

const tree: Record<string, { name: string; id: string | null }[]> = {
  u1: [{ name: "avatar.jpg", id: "1" }, { name: "portfolio", id: null }],
  "u1/portfolio": [{ name: "p1.jpg", id: "2" }, { name: "p2.jpg", id: "3" }],
};
const list: DeletionClient["list"] = async (prefix) => ({ data: tree[prefix] ?? [], error: null });

describe("account deletion", () => {
  it("collects every file in the user's own folder, walking sub-folders", async () => {
    expect(await collectOwnFiles(list, "u1")).toEqual(["u1/avatar.jpg", "u1/portfolio/p1.jpg", "u1/portfolio/p2.jpg"]);
  });

  it("removes the files first, then deletes the account", async () => {
    const calls: string[] = [];
    const client: DeletionClient = {
      list,
      remove: vi.fn(async (paths: string[]) => { calls.push(`remove:${paths.length}`); return { error: null }; }),
      rpc: vi.fn(async () => { calls.push("rpc"); return { error: null }; }),
    };
    expect(await deleteMyAccount(client, "u1")).toEqual({ ok: true });
    expect(calls).toEqual(["remove:3", "rpc"]);
  });

  it("never deletes the account when the photos could not be removed", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const res = await deleteMyAccount({ list, remove: async () => ({ error: new Error("x") }), rpc }, "u1");
    expect(res).toEqual({ ok: false, step: "files" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a failed listing as a files failure", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const res = await deleteMyAccount({ list: async () => ({ data: null, error: new Error("x") }), remove: async () => ({ error: null }), rpc }, "u1");
    expect(res).toEqual({ ok: false, step: "files" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("removes in batches of 100", async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ name: `f${i}.jpg`, id: String(i) }));
    const sizes: number[] = [];
    await deleteMyAccount({ list: async () => ({ data: many, error: null }), remove: async (p) => { sizes.push(p.length); return { error: null }; }, rpc: async () => ({ error: null }) }, "u2");
    expect(sizes).toEqual([100, 100, 50]);
  });

  it("reports an account failure after the files step", async () => {
    expect(await deleteMyAccount({ list, remove: async () => ({ error: null }), rpc: async () => ({ error: new Error("x") }) }, "u1")).toEqual({ ok: false, step: "account" });
  });
});
