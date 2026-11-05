import { describe, expect, it } from "vitest";
import { loopLayout, loopPath, spotlight, weekIndex, SPOTLIGHT_MAX } from "@/lib/featured-pros";
import { CITIES } from "@/lib/data";
import { FOUNDERS_CAP } from "@/lib/plan";
import type { Service } from "@/lib/data";
import { dictionaries } from "@/lib/i18n";

const svc = (p: Partial<Service>): Service => ({
  id: "x", title: "T", description: "", category: "tech", price: 0, unit: "pm_fixed", city: "Tunis",
  remote: false, image: "", provider: "", delivery: "", languages: "", publishedDaysAgo: 0, ...p,
});

// Newest first, like the published list: c joined last, a first.
const list = [
  svc({ id: "c1", ownerId: "c", provider: "Sami", publishedAt: "2026-11-04T10:00:00Z" }),
  svc({ id: "a2", ownerId: "a", provider: "Amel", publishedAt: "2026-11-03T10:00:00Z", category: "design" }),
  svc({ id: "b1", ownerId: "b", provider: "Karim", publishedAt: "2026-11-02T10:00:00Z", hasPhoto: true, image: "b.jpg" }),
  svc({ id: "a1", ownerId: "a", provider: "Amel", publishedAt: "2026-11-01T10:00:00Z", hasPhoto: true, image: "a.jpg" }),
  svc({ id: "n1", provider: "No owner" }),
];

/** A date in the week with this index (Wednesday noon, Tunis). */
const inWeek = (w: number) => new Date((w * 7 - 3 + 2) * 86_400_000 + 11 * 3_600_000);

describe("weekIndex", () => {
  it("turns on Monday 00:00 Tunis time (UTC+1)", () => {
    expect(weekIndex(new Date("2026-11-08T22:59:00Z"))).toBe(weekIndex(new Date("2026-11-02T00:00:00Z")));
    expect(weekIndex(new Date("2026-11-08T23:00:00Z"))).toBe(weekIndex(new Date("2026-11-02T00:00:00Z")) + 1);
  });
});

describe("spotlight (Pros à la une)", () => {
  it("one card per pro, in join order, rotating the lead every week", () => {
    const w = 3 * 1000; // a multiple of 3 → offset 0 with 3 pros
    expect(spotlight(list, { now: inWeek(w), complete: true }).pros.map((p) => p.ownerId)).toEqual(["a", "b", "c"]);
    expect(spotlight(list, { now: inWeek(w + 1), complete: true }).pros.map((p) => p.ownerId)).toEqual(["b", "c", "a"]);
    expect(spotlight(list, { now: inWeek(w + 2), complete: true }).pros.map((p) => p.ownerId)).toEqual(["c", "a", "b"]);
    expect(spotlight(list, { now: inWeek(w + 3), complete: true }).pros.map((p) => p.ownerId)).toEqual(["a", "b", "c"]);
  });

  it("join order never depends on the list order", () => {
    const now = inWeek(3000);
    expect(spotlight([...list].reverse(), { now, complete: true }).pros.map((p) => p.ownerId)).toEqual(["a", "b", "c"]);
  });

  it("cover = newest service with a real photo, else newest service", () => {
    const { pros } = spotlight(list, { now: inWeek(3000), complete: true });
    expect(pros.find((p) => p.ownerId === "a")!.cover.id).toBe("a1");
    expect(pros.find((p) => p.ownerId === "c")!.cover.id).toBe("c1");
    expect(pros.find((p) => p.ownerId === "a")!.services).toBe(2);
  });

  it("founders and count only when the list is complete", () => {
    const done = spotlight(list, { now: inWeek(3000), complete: true });
    expect(done.foundersTaken).toBe(3);
    expect(done.pros.every((p) => p.founder)).toBe(true);
    const cut = spotlight(list, { now: inWeek(3000), complete: false });
    expect(cut.foundersTaken).toBeNull();
    expect(cut.pros.some((p) => p.founder)).toBe(false);
  });

  it("the database count wins when the Pro plan gives one", () => {
    expect(spotlight(list, { now: inWeek(3000), complete: true, foundersLeft: 88 }).foundersTaken).toBe(FOUNDERS_CAP - 88);
    expect(spotlight(list, { now: inWeek(3000), complete: false, foundersLeft: 0 }).foundersTaken).toBe(FOUNDERS_CAP);
  });

  it("only the first FOUNDERS_CAP pros are founders; at most SPOTLIGHT_MAX cards; everyone leads in turn", () => {
    const many = Array.from({ length: FOUNDERS_CAP + 5 }, (_, i) =>
      svc({ id: `s${i}`, ownerId: `p${String(i).padStart(3, "0")}`, publishedAt: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString() }));
    const leads = new Set<string>();
    for (let w = 0; w < many.length; w++) {
      const r = spotlight(many, { now: inWeek(5000 + w), complete: true });
      expect(r.pros.length).toBe(SPOTLIGHT_MAX);
      expect(r.total).toBe(many.length);
      for (const p of r.pros) expect(p.founder).toBe(Number(p.ownerId.slice(1)) < FOUNDERS_CAP);
      leads.add(r.pros[0]!.ownerId);
    }
    expect(leads.size).toBe(many.length);
    expect(spotlight(many, { now: inWeek(5000), complete: true }).foundersTaken).toBe(FOUNDERS_CAP);
  });

  it("empty list → nothing to show", () => {
    expect(spotlight([], { now: inWeek(1), complete: true })).toEqual({ pros: [], total: 0, foundersTaken: 0 });
  });

  it("copy exists in every language", () => {
    for (const d of Object.values(dictionaries)) {
      for (const k of ["fp_eyebrow", "fp_title", "fp_sub", "fp_week", "fp_all", "fp_loop_kicker", "fp_loop_t", "fp_loop_hint", "fp_loop_more", "fp_latest", "fp_see_service", "fp_founders_t", "fp_founders_d", "fp_founders_full"] as const) {
        expect(d[k].trim().length).toBeGreaterThan(0);
      }
      expect(d.fp_founders_d).toContain("{n}");
    }
  });
});

describe("founders loop (∞)", () => {
  it("no two pros ever reach the centre crossing together, for any count", () => {
    for (let n = 1; n <= SPOTLIGHT_MAX; n++) {
      const spots = loopLayout(n);
      expect(spots).toHaveLength(n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const d = Math.abs(spots[i]!.phase - spots[j]!.phase);
        expect(Math.abs(d - 0.5)).toBeGreaterThan(1e-9);
      }
    }
  });
  it("static places lie on the drawn ∞ (x = −cos θ, y = sin 2θ), first pro at the left end", () => {
    const [a, b] = loopLayout(3);
    expect(a).toMatchObject({ phase: 0, x: -1 });
    expect(a!.y).toBeCloseTo(0);
    const th = 2 * Math.PI * b!.phase;
    expect(b!.x).toBeCloseTo(-Math.cos(th));
    expect(b!.y).toBeCloseTo(Math.sin(2 * th));
    expect(loopPath(40, 37).startsWith("M-40.00 0.00L")).toBe(true);
  });
});

describe("governorates", () => {
  it("all 24 wilayas, once each", () => {
    expect(CITIES).toHaveLength(24);
    expect(new Set(CITIES).size).toBe(24);
    for (const c of ["Tunis", "Sousse", "Sfax", "Nabeul", "Bizerte", "Monastir", "Ariana", "Ben Arous", "Manouba", "Zaghouan", "Béja", "Jendouba", "Le Kef", "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Mahdia", "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili"]) {
      expect(CITIES).toContain(c);
    }
  });
});
