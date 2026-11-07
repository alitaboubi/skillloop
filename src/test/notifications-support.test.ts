import { describe, expect, it } from "vitest";
import { dictionaries, type Lang } from "@/lib/i18n";
import { KIND_SPEC, NOTIFICATION_KINDS, badgeText, isolate, groupByAge, parseFeed, targetOf, vars, type AppNotification } from "@/lib/notifications";
import { HELP_TOPICS, SUPPORT_MAX, checkBody, launcherHiddenOnPhone, normalizeWhatsApp, pagePath, supportErrorKey, unreadFromTeam } from "@/lib/support";
import { parseAdminThread, parseInbox } from "@/lib/support-db";
import { readFileSync } from "node:fs";

const LANGS: Lang[] = ["fr", "en", "ar"];
const note = (o: Partial<AppNotification>): AppNotification => ({
  id: "n1", kind: "request_new", createdAt: "2026-11-06T10:00:00Z", read: false,
  requestId: "r1", serviceId: "s1", serviceTitle: "Plomberie", actorName: "Amira", featureTitle: null, featureUrl: null, featureInstagramUrl: null, featureFacebookUrl: null, featurePublishedAt: null, ...o,
});

describe("notification kinds", () => {
  it("match the database check list exactly (the latest migration that redefines it)", () => {
    const sql = readFileSync("supabase/migrations/20261106140000_social_features.sql", "utf8");
    const list = sql.match(/notifications_kind_check check \(kind in \(([\s\S]*?)\)\)/)![1]!.match(/'([a-z_]+)'/g)!.map((s) => s.slice(1, -1));
    expect([...list].sort()).toEqual([...NOTIFICATION_KINDS].sort());
  });

  it("have a title and a body in every language; titles never need a name (they are also toasts)", () => {
    for (const kind of NOTIFICATION_KINDS) {
      const spec = KIND_SPEC[kind];
      for (const lang of LANGS) {
        expect(dictionaries[lang][spec.title], `${lang} ${spec.title}`).toBeTruthy();
        expect(dictionaries[lang][spec.body], `${lang} ${spec.body}`).toBeTruthy();
        expect(dictionaries[lang][spec.title]).not.toMatch(/\{/);
      }
    }
  });

  it("use the same placeholders in fr, en and ar", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const kind of NOTIFICATION_KINDS) {
      const k = KIND_SPEC[kind].body;
      expect(ph(dictionaries.en[k]), k).toBe(ph(dictionaries.fr[k]));
      expect(ph(dictionaries.ar[k]), k).toBe(ph(dictionaries.fr[k]));
    }
  });
});

