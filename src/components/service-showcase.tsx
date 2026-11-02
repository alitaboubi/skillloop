import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Service } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { BrandBackdrop } from "./brand";
import { ServiceCard } from "./site";

/** Most services the showcase holds; the rest are one click away in Explore. */
export const SHOWCASE_MAX = 24;
/** Autoplay: time on each card, and the quiet time after the visitor touched the stage. */
const AUTOPLAY_MS = 3200;
const RESUME_MS = 6000;

/** Index of the slide whose centre is closest to the track's centre. */
function centredIndex(el: HTMLElement): number {
  const mid = el.scrollLeft + el.clientWidth / 2;
  let best = 0, dist = Infinity;
  el.querySelectorAll<HTMLElement>(".sc-slide").forEach((s, i) => {
    const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}

/**
 * Home "vitrine": every published service on one horizontal 3D stage. Native horizontal scroll with snap (touch, trackpad,
 * keyboard, buttons); the coverflow turn/scale and the progress bar are CSS scroll-driven animations (.sc-* in
 * styles.css), so browsers without them and reduced motion get a flat carousel. The stage always runs left to right
 * (cards keep the page direction inside): Chrome offsets view() timelines in RTL scrollers, which turned the centred card
 * sideways in Arabic. It plays by itself (next card every few seconds, back to the first at the end) while visible, and
 * stops on hover, focus, touch or the pause button; never under reduced motion. `body` replaces the track while loading,
 * on error or when empty.
 */
export function ServiceShowcase({ services, body }: { services: Service[]; body?: ReactNode }) {
  const { t } = useI18n();
  const titleId = useId();
  const track = useRef<HTMLUListElement>(null);
  const shown = services.slice(0, SHOWCASE_MAX);
  const [paused, setPaused] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const hold = useRef(0);

  function goTo(i: number) {
    const el = track.current;
    const slides = el?.querySelectorAll<HTMLElement>(".sc-slide");
    if (!el || !slides?.length) return;
    const s = slides[(i + slides.length) % slides.length]!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: s.offsetLeft + s.offsetWidth / 2 - el.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
  }
  const step = (dir: 1 | -1) => { hold.current = Date.now(); if (track.current) goTo(centredIndex(track.current) + dir); };

  // Autoplay only with motion allowed and more than one card.
  useEffect(() => {
    setCanPlay(shown.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [shown.length]);
  useEffect(() => {
    const el = track.current;
    if (!el || !canPlay || paused) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; }, { threshold: 0.4 });
    io.observe(el);
    const stage = el.closest(".sc-stage");
    // Keyboard focus inside pauses; a mouse click on a button leaves focus there but must not stop it for good.
    const busy = () => !!stage && (stage.matches(":hover") || !!stage.querySelector(":focus-visible"));
    const id = window.setInterval(() => {
      if (!visible || document.hidden || busy() || Date.now() - hold.current < RESUME_MS) return;
      goTo(centredIndex(el) + 1);
    }, AUTOPLAY_MS);
    return () => { window.clearInterval(id); io.disconnect(); };
  }, [canPlay, paused]);

  return (
    <section className="sc-stage" aria-labelledby={titleId}>
      <BrandBackdrop variant="intro" />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pt-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-lime">{t("sc_eyebrow")}</p>
          <h2 id={titleId} className="display-title mt-2 text-3xl md:text-5xl">{t("sc_title")}</h2>
          <p className="mt-2 text-ink-muted">{services.length > 0 ? t(services.length === 1 ? "sc_sub_one" : "sc_sub", { n: services.length }) : t("hp_live_sub")}</p>
        </div>
        {shown.length > 0 && (
          // Same direction as the stage: previous on the left, next on the right, in every language.
          <div dir="ltr" className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost-dark size-11 rounded-full p-0" aria-label={t("sc_prev")} onClick={() => step(-1)}><ChevronLeft className="size-5" aria-hidden /></button>
            {canPlay && (
              <button type="button" className="btn btn-ghost-dark size-11 rounded-full p-0" aria-pressed={paused} aria-label={t(paused ? "sc_play" : "sc_pause")} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              </button>
            )}
            <button type="button" className="btn btn-ghost-dark size-11 rounded-full p-0" aria-label={t("sc_next")} onClick={() => step(1)}><ChevronRight className="size-5" aria-hidden /></button>
          </div>
        )}
      </div>

      {body ?? (
        <>
          <ul ref={track} tabIndex={0} aria-label={t("sc_list", { n: shown.length })} className="sc-track"
            onPointerDown={() => { hold.current = Date.now(); }} onWheel={() => { hold.current = Date.now(); }}>
            {shown.map((s) => <li key={s.id} className="sc-slide"><ServiceCard s={s} /></li>)}
          </ul>
          <div aria-hidden className="sc-bar mx-auto max-w-xs"><span className="sc-bar-fill" /></div>
        </>
      )}

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 text-center sm:px-6">
        {services.length > 0 && <Link to="/explore" className="btn btn-ghost-dark">{t("view_all")}</Link>}
      </div>
    </section>
  );
}
