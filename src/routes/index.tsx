import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type CSSProperties } from "react";
import { Search, Laptop, GraduationCap, ArrowRight, Send, Handshake, Rocket, Wrench, Car, Camera, LayoutGrid, Check, Wifi, User, MapPin } from "lucide-react";
import { BrandBackdrop, CATEGORY_ICONS, PointerField } from "@/components/brand";
import { FaqBlock } from "@/components/page-sections";
import { HomeHero, type HomeHeroHandle } from "@/components/home-hero";
import { useI18n, type TKey } from "@/lib/i18n";
import { CATEGORIES, CITIES, type CategoryId } from "@/lib/data";
import { CATEGORY_IMAGES } from "@/lib/category-images";
import forClients from "@/assets/home/for-clients.webp";
import forPros from "@/assets/home/for-pros.webp";
import { ServiceCardSkeleton, useAllServices } from "@/components/site";
import { ServiceShowcase } from "@/components/service-showcase";
import { homeSeo } from "@/lib/seo";
import { ErrorState, FirstVisitEmpty } from "@/components/states";

export const Route = createFileRoute("/")({
  head: () => homeSeo(),
  component: Index,
});

const FEATURED: { id: CategoryId; ex: TKey }[] = [
  { id: "home", ex: "hp_ex_home" },
  { id: "tutoring", ex: "hp_ex_tutoring" },
  { id: "tech", ex: "hp_ex_tech" },
  { id: "design", ex: "hp_ex_design" },
  { id: "automotive", ex: "hp_ex_automotive" },
  { id: "business", ex: "hp_ex_business" },
  { id: "events", ex: "hp_ex_events" },
  { id: "personal", ex: "hp_ex_personal" },
];
const NEEDS: { k: TKey; icon: typeof Laptop }[] = [
  { k: "hp_need_home", icon: Wrench },
  { k: "hp_need_tutoring", icon: GraduationCap },
  { k: "hp_need_digital", icon: Laptop },
  { k: "hp_need_auto", icon: Car },
  { k: "hp_need_events", icon: Camera },
];

/** Keyword + mode + city search. On /explore it keeps the active category and sort, so refining a search never drops them. */
export function SearchBar({ initial }: { initial?: { q?: string | undefined; city?: string | undefined; mode?: string | undefined; category?: string | undefined; sort?: "recent" | "price" | undefined } }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState(initial?.q ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/explore", search: { q: q.trim() || undefined, mode: (mode || undefined) as "remote" | "inperson" | undefined, city: city || undefined, category: initial?.category, sort: initial?.sort } });
      }}
      className="grid gap-2 rounded-2xl border bg-card p-2 shadow-raised sm:grid-cols-[1fr_auto_auto_auto] sm:rounded-full"
    >
      <label className="flex min-w-0 items-center gap-2 px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">{t("q_placeholder")}</span>
        <input type="search" enterKeyHint="search" dir="auto" maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("q_placeholder")} className="min-h-11 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
      </label>
      <select aria-label={t("f_mode")} value={mode} onChange={(e) => setMode(e.target.value)} className="field sm:border-0 sm:border-s sm:rounded-none">
        <option value="">{t("mode_any")}</option>
        <option value="inperson">{t("mode_inperson")}</option>
        <option value="remote">{t("mode_remote")}</option>
      </select>
      <select aria-label={t("f_city")} value={city} onChange={(e) => setCity(e.target.value)} className="field sm:border-0 sm:border-s sm:rounded-none">
        <option value="">{t("city_any")}</option>
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="btn btn-lime"><Search className="size-4" aria-hidden />{t("search")}</button>
    </form>
  );
}

