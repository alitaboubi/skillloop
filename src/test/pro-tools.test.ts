import { describe, expect, it } from "vitest";
import { QR_MAX_VERSION, encodeQr, formatBits, qrPath, qrVersionFor, rsRemainder, versionBits } from "@/lib/qr";
import { CARD_SIZE_MM, anchorFor, buildCardSvg, clip, escapeXml, nameSize, qrLink } from "@/lib/pro-card";
import { PRO_TOOLS_ENABLED, addDays, shouldRecord, summarizeStats } from "@/lib/pro-tools";
import { MOTION_MAX_BYTES, checkDuration, checkVideoFile, cropTo43, formatDuration, motionPath } from "@/lib/motion";
import { readTheme, writeTheme } from "@/lib/carnet";
import { limitMessage, planRequiredKindOf } from "@/lib/limits";
import { markCardSaved, proSteps, readCardSaved } from "@/lib/pro-onboarding";

describe("QR encoder (ISO/IEC 18004, level M)", () => {
  it("computes Reed–Solomon codewords (known 1-M vector)", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(rsRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it("builds the standard format and version bits", () => {
    expect(formatBits(0).toString(2).padStart(15, "0")).toBe("101010000010010");
    expect(formatBits(5).toString(2).padStart(15, "0")).toBe("100000011001110");
    expect(formatBits(7).toString(2).padStart(15, "0")).toBe("100101010100000");
    expect(versionBits(7).toString(2).padStart(18, "0")).toBe("000111110010010100");
  });

  it("picks the smallest version and refuses text past version 15", () => {
    expect(qrVersionFor(14)).toBe(1);
    expect(qrVersionFor(15)).toBe(2);
    expect(qrVersionFor(84)).toBe(5);
    expect(qrVersionFor(412)).toBe(QR_MAX_VERSION);
    expect(qrVersionFor(413)).toBeNull();
    expect(() => encodeQr("x".repeat(413))).toThrow("qr_too_long");
  });

  it("draws finder patterns, timing and the dark module", () => {
    const q = encodeQr("https://skillloop.example/pros/3f2a9c1e-1b2c-4d5e-8f90-123456789abc?via=qr");
    expect(q.size).toBe(q.version * 4 + 17);
    for (const [cx, cy] of [[3, 3], [q.size - 4, 3], [3, q.size - 4]] as const) {
      expect(q.dark(cx, cy)).toBe(true); // centre
      expect(q.dark(cx + 2, cy)).toBe(false); // light ring
      expect(q.dark(cx + 3, cy)).toBe(true); // outer ring
    }
    for (let i = 8; i < q.size - 8; i++) expect(q.dark(i, 6)).toBe(i % 2 === 0);
    expect(q.dark(8, q.size - 8)).toBe(true);
    expect(q.dark(-1, 0)).toBe(false);
  });

  it("is deterministic and renders one path of dark modules", () => {
    const a = encodeQr("SkillLoop"), b = encodeQr("SkillLoop");
    expect(qrPath(a)).toBe(qrPath(b));
    expect(qrPath(a, 2)).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });
});

describe("Pro card", () => {
  const input = { name: "Ali <Taboubi>", title: "Motion & design", place: "Sousse", url: "https://x.test/pros/1?via=qr", scanLabel: "Scan", stickerTitle: "Find me", rtl: false };

  it("escapes user text (never markup from a profile)", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;");
    const svg = buildCardSvg(input, "card");
    expect(svg).toContain("Ali &lt;Taboubi&gt;");
    expect(svg).toContain("Motion &amp; design");
    expect(svg).not.toContain("<Taboubi>");
  });

  it("prints at real size", () => {
    expect(buildCardSvg(input, "card")).toContain(`width="${CARD_SIZE_MM.card.w}mm" height="${CARD_SIZE_MM.card.h}mm"`);
    expect(buildCardSvg(input, "sticker")).toContain('width="80mm" height="80mm"');
  });

  it("mirrors the layout for Arabic and keeps long names on one line", () => {
    expect(anchorFor("left")).toBe("start");
    expect(anchorFor("right")).toBe("end");
    expect(anchorFor("center")).toBe("middle");
    expect(buildCardSvg({ ...input, rtl: true }, "card")).toContain('text-anchor="end"');
    expect(nameSize("Ali", 58, 14)).toBe(58);
    expect(nameSize("A very very long professional name", 58, 14)).toBeLessThan(58);
    expect(clip("Plomberie et chauffage pour toute la région de Sousse", 30)).toBe("Plomberie et chauffage pour…");
    expect(clip("Court", 30)).toBe("Court");
  });

  it("links to the public profile, marked as a QR scan", () => {
    expect(qrLink("abc")).toMatch(/\/pros\/abc\?via=qr$/);
  });
});

describe("Statistics", () => {
  it("is off in tests (env pinned)", () => expect(PRO_TOOLS_ENABLED).toBe(false));

  it("counts a view once per session, clicks every time", () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(shouldRecord("profile_view", "p1", st)).toBe(true);
    expect(shouldRecord("profile_view", "p1", st)).toBe(false);
    expect(shouldRecord("profile_view", "p2", st)).toBe(true);
    expect(shouldRecord("contact_click", "p1", st)).toBe(true);
    expect(shouldRecord("contact_click", "p1", st)).toBe(true);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => {} };
    expect(shouldRecord("qr_scan", "p1", broken)).toBe(true);
  });

  it("sums totals and fills every day of the period", () => {
    const s = summarizeStats({ since: "2026-10-01", days: 3, rows: [
      { day: "2026-10-01", kind: "profile_view", count: 4 },
      { day: "2026-10-01", kind: "qr_scan", count: 1 },
      { day: "2026-10-03", kind: "service_view", count: 2 },
      { day: "2026-10-02", kind: "request", count: 1 },
      { day: "2026-10-02", kind: "bogus", count: 99 },
      { day: "2026-10-02", kind: "share", count: -3 },
    ] });
    expect(s.totals).toEqual({ profile_view: 4, service_view: 2, qr_scan: 1, contact_click: 0, share: 0, request: 1 });
    expect(s.series).toEqual([{ day: "2026-10-01", views: 5 }, { day: "2026-10-02", views: 0 }, { day: "2026-10-03", views: 2 }]);
    expect(s.empty).toBe(false);
  });

  it("reads anything unexpected as an empty period", () => {
    const s = summarizeStats(null);
    expect(s.series).toHaveLength(30);
    expect(s.empty).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("Portfolio videos", () => {
  it("accepts MP4/WebM/MOV up to 8 MB and 15 s", () => {
    expect(checkVideoFile({ type: "video/mp4", size: 1000 })).toBeNull();
    expect(checkVideoFile({ type: "video/x-msvideo", size: 1000 })).toBe("motion_err_type");
    expect(checkVideoFile({ type: "video/webm", size: MOTION_MAX_BYTES + 1 })).toBe("motion_err_size");
    expect(checkDuration(15.04)).toBeNull();
    expect(checkDuration(16)).toBe("motion_err_long");
    expect(checkDuration(Number.NaN)).toBe("motion_err_read");
  });

  it("stores videos in the owner's motion folder (database rule)", () => {
    expect(motionPath("11111111-1111-1111-1111-111111111111", "video/quicktime", "22222222-2222-2222-2222-222222222222"))
      .toBe("11111111-1111-1111-1111-111111111111/motion/22222222-2222-2222-2222-222222222222.mov");
  });

  it("frames the poster at 4:3 and formats durations", () => {
    expect(cropTo43(1920, 1080)).toEqual({ sx: 240, sy: 0, sw: 1440, sh: 1080 });
    expect(cropTo43(1080, 1920)).toEqual({ sx: 0, sy: 555, sw: 1080, sh: 810 });
    expect(formatDuration(12.4)).toBe("0:12");
  });
});

describe("Carnet themes and Pro refusals", () => {
  it("reads only known themes and keeps other details", () => {
    expect(readTheme({ carnet_theme: "sea" })).toBe("sea");
    expect(readTheme({ carnet_theme: "neon" })).toBeNull();
    expect(writeTheme({ accepting: true, carnet_theme: "sea" }, null)).toEqual({ accepting: true });
    expect(writeTheme({ accepting: true }, "olive")).toEqual({ accepting: true, carnet_theme: "olive" });
  });

  it("maps the database's plan_required refusals only", () => {
    expect(planRequiredKindOf("plan_required:motion")).toBe("motion");
    expect(planRequiredKindOf({ message: "plan_required:themes" })).toBe("themes");
    expect(planRequiredKindOf("plan_required:everything")).toBeNull();
    expect(limitMessage("plan_required:stats")?.key).toBe("plan_required_stats");
  });
});

describe("Démarrer avec Pro (guided steps)", () => {
  const base = { hasVideo: false, hasTheme: false, cardSaved: false, hasVisits: false };
  it("lists the four tools in order, each done from real state", () => {
    const s = proSteps({ ...base, tools: true, hasTheme: true, hasVisits: true });
    expect(s.map((x) => x.id)).toEqual(["video", "theme", "card", "visit"]);
    expect(s.filter((x) => x.done).map((x) => x.id)).toEqual(["theme", "visit"]);
  });
  it("offers only the card while the other tools are off", () => {
    expect(proSteps({ ...base, tools: false }).map((x) => x.id)).toEqual(["card"]);
  });
  it("remembers a downloaded card on this device only", () => {
    expect(readCardSaved("u1")).toBe(false);
    markCardSaved("u1");
    expect(readCardSaved("u1")).toBe(true);
    expect(readCardSaved("u2")).toBe(false);
  });
});
