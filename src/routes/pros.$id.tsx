import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Copy, ImageIcon, Languages, MapPin, Pencil, Wifi } from "lucide-react";
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
import { profilePath } from "@/lib/share";
import { CATEGORIES, type CategoryId, type Service } from "@/lib/data";
import { COMMITMENT_KEYS, hasCarnet, readCarnet } from "@/lib/carnet";

export const Route = createFileRoute("/pros/$id")({
  loader: async ({ params, context }) => {
    if (!isUuid(params.id)) throw notFound();
    // Server render: anonymous read (public contacts, published services only). In the browser the user's session is
    // used, as before (owners see their own private contacts in the editor, never on this page).
    if (typeof window === "undefined") {
      const data = await fetchPublicProfile(params.id);
      if (!data) throw notFound();
      return data;
    }
    const profile = await context.queryClient.ensureQueryData(profileQuery(params.id));
    if (!profile) throw notFound();
    return { profile, services: null as Service[] | null };
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
      <div className="profile-cover h-40 md:h-48" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-12 flex items-end gap-4"><span className="skeleton-block size-24 rounded-full" /><div className="flex-1 space-y-2 pb-2"><div className="skeleton-block h-7 w-1/2" /><div className="skeleton-block h-4 w-1/3" /></div></div>
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
  const q = useQuery({ ...profileQuery(id), initialData: data.profile });
  const all = useAllServices();
  const [viewer, setViewer] = useState<number | null>(null);

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
  const portfolio: MediaItem[] = shown.map((x) => ({ src: x.image!, alt: x.title, caption: x.title, description: x.description }));
  // Before/after pairs (only once that feature is on): the "before" photo sits at the start side of the "after" one.
  const befores = shown.map((x) => x.before);
  const since = p.created_at ? new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { month: "long", year: "numeric" }).format(new Date(p.created_at)) : null;
  const hasDetails = !!(spoken || availability || typeof pd["accepting"] === "boolean");
  const carnet = readCarnet(pd);

  return (
    <div className="pb-16">
      <div className="profile-cover relative overflow-hidden">
        <BrandBackdrop variant="intro" />
        <PointerField />
        {fields.length > 0 && (
          <div aria-hidden className="pointer-events-none absolute bottom-5 end-4 hidden gap-2 sm:flex sm:end-6">
            {fields.slice(0, 4).map((c, i) => {
              const Icon = CATEGORY_ICONS[c] ?? CATEGORY_ICONS.other;
              return <span key={c} className={`grid size-12 place-items-center rounded-2xl ${i % 2 ? "bg-clay/30 text-ink-foreground" : "bg-ink-foreground/10 text-clay"}`}><Icon className="size-6" /></span>;
            })}
          </div>
        )}
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 md:pb-20">
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

      {/* Positioned so the overlapping header paints above the (positioned) cover. */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="-mt-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <ProfilePhoto src={p.avatar} name={name} />
            <div className="min-w-0 sm:pt-16">
              <p className="eyebrow">{t("pp_title")}</p>
              <h1 dir="auto" className="display-title mt-1 break-words text-3xl md:text-4xl">{name}</h1>
              {p.title && <p dir="auto" className="mt-0.5 break-words text-muted-foreground">{p.title}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {place && <span className="tag tag-sea"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{place}</span></span>}
                {remote && <span className="tag tag-sea"><Wifi className="size-3.5" aria-hidden />{t("remote")}</span>}
                {onsite && <span className="tag tag-sea">{t("on_site")}</span>}
                {spoken && <span className="tag tag-sea"><Languages className="size-3.5" aria-hidden /><span dir="auto">{spoken}</span></span>}
                {typeof pd["accepting"] === "boolean" && <span className={`avail-chip ${pd["accepting"] ? "avail-open" : "avail-closed"}`}>{t(pd["accepting"] ? "avail_open" : "avail_closed")}</span>}
                {/* These facts come from the pro: labelled as declared (levels of proof). */}
                {(place || spoken || typeof pd["accepting"] === "boolean") && <TrustBadge level="declared" />}
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
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 md:items-end">
            {isOwner ? (
              <Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline"><Pencil className="size-4" aria-hidden />{t("pp_edit")}</Link>
            ) : services.length === 1 ? (
              <Link to="/services/$id" params={{ id: services[0]!.id }} hash="request" className="btn btn-lime">{t("request_quote")}</Link>
            ) : services.length > 1 ? (
              <>
                <a href="#services" className="btn btn-lime">{t("request_quote")}</a>
                <p className="text-xs text-muted-foreground">{t("pp_request_help")}</p>
              </>
            ) : null}
          </div>
        </header>

        {isOwner && (
          <div role="note" className="mt-5 space-y-3 rounded-2xl bg-sea-soft p-4 text-sm text-sea">
            <p>{t("pp_own_note")}</p>
            <ShareKit path={profilePath(p.id)} title={name} text="share_profile_text" label="share_profile" />
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-12">
            {p.bio && (
              <section aria-labelledby="pp-about">
                <h2 id="pp-about" className="text-xl font-bold">{t("pp_about")}</h2>
                <p dir="auto" className="mt-3 max-w-prose whitespace-pre-line break-words leading-relaxed text-muted-foreground">{p.bio}</p>
              </section>
            )}

            {hasCarnet(carnet) ? (
              <section id="carnet" aria-labelledby="pp-carnet" className="space-y-8">
                {carnet.method.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><h2 id="pp-carnet" className="text-xl font-bold">{t("carnet_method")}</h2><TrustBadge level="declared" /></div>
                    <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                      {carnet.method.map((step, i) => (
                        <li key={i} className="panel flex gap-3 p-4">
                          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-clay/15 text-sm font-bold text-clay-strong">{i + 1}</span>
                          <p dir="auto" className="min-w-0 break-words text-sm leading-relaxed">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {carnet.commitments.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 {...(carnet.method.length ? {} : { id: "pp-carnet" })} className="text-xl font-bold">{t("carnet_commitments")}</h2>
                      <TrustBadge level="declared" />
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {carnet.commitments.map((c) => (
                        <li key={c} className="flex items-center gap-3 text-sm">
                          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-sea-soft text-sea"><Check className="size-4" /></span>
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

            <section id="services" aria-labelledby="pp-services" className="scroll-mt-24">
              <h2 id="pp-services" className="text-xl font-bold">{t("pp_services")}{services.length > 0 && <span className="ms-2 text-base font-semibold text-muted-foreground">({services.length})</span>}</h2>
              <div className="mt-5">
                {all.isLoading && !ssrServices ? (
                  <div className="grid gap-5 sm:grid-cols-2">{[0, 1].map((i) => <ServiceCardSkeleton key={i} />)}</div>
                ) : all.isError && !ssrServices ? (
                  <ErrorState onRetry={() => all.refetch()} />
                ) : services.length === 0 ? (
                  <EmptyState title={t("pp_no_services")} action={isOwner ? <Link to="/offer" className="btn btn-outline">{t("nav_offer")}</Link> : undefined} />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} s={s} />)}</div>
                )}
              </div>
            </section>

            {portfolio.length > 0 ? (
              <section aria-labelledby="pp-portfolio">
                <h2 id="pp-portfolio" className="text-xl font-bold">{t("sd_portfolio")}<span className="ms-2 text-base font-semibold text-muted-foreground">({portfolio.length})</span></h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("pp_portfolio_note")}</p>
                {/* Bento from 3 projects (idea from VengeanceUI "Image Collage"/"Expandable Bento"; CSS grid only): the newest
                    leads — full width on tablets, and on wide screens a large tile beside the next two stacked. */}
                <ul className={`mt-5 grid gap-5 sm:grid-cols-2 ${portfolio.length >= 3 ? "xl:grid-cols-3" : ""}`}>
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
                        <button type="button" onClick={() => setViewer(i)} className={`media-trigger rounded-2xl ${featured ? "xl:flex-1" : ""}`} aria-label={t("pp_open_project", { t: x.alt })}>
                          <FramedImage src={x.src} alt="" className={featured ? "aspect-[4/3] sm:aspect-[16/9] xl:aspect-auto xl:h-full xl:min-h-[18rem]" : "aspect-[4/3]"} />
                          <EnlargeHint />
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
                <h2 id="pp-portfolio" className="text-xl font-bold">{t("sd_portfolio")}</h2>
                <div className="mt-5"><EmptyState icon={ImageIcon} title={t("db_no_portfolio")} sub={t("db_no_portfolio_sub")} action={<Link to="/profile" search={{ tab: "settings" }} hash="portfolio" className="btn btn-outline">{t("portfolio_add")}</Link>} /></div>
              </section>
            ) : null}
          </div>

          {(hasDetails || contacts.length > 0 || since) && (
            <aside className="h-fit space-y-6 lg:sticky lg:top-24">
              <section aria-labelledby="pp-details" className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pp-details" className="font-bold">{t("pp_details")}</h2><TrustBadge level="declared" /></div>
                <dl className="mt-2 text-sm">
                  {availability && <div className="info-row"><div className="min-w-0"><dt className="text-xs text-muted-foreground">{t("availability")}</dt><dd dir="auto" className="break-words font-semibold">{availability}</dd></div></div>}
                  {spoken && <div className="info-row"><div className="min-w-0"><dt className="text-xs text-muted-foreground">{t("languages")}</dt><dd dir="auto" className="font-semibold">{spoken}</dd></div></div>}
                  {since && <div className="info-row"><dd className="text-muted-foreground">{t("sd_member_since", { d: since })}</dd></div>}
                </dl>
                {contacts.length > 0 && (
                  <>
                    <h3 className="mt-4 border-t pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pp_contact")}</h3>
                    <ul className="mt-2 space-y-1">
                      {contacts.map((c) => {
                        const meta = CONTACT_META[c.kind as ContactKind];
                        const phone = c.kind === "phone" || c.kind === "whatsapp";
                        return (
                          <li key={c.id} className="flex items-center gap-1">
                            <a href={contactHref(c.kind, c.value)} {...(c.kind === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer nofollow" })} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-sm transition-colors hover:bg-muted">
                              <meta.icon className="size-4 shrink-0 text-sea" aria-hidden />
                              <span className="min-w-0"><span className="block text-xs text-muted-foreground">{t(meta.label)}</span><span dir="ltr" className="block truncate font-medium">{contactLabel(c.kind, c.value)}</span></span>
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
          )}
        </div>
      </div>
    </div>
  );
}
