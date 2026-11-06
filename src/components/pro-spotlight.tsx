import { useId, useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, ImageIcon, MapPin, Sparkles, Users } from "lucide-react";
import type { Service } from "@/lib/data";
import { CATEGORIES } from "@/lib/data";
import { categoryImage } from "@/lib/category-images";
import { countKey, useI18n } from "@/lib/i18n";
import { loopLayout, loopPath, spotlight, type FeaturedPro } from "@/lib/featured-pros";
import { FOUNDERS_CAP, foundersLeftQuery } from "@/lib/plan";
import { PUBLISHED_LIMIT } from "@/lib/services-db";
import { CATEGORY_ICONS } from "./brand";
import { Avatar } from "./media-viewer";

/**
 * Home "Pros à la une": this week's pro on a big card (the lead rotates weekly, see spotlight()), and every pro as a
 * small avatar travelling round the SkillLoop ∞ ("la boucle des fondateurs") with the real count of founding places.
 * Renders nothing until there is at least one pro.
 */
export function ProSpotlight({ services }: { services: Service[] }) {
  const { t } = useI18n();
  const titleId = useId();
  const left = useQuery(foundersLeftQuery());
  const { pros, total, foundersTaken } = useMemo(
    () => spotlight(services, { now: new Date(), complete: services.length < PUBLISHED_LIMIT, foundersLeft: left.data ?? null }),
    [services, left.data],
  );
  if (!pros.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("fp_eyebrow")}</p>
          <h2 id={titleId} className="display-title mt-2 text-3xl md:text-4xl">{t("fp_title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("fp_sub")}</p>
        </div>
        <Link to="/explore" search={{ view: "pros" }} className="btn btn-outline"><Users className="size-4" aria-hidden />{t("fp_all")}</Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <LeadCard p={pros[0]!} />
        <FoundersLoop pros={pros} total={total} taken={foundersTaken} />
      </div>
    </section>
  );
}

function FounderChip() {
  const { t } = useI18n();
  return <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-clay/60 px-2.5 py-0.5 text-xs font-bold text-clay-strong"><Crown className="size-3.5" aria-hidden />{t("plan_founder")}</span>;
}

function LeadCard({ p }: { p: FeaturedPro }) {
  const { t, lang } = useI18n();
  const s = p.cover;
  return (
    <article className="panel sd-rise relative flex min-w-0 flex-col overflow-hidden">
      <div className="relative aspect-[2/1] overflow-hidden bg-muted">
        {s.hasPhoto ? (
          <img src={s.image} alt="" loading="lazy" width={944} height={472} className="size-full object-cover" />
        ) : (
          // No photo from the pro: the category illustration, always labelled so it never reads as their work.
          <span className="illus-frame">
            <img src={categoryImage(s.category)} alt="" loading="lazy" width={800} height={600} className="illus-img" />
            <span className="illus-label"><ImageIcon className="size-3.5" aria-hidden />{t("illus_photo")}</span>
          </span>
        )}
        <span className="tag tag-ink absolute start-3 top-3"><Sparkles className="size-3.5 text-lime" aria-hidden />{t("fp_week")}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <div className="flex items-center gap-4">
          <Avatar src={p.avatar} name={p.name} size="md" />
          <span className="min-w-0 flex-1">
            <h3 dir="auto" className="truncate text-xl font-bold md:text-2xl">{p.name}</h3>
            {p.profession && <span dir="auto" className="block truncate text-muted-foreground">{p.profession}</span>}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {p.founder && <FounderChip />}
          <ul className="contents" aria-label={t("pp_fields")}>
            {p.categories.slice(0, 3).map((c) => {
              const cat = CATEGORIES.find((x) => x.id === c);
              const Icon = CATEGORY_ICONS[c] ?? CATEGORY_ICONS.other;
              return cat ? <li key={c} className="tag tag-sea"><Icon className="size-3.5" aria-hidden />{t(cat.key)}</li> : null;
            })}
          </ul>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3.5 shrink-0" aria-hidden /><span dir="auto">{p.cities.join(", ")}</span></span>
          <span>{t(countKey(lang, p.services, "pro_service_count"), { n: p.services })}</span>
          {typeof p.accepting === "boolean" && <span className={`avail-chip ${p.accepting ? "avail-open" : "avail-closed"}`}>{t(p.accepting ? "avail_open" : "avail_closed")}</span>}
        </p>
        <p className="border-t pt-4 text-sm">
          <span className="block text-muted-foreground">{t("fp_latest")}</span>
          <span dir="auto" className="mt-0.5 line-clamp-2 font-semibold">{s.title}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-3">
          <Link to="/pros/$id" params={{ id: p.ownerId }} className="btn btn-ink">{t("view_profile")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
          <Link to="/services/$id" params={{ id: s.id }} className="btn btn-outline">{t("fp_see_service")}</Link>
        </div>
      </div>
    </article>
  );
}

/* Geometry shared with .fl-* in styles.css, in cqi (1/100 of the loop's width): the box is H tall, the ∞ reaches ±AX across
 * and ±AY down. The SVG uses the same units (viewBox 100 × H), so it scales evenly and matches the avatars. */
const AX = 40;
const AY = 17;
const H = 46;
/** Seconds for half a lap (a whole lap is twice that). */
const HALF_LAP = 15;
const PATH = loopPath(AX, AY);

/**
 * "La boucle des fondateurs": each pro is an avatar travelling round the ∞ (two transform animations per avatar, see
 * loopLayout()). Hover or focus pauses the loop and names the pro in the caption; a click opens their profile. Reduced
 * motion: the avatars stand still at their place on the loop.
 */
function FoundersLoop({ pros, total, taken }: { pros: FeaturedPro[]; total: number; taken: number | null }) {
  const { t } = useI18n();
  const spots = loopLayout(pros.length);
  const [active, setActive] = useState<FeaturedPro | null>(null);
  const shown = active ?? pros[0]!;
  const full = taken !== null && taken >= FOUNDERS_CAP;
  const label = (p: FeaturedPro) => [p.name, p.profession, p.founder ? t("plan_founder") : null].filter(Boolean).join(" · ");

  return (
    <div className="sd-rise bg-ink-hero relative flex min-w-0 flex-col overflow-hidden rounded-3xl p-5 text-ink-foreground md:p-6">
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-lime">{t("fp_loop_kicker")}</p>
          <h3 className="mt-1 text-xl font-bold md:text-2xl">{t("fp_loop_t")}</h3>
        </div>
        {taken !== null && (
          <p className="text-end text-sm text-ink-muted">
            <span className="block text-2xl font-extrabold tabular-nums text-ink-foreground">{Math.min(taken, FOUNDERS_CAP)}<span className="text-ink-muted">/{FOUNDERS_CAP}</span></span>
            {full ? t("fp_founders_full", { n: FOUNDERS_CAP }) : <span className="text-lime">{t("pc_founders_left", { n: FOUNDERS_CAP - taken })}</span>}
          </p>
        )}
      </div>

      <div className="fl-wrap mt-2" dir="ltr" style={{ "--fl-ax": `${AX}cqi`, "--fl-ay": `${AY}cqi`, "--fl-h": `${H}cqi`, "--fl-d": `${HALF_LAP}s` } as CSSProperties}>
        <div className="fl-box" onPointerLeave={() => setActive(null)}>
          <svg className="fl-path" viewBox={`-50 ${-H / 2} 100 ${H}`} aria-hidden focusable="false">
            <path d={PATH} className="fl-track" />
            <path d={PATH} pathLength={1} className="fl-spark" />
          </svg>
          <ul aria-label={t("fp_loop_t")}>
            {pros.map((p, i) => {
              const s = spots[i]!;
              return (
                <li key={p.ownerId} className="fl-x" style={{ "--fl-dx": `${(-s.phase * 2 * HALF_LAP).toFixed(3)}s`, "--fl-sx": s.x.toFixed(4) } as CSSProperties}>
                  <div className="fl-y" style={{ "--fl-dy": `${(-(HALF_LAP / 4) - s.phase * 2 * HALF_LAP).toFixed(3)}s`, "--fl-sy": s.y.toFixed(4) } as CSSProperties}>
                    <Link to="/pros/$id" params={{ id: p.ownerId }} className="fl-dot" aria-label={label(p)}
                      data-lead={i === 0 || undefined} data-founder={p.founder || undefined}
                      onPointerEnter={() => setActive(p)} onFocus={() => setActive(p)} onBlur={() => setActive(null)}>
                      {p.avatar ? <img src={p.avatar} alt="" width={96} height={96} loading="lazy" /> : <span aria-hidden>{(p.name.trim()[0] ?? "?").toUpperCase()}</span>}
                      {p.founder && <span className="fl-crown" aria-hidden><Crown /></span>}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Who is under the pointer (or this week's pro); screen readers get the same from each avatar's name. */}
      <p aria-hidden className="relative min-h-10 text-center text-sm">
        <span dir="auto" className="font-bold">{shown.name}</span>
        {shown.profession && <span dir="auto" className="block truncate text-ink-muted">{shown.profession}</span>}
      </p>
      <p className="relative mt-1 text-center text-xs text-ink-muted">
        {t("fp_loop_hint")}
        {total > pros.length && <> · <Link to="/explore" search={{ view: "pros" }} className="font-semibold text-lime underline-offset-4 hover:underline">{t("fp_loop_more", { n: total - pros.length })}</Link></>}
      </p>

      <div className="relative mt-5 flex flex-col gap-4 border-t border-ink-foreground/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-ink-muted"><span className="font-bold text-ink-foreground">{t("fp_founders_t")}.</span> {t("fp_founders_d", { n: FOUNDERS_CAP })}</p>
        <Link to="/offer" className="btn btn-lime shrink-0" data-magnetic>{t("offer_service")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
      </div>
    </div>
  );
}
