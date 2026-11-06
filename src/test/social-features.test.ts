import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dictionaries, type Lang, type TKey } from "@/lib/i18n";
import { parseFeed, targetOf, vars, isolate } from "@/lib/notifications";
import {
  PEOPLE_MAX, SOCIAL_FEATURES_ENABLED, TITLE_MAX, checkDraft, consentSummary, normalizeFacebook, normalizeInstagram,
  parseMyFeatures, parsePeopleHits, parsePosts, parsePublicFeatures, platformsOf, primaryUrl, socialErrorKey,
} from "@/lib/social-features";

const LANGS: Lang[] = ["fr", "en", "ar"];
const IG = "https://www.instagram.com/reel/DQx1AbC_9-z/";
const sql = readFileSync("supabase/migrations/20261106140000_social_features.sql", "utf8");
/** The database's own link rules, so the app never sends a link the database would refuse (or the reverse). */
const dbRule = (col: string) => new RegExp(sql.match(new RegExp(`${col} ~ '([^']+)'`))![1]!.replace(/\\\\/g, "\\"));

describe("Instagram links", () => {
  it("normalise every common shape to the stored one", () => {
    for (const raw of [
      "https://www.instagram.com/reel/DQx1AbC_9-z/",
      "https://www.instagram.com/reel/DQx1AbC_9-z/?igsh=MTc4MmM1YmI2Ng==",
      "instagram.com/reels/DQx1AbC_9-z",
      "http://m.instagram.com/reel/DQx1AbC_9-z/?utm_source=ig_web_copy_link",
      "https://www.instagram.com/skillloop_tunisia/reel/DQx1AbC_9-z/",
      "  https://www.instagram.com/reel/DQx1AbC_9-z  ",
    ]) expect(normalizeInstagram(raw), raw).toBe(IG);
    expect(normalizeInstagram("https://www.instagram.com/p/C0deX12/")).toBe("https://www.instagram.com/p/C0deX12/");
    expect(normalizeInstagram("https://www.instagram.com/tv/C0deX12")).toBe("https://www.instagram.com/tv/C0deX12/");
  });

  it("refuse everything else", () => {
    for (const raw of [
      "", "https://www.instagram.com/skillloop_tunisia/", "https://instagram.com.evil.example/reel/DQx1AbC_9-z/",
      "https://evil.example/reel/DQx1AbC_9-z/", "javascript:alert(1)", "https://www.instagram.com/reel/ab/",
      "https://www.instagram.com/reel/<script>/", "ftp://www.instagram.com/reel/DQx1AbC_9-z/",
      "https://www.instagram.com/a/b/reel/DQx1AbC_9-z/",
    ]) expect(normalizeInstagram(raw), raw).toBeNull();
  });

  it("always produce what the database accepts", () => {
    const rule = dbRule("instagram_url");
    expect(rule.test(IG)).toBe(true);
    expect(rule.test(normalizeInstagram("https://www.instagram.com/p/C0deX12/?img_index=1")!)).toBe(true);
    expect(rule.test("https://www.instagram.com/reel/DQx1AbC_9-z/?igsh=x")).toBe(false);
  });
});

describe("Facebook links", () => {
  it("keep the post, drop the tracking", () => {
    expect(normalizeFacebook("https://www.facebook.com/reel/1234567890?mibextid=rS40aB7S9Ucbxw6v")).toBe("https://www.facebook.com/reel/1234567890");
    expect(normalizeFacebook("https://m.facebook.com/watch/?v=987654321&rdid=abc&fbclid=xyz")).toBe("https://www.facebook.com/watch/?v=987654321");
    expect(normalizeFacebook("facebook.com/share/r/1AbCdEf/")).toBe("https://www.facebook.com/share/r/1AbCdEf/");
    expect(normalizeFacebook("https://web.facebook.com/SkillLoop-Tunisia-61595942581358/videos/123/")).toBe("https://www.facebook.com/SkillLoop-Tunisia-61595942581358/videos/123/");
    expect(normalizeFacebook("https://fb.watch/abC12_x/?mibextid=1")).toBe("https://fb.watch/abC12_x/");
  });

  it("refuse other sites and the bare home page", () => {
    expect(normalizeFacebook("https://www.facebook.com/watch/?v=<b>")).toBe("https://www.facebook.com/watch/");
    for (const raw of ["", "https://www.facebook.com/", "https://facebook.com.evil.example/x", "https://fb.watch/", "javascript:alert(1)"])
      expect(normalizeFacebook(raw), raw).toBeNull();
  });

  it("always produce what the database accepts", () => {
    const rule = dbRule("facebook_url");
    for (const raw of ["https://m.facebook.com/watch/?v=987654321&fbclid=x", "https://fb.watch/abC12_x", "https://www.facebook.com/reel/1234567890"])
      expect(rule.test(normalizeFacebook(raw)!), raw).toBe(true);
  });
});

