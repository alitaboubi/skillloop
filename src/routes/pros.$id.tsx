import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronRight, Copy, ImageIcon, Languages, MapPin, Pencil, Play, Sparkles, Wifi } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_META } from "@/components/contact-meta";
import { CONTACT_KINDS, contactHref, contactLabel, isPublicContactValid, type ContactKind } from "@/lib/profile-contacts";
import { ErrorState, EmptyState, TrustBadge } from "@/components/states";
import { EnlargeHint, FramedImage, MediaViewer, ProfilePhoto, type MediaItem } from "@/components/media-viewer";
import { ServiceCard, ServiceCardSkeleton, useAllServices } from "@/components/site";
import { fetchPublicProfile, profileQuery } from "@/lib/profiles-db";
import { profileSeo } from "@/lib/seo";
import { isUuid } from "@/lib/services-db";
import { useI18n, type TKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { BrandBackdrop, CATEGORY_ICONS, PointerField } from "@/components/brand";
import { ShareKit } from "@/components/share-kit";
import { CountUp, useActiveSection } from "@/components/motion-kit";
import { profilePath } from "@/lib/share";
import { CATEGORIES, type CategoryId, type Service } from "@/lib/data";
import { COMMITMENT_KEYS, hasCarnet, readCarnet, readTheme } from "@/lib/carnet";
import { PRO_TOOLS_ENABLED, hasProQuery, recordPageEvent } from "@/lib/pro-tools";

/** Pro state for the theme; any failure (function missing, network) is "no theme" — never a broken page. */
const loadHasPro = (qc: import("@tanstack/react-query").QueryClient, id: string) =>
  PRO_TOOLS_ENABLED ? qc.ensureQueryData(hasProQuery(id)).catch(() => false) : Promise.resolve(false);

export const Route = createFileRoute("/pros/$id")({
  // ?via=qr marks a scan of the pro's printed card (counted once, then removed from the address).
  validateSearch: z.object({ via: z.literal("qr").optional().catch(undefined) }),
  loader: async ({ params, context }) => {
    if (!isUuid(params.id)) throw notFound();
    // Server render: anonymous read (public contacts, published services only). In the browser the user's session is
    // used, as before (owners see their own private contacts in the editor, never on this page).
    if (typeof window === "undefined") {
      const [data, hasPro] = await Promise.all([fetchPublicProfile(params.id), loadHasPro(context.queryClient, params.id)]);
      if (!data) throw notFound();
      return { ...data, hasPro };
    }
    const [profile, hasPro] = await Promise.all([context.queryClient.ensureQueryData(profileQuery(params.id)), loadHasPro(context.queryClient, params.id)]);
    if (!profile) throw notFound();
    return { profile, services: null as Service[] | null, hasPro };
  },
  head: ({ loaderData }) => profileSeo(loaderData?.profile),
  notFoundComponent: NotFound,
  errorComponent: LoadError,
  pendingComponent: Skeleton,
  component: Page,
});

function LoadError() {
  const router = useRouter();
  return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={() => router.invalidate()} /></div>;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{t("profile_not_found")}</h1>
      <Link to="/explore" className="btn btn-ink mt-6">{t("explore_services")}</Link>
    </div>
  );
}

function Skeleton() {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("loading")}>
      <div className="pro-cover h-48 md:h-60" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pro-id -mt-20 flex flex-col gap-4 p-6 sm:flex-row sm:items-end md:-mt-28 md:p-8"><span className="skeleton-block size-28 rounded-full" /><div className="flex-1 space-y-2 pb-2"><div className="skeleton-block h-8 w-1/2" /><div className="skeleton-block h-4 w-1/3" /></div></div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <ServiceCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}