function Index() {
  const { t } = useI18n();
  const { services, isLoading, isError, refetch } = useAllServices();
  const hero = useRef<HomeHeroHandle>(null);
  const known = new Set(FEATURED.map((f) => f.id));
  const others = CATEGORIES.filter((c) => !known.has(c.id));
  return (
    <>
      <HomeHero ref={hero} />

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-20" aria-labelledby="cats">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("hp_cats_kicker")}</p>
            <h2 id="cats" className="display-title mt-2 text-3xl md:text-4xl">{t("hp_cats_title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("hp_cats_sub")}</p>
          </div>
          <Link to="/explore" className="btn btn-outline"><LayoutGrid className="size-4" aria-hidden />{t("hp_cats_all")}</Link>
        </div>
        {/* Photo bento: the first category leads (2×2 from md), the last cell opens the full list. */}
        <ul className="mt-8 grid auto-rows-[11rem] grid-cols-2 gap-3 md:auto-rows-[12.5rem] md:grid-cols-4 md:gap-4">
          {FEATURED.map((c, i) => {
            const cat = CATEGORIES.find((x) => x.id === c.id)!;
            const Icon = CATEGORY_ICONS[c.id];
            const lead = i === 0;
            return (
              <li key={c.id} className={`sd-rise ${lead ? "col-span-2 row-span-2" : ""}`} style={{ "--sd-i": i % 4 } as CSSProperties}>
                <Link to="/explore" search={{ category: c.id }} className="cat-photo" data-tilt>
                  <img src={CATEGORY_IMAGES[c.id]} alt="" loading={i < 3 ? "eager" : "lazy"} width={800} height={600} className="cat-photo-img" />
                  <span className="cat-photo-go" aria-hidden><ArrowRight className="size-4 rtl:-scale-x-100" /></span>
                  <span className="cat-photo-icon" aria-hidden><Icon className="size-5" /></span>
                  <span className={`mt-3 block font-bold leading-tight ${lead ? "text-2xl md:text-3xl" : "text-base md:text-lg"}`}>{t(cat.key)}</span>
                  <span className={`mt-1 text-sm leading-snug text-ink-muted ${lead ? "block max-w-sm" : "hidden sm:line-clamp-2"}`}>{t(c.ex)}</span>
                </Link>
              </li>
            );
          })}
          <li className="sd-rise" style={{ "--sd-i": 3 } as CSSProperties}>
            <Link to="/explore" className="cat-photo bg-ink-hero justify-between" data-tilt>
              <span className="photo-stack" aria-hidden>
                {others.slice(0, 3).map((c) => <img key={c.id} src={CATEGORY_IMAGES[c.id]} alt="" loading="lazy" width={800} height={600} />)}
              </span>
              <span>
                <span className="block text-lg font-bold leading-tight">{t("hp_cats_all")}</span>
                {others.length > 0 && <span className="mt-1 block text-sm text-ink-muted">{t("hp_cats_more_n", { n: others.length })}</span>}
              </span>
              <span className="cat-photo-go" aria-hidden><ArrowRight className="size-4 rtl:-scale-x-100" /></span>
            </Link>
          </li>
        </ul>
        {others.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("hp_cats_more")}>
            {others.map((c) => (
              <li key={c.id}><Link to="/explore" search={{ category: c.id }} className="chip"><img src={CATEGORY_IMAGES[c.id]} alt="" loading="lazy" width={800} height={600} className="chip-thumb" />{t(c.key)}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="needs">
        <div className="panel bg-surface-sunken p-6 sm:p-8">
        <h2 id="needs" className="section-title">{t("hp_needs_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("hp_needs_sub")}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <li key={n.k}>
              <button type="button" className="chip whitespace-normal text-start" onClick={() => hero.current?.prefill("find", t(n.k))}>
                <n.icon className="size-4 text-clay-strong" aria-hidden />{t(n.k)}
              </button>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {/* Every published service on one 3D stage (scroll-driven coverflow; flat without support or with reduced motion). */}
      <ServiceShowcase
        services={services}
        body={isLoading ? (
          <div className="relative mx-auto mt-8 grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <ServiceCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="relative mx-auto mt-8 max-w-7xl px-4 text-foreground sm:px-6"><ErrorState onRetry={() => refetch()} /></div>
        ) : services.length === 0 ? (
          <div className="relative mx-auto mt-8 max-w-7xl px-4 text-foreground sm:px-6"><FirstVisitEmpty /></div>
        ) : undefined}
      />

      <HowItWorks />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="check">
        <div>
        <h2 id="check" className="section-title">{t("hp_check_title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("hp_check_sub")}</p>
        <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {([1, 2, 3, 4, 5] as const).map((i) => (
            <li key={i} className="sd-rise border-s-2 border-lime ps-4" style={{ "--sd-i": i - 1 } as CSSProperties}>
              <h3 className="font-bold">{t(`hp_check_${i}_t` as TKey)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`hp_check_${i}_d` as TKey)}</p>
            </li>
          ))}
        </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-label={`${t("hp_ben_cust")} / ${t("hp_ben_pro")}`}>
        <div className="grid gap-5 md:grid-cols-2">
          {([["hp_ben_cust", Search, "find", forClients], ["hp_ben_pro", Rocket, "offer", forPros]] as const).map(([k, Icon, mode, img]) => (
            <div key={k} className="panel sd-rise relative overflow-hidden" data-tilt>
              <div className="ben-photo">
                <img src={img} alt="" loading="lazy" width={800} height={600} className="sd-parallax" />
                <h2 className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 p-5 text-xl font-bold text-ink-foreground md:text-2xl">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${mode === "find" ? "bg-ink-foreground text-ink" : "bg-lime text-lime-foreground"}`}><Icon className="size-5" aria-hidden /></span>
                  {t(k)}
                </h2>
              </div>
              <ul className="space-y-3 p-5 md:p-6">
                {([1, 2, 3] as const).map((i) => (
                  <li key={i} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-sea" aria-hidden /><span>{t(`${k}_${i}` as TKey)}</span></li>
                ))}
              </ul>
              <div className="px-5 pb-5 md:px-6 md:pb-6">
                <Link to={mode === "find" ? "/explore" : "/offer"} className={`btn ${mode === "find" ? "btn-ink" : "btn-outline"}`}>
                  {t(mode === "find" ? "explore_services" : "offer_service")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="loc">
        <h2 id="loc" className="section-title">{t("hp_loc_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("hp_loc_sub")}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          <li><Link to="/explore" search={{ mode: "remote" }} className="chip"><Wifi className="size-4 text-sea" aria-hidden />{t("hp_loc_remote")}</Link></li>
          <li><Link to="/explore" search={{ mode: "inperson" }} className="chip"><User className="size-4 text-sea" aria-hidden />{t("hp_loc_inperson")}</Link></li>
          {CITIES.map((c) => (
            <li key={c}><Link to="/explore" search={{ city: c }} className="chip"><MapPin className="size-4 text-clay-strong" aria-hidden /><span dir="ltr">{c}</span></Link></li>
          ))}
        </ul>
      </section>

      <section className="bg-card" aria-labelledby="faq">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 id="faq" className="section-title">{t("hp_faq_title")}</h2>
          {/* Same FAQ component as the other pages (accent edge, +/−). */}
          <div className="mt-6">
            <FaqBlock items={([1, 2, 3, 4, 5, 6] as const).map((i) => ({ q: t(`hp_faq_${i}_q` as TKey), a: t(`hp_faq_${i}_a` as TKey) }))} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="sd-rise bg-ink-hero relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <BrandBackdrop variant="intro" />
          <PointerField />
          <div className="relative">
            <h2 className="display-title text-2xl md:text-3xl">{t("cta_title")} <span className="text-lime">{t("cta_hl")}</span></h2>
            <p className="mt-2 max-w-2xl text-ink-muted">{t("cta_sub")}</p>
          </div>
          <Link to="/offer" className="btn btn-lime relative shrink-0" data-magnetic>{t("offer_service")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
        </div>
      </section>
    </>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: Search, t: t("how_1_t"), d: t("how_1_d") },
    { icon: Send, t: t("how_2_t"), d: t("how_2_d") },
    { icon: Handshake, t: t("how_3_t"), d: t("how_3_d") },
  ];
  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div>
        <h2 className="section-title">{t("how_title")}</h2>
        <ol className="steps-line mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <li key={i} className="sd-rise relative" style={{ "--sd-i": i } as CSSProperties}>
              <span className="flex items-center gap-3">
                <span className="relative grid size-11 place-items-center rounded-full bg-lime text-lime-foreground ring-8 ring-card"><s.icon className="size-5" aria-hidden /></span>
                <span className="rounded-full bg-card px-2 text-sm font-bold text-muted-foreground">0{i + 1}</span>
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 max-w-xs text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
