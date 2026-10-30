import { useEffect, useRef, useState } from "react";

/**
 * Pointer motion for cards, mounted once in __root. Any element with `data-tilt` leans toward a fine pointer (3D tilt +
 * a soft light that follows it); `data-magnetic` nudges toward it. One delegated listener, one rAF per frame, CSS
 * variables read by styles.css (transform only). Touch and reduced motion: nothing is installed.
 */
export function MotionLayer() {
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;
    let el: HTMLElement | null = null;
    let raf = 0;
    let x = 0;
    let y = 0;
    const reset = (t: HTMLElement | null) => {
      if (!t) return;
      t.removeAttribute("data-moving");
      for (const k of ["--rx", "--ry", "--tx", "--ty"]) t.style.removeProperty(k);
    };
    const apply = () => {
      raf = 0;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (y - r.top) / r.height));
      if (el.hasAttribute("data-tilt")) {
        // Bigger surfaces lean less; never more than ~7°.
        const k = Math.min(7, 2400 / Math.max(r.width, 240));
        el.style.setProperty("--rx", `${((0.5 - py) * k).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((px - 0.5) * k).toFixed(2)}deg`);
        el.style.setProperty("--sx", `${(x - r.left).toFixed(0)}px`);
        el.style.setProperty("--sy", `${(y - r.top).toFixed(0)}px`);
      } else {
        el.style.setProperty("--tx", `${((px - 0.5) * 10).toFixed(1)}px`);
        el.style.setProperty("--ty", `${((py - 0.5) * 8).toFixed(1)}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt],[data-magnetic]") ?? null;
      if (t !== el) {
        reset(el);
        el = t;
        el?.setAttribute("data-moving", "");
      }
      x = e.clientX;
      y = e.clientY;
      if (el && !raf) raf = requestAnimationFrame(apply);
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) { reset(el); el = null; }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      cancelAnimationFrame(raf);
      reset(el);
    };
  }, []);
  return null;
}

/** Thin lime reading bar under the header, driven by the page scroll in CSS (absent where unsupported). */
export function ScrollProgress() {
  return <div aria-hidden className="scroll-progress" />;
}

/**
 * A count that runs up once when it first scrolls into view. The real value is in the server HTML and for screen
 * readers (the moving text is aria-hidden); reduced motion shows the value directly.
 */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0 || typeof IntersectionObserver === "undefined") { setShown(value); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = Math.min(1200, 500 + value * 40);
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setShown(0);
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

/** Id of the section currently under the sticky bars (no observer under SSR; anchor links work without it). */
export function useActiveSection(ids: string[], rootMargin = "-120px 0px -60% 0px") {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const els = key.split(",").map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key, rootMargin]);
  return active;
}
