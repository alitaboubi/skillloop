import { useId, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Service } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { BrandBackdrop } from "./brand";
import { ServiceCard } from "./site";

/** Most services the showcase holds; the rest are one click away in Explore. */
export const SHOWCASE_MAX = 24;

/**
 * Home "vitrine": every published service on one horizontal 3D stage. Native horizontal scroll with snap (touch, trackpad,
 * keyboard, buttons); the coverflow turn/scale and the progress bar are CSS scroll-driven animations (.sc-* in
 * styles.css), so browsers without them and reduced motion get a flat carousel. `body` replaces the track while loading,
 * on error or when empty.
 */
export function ServiceShowcase({ services, body }: { services: Service[]; body?: ReactNode }) {
  const { t } = useI18n();
  const titleId = useId();
  const track = useRef<HTMLUListElement>(null);
  const shown = services.slice(0, SHOWCASE_MAX);

  function step(dir: 1 | -1) {
    const el = track.current;
    const slide = el?.querySelector<HTMLElement>(".sc-slide");
    if (!el || !slide) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * (slide.offsetWidth + gap), behavior: reduce ? "auto" : "smooth" });
  }

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
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost-dark size-11 rounded-full p-0" aria-label={t("sc_prev")} onClick={() => step(-1)}><ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden /></button>
            <button type="button" className="btn btn-ghost-dark size-11 rounded-full p-0" aria-label={t("sc_next")} onClick={() => step(1)}><ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden /></button>
          </div>
        )}
      </div>

      {body ?? (
        <>
          <ul ref={track} tabIndex={0} aria-label={t("sc_list", { n: shown.length })} className="sc-track">
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
