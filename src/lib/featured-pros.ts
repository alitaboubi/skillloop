import type { Service } from "./data";
import { groupByPro, type ProSummary } from "./explore-filters";
import { FOUNDERS_CAP } from "./plan";

/**
 * Home "Pros à la une": built only from published services (real data, nothing written by hand).
 *
 * Founding members = the first FOUNDERS_CAP pros by their first service still published. This is derived from the public
 * list because public.subscriptions.founder (migration 20261029120000, prepared) is not applied yet; switch to that flag
 * once it is. The rank is only trusted when the list is complete (not cut by the query limit): otherwise no badge and no
 * count are shown rather than a guess.
 */

/** Most pros on the founders loop (the lead included); the rest are behind "+N" and come round in later weeks. */
export const SPOTLIGHT_MAX = 12;

export type FeaturedPro = ProSummary & {
  founder: boolean;
  /** Their newest service with a real photo, else their newest service. */
  cover: Service;
};

export type Spotlight = {
  /** Rotated for the week: [0] is "à la une cette semaine". */
  pros: FeaturedPro[];
  /** Every pro with a published service (pros may be cut to SPOTLIGHT_MAX). */
  total: number;
  /** Founding member places taken, or null when unknown. */
  foundersTaken: number | null;
};

const DAY = 86_400_000;
/** Tunisia is UTC+1 all year (no DST), so the week turns at Monday 00:00 in Tunis. */
const TUNIS_OFFSET = 3_600_000;

/** Weeks since the epoch, starting on Mondays (1970-01-01 was a Thursday). */
export function weekIndex(now: Date): number {
  return Math.floor(((now.getTime() + TUNIS_OFFSET) / DAY + 3) / 7);
}

const firstAt = (s: Service) => (s.publishedAt ? Date.parse(s.publishedAt) : Number.NaN);

export function spotlight(all: Service[], opts: { now: Date; complete: boolean; max?: number; foundersLeft?: number | null }): Spotlight {
  const max = opts.max ?? SPOTLIGHT_MAX;
  const pros = groupByPro(all);

  // Join order: earliest still-published service first (exact time when known, else whole days); ties by id so the
  // order never depends on the query's order.
  const since = new Map<string, number>();
  for (const s of all) {
    if (!s.ownerId) continue;
    const at = firstAt(s);
    const t = Number.isNaN(at) ? opts.now.getTime() - s.publishedDaysAgo * DAY : at;
    since.set(s.ownerId, Math.min(since.get(s.ownerId) ?? Infinity, t));
  }
  const joined = [...pros].sort((a, b) => (since.get(a.ownerId)! - since.get(b.ownerId)!) || (a.ownerId < b.ownerId ? -1 : a.ownerId > b.ownerId ? 1 : 0));

  const featured: FeaturedPro[] = joined.map((p, rank) => {
    const own = all.filter((s) => s.ownerId === p.ownerId);
    const cover = own.find((s) => s.hasPhoto) ?? own[0]!;
    return { ...p, founder: opts.complete && rank < FOUNDERS_CAP, cover };
  });

  // Fair rotation: everyone takes the lead in turn, one week each, in join order.
  const n = featured.length;
  const offset = n ? weekIndex(opts.now) % n : 0;
  const rotated = [...featured.slice(offset), ...featured.slice(0, offset)].slice(0, max);

  const foundersTaken = typeof opts.foundersLeft === "number"
    ? Math.max(0, FOUNDERS_CAP - opts.foundersLeft)
    : opts.complete ? Math.min(n, FOUNDERS_CAP) : null;

  return { pros: rotated, total: n, foundersTaken };
}

/* ---------- The founders loop (∞) ---------- */

/**
 * The loop is the 1:2 Lissajous figure x = −cos θ, y = sin 2θ (an ∞), drawn by two CSS animations: X alternates over half a
 * lap, Y over a quarter (eased like a sine). Each pro sits at phase φ = θ / 2π. The centre crossing is at φ = ¼ and ¾,
 * so two pros meet there only if their phases differ by exactly ½: an odd number of slots makes that impossible (with an
 * even number of pros one slot stays empty).
 */
export type LoopSpot = { phase: number; x: number; y: number };

export function loopLayout(n: number): LoopSpot[] {
  const slots = n % 2 === 0 ? n + 1 : n;
  return Array.from({ length: n }, (_, i) => {
    const phase = i / slots;
    const th = 2 * Math.PI * phase;
    return { phase, x: -Math.cos(th), y: Math.sin(2 * th) };
  });
}

/** SVG path of the same ∞, centred on 0: |x| ≤ ax, |y| ≤ ay (in the caller's units). */
export function loopPath(ax: number, ay: number, steps = 96): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const th = (2 * Math.PI * i) / steps;
    pts.push(`${(-Math.cos(th) * ax).toFixed(2)} ${(Math.sin(2 * th) * ay).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
