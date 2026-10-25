import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Info, PackageOpen, SearchX, SlidersHorizontal, X } from "lucide-react";
import { countKey, useI18n } from "@/lib/i18n";
import { CATEGORIES, CITIES, type CategoryId } from "@/lib/data";
import { PageIntro } from "@/components/page-sections";
import { ServiceCard, ServiceCardSkeleton, useAllServices } from "@/components/site";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { SearchBar } from "./index";
import { seo } from "@/lib/seo";
import { fetchPublicServices } from "@/lib/services-db";
import { CATEGORY_ICONS } from "@/components/brand";
import { EmptyState, ErrorState } from "@/components/states";
import { activeFilters, cleanExploreSearch, facetCounts, filterServices, type ExploreSearch, type FacetCounts } from "@/lib/explore-filters";

// URL values are JSON-parsed (?q=123 arrives as a number); accept numbers as text and drop anything else instead of failing the page.
const text = z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().optional()).catch(undefined);
const searchSchema = z.object({
  q: text,
  category: text,
  city: text,
  mode: z.enum(["remote", "inperson"]).optional().catch(undefined),
  sort: z.enum(["recent", "price"]).optional().catch(undefined),
});

export const Route = createFileRoute("/explore")({
  validateSearch: (raw: Record<string, unknown>): ExploreSearch => cleanExploreSearch(searchSchema.parse(raw)),
  // Server render: the published listings (session-less read) so the cards and their links are in the HTML.
  // In the browser the shared query loads them as before; filtering stays client-side over the full list.
  // If the backend is down the page still renders and the browser retries (no 500 for a listing page).
  loader: async () => ({ services: typeof window === "undefined" ? await fetchPublicServices().catch(() => null) : null }),
  // Filtered views (?q, ?category…) are the same page: one canonical URL.
  head: () => seo("Explorer les services", "Parcourez les services locaux et en ligne proposés en Tunisie : tech, design, cours, maison et plus.", { path: "/explore" }),
  component: Explore,
});

/** Category chip with its real result count; zero-result options are greyed out (the current choice stays usable). */
function CategoryChip({ id, label, selected, n, onPick }: { id: CategoryId | undefined; label: string; selected: boolean; n: number | null; onPick: () => void }) {
  const Icon = id ? CATEGORY_ICONS[id] : null;
  const empty = n === 0 && !selected;
  return (
    <button type="button" onClick={onPick} aria-pressed={selected} disabled={empty} className="chip">
      {Icon && <Icon className="size-3.5" aria-hidden />}{label}
      {n != null && <span className="ms-0.5 text-xs font-medium tabular-nums opacity-70">{n}</span>}
    </button>
  );
}

function Filters({ s, set, counts, total }: { s: ExploreSearch; set: (p: Partial<ExploreSearch>) => void; counts: FacetCounts | null; total: number | null }) {
  const { t } = useI18n();
  return (
    <>
      <fieldset>
        <legend className="text-sm font-semibold text-muted-foreground">{t("category")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[{ id: undefined, key: "cat_all" as const }, ...CATEGORIES].map((c) => (
            <CategoryChip key={c.id ?? "all"} id={c.id} label={t(c.key)} selected={s.category === c.id} n={c.id ? counts?.category[c.id] ?? null : total} onPick={() => set({ category: c.id })} />
          ))}
        </div>
      </fieldset>
      <label className="mt-5 block text-sm font-semibold text-muted-foreground">
        {t("location")}
        <select value={s.city ?? ""} onChange={(e) => set({ city: e.target.value || undefined })} className="field mt-2">
          <option value="">{t("city_any")}</option>
          {CITIES.map((c) => {
            const n = counts?.city[c];
            return <option key={c} value={c} disabled={n === 0 && s.city !== c}>{n == null ? c : `${c} (${n})`}</option>;
          })}
        </select>
      </label>
      <label className="mt-5 block text-sm font-semibold text-muted-foreground">
        {t("f_mode")}
        <select value={s.mode ?? ""} onChange={(e) => set({ mode: (e.target.value || undefined) as ExploreSearch["mode"] })} className="field mt-2">
          <option value="">{t("mode_any")}</option>
          {(["inperson", "remote"] as const).map((m) => {
            const n = counts?.mode[m];
            const label = t(m === "remote" ? "mode_remote" : "mode_inperson");
            return <option key={m} value={m} disabled={n === 0 && s.mode !== m}>{n == null ? label : `${label} (${n})`}</option>;
          })}
        </select>
      </label>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t("ex_location_note")}</p>
      {activeFilters(s).length > 0 && (
        <button type="button" onClick={() => set({ q: undefined, category: undefined, city: undefined, mode: undefined })} className="btn btn-outline mt-5 w-full">{t("clear_filters")}</button>
      )}
    </>
  );
}

