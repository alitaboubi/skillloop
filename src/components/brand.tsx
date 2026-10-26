import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Briefcase, Car, GraduationCap, HardHat, HeartHandshake, HeartPulse, Laptop, LayoutGrid, Palette, PartyPopper, School, Stethoscope, Wrench, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/lib/data";

/** One icon per category, shared by homepage tiles, explore chips and card fallbacks. */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  home: Wrench,
  tutoring: GraduationCap,
  tech: Laptop,
  design: Palette,
  automotive: Car,
  business: Briefcase,
  events: PartyPopper,
  personal: HeartHandshake,
  care: HeartPulse,
  healthcare: Stethoscope,
  engineering: HardHat,
  student: School,
  other: LayoutGrid,
};

/* ---------- Brand backdrop: contour lines + the SkillLoop "loop" ---------- */

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Wavy concentric rings — reads like a topographic map (local ground), drawn once at module load. */
function contours(cx: number, cy: number, rings: number, r0: number, step: number, seed: number) {
  const out: string[] = [];
  for (let k = 0; k < rings; k++) {
    const r = r0 + k * step;
    const pts: string[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const rr = r * (1 + 0.07 * Math.sin(3 * a + k * 0.55 + seed) + 0.04 * Math.cos(5 * a - k * 0.35 + seed));
      pts.push(`${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * 0.72 * Math.sin(a))}`);
    }
    out.push(`M${pts.join(" L")}Z`);
  }
  return out;
}

/** Lemniscate points — the same infinity loop as the logo, scaled up. Starts at the end-side tip. */
function loopPoints(cx: number, cy: number, a: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    pts.push([r1(cx + (a * Math.cos(t)) / d), r1(cy + (a * 1.15 * Math.sin(t) * Math.cos(t)) / d)]);
  }
  return pts;
}
const loop = (cx: number, cy: number, a: number) => `M${loopPoints(cx, cy, a).map(([x, y]) => `${x} ${y}`).join(" L")}`;

/** Each sample's position along the path as a 0–1 fraction (matches pathLength={1}). */
export function pathFractions(pts: Array<[number, number]>): number[] {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const total = acc[acc.length - 1]!;
  return acc.map((v) => v / total);
}

/** Fraction of the closest sample to (x, y). */
export function nearestFraction(pts: Array<[number, number]>, fr: number[], x: number, y: number): number {
  let best = 0, bd = Infinity;
  pts.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = i; } });
  return fr[best]! % 1;
}

/** Shortest signed distance from a to b around a closed 0–1 loop. */
export function wrapDelta(a: number, b: number): number {
  const d = (((b - a) % 1) + 1) % 1;
  return d > 0.5 ? d - 1 : d;
}

const HERO_CONTOURS = [...contours(1020, 120, 7, 70, 46, 0.4), ...contours(140, 560, 6, 60, 44, 2.1)];
const INTRO_CONTOURS = contours(1080, 60, 6, 60, 40, 1.3);
const HERO_PTS = loopPoints(600, 360, 480);
const HERO_FR = pathFractions(HERO_PTS);
const HERO_LOOP = loop(600, 360, 480);
const INTRO_LOOP = loop(1000, 150, 150);
const INTRO_PTS = loopPoints(1000, 150, 150);
const INTRO_FR = pathFractions(INTRO_PTS);
const INTRO_REST = 0.12;

/* ---------- Hero spark: "the loop finds you" ---------- */

const SPARK = 0.12; // lit share of the loop (strokeDasharray "0.12 0.88")
/** Where the spark rests per homepage intent: start-side lime node (find) or end-side clay node (offer). */
export const INTENT_STOP = { find: 0.5, offer: 0 } as const;
const NODES = [
  { at: 0.5, cx: 120, cy: 360, r: 5, cls: "fill-lime" },
  { at: 0, cx: 1080, cy: 360, r: 5, cls: "fill-clay" },
  { at: 0.25, cx: 600, cy: 360, r: 3.5, cls: "fill-navy-foreground/50" },
];
const sparkOffset = (center: number) => String(SPARK / 2 - center);

/**
 * Moves the hero spark along the loop. It rests on the selected intent's node; with a fine pointer it
 * glides toward the closest point of the loop and the layers shift a few pixels for depth.
 * Writes SVG attributes directly (no React state per frame) and the frame loop stops once settled.
 * Waits for the one-time CSS entrance to finish; reduced motion gets a static spark at the intent node.
 */