describe("parseFeed", () => {
  it("keeps valid rows, drops unknown kinds and malformed rows", () => {
    const feed = parseFeed({
      unread: 2,
      items: [
        { id: "a", kind: "request_new", created_at: "2026-11-06T10:00:00Z", read_at: null, request_id: "r", service_id: "s", service_title: "T", actor_name: "Amira" },
        { id: "b", kind: "welcome", created_at: "2026-11-05T10:00:00Z", read_at: "2026-11-05T11:00:00Z", actor_name: null },
        { id: "c", kind: "hacked", created_at: "2026-11-05T10:00:00Z" },
        { id: "d", kind: "welcome", created_at: "nope" },
        null,
      ],
    });
    expect(feed.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(feed.items[0]).toMatchObject({ read: false, requestId: "r", serviceTitle: "T", actorName: "Amira" });
    expect(feed.items[1]).toMatchObject({ read: true, actorName: null });
    expect(feed.unread).toBe(2);
  });
  it("never reports fewer unread than it shows, and survives garbage", () => {
    expect(parseFeed({ unread: 0, items: [{ id: "a", kind: "welcome", created_at: "2026-11-06T10:00:00Z" }] }).unread).toBe(1);
    expect(parseFeed("x")).toEqual({ unread: 0, items: [] });
  });
});

describe("targets and wording", () => {
  it("leads each kind to the right place", () => {
    expect(targetOf(note({ kind: "request_new" }))).toEqual({ kind: "link", to: "/messages", search: { r: "r1" } });
    expect(targetOf(note({ kind: "job_completed" }))).toEqual({ kind: "link", to: "/messages", search: { r: "r1" } });
    expect(targetOf(note({ kind: "service_live" }))).toEqual({ kind: "link", to: "/services/$id", params: { id: "s1" } });
    expect(targetOf(note({ kind: "review_new" }))).toEqual({ kind: "link", to: "/dashboard", search: { mode: "provider", section: "reviews" } });
    expect(targetOf(note({ kind: "support_reply" }))).toEqual({ kind: "support" });
    expect(targetOf(note({ kind: "support_new" }))).toEqual({ kind: "link", to: "/admin", search: { section: "messages" } });
    expect(targetOf(note({ kind: "request_accepted", requestId: null }))).toMatchObject({ to: "/dashboard" });
  });
  it("names a deleted account by its fixed label", () => {
    expect(vars(note({ actorName: "" }), "Compte supprimé", "Quelqu’un").name).toBe(isolate("Compte supprimé"));
    expect(vars(note({ actorName: null }), "Compte supprimé", "Quelqu’un").name).toBe(isolate("Quelqu’un"));
    expect(vars(note({ serviceTitle: null }), "x", "y").service).toBe(isolate("SkillLoop"));
    expect(vars(note({ actorName: " Amira " }), "x", "y").name).toBe("\u2068Amira\u2069");
  });
  it("groups by age and caps the badge", () => {
    const now = new Date(2026, 10, 6, 15, 0);
    const g = groupByAge([
      note({ id: "old", createdAt: new Date(2026, 9, 1).toISOString() }),
      note({ id: "today", createdAt: new Date(2026, 10, 6, 9, 0).toISOString() }),
      note({ id: "week", createdAt: new Date(2026, 10, 3).toISOString() }),
    ], now);
    expect(g.map((x) => [x.key, x.items.map((i) => i.id)])).toEqual([["today", ["today"]], ["week", ["week"]], ["earlier", ["old"]]]);
    expect(badgeText(3)).toBe("3");
    expect(badgeText(12)).toBe("9+");
  });
});

describe("support rules", () => {
  it("normalizes WhatsApp numbers (8 digits = Tunisia) and rejects junk", () => {
    expect(normalizeWhatsApp("22 123 456")).toBe("21622123456");
    expect(normalizeWhatsApp("+216 22 123 456")).toBe("21622123456");
    expect(normalizeWhatsApp("0021622123456")).toBe("21622123456");
    expect(normalizeWhatsApp("call me")).toBeNull();
    expect(normalizeWhatsApp("")).toBeNull();
    expect(normalizeWhatsApp(undefined)).toBeNull();
  });
  it("mirrors the database text rule", () => {
    expect(checkBody("   ")).toBe("empty");
    expect(checkBody("Bonjour")).toBeNull();
    expect(checkBody("x".repeat(SUPPORT_MAX))).toBeNull();
    expect(checkBody("x".repeat(SUPPORT_MAX + 1))).toBe("too_long");
  });
  it("sends only an internal path, never query strings", () => {
    expect(pagePath("/services/abc?ref=mail#top")).toBe("/services/abc");
    expect(pagePath("https://evil.example")).toBeNull();
    expect(pagePath("/" + "a".repeat(300))!.length).toBe(200);
  });
  it("maps database errors to messages", () => {
    expect(supportErrorKey({ message: "support_limit: too many messages" })).toBe("sup_err_limit");
    expect(supportErrorKey({ message: "not_signed_in" })).toBe("sup_err_signin");
    expect(supportErrorKey(new Error("network"))).toBe("sup_err_send");
  });
  it("counts team replies after the read marker", () => {
    const m = [
      { id: "1", fromTeam: false, body: "a", createdAt: "2026-11-06T10:00:00Z" },
      { id: "2", fromTeam: true, body: "b", createdAt: "2026-11-06T11:00:00Z" },
      { id: "3", fromTeam: true, body: "c", createdAt: "2026-11-06T12:00:00Z" },
    ];
    expect(unreadFromTeam(m, null)).toBe(2);
    expect(unreadFromTeam(m, "2026-11-06T11:30:00Z")).toBe(1);
  });
  it("hides the floating button on phone pages with their own bottom bar only", () => {
    expect(launcherHiddenOnPhone("/messages")).toBe(true);
    expect(launcherHiddenOnPhone("/services/123")).toBe(true);
    expect(launcherHiddenOnPhone("/offer")).toBe(true);
    expect(launcherHiddenOnPhone("/")).toBe(false);
    expect(launcherHiddenOnPhone("/explore")).toBe(false);
    expect(launcherHiddenOnPhone("/pros/123")).toBe(false);
  });
  it("has every quick answer in every language", () => {
    for (const h of HELP_TOPICS) for (const lang of LANGS) {
      expect(dictionaries[lang][h.q]).toBeTruthy();
      expect(dictionaries[lang][h.a]).toBeTruthy();
      if (h.cta) expect(dictionaries[lang][h.cta.label]).toBeTruthy();
    }
  });
  it("reads the operator inbox and thread defensively", () => {
    expect(parseInbox([{ user_id: "u", name: "Amira", status: "closed", last_message_at: "t", last_body: "b", last_from_team: true, unread: 2 }, { name: "no id" }]))
      .toEqual([{ userId: "u", name: "Amira", status: "closed", lastAt: "t", lastBody: "b", lastFromTeam: true, unread: 2 }]);
    expect(parseInbox(null)).toEqual([]);
    const th = parseAdminThread({ user: { id: "u", name: "A", services: 1, requests: -3 }, status: "x", messages: [{ id: "m", from_team: false, body: "hi", created_at: "t", page: "/offer" }] });
    expect(th.status).toBe("open");
    expect(th.user.requests).toBe(0);
    expect(th.messages[0]).toMatchObject({ fromTeam: false, page: "/offer" });
  });
});