function Explore() {
  const { t, lang } = useI18n();
  const s = Route.useSearch();
  const navigate = Route.useNavigate();
  const set = (patch: Partial<ExploreSearch>) => navigate({ search: (p) => ({ ...p, ...patch }), replace: true });

  const { services: ssr } = Route.useLoaderData();
  const { services, isLoading, isError, refetch } = useAllServices(ssr);
  const catLabel = (id: string) => { const c = CATEGORIES.find((x) => x.id === id); return c ? t(c.key) : ""; };
  const filtered = filterServices(services, s, catLabel);
  const n = filtered.length;
  // Real counts per option (null while loading, so no misleading zeros are shown).
  const counts = isLoading || isError ? null : facetCounts(services, s, catLabel);
  const totalAllCats = isLoading || isError ? null : filterServices(services, { ...s, category: undefined }, catLabel).length;
  const chips = activeFilters(s);
  const chipLabel = (c: (typeof chips)[number]) => {
    if (c.key === "category") {
      const cat = CATEGORIES.find((x) => x.id === c.value);
      return cat ? t(cat.key) : c.value;
    }
    if (c.key === "mode") return c.value === "remote" ? t("mode_remote") : t("mode_inperson");
    return c.value;
  };

  return (
    <>
      <PageIntro kicker={t("ex_kicker")} title={t("explore_services")} sub={t("explore_sub")} />
      <div className="relative mx-auto -mt-7 max-w-7xl px-4 sm:px-6">
        <SearchBar key={`${s.q}-${s.city}-${s.mode}`} initial={s} />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="panel hidden h-fit p-5 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4 text-sea" aria-hidden />{t("filters")}</h2>
          <Filters s={s} set={set} counts={counts} total={totalAllCats} />
        </aside>
        <section className="min-w-0">
          {/* Mobile/tablet: categories stay one tap away without opening the filter sheet. */}
          <div role="group" aria-label={t("category")} className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex w-max gap-2">
              {[{ id: undefined, key: "cat_all" as const }, ...CATEGORIES].map((c) => (
                <CategoryChip key={c.id ?? "all"} id={c.id} label={t(c.key)} selected={s.category === c.id} n={c.id ? counts?.category[c.id] ?? null : totalAllCats} onPick={() => set({ category: c.id })} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold tabular-nums" aria-live="polite">
              {isLoading ? t("loading") : isError ? t("load_error") : s.q ? (
                <>{t(countKey(lang, n, "ex_results_for"), { n })} <q dir="auto" className="text-sea">{s.q}</q></>
              ) : t(countKey(lang, n, "results"), { n })}
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger className="btn btn-outline lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden />
                  {t("open_filters")}
                  {chips.length > 0 && <span className="tag tag-ink">{chips.length}</span>}
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
                  <SheetHeader><SheetTitle>{t("filters")}</SheetTitle></SheetHeader>
                  <div className="px-4 pb-4"><Filters s={s} set={set} counts={counts} total={totalAllCats} /></div>
                  <div className="pb-safe sticky bottom-0 border-t bg-card p-4">
                    <SheetClose className="btn btn-lime w-full">{isLoading ? t("loading") : t(countKey(lang, n, "show_results"), { n })}</SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
              <label className="sr-only" htmlFor="sort">{t("sort_by")}</label>
              <select id="sort" value={s.sort ?? "recent"} onChange={(e) => set({ sort: e.target.value as "recent" | "price" })} className="field w-auto">
                <option value="recent">{t("sort_recent")}</option>
                <option value="price">{t("sort_price")}</option>
              </select>
            </div>
          </div>

          {s.sort === "price" && <p className="mt-2 text-xs text-muted-foreground">{t("ex_price_note")}</p>}
          {chips.length > 0 && (
            <ul aria-label={t("active_filters")} className="mt-4 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => set({ [c.key]: undefined })} className="chip border-foreground/25 bg-surface-sunken" aria-label={t("remove_filter", { label: chipLabel(c) })}>
                    <span dir="auto">{chipLabel(c)}</span>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <Link to="/explore" search={s.sort ? { sort: s.sort } : {}} className="chip border-transparent bg-transparent text-sea underline-offset-4 hover:underline">{t("clear_filters")}</Link>
              </li>
            </ul>
          )}

          {isLoading ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => <ServiceCardSkeleton key={i} />)}
            </div>
          ) : isError ? (
            <div className="mt-8"><ErrorState onRetry={() => refetch()} /></div>
          ) : filtered.length ? (
            <div className="results-fade mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((x) => <ServiceCard key={x.id} s={x} />)}
            </div>
          ) : services.length === 0 ? (
            <div className="mt-8">
              <EmptyState icon={PackageOpen} title={t("ex_empty_t")} sub={t("ex_empty_d")} action={<Link to="/offer" className="btn btn-outline">{t("offer_service")}</Link>} />
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={SearchX}
                title={t("ex_nomatch_t")}
                sub={t("ex_nomatch_d")}
                action={
                  <>
                    {chips.length > 0 && <Link to="/explore" search={s.sort ? { sort: s.sort } : {}} className="btn btn-ink">{t("clear_filters")}</Link>}
                    <span className="w-full text-xs text-muted-foreground">{t("ex_pro_hint")} <Link to="/offer" search={s.q?.trim() ? { title: s.q.trim() } : {}} className="font-semibold text-sea underline">{t(s.q?.trim() ? "zero_offer" : "offer_service")}</Link></span>
                  </>
                }
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
