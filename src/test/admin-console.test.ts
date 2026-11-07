import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dictionaries, type Lang, type TKey } from "@/lib/i18n";
import {
  CONSOLE_SECTIONS, GRANT_MAX, SECTION_LABEL, consoleErrorKey, daysLeft, grantEnd, isMissingFunction, parseLog, parseSubs, parseTodo,
  parseUserDetail, parseUsers, validDays, visibleSections,
} from "@/lib/admin-console";

const LANGS: Lang[] = ["fr", "en", "ar"];
const NOW = Date.parse("2026-11-07T10:00:00Z");

describe("console sections", () => {
  it("show only what is on, in a fixed order", () => {
    expect(visibleSections({ support: true, social: true, payments: false })).toEqual(["overview", "messages", "users", "social", "subscriptions"]);
    expect(visibleSections({ support: false, social: false, payments: true })).toEqual(["overview", "users", "subscriptions", "payments"]);
  });
  it("have a label in every language", () => {
    for (const s of CONSOLE_SECTIONS) for (const l of LANGS) expect(dictionaries[l][SECTION_LABEL[s]], `${l} ${s}`).toBeTruthy();
  });
  it("match the route's accepted values", () => {
    const route = readFileSync("src/routes/admin.tsx", "utf8");
    expect(route).toContain("z.enum(CONSOLE_SECTIONS)");
  });
});

describe("missing migrations", () => {
  it("are recognised (PostgREST and Postgres codes, message) — not other errors", () => {
    expect(isMissingFunction({ code: "PGRST202", message: "Could not find the function public.admin_users" })).toBe(true);
    expect(isMissingFunction({ code: "42883", message: "function does not exist" })).toBe(true);
    expect(isMissingFunction({ message: "Could not find the function public.admin_todo without parameters" })).toBe(true);
    expect(isMissingFunction({ code: "42501", message: "not_admin" })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
  it("map operator errors to messages", () => {
    expect(consoleErrorKey({ message: "bad_days" })).toBe("ac_err_days");
    expect(consoleErrorKey({ message: "not_pro" })).toBe("ac_err_not_pro");
    expect(consoleErrorKey(new Error("x"))).toBe("sf_err_generic");
  });
});

describe("reading the database", () => {
  it("accounts: valid rows only, never more total than reported", () => {
    const p = parseUsers({ total: 3, items: [
      { id: "u1", name: " Amira ", city: "Sfax", avatar_url: "u1/a.jpg", created_at: "2026-11-01T10:00:00Z", pro: true, services: 2, requests: 5, support: "open" },
      { id: "u2", name: "", pro: false },
      { id: "u3", name: "Karim", support: "weird", services: -4 },
    ] });
    expect(p.total).toBe(3);
    expect(p.items.map((u) => [u.id, u.name, u.support, u.services])).toEqual([["u1", "Amira", "open", 2], ["u3", "Karim", null, 0]]);
    expect(parseUsers("nope")).toEqual({ total: 0, items: [] });
  });
  it("one account", () => {
    const d = parseUserDetail({ id: "u1", name: "Amira", admin: true, services: [{ id: "s1", title: "Plomberie", status: "draft" }, { id: "", title: "x" }],
      requests: { as_client: 1, as_pro: 4, pending: 2, accepted: 1 }, support: { status: "closed", last_message_at: "2026-11-06T10:00:00Z" } })!;
    expect(d.services).toEqual([{ id: "s1", title: "Plomberie", status: "draft", archived: false, city: null, createdAt: null }]);
    expect(d.requests).toEqual({ asClient: 1, asPro: 4, pending: 2, accepted: 1 });
    expect(d.support).toEqual({ status: "closed", lastAt: "2026-11-06T10:00:00Z" });
    expect(d.admin).toBe(true);
    expect(parseUserDetail({ id: "u1" })).toBeNull();
  });
  it("to-dos: optional blocks stay null when their table does not exist", () => {
    expect(parseTodo({ support_unread: 2, new_users: 1 })).toMatchObject({ supportUnread: 2, newUsers: 1, paymentsPending: null, trialsEnding: null });
    expect(parseTodo({ payments_pending: 0, trials_ending: 3 })).toMatchObject({ paymentsPending: 0, trialsEnding: 3 });
  });
  it("subscriptions and the log", () => {
    expect(parseSubs([{ user_id: "u1", name: "Amira", status: "active", founder: true, until: "2026-12-07T10:00:00Z", pro: true }, { user_id: "u2", name: "X", status: "gold" }]))
      .toEqual([{ userId: "u1", name: "Amira", city: null, avatarPath: null, status: "active", founder: true, until: "2026-12-07T10:00:00Z", pro: true }]);
    expect(parseLog([{ id: 3, at: "2026-11-07T10:00:00Z", action: "pro_granted", actor_name: "Ali", target_id: "u1", target_name: "Amira", detail: { days: 30, note: "Fondateur" } }, { id: "x" }]))
      .toEqual([{ id: 3, at: "2026-11-07T10:00:00Z", action: "pro_granted", actorName: "Ali", targetId: "u1", targetName: "Amira", detail: { days: 30, until: null, note: "Fondateur" } }]);
  });
});

describe("Pro access", () => {
  it("days: 1 to 730 whole days, like the database", () => {
    expect([1, 30, GRANT_MAX].every(validDays)).toBe(true);
    expect([0, -1, 731, 1.5, Number.NaN].some(validDays)).toBe(false);
    const sql = readFileSync("supabase/migrations/20261107140000_admin_subscriptions.sql", "utf8");
    expect(sql).toContain(`p_days > ${GRANT_MAX}`);
  });
  it("a grant starts from the later of now / the current end", () => {
    expect(grantEnd(null, 30, NOW).toISOString()).toBe("2026-12-07T10:00:00.000Z");
    expect(grantEnd("2026-11-17T10:00:00Z", 30, NOW).toISOString()).toBe("2026-12-17T10:00:00.000Z");
    expect(grantEnd("2026-10-01T10:00:00Z", 30, NOW).toISOString()).toBe("2026-12-07T10:00:00.000Z");
  });
  it("days left", () => {
    expect(daysLeft("2026-11-08T09:00:00Z", NOW)).toBe(1);
    expect(daysLeft("2026-11-01T00:00:00Z", NOW)).toBe(0);
    expect(daysLeft(null, NOW)).toBe(0);
  });
});

describe("wording", () => {
  it("has every ac_ key in every language, with the same placeholders", () => {
    const keys = Object.keys(dictionaries.fr).filter((k) => k.startsWith("ac_")) as TKey[];
    expect(keys.length).toBeGreaterThan(80);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of keys) for (const l of LANGS) {
      expect(dictionaries[l][k], `${l} ${k}`).toBeTruthy();
      expect(ph(dictionaries[l][k]), `${l} ${k}`).toBe(ph(dictionaries.fr[k]));
    }
  });
});
