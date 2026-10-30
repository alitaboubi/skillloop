import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ImageIcon, MapPin, type LucideIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { categoryImage } from "@/lib/category-images";
import { BrandBackdrop, PointerField } from "@/components/brand";
import { Avatar } from "@/components/media-viewer";
import { CountUp } from "@/components/motion-kit";
import { useI18n } from "@/lib/i18n";

/**
 * Personal header of the private spaces (dashboard, profile & settings): ink surface, contour backdrop, two slow orbs,
 * the account's face and name, then the page's switch and quick actions.
 */
export function DashHero({ name, avatar, eyebrow, sub, children }: { name: string; avatar?: string | undefined; eyebrow: string; sub?: string; children?: ReactNode }) {
  const { t, lang } = useI18n();
  const today = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <section className="dash-hero">
      <span aria-hidden className="dash-hero-orb" />
      <span aria-hidden className="dash-hero-orb" />
      <BrandBackdrop variant="intro" />
      <PointerField />
      <div className="sd-hero-out relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 md:pb-10 md:pt-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="enter flex min-w-0 items-center gap-4">
            <Avatar src={avatar} name={name} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-clay first-letter:uppercase">{eyebrow} · <span className="text-ink-muted">{today}</span></p>
              <h1 dir="auto" className="display-title mt-1 break-words text-3xl md:text-5xl">{t("dh_hello", { n: name })}</h1>
              {sub && <p dir="auto" className="mt-1.5 max-w-xl text-ink-muted">{sub}</p>}
            </div>
          </div>
        </div>
        {children && <div className="enter mt-7 flex flex-wrap items-center gap-3" style={{ "--enter-delay": "80ms" } as CSSProperties}>{children}</div>}
      </div>
    </section>
  );
}

/** Ink segmented switch with a sliding lime pill; the items are links (one per space/mode). */
export function SegSlide({ index, count, label, children }: { index: number; count: number; label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="seg-slide" style={{ "--seg-i": index, "--seg-n": count } as CSSProperties}>
      {children}
    </nav>
  );
}

/** A real count with an icon, a tone line and a count-up on first view. */
export function StatTile({ icon: Icon, value, label, tone = "var(--sea)", hint }: { icon: LucideIcon; value: number | string; label: string; tone?: string; hint?: string }) {
  return (
    <div className="stat-tile sd-rise" style={{ "--stat-tone": tone } as CSSProperties} data-tilt>
      <span className="stat-tile-icon"><Icon className="size-5" aria-hidden /></span>
      <dt className="stat-tile-l">{label}</dt>
      <dd className="stat-tile-n">{typeof value === "number" ? <CountUp value={value} /> : value}</dd>
      {hint && <dd className="order-3 mt-1 text-sm text-muted-foreground">{hint}</dd>}
    </div>
  );
}

export type MyService = { id: string; title: string; category: string; city: string; status: string; archived?: boolean | null; img?: string | undefined };

/**
 * One of my services as a visual card: the photo (or the labelled category illustration), status, title, place. The whole
 * card opens the service (a draft opens the editor); the action buttons sit above that link.
 */
export function ServiceTile({ s, actions }: { s: MyService; actions?: ReactNode }) {
  const { t } = useI18n();
  const cat = CATEGORIES.find((c) => c.id === s.category);
  const draft = s.status !== "published";
  const status = s.archived ? "st_archived" : draft ? "st_draft" : "st_published";
  return (
    <li className={`svc-tile ${draft && !s.archived ? "svc-tile-draft" : ""} ${s.archived ? "opacity-70" : ""}`} data-tilt>
      <div className="svc-tile-media">
        {s.img ? (
          <img src={s.img} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="illus-frame">
            <img src={categoryImage(s.category)} alt="" loading="lazy" width={800} height={600} className="illus-img" />
            <span className="illus-label"><ImageIcon className="size-3.5" aria-hidden />{t("illus_photo")}</span>
          </span>
        )}
        <span className={`badge absolute start-3 top-3 z-[2] ${s.archived ? "badge-muted" : draft ? "badge-warning" : "badge-success"}`}>{t(status)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {draft && !s.archived ? (
          <Link to="/offer" search={{ edit: s.id }} dir="auto" className="stretched-link line-clamp-2 font-bold leading-snug">{s.title}</Link>
        ) : (
          <Link to="/services/$id" params={{ id: s.id }} dir="auto" className="stretched-link line-clamp-2 font-bold leading-snug">{s.title}</Link>
        )}
        <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
          {cat && <span className="truncate">{t(cat.key)}</span>}
          {s.city && <><span aria-hidden>·</span><MapPin className="size-3.5 shrink-0" aria-hidden /><span dir="auto" className="truncate">{s.city}</span></>}
        </p>
        {actions && <div className="relative z-[2] mt-auto flex flex-wrap items-center gap-2 border-t pt-3">{actions}</div>}
      </div>
    </li>
  );
}