describe("the operator's form", () => {
  const ok = { title: "Mohamed, plombier à Sfax", instagram: IG, facebook: "", people: ["a"] };
  it("accepts a good post", () => expect(checkDraft(ok)).toBeNull());
  it("points at the first problem", () => {
    expect(checkDraft({ ...ok, title: " ab " })?.field).toBe("title");
    expect(checkDraft({ ...ok, title: "x".repeat(TITLE_MAX + 1) })?.field).toBe("title");
    expect(checkDraft({ ...ok, instagram: "https://evil.example" })?.field).toBe("instagram");
    expect(checkDraft({ ...ok, facebook: "nope" })?.field).toBe("facebook");
    expect(checkDraft({ ...ok, instagram: " ", facebook: "" })?.field).toBe("links");
    expect(checkDraft({ ...ok, people: Array.from({ length: PEOPLE_MAX + 1 }, (_, i) => `p${i}`) })?.field).toBe("people");
  });
  it("mirrors the database's people limit", () => expect(sql).toContain(`cardinality(people) > ${PEOPLE_MAX}`));
  it("maps database errors to messages", () => {
    expect(socialErrorKey({ message: "announce_too_soon" })).toBe("sf_err_announce_soon");
    expect(socialErrorKey({ message: "too_many_people" })).toBe("sf_err_people");
    expect(socialErrorKey({ message: "unknown_person" })).toBe("sf_err_unknown_person");
    expect(socialErrorKey(new Error("network"))).toBe("sf_err_generic");
    expect(socialErrorKey(null)).toBe("sf_err_generic");
  });
});

describe("reading the database", () => {
  const raw = [{
    id: "p1", title: "Plombier à Sfax", instagram_url: IG, facebook_url: null, published_at: "2026-11-06T10:00:00Z", announced_at: null,
    people: [
      { id: "u1", name: "Amira", city: "Sfax", avatar_url: "u1/a.jpg", pro: true, choice: "shown", notified: true },
      { id: "u2", name: "Karim", choice: "weird" },
      { id: "", name: "Ghost" },
    ],
  }, { id: "p2", title: "Lien piégé", instagram_url: "javascript:alert(1)", facebook_url: null }, "garbage", null];

  it("keeps valid posts and people, drops the rest", () => {
    const posts = parsePosts(raw);
    expect(posts).toHaveLength(1);
    expect(posts[0]!.people.map((p) => [p.id, p.choice])).toEqual([["u1", "shown"], ["u2", "pending"]]);
    expect(posts[0]!.people[0]).toMatchObject({ avatarPath: "u1/a.jpg", pro: true, notified: true });
    expect(parsePosts("nope")).toEqual([]);
  });

  it("never renders a link of another shape", () => {
    expect(parsePublicFeatures([{ id: "x", title: "t", instagram_url: "https://evil.example/reel/abcdef/", published_at: "2026-11-06T10:00:00Z" }])).toEqual([]);
    expect(parsePublicFeatures([{ id: "x", title: "t", instagram_url: `${IG}?igsh=1`, published_at: "2026-11-06T10:00:00Z" }])).toEqual([]);
  });

  it("needs a publication date for the person's and the public lists", () => {
    expect(parseMyFeatures([{ id: "x", title: "t", instagram_url: IG, choice: "shown" }])).toEqual([]);
    expect(parseMyFeatures([{ id: "x", title: "t", instagram_url: IG, published_at: "2026-11-06T10:00:00Z", choice: "hidden" }])[0]!.choice).toBe("hidden");
  });

  it("reads people search results", () => {
    expect(parsePeopleHits([{ id: "u1", name: " Amira ", pro: false }, { id: "u2", name: "" }])).toEqual([{ id: "u1", name: "Amira", city: null, avatarPath: null, pro: false }]);
  });

  it("summarises consent and picks the link", () => {
    const people = parsePosts(raw)[0]!.people;
    expect(consentSummary(people)).toEqual({ shown: 1, hidden: 0, pending: 1 });
    expect(primaryUrl({ instagramUrl: null, facebookUrl: "https://fb.watch/x/" })).toBe("https://fb.watch/x/");
    expect(primaryUrl({ instagramUrl: IG, facebookUrl: "https://fb.watch/x/" })).toBe(IG);
    expect(platformsOf({ instagramUrl: IG, facebookUrl: null })).toEqual(["instagram"]);
  });
});