function useHeroSpark(svg: RefObject<SVGSVGElement | null>, intent: keyof typeof INTENT_STOP) {
  const target = useRef<(f: number | null) => void>(() => {});
  useEffect(() => {
    const el = svg.current;
    const host = el?.parentElement;
    const spark = el?.querySelector<SVGPathElement>("[data-spark]");
    const ground = el?.querySelector<SVGGElement>("[data-ground]");
    const fore = el?.querySelector<SVGGElement>("[data-fore]");
    const nodes = el ? Array.from(el.querySelectorAll<SVGCircleElement>("[data-node]")) : [];
    if (!el || !host || !spark || !ground || !fore) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let ready = reduced, cur = 0.12, goal: number = INTENT_STOP.find, rest: number = INTENT_STOP.find;
    let px = 0, py = 0, gx = 0, gy = 0, raf = 0, visible = true, lit = -1;

    const paint = () => {
      spark.style.strokeDashoffset = sparkOffset(cur);
      ground.setAttribute("transform", `translate(${(-7 * px).toFixed(2)} ${(-4 * py).toFixed(2)})`);
      fore.setAttribute("transform", `translate(${(4 * px).toFixed(2)} ${(2.5 * py).toFixed(2)})`);
      const on = NODES.findIndex((n) => Math.abs(wrapDelta(cur, n.at)) < 0.035 || (n.at === 0.25 && Math.abs(wrapDelta(cur, 0.75)) < 0.035));
      if (on !== lit) { nodes.forEach((n, i) => n.toggleAttribute("data-lit", i === on)); lit = on; }
    };
    const tick = () => {
      const d = wrapDelta(cur, goal);
      cur = (cur + Math.max(-0.018, Math.min(0.018, d * 0.09)) + 1) % 1;
      px += (gx - px) * 0.08;
      py += (gy - py) * 0.08;
      paint();
      raf = Math.abs(d) > 0.0006 || Math.abs(gx - px) > 0.002 || Math.abs(gy - py) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (ready && !raf) raf = requestAnimationFrame(tick); };
    target.current = (f) => {
      if (f !== null) rest = f;
      goal = rest;
      if (reduced) { cur = goal; paint(); } else kick();
    };

    // Start from where the CSS entrance trace ends, after it has played once.
    const begin = () => { if (ready) return; ready = true; spark.style.animation = "none"; paint(); kick(); };
    if (reduced) paint();
    else { spark.addEventListener("animationend", begin, { once: true }); }
    const fallback = reduced ? 0 : window.setTimeout(begin, 2200);

    // Pointer: viewBox 1200×600, preserveAspectRatio slice, mirrored in RTL.
    const onMove = (e: PointerEvent) => {
      if (!ready || !visible || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const k = Math.max(r.width / 1200, r.height / 600);
      let x = (e.clientX - r.left - (r.width - 1200 * k) / 2) / k;
      const y = (e.clientY - r.top - (r.height - 600 * k) / 2) / k;
      if (document.documentElement.dir === "rtl") x = 1200 - x;
      goal = nearestFraction(HERO_PTS, HERO_FR, x, y);
      gx = Math.max(-1, Math.min(1, (x - 600) / 600));
      gy = Math.max(-1, Math.min(1, (y - 300) / 300));
      kick();
    };
    const onLeave = () => { goal = rest; gx = 0; gy = 0; kick(); };
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (!visible) onLeave(); });
    io?.observe(host);
    if (fine && !reduced) {
      host.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      io?.disconnect();
      spark.removeEventListener("animationend", begin);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [svg]);
  useEffect(() => { target.current(INTENT_STOP[intent]); }, [intent]);
}

/**
 * Decorative, original brand surface. Hidden from assistive tech, never covers content,
 * mirrored in RTL. The hero variant draws its loop once on first paint (CSS only, so it
 * never replays on language/theme changes; static under reduced motion), then its spark
 * follows the homepage intent and, on desktop, the pointer.
 */
export function BrandBackdrop({ variant, intent = "find" }: { variant: "hero" | "intro"; intent?: keyof typeof INTENT_STOP }) {
  const hero = variant === "hero";
  const ref = useRef<SVGSVGElement>(null);
  return (
    <svg
      ref={ref}
      aria-hidden
      focusable="false"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full rtl:-scale-x-100"
    >
      {hero ? <HeroSpark svg={ref} intent={intent} /> : <IntroFlow svg={ref} />}
      <g data-ground fill="none" className="stroke-navy-foreground/[0.07]" strokeWidth="1">
        {(hero ? HERO_CONTOURS : INTRO_CONTOURS).map((d, i) => <path key={i} d={d} />)}
      </g>
      <g data-fore>
        <path d={hero ? HERO_LOOP : INTRO_LOOP} pathLength={1} fill="none" strokeWidth={hero ? 2 : 1.5} strokeLinecap="round" className={`stroke-clay/55 ${hero ? "loop-draw" : ""}`} />
        <path data-spark={hero || undefined} d={hero ? HERO_LOOP : INTRO_LOOP} pathLength={1} fill="none" strokeWidth={hero ? 3 : 2} strokeLinecap="round" strokeDasharray={`${SPARK} ${1 - SPARK}`} strokeDashoffset="-0.06" className={`stroke-lime/70 ${hero ? "loop-trace" : ""}`} />
        {hero && (
          <g className="loop-nodes">
            {NODES.map((n) => <circle key={n.at} data-node cx={n.cx} cy={n.cy} r={n.r} className={`loop-node ${n.cls}`} />)}
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Page intros and the profile cover: with a fine pointer (and no reduced motion) the spark glides to the closest
 * point of the small loop and the layers shift a few pixels (the light itself is PointerField). Transform/opacity
 * and the spark's dash offset only; touch and reduced motion keep the static artwork. Frame loop stops once settled.
 */
function useIntroFlow(svg: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const el = svg.current;
    const host = el?.parentElement;
    const spark = el?.querySelector<SVGPathElement>("path[stroke-dasharray]");
    const ground = el?.querySelector<SVGGElement>("[data-ground]");
    const fore = el?.querySelector<SVGGElement>("[data-fore]");
    if (!el || !host || !spark || !ground || !fore) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let cur = INTRO_REST, goal = INTRO_REST, px = 0, py = 0, gx = 0, gy = 0, raf = 0;
    const paint = () => {
      spark.style.strokeDashoffset = sparkOffset(cur);
      ground.setAttribute("transform", `translate(${(-6 * px).toFixed(2)} ${(-4 * py).toFixed(2)})`);
      fore.setAttribute("transform", `translate(${(4 * px).toFixed(2)} ${(2.5 * py).toFixed(2)})`);
    };
    const tick = () => {
      const d = wrapDelta(cur, goal);
      cur = (cur + Math.max(-0.015, Math.min(0.015, d * 0.08)) + 1) % 1;
      px += (gx - px) * 0.07; py += (gy - py) * 0.07;
      paint();
      const moving = Math.abs(d) > 0.0006 || Math.abs(gx - px) > 0.002 || Math.abs(gy - py) > 0.002;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const k = Math.max(r.width / 1200, r.height / 600);
      let x = (e.clientX - r.left - (r.width - 1200 * k) / 2) / k;
      const y = (e.clientY - r.top - (r.height - 600 * k) / 2) / k;
      if (document.documentElement.dir === "rtl") x = 1200 - x;
      goal = nearestFraction(INTRO_PTS, INTRO_FR, x, y);
      gx = Math.max(-1, Math.min(1, (x - 600) / 600));
      gy = Math.max(-1, Math.min(1, (y - 300) / 300));
      kick();
    };
    const onLeave = () => { goal = INTRO_REST; gx = 0; gy = 0; kick(); };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [svg]);
}

function IntroFlow({ svg }: { svg: RefObject<SVGSVGElement | null> }) {
  useIntroFlow(svg);
  return null;
}

/** Renders nothing; isolates the hero spark effect so the SVG markup stays declarative. */
function HeroSpark({ svg, intent }: { svg: RefObject<SVGSVGElement | null>; intent: keyof typeof INTENT_STOP }) {
  useHeroSpark(svg, intent);
  return null;
}

/* ---------- Pointer field: the map lights up where you are ---------- */

/**
 * Decorative layer for empty surfaces (ink bands, page heroes, the auth background, footer, empty states, 404).
 * A faint map dot-grid (static, always visible) that lights up around a fine pointer: a lime "torch" stretched a little
 * in the direction of travel, a slower clay trail behind it, a broad halo, and a soft ring on click.
 * The grid is a static CSS mask; only the lights move, by transform/opacity, from one rAF loop that stops once settled.
 * Touch devices and reduced motion get the static grid only. aria-hidden, pointer-events: none, never covers content
 * (the host's content must be positioned above it). Listens on the parent element.
 */
export function PointerField({ tone = "ink", className = "" }: { tone?: "ink" | "light"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerField(ref);
  return (
    <div ref={ref} aria-hidden className={`pointer-field ${tone === "light" ? "pf-light-tone" : ""} ${className}`}>
      <div className="pf-halo" data-pf="halo" />
      <div className="pf-dots">
        <div className="pf-trail" data-pf="trail" />
        <div className="pf-torch" data-pf="torch" />
      </div>
    </div>
  );
}

function usePointerField(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    const torch = el?.querySelector<HTMLElement>('[data-pf="torch"]');
    const trail = el?.querySelector<HTMLElement>('[data-pf="trail"]');
    const halo = el?.querySelector<HTMLElement>('[data-pf="halo"]');
    if (!el || !host || !torch || !trail || !halo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0, ty = 0, ax = 0, ay = 0, bx = 0, by = 0, hx = 0, hy = 0, vx = 0, vy = 0, raf = 0, placed = false;
    const place = (n: HTMLElement, x: number, y: number, extra = "") => { n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)${extra}`; };
    const tick = () => {
      const px = ax, py = ay;
      ax += (tx - ax) * 0.22; ay += (ty - ay) * 0.22;
      bx += (tx - bx) * 0.07; by += (ty - by) * 0.07;
      hx += (tx - hx) * 0.12; hy += (ty - hy) * 0.12;
      vx = vx * 0.8 + (ax - px) * 0.2; vy = vy * 0.8 + (ay - py) * 0.2;
      // Stretch along the direction of travel (max +45%), like light flowing over the map.
      const speed = Math.hypot(vx, vy);
      const s = 1 + Math.min(speed / 28, 0.45);
      const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
      place(torch, ax, ay, ` rotate(${deg.toFixed(1)}deg) scale(${s.toFixed(3)}, ${(1 / Math.sqrt(s)).toFixed(3)})`);
      place(trail, bx, by);
      place(halo, hx, hy);
      const moving = Math.abs(tx - bx) > 0.4 || Math.abs(ty - by) > 0.4 || speed > 0.05;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const point = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      [tx, ty] = point(e);
      // First contact: start from the pointer (no sweep in from the corner).
      if (!placed) { ax = bx = hx = tx; ay = by = hy = ty; placed = true; }
      el.setAttribute("data-active", "");
      kick();
    };
    const onLeave = () => { el.removeAttribute("data-active"); placed = false; };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const [x, y] = point(e);
      const ring = document.createElement("span");
      ring.className = "pf-ripple";
      place(ring, x, y);
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      el.appendChild(ring);
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
    };
  }, [ref]);
}

/* ---------- Gentle section reveal ---------- */

/**
 * Fades a block in once when it first scrolls into view.
 * Safe by default: content renders visible on the server and without JS; it is only hidden
 * when it starts below the fold and the user has not asked for reduced motion.
 */
/**
 * `stagger`: for grids — the container stays put and its first children rise in one after another (40 ms steps, at most
 * 6 steps; idea from VengeanceUI "Staggered Grid", own CSS implementation, no GSAP). Same safety as above: only for
 * grids that start below the fold, never hidden on the server or without JS, nothing under reduced motion.
 */
export function Reveal({ children, className = "", stagger = false }: { children: ReactNode; className?: string; stagger?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.dataset["reveal"] === "in" || el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset["reveal"] = "pending";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset["reveal"] = "in";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    // Keyboard users tabbing into a pending block reveal it immediately.
    const onFocus = () => { el.dataset["reveal"] = "in"; io.disconnect(); };
    el.addEventListener("focusin", onFocus, { once: true });
    return () => { io.disconnect(); el.removeEventListener("focusin", onFocus); };
  }, []);
  return <div ref={ref} className={className} data-stagger={stagger || undefined}>{children}</div>;
}

/* ---------- Profile progress: the logo's loop, filling with lime ---------- */

const LOGO_LOOP = "M9 2a7 7 0 1 0 0 14c4 0 6-3.5 8-7s4-7 8-7a7 7 0 1 1 0 14c-4 0-6-3.5-8-7S13 2 9 2Z";

/** Progress drawn on the SkillLoop loop. Exposed as a real progressbar; the fill animates only without reduced motion. */
export function LoopProgress({ value, total, label, className = "" }: { value: number; total: number; label: string; className?: string }) {
  const f = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label} className={className}>
      <svg viewBox="-2 -2 38 22" className="h-auto w-full" aria-hidden focusable="false">
        <path d={LOGO_LOOP} pathLength={1} fill="none" strokeWidth="3.2" className="stroke-muted" />
        <path d={LOGO_LOOP} pathLength={1} fill="none" strokeWidth="3.2" strokeLinecap="round"
          strokeDasharray={`${f} 1`} className="loop-progress stroke-lime" style={{ opacity: f > 0 ? 1 : 0 }} />
      </svg>
    </div>
  );
}
