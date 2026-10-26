import { useRef, type ReactNode } from "react";

/**
 * A list whose items share one highlight frame that glides to the item under a fine pointer or with keyboard focus.
 * Idea from VengeanceUI "Highlight Grid" (itself ported from a CodeGrid experiment) — own implementation, no code
 * copied. Decorative only: the links inside stay ordinary links (focus ring, names, order unchanged).
 * - Motion: the frame moves by transform; it appears/disappears by opacity; its size is set without animation.
 * - Touch: no highlight on tap (pointerType touch is ignored; keyboard focus only via :focus-visible).
 * - Reduced motion: the frame jumps instead of gliding (CSS). RTL: positions are measured, so direction doesn't matter.
 */
function isFocusVisible(el: Element): boolean {
  try { return el.matches(":focus-visible"); } catch { return true; } // older engines: treat focus as keyboard focus
}

export function HighlightGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const frame = useRef<HTMLSpanElement>(null);

  const moveTo = (target: Element | null) => {
    const ul = list.current, wrap = box.current, f = frame.current;
    const item = target?.closest("li");
    if (!ul || !wrap || !f || !item || item.parentElement !== ul) return;
    const a = wrap.getBoundingClientRect(), b = item.getBoundingClientRect();
    const shown = f.hasAttribute("data-on");
    // First appearance: place without gliding in from the previous spot.
    if (!shown) f.setAttribute("data-jump", "");
    f.style.width = `${b.width}px`;
    f.style.height = `${b.height}px`;
    f.style.transform = `translate3d(${b.left - a.left}px, ${b.top - a.top}px, 0)`;
    if (!shown) { void f.offsetWidth; f.removeAttribute("data-jump"); }
    f.setAttribute("data-on", "");
  };
  const hide = () => frame.current?.removeAttribute("data-on");

  return (
    <div ref={box} className="relative">
      <ul
        ref={list}
        className={className}
        onPointerOver={(e) => { if (e.pointerType !== "touch") moveTo(e.target as Element); }}
        onPointerLeave={(e) => { if (e.pointerType !== "touch" && !list.current?.contains(document.activeElement)) hide(); }}
        onFocus={(e) => { if (isFocusVisible(e.target)) moveTo(e.target); }}
        onBlur={(e) => { if (!list.current?.contains(e.relatedTarget as Node | null)) hide(); }}
      >
        {children}
      </ul>
      <span ref={frame} aria-hidden className="highlight-frame" />
    </div>
  );
}