describe("feature notifications", () => {
  const feed = (kind: string, url: unknown) => parseFeed({ unread: 1, items: [{ id: "n1", kind, created_at: "2026-11-06T10:00:00Z", feature_title: "Plombier à Sfax", feature_url: url }] }).items[0]!;

  it("open the video sheet, for the people in it (you) and for everyone (new)", () => {
    expect(targetOf(feed("feature_you", IG))).toEqual({ kind: "feature", sheet: { mode: "you", title: "Plombier à Sfax", instagramUrl: IG, facebookUrl: null, publishedAt: null } });
    expect(targetOf(feed("feature_new", IG))).toMatchObject({ kind: "feature", sheet: { mode: "new", instagramUrl: IG } });
  });

  it("carry both links and the date (20261107120000), else place the single link on its platform", () => {
    const FB = "https://www.facebook.com/reel/1234567890";
    const both = parseFeed({ items: [{ id: "n1", kind: "feature_new", created_at: "2026-11-06T10:00:00Z", feature_title: "T", feature_url: IG,
      feature_instagram_url: IG, feature_facebook_url: FB, feature_published_at: "2026-11-06T09:00:00Z" }] }).items[0]!;
    expect(targetOf(both)).toEqual({ kind: "feature", sheet: { mode: "new", title: "T", instagramUrl: IG, facebookUrl: FB, publishedAt: "2026-11-06T09:00:00Z" } });
    const fbOnly = feed("feature_new", FB);
    expect([fbOnly.featureInstagramUrl, fbOnly.featureFacebookUrl]).toEqual([null, FB]);
  });

  it("never open a link that is not SkillLoop's own post shape; a deleted post leads to the dashboard", () => {
    expect(feed("feature_new", "https://evil.example/").featureUrl).toBeNull();
    const bad = parseFeed({ items: [{ id: "n1", kind: "feature_new", created_at: "2026-11-06T10:00:00Z", feature_instagram_url: "javascript:alert(1)", feature_facebook_url: "https://evil.example/x" }] }).items[0]!;
    expect(targetOf(bad)).toMatchObject({ to: "/dashboard" });
    expect(targetOf(feed("feature_you", null))).toMatchObject({ to: "/dashboard" });
  });

  it("put the post title in the sentence", () => {
    expect(vars(feed("feature_you", IG), "x", "y").title).toBe(isolate("Plombier à Sfax"));
    expect(vars({ ...feed("feature_you", IG), featureTitle: null }, "x", "y").title).toBe(isolate("SkillLoop"));
  });
});

describe("wording and flag", () => {
  it("is off in tests (pinned) — nothing calls the database", () => expect(SOCIAL_FEATURES_ENABLED).toBe(false));

  it("has every sf_ key in every language, with the same placeholders", () => {
    const keys = Object.keys(dictionaries.fr).filter((k) => k.startsWith("sf_") || k.startsWith("nt_feature_")) as TKey[];
    expect(keys.length).toBeGreaterThan(50);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of keys) for (const lang of LANGS) {
      expect(dictionaries[lang][k], `${lang} ${k}`).toBeTruthy();
      expect(ph(dictionaries[lang][k]), `${lang} ${k}`).toBe(ph(dictionaries.fr[k]));
    }
  });
});