function Page() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const data = Route.useLoaderData();
  const { via } = Route.useSearch();
  const navigate = useNavigate();
  const q = useQuery({ ...profileQuery(id), initialData: data.profile });
  const proQ = useQuery({ ...hasProQuery(id), initialData: data.hasPro });
  // The pro's statistics: a visit (or a scan of their card), once per visitor session; the database ignores the owner.
  useEffect(() => {
    recordPageEvent(via === "qr" ? "qr_scan" : "profile_view", id);
    if (via) void navigate({ to: "/pros/$id", params: { id }, search: {}, replace: true });
  }, [id, via, navigate]);
  const all = useAllServices();
  const [viewer, setViewer] = useState<number | null>(null);
  const active = useActiveSection(["about", "services", "portfolio", "carnet"]);

  const p = q.data;
  if (!p) return <NotFound />;

  const isOwner = user?.id === p.id;
  const name = p.display_name || "—";
  const pd = (p.professional_details ?? {}) as Record<string, unknown>;
  const place = [p.area, p.city].filter(Boolean).join(", ");
  // Server HTML (and first paint) use the services loaded with the page; then the shared published list takes over.
  const ssrServices = all.isLoading ? data.services : null;
  const services = ssrServices ?? all.services.filter((s) => s.ownerId === p.id && p.serviceIds.includes(s.id));
  const remote = services.some((s) => s.remote);
  const onsite = services.some((s) => !s.remote);
  // Fields this provider really works in, from their published services (most offered first).
  const fields = [...services.reduce((m, s) => m.set(s.category, (m.get(s.category) ?? 0) + 1), new Map<CategoryId, number>())]
    .sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const spoken = Array.isArray(pd["languages"]) ? (pd["languages"] as unknown[]).filter((x): x is string => typeof x === "string" && !!x.trim()).join(", ") : typeof pd["languages"] === "string" ? pd["languages"].trim() : "";
  const availability = typeof pd["availability"] === "string" ? pd["availability"].trim() : "";
  // Only contacts the owner opted to make public, and only safe link shapes.
  const contacts = p.contacts
    .filter((c) => c.is_public && isPublicContactValid(c.kind, c.value))
    .sort((a, b) => CONTACT_KINDS.indexOf(a.kind as ContactKind) - CONTACT_KINDS.indexOf(b.kind as ContactKind));
  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success(t("copied")), () => {});
  const shown = p.portfolio.filter((x) => x.image);
  const portfolio: MediaItem[] = shown.map((x) => ({ src: x.image!, alt: x.title, caption: x.title, description: x.description, video: x.video }));
  // Before/after pairs (only once that feature is on): the "before" photo sits at the start side of the "after" one.
  const befores = shown.map((x) => x.before);
  const since = p.created_at ? new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { month: "long", year: "numeric" }).format(new Date(p.created_at)) : null;
  const hasDetails = !!(spoken || availability || typeof pd["accepting"] === "boolean");
  const carnet = readCarnet(pd);
  // Carnet theme (SkillLoop Pro): applied only while the pro has Pro; the stored choice is kept otherwise.
  const theme = PRO_TOOLS_ENABLED && proQ.data ? readTheme(pd) : null;

  // Cover: the pro's own published photos only (portfolio first, then service photos) — never category art.
  const coverPhotos = [...new Set([...shown.filter((x) => !x.video).map((x) => x.image!), ...services.filter((s) => s.hasPhoto).map((s) => s.image)])].slice(0, 3);
  const sections = [
    p.bio ? { id: "about", label: t("pp_about") } : null,
    { id: "services", label: t("pp_services") },
    portfolio.length > 0 ? { id: "portfolio", label: t("sd_portfolio") } : null,
    hasCarnet(carnet) ? { id: "carnet", label: t("carnet_method") } : null,
  ].filter((x): x is { id: string; label: string } => !!x);
  // Counts of what this page shows — nothing estimated.
  const stats = [
    { n: String(services.length), l: t("pp_stat_services") },
    fields.length > 0 ? { n: String(fields.length), l: t("pp_stat_fields") } : null,
    portfolio.length > 0 ? { n: String(portfolio.length), l: t("pp_stat_projects") } : null,
    since ? { n: since, l: t("pp_stat_since"), small: true } : null,
  ].filter((x): x is { n: string; l: string; small?: boolean } => !!x);
  const requestCta = services.length === 1
    ? <Link to="/services/$id" params={{ id: services[0]!.id }} hash="request" className="btn btn-lime w-full sm:w-auto">{t("request_quote")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
    : services.length > 1
      ? <a href="#services" className="btn btn-lime w-full sm:w-auto">{t("request_quote")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></a>
      : null;

  return (
    <div className={`pb-16 ${theme ? `ctheme ctheme-${theme}` : ""}`}>
      <div className="pro-cover">
        {coverPhotos.length > 0 ? (
          <div aria-hidden className="pro-cover-mosaic sd-cover" data-n={coverPhotos.length}>
            {coverPhotos.map((src) => <img key={src} src={src} alt="" />)}
          </div>
        ) : (
          <>
            <BrandBackdrop variant="intro" />
            <PointerField />
          </>
        )}
        <div aria-hidden className="pro-cover-fade" />
        <div className="relative mx-auto max-w-6xl px-4 pb-44 pt-5 sm:px-6 md:pb-64">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-navy-muted">
              <li><Link to="/" className="line-link rounded hover:text-navy-foreground">{t("home")}</Link></li>
              <li aria-hidden><ChevronRight className="size-4 rtl:-scale-x-100" /></li>
              <li><Link to="/explore" className="line-link rounded hover:text-navy-foreground">{t("explore_services")}</Link></li>
              <li aria-hidden><ChevronRight className="size-4 rtl:-scale-x-100" /></li>
              <li className="min-w-0"><span dir="auto" aria-current="page" className="line-clamp-1 text-navy-foreground">{name}</span></li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Positioned so the overlapping identity card paints above the (positioned) cover. */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="pro-id -mt-24 md:-mt-32">
          <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start md:gap-7 md:p-8">
            <div className="-mt-16 shrink-0 sm:-mt-20"><ProfilePhoto src={p.avatar} name={name} /></div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{t("pp_title")}</p>
              <h1 dir="auto" className="display-title mt-1 break-words text-3xl md:text-5xl">{name}</h1>
              {p.title && <p dir="auto" className="mt-1.5 break-words text-lg text-muted-foreground">{p.title}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {typeof pd["accepting"] === "boolean" && <span className={`avail-chip ${pd["accepting"] ? "avail-open" : "avail-closed"}`}>{t(pd["accepting"] ? "avail_open" : "avail_closed")}</span>}
                {place && <span className="tag tag-sea"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{place}</span></span>}
                {remote && <span className="tag tag-sea"><Wifi className="size-3.5" aria-hidden />{t("remote")}</span>}
                {onsite && <span className="tag tag-sea">{t("on_site")}</span>}
                {spoken && <span className="tag tag-sea"><Languages className="size-3.5" aria-hidden /><span dir="auto">{spoken}</span></span>}
                {/* These facts come from the pro: labelled as declared (levels of proof). */}
                {(place || spoken || typeof pd["accepting"] === "boolean") && <TrustBadge level="declared" />}
                {/* A subscription fact, labelled as such — never a level of proof. */}
                {PRO_TOOLS_ENABLED && proQ.data && (
                  <span className="tag bg-ink text-lime" title={t("pp_pro_member_note")}>
                    <Sparkles className="size-3.5" aria-hidden />{t("pp_pro_member")}<span className="sr-only"> — {t("pp_pro_member_note")}</span>
                  </span>
                )}
              </div>
              {fields.length > 0 && (
                <ul aria-label={t("pp_fields")} className="mt-3 flex flex-wrap gap-2">
                  {fields.map((c) => {
                    const cat = CATEGORIES.find((x) => x.id === c);
                    const Icon = CATEGORY_ICONS[c] ?? CATEGORY_ICONS.other;
                    return cat ? <li key={c}><Link to="/explore" search={{ category: c }} className="chip"><Icon className="size-3.5 text-clay-strong" aria-hidden />{t(cat.key)}</Link></li> : null;
                  })}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 md:items-end md:pt-6">
              {isOwner ? (
                <Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline"><Pencil className="size-4" aria-hidden />{t("pp_edit")}</Link>
              ) : requestCta && (
                <>
                  {requestCta}
                  {services.length > 1 && <p className="text-sm text-muted-foreground md:max-w-[14rem] md:text-end">{t("pp_request_help")}</p>}
                </>
              )}
            </div>
          </div>
          {stats.length > 1 && (
            <dl aria-label={t("pp_glance")} className="pro-stats">
              {stats.map((x) => (
                <div key={x.l} className="pro-stat sd-rise">
                  <dt className="pro-stat-l">{x.l}</dt>
                  <dd className="pro-stat-n" data-small={x.small || undefined}>{x.small ? x.n : <CountUp value={Number(x.n)} />}</dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        {isOwner && (
          <div role="note" className="mt-5 space-y-3 rounded-2xl bg-sea-soft p-4 text-sm text-sea">
            <p>{t("pp_own_note")}</p>
            <ShareKit path={profilePath(p.id)} title={name} text="share_profile_text" label="share_profile" />
          </div>
        )}
      </div>

      {sections.length > 1 && (
        <nav aria-label={t("pp_sections")} className="pro-tabs mt-8">
          <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:px-6">
            {sections.map((x) => <li key={x.id}><a href={`#${x.id}`} aria-current={active === x.id ? "true" : undefined} className="pro-tab">{x.label}</a></li>)}
          </ul>
        </nav>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0 space-y-14">
            {p.bio && (
              <section id="about" aria-labelledby="pp-about" className="scroll-mt-32">
                <h2 id="pp-about" className="section-title">{t("pp_about")}</h2>
                <p dir="auto" className="pro-quote mt-4 max-w-prose whitespace-pre-line break-words text-lg leading-relaxed">{p.bio}</p>
              </section>
            )}

            <section id="services" aria-labelledby="pp-services" className="sd-rise scroll-mt-32">
              <div className="section-head">
                <h2 id="pp-services" className="section-title">{t("pp_services")}</h2>
                {services.length > 0 && <span className="section-count">{services.length}</span>}
              </div>
              <div className="mt-5">
                {all.isLoading && !ssrServices ? (
                  <div className="grid gap-5 sm:grid-cols-2">{[0, 1].map((i) => <ServiceCardSkeleton key={i} />)}</div>
                ) : all.isError && !ssrServices ? (
                  <ErrorState onRetry={() => all.refetch()} />
                ) : services.length === 0 ? (
                  <EmptyState title={t("pp_no_services")} action={isOwner ? <Link to="/offer" className="btn btn-outline">{t("nav_offer")}</Link> : undefined} />
                ) : (
                  <div className="sd-stagger grid gap-5 sm:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} s={s} />)}</div>
                )}
              </div>
            </section>

            {portfolio.length > 0 ? (
              <section id="portfolio" aria-labelledby="pp-portfolio" className="scroll-mt-32">
                <div className="section-head">
                  <h2 id="pp-portfolio" className="section-title">{t("sd_portfolio")}</h2>
                  <span className="section-count">{portfolio.length}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t("pp_portfolio_note")}</p>
                {/* Bento from 3 projects (idea from VengeanceUI "Image Collage"/"Expandable Bento"; CSS grid only): the newest
                    leads — full width on tablets, and on wide screens a large tile beside the next two stacked. */}
                <ul className={`sd-stagger mt-5 grid gap-5 sm:grid-cols-2 ${portfolio.length >= 3 ? "xl:grid-cols-3" : ""}`}>
                  {portfolio.map((x, i) => {
                    const featured = i === 0 && portfolio.length >= 3;
                    return (
                    <li key={x.src} className={`min-w-0 ${featured ? "flex flex-col sm:col-span-2 xl:row-span-2" : ""}`}>
                      {befores[i] ? (
                        <div className={`grid grid-cols-2 gap-2 ${featured ? "xl:flex-1" : ""}`}>
                          <figure className="relative min-w-0">
                            <FramedImage src={befores[i]!} alt={`${x.alt} · ${t("ba_before")}`} className="aspect-[4/3]" />
                            <figcaption className="tag tag-ink absolute start-2 top-2">{t("ba_before")}</figcaption>
                          </figure>
                          <button type="button" onClick={() => setViewer(i)} className="media-trigger relative rounded-2xl" aria-label={t("pp_open_project", { t: x.alt })}>
                            <FramedImage src={x.src} alt="" className="aspect-[4/3]" />
                            <span aria-hidden className="tag absolute start-2 top-2 bg-lime text-lime-foreground">{t("ba_after")}</span>
                            <EnlargeHint />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setViewer(i)} className={`media-trigger relative rounded-2xl ${featured ? "xl:flex-1" : ""}`} aria-label={t(x.video ? "pp_open_video" : "pp_open_project", { t: x.alt })}>
                          <FramedImage src={x.src} alt="" className={featured ? "aspect-[4/3] sm:aspect-[16/9] xl:aspect-auto xl:h-full xl:min-h-[18rem]" : "aspect-[4/3]"} />
                          {x.video ? <span aria-hidden className="tag tag-ink absolute start-3 top-3"><Play className="size-3.5 fill-current" />{t("mo_badge")}</span> : <EnlargeHint />}
                        </button>
                      )}
                      <h3 dir="auto" className="mt-3 break-words font-semibold">{x.caption}</h3>
                      {x.description && <p dir="auto" className={`mt-1 break-words text-sm text-muted-foreground ${featured ? "line-clamp-3" : "line-clamp-2"}`}>{x.description}</p>}
                    </li>
                    );
                  })}
                </ul>
                <MediaViewer items={portfolio} index={viewer ?? 0} onIndex={setViewer} open={viewer !== null} onOpenChange={(o) => !o && setViewer(null)} />
              </section>
            ) : isOwner ? (
              <section aria-labelledby="pp-portfolio">
                <h2 id="pp-portfolio" className="section-title">{t("sd_portfolio")}</h2>
                <div className="mt-5"><EmptyState icon={ImageIcon} title={t("db_no_portfolio")} sub={t("db_no_portfolio_sub")} action={<Link to="/profile" search={{ tab: "settings" }} hash="portfolio" className="btn btn-outline">{t("portfolio_add")}</Link>} /></div>
              </section>
            ) : null}

            {hasCarnet(carnet) ? (
              <section id="carnet" aria-labelledby="pp-carnet" className="scroll-mt-32 space-y-8">
                {carnet.method.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><h2 id="pp-carnet" className="section-title">{t("carnet_method")}</h2><TrustBadge level="declared" /></div>
                    <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                      {carnet.method.map((step, i) => (
                        <li key={i} className="ct-step panel flex gap-3 p-4">
                          <span aria-hidden className="ct-num grid size-8 shrink-0 place-items-center rounded-full bg-clay/15 text-sm font-bold text-clay-strong">{i + 1}</span>
                          <p dir="auto" className="min-w-0 break-words text-sm leading-relaxed">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {carnet.commitments.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 {...(carnet.method.length ? {} : { id: "pp-carnet" })} className="section-title">{t("carnet_commitments")}</h2>
                      <TrustBadge level="declared" />
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {carnet.commitments.map((c) => (
                        <li key={c} className="flex items-center gap-3 text-sm">
                          <span aria-hidden className="ct-check grid size-7 shrink-0 place-items-center rounded-full bg-sea-soft text-sea"><Check className="size-4" /></span>
                          {c === "warranty" ? t("cm_warranty_days", { n: carnet.warrantyDays ?? "" }) : t(COMMITMENT_KEYS[c])}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ) : isOwner ? (
              <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed p-4 text-sm">
                <p className="max-w-md text-muted-foreground">{t("pp_carnet_owner")}</p>
                <Link to="/profile" search={{ tab: "settings" }} hash="carnet" className="btn btn-outline min-h-10">{t("pp_carnet_cta")}</Link>
              </div>
            ) : null}
          </div>

          {(!isOwner && requestCta) || hasDetails || contacts.length > 0 ? (
            <aside className="h-fit space-y-6 lg:sticky lg:top-32">
              <section aria-labelledby="pp-details" className="panel-action relative p-5 sm:p-6" data-tilt>
                <h2 id="pp-details" dir="auto" className="text-lg font-bold">{t("pp_work_with", { n: name })}</h2>
                {!isOwner && requestCta && (
                  <>
                    <p dir="auto" className="mt-1 text-sm text-muted-foreground">{t("pp_work_with_sub", { n: name })}</p>
                    <div className="mt-4 [&>*]:w-full">{requestCta}</div>
                  </>
                )}
                {hasDetails && (
                  <>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4"><h3 className="text-sm font-bold">{t("pp_details")}</h3><TrustBadge level="declared" /></div>
                    <dl className="mt-1 text-sm">
                      {availability && <div className="info-row"><div className="min-w-0"><dt className="text-sm text-muted-foreground">{t("availability")}</dt><dd dir="auto" className="break-words font-semibold">{availability}</dd></div></div>}
                      {spoken && <div className="info-row"><div className="min-w-0"><dt className="text-sm text-muted-foreground">{t("languages")}</dt><dd dir="auto" className="font-semibold">{spoken}</dd></div></div>}
                      {since && <div className="info-row"><dd className="text-muted-foreground">{t("sd_member_since", { d: since })}</dd></div>}
                    </dl>
                  </>
                )}
                {contacts.length > 0 && (
                  <>
                    <h3 className="mt-4 border-t pt-4 text-sm font-bold">{t("pp_contact")}</h3>
                    <ul className="mt-2 space-y-1">
                      {contacts.map((c) => {
                        const meta = CONTACT_META[c.kind as ContactKind];
                        const phone = c.kind === "phone" || c.kind === "whatsapp";
                        return (
                          <li key={c.id} className="flex items-center gap-1">
                            <a href={contactHref(c.kind, c.value)} onClick={() => recordPageEvent("contact_click", p.id)} {...(c.kind === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer nofollow" })} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-sm transition-colors hover:bg-muted">
                              <span className="icon-well-sea size-9"><meta.icon className="size-4" aria-hidden /></span>
                              <span className="min-w-0"><span className="block text-sm text-muted-foreground">{t(meta.label)}</span><span dir="ltr" className="block truncate font-medium">{contactLabel(c.kind, c.value)}</span></span>
                            </a>
                            {phone && (
                              <button type="button" onClick={() => copy(c.value.trim())} aria-label={`${t("copy_number")} · ${t(meta.label)}`} title={t("copy_number")} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <Copy className="size-4" aria-hidden />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

