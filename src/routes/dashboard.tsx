import { createFileRoute, Link } from "@tanstack/react-router";
import { rememberCurrentPage } from "@/lib/return-to";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowRight, Clock, MessageSquare, Settings, Hourglass, Handshake, Gauge, Sparkles, PauseCircle, Pencil, CheckCircle2, Circle, Briefcase, ExternalLink, Inbox, Image as ImageIcon, LayoutDashboard, PlusCircle, Search, MapPin } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site";
import { EmptyState, ErrorState, ListingSketch, ListSkeleton, RequestTimeline, StartShortcuts, StatusBadge } from "@/components/states";
import { myRequestsQuery, type RequestRow } from "@/lib/requests-db";
import { CATEGORIES } from "@/lib/data";
import { profileQuery } from "@/lib/profiles-db";
import { clientRequestSummary, profileChecklist, resolveDashboardMode } from "@/lib/request-timeline";
import { REQUEST_PROGRESS_ENABLED } from "@/lib/request-progress";
import { seo } from "@/lib/seo";
import { BrandBackdrop, LoopProgress, PointerField } from "@/components/brand";
import { clientNextStep } from "@/lib/conversations";
import { draftsFirst, draftsToFinish, formatWait, isCaughtUp, pendingOldestFirst } from "@/lib/provider-today";
import { ShareKit } from "@/components/share-kit";
import { profilePath } from "@/lib/share";
import { ProfilePhoto } from "@/components/media-viewer";
import { PRO_PLAN_ENABLED } from "@/lib/plan";
import { PlanCard } from "@/components/plan-card";
import { ProHub } from "@/components/pro-tools";
import { signImages } from "@/lib/services-db";
import { DashHero, SegSlide, ServiceTile, StatTile } from "@/components/dash-kit";

const SECTIONS = ["overview", "pro", "services", "requests", "portfolio", "preview"] as const;
type Section = (typeof SECTIONS)[number];
type Mode = "client" | "provider";
// "pro" (Pro tools: statistics, card & QR) exists only with the plan.
const MODE_SECTIONS: Record<Mode, readonly Section[]> = { client: ["overview", "requests"], provider: SECTIONS.filter((x) => x !== "pro" || PRO_PLAN_ENABLED) };

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({
    mode: z.enum(["client", "provider"]).optional().catch(undefined),
    section: z.enum(SECTIONS).optional().catch(undefined),
  }),
  head: () => seo("Tableau de bord", "Votre espace SkillLoop : services, demandes, portfolio et profil public.", { noindex: true }),
  component: Page,
});

const myServicesQuery = (userId: string) => ({
  queryKey: ["services", "mine", userId, "active"],
  queryFn: async () => {
    const { data, error } = await supabase.from("services").select("id, title, category, city, created_at, status, archived, image_url").eq("owner_id", userId).eq("archived", false).order("created_at", { ascending: false });
    if (error) throw error;
    const urls = await signImages(data.map((d) => d.image_url).filter((x): x is string => !!x));
    return data.map((d) => ({ ...d, img: d.image_url ? urls[d.image_url] : undefined }));
  },
});

/** Checklist items jump to the matching field in profile settings. */
const CHECK_ANCHOR: Partial<Record<TKey, string>> = { db_check_photo: "photo", db_check_bio: "bio", db_check_availability: "availability", db_check_carnet: "carnet" };

const SECTION_LABEL: Record<Section, TKey> = { overview: "db_overview", services: "my_services", requests: "received_requests", portfolio: "db_portfolio", preview: "db_preview", pro: "db_pro_tools" };

function Page() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const s = Route.useSearch();
  // Without an explicit ?mode, accounts with a service open the provider side; everyone else the client side.
  const mine = useQuery({ ...myServicesQuery(user?.id ?? ""), enabled: !!user && !s.mode });
  const mode: Mode = resolveDashboardMode(s.mode, mine.data?.length ?? 0);
  const sections = MODE_SECTIONS[mode];
  const section: Section = s.section && sections.includes(s.section) ? s.section : "overview";

  const me = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const reqs = useQuery({ ...myRequestsQuery(user?.id ?? ""), enabled: !!user });
  if (!ready || (user && !s.mode && mine.isLoading)) return <div className="mx-auto max-w-5xl px-4 py-10"><ListSkeleton /></div>;
  if (!user)
    return (
      <>
        <PageHero title={t("dashboard")} />
        <div className="mx-auto max-w-xl px-4 py-12">
          <EmptyState icon={LayoutDashboard} title={t("db_signin")} action={<Link to="/login" onClick={rememberCurrentPage} className="btn btn-lime">{t("login")}</Link>} />
        </div>
      </>
    );

  const name = me.data?.display_name || user.email?.split("@")[0] || "";
  const pendingIn = (reqs.data ?? []).filter((r) => r.provider_id === user.id && r.status === "pending").length;
  return (
    <>
      <DashHero name={name} avatar={me.data?.avatar ?? undefined} eyebrow={t("dashboard")} sub={t(mode === "client" ? "dh_sub_client" : "dh_sub_pro")}>
        <SegSlide index={mode === "client" ? 0 : 1} count={2} label={t("db_mode")}>
          {(["client", "provider"] as const).map((m) => (
            <Link key={m} to="/dashboard" search={{ mode: m }} aria-current={mode === m ? "page" : undefined}>{t(m === "client" ? "db_mode_client" : "db_mode_provider")}</Link>
          ))}
        </SegSlide>
        {mode === "provider" ? (
          <>
            <Link to="/offer" className="btn btn-lime" data-magnetic><PlusCircle className="size-4" aria-hidden />{t("offer_service")}</Link>
            <Link to="/pros/$id" params={{ id: user.id }} className="dash-action"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
          </>
        ) : (
          <Link to="/explore" className="btn btn-lime" data-magnetic><Search className="size-4" aria-hidden />{t("explore_services")}</Link>
        )}
        <Link to="/messages" className="dash-action"><MessageSquare className="size-4" aria-hidden />{t("messages")}</Link>
        <Link to="/profile" search={{ tab: "settings" }} className="dash-action"><Settings className="size-4" aria-hidden />{t("db_edit_profile")}</Link>
      </DashHero>
      <nav aria-label={t("db_sections")} className="dash-tabs sd-sticky-shadow">
        <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:px-6">
          {sections.map((k) => (
            <li key={k}>
              <Link to="/dashboard" search={{ mode, section: k }} aria-current={section === k ? "page" : undefined} className="dash-tab">
                {k === "pro" && <Sparkles className="size-4 text-clay-strong" aria-hidden />}
                {t(k === "requests" && mode === "client" ? "my_requests" : SECTION_LABEL[k])}
                {k === "requests" && mode === "provider" && pendingIn > 0 && <span className="dash-tab-n">{pendingIn}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="mt-8">
          {mode === "client" ? (
            section === "overview" ? <ClientOverview userId={user.id} /> : <Requests userId={user.id} received={false} />
          ) : section === "overview" ? (
            <Overview userId={user.id} />
          ) : section === "services" ? (
            <Services userId={user.id} />
          ) : section === "requests" ? (
            <Requests userId={user.id} received />
          ) : section === "portfolio" ? (
            <Portfolio userId={user.id} />
          ) : section === "pro" ? (
            <ProHub userId={user.id} />
          ) : (
            <Preview userId={user.id} />
          )}
        </div>
      </div>
    </>
  );
}

function ClientOverview({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery(myRequestsQuery(userId));
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const mine = (q.data ?? []).filter((r) => r.client_id === userId);
  const sum = clientRequestSummary(mine);
  const stats: [TKey, number, string, typeof Clock][] = [["sum_pending", sum.pending, "var(--warning)", Hourglass], ["sum_accepted", sum.accepted, "var(--success)", Handshake], ["sum_closed", sum.closed, "var(--muted-foreground)", PauseCircle]];
  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">{t("db_client_intro")}</p>
      {mine.length > 0 && (
        <dl className="grid gap-4 sm:grid-cols-3">
          {stats.map(([k, v, tone, Icon]) => <StatTile key={k} icon={Icon} value={v} label={t(k)} tone={tone} />)}
        </dl>
      )}
      <section aria-labelledby="recent-req">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-req" className="text-lg font-bold">{t("db_recent_requests")}</h2>
          {mine.length > 3 && <Link to="/dashboard" search={{ mode: "client", section: "requests" }} className="text-sm font-semibold text-sea underline-offset-4 hover:underline">{t("db_see_all")}</Link>}
        </div>
        {mine.length ? (
          <ul className="space-y-3">{mine.slice(0, 3).map((r) => <RequestItem key={r.id} r={r} received={false} />)}</ul>
        ) : (
          <EmptyState icon={Inbox} title={t("db_no_requests")} sub={t("db_no_requests_client")} action={<><Link to="/explore" className="btn btn-ink"><Search className="size-4" aria-hidden />{t("explore_services")}</Link><div className="w-full"><StartShortcuts /></div></>} />
        )}
      </section>
      <section aria-labelledby="become-pro" className="sd-rise relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-ink-hero p-6 text-ink-foreground sm:flex-row sm:items-center sm:justify-between">
        <PointerField />
        <div className="relative">
          <h2 id="become-pro" className="text-lg font-bold">{t("db_become_pro_t")}</h2>
          <p className="mt-1 text-sm text-navy-muted">{t("db_become_pro_d")}</p>
        </div>
        <Link to="/offer" className="btn btn-lime relative shrink-0">{t("offer_service")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
      </section>
    </div>
  );
}

function Overview({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { lang } = useI18n();
  const prof = useQuery(profileQuery(userId));
  const reqs = useQuery(myRequestsQuery(userId));
  const svcs = useQuery(myServicesQuery(userId));
  if (prof.isLoading) return <ListSkeleton rows={2} />;
  if (prof.isError) return <ErrorState onRetry={() => prof.refetch()} />;
  const p = prof.data;
  const items = profileChecklist({ avatar_url: p?.avatar_url, bio: p?.bio, publishedServices: p?.serviceIds.length ?? 0, professional_details: p?.professional_details });
  const done = items.filter((x) => x.done).length;
  // "Today": only what needs action — longest-waiting request first, then drafts to finish.
  const pending = pendingOldestFirst(reqs.data ?? [], userId);
  const drafts = draftsToFinish(svcs.data ?? []);
  const accepting = ((p?.professional_details ?? {}) as Record<string, unknown>)["accepting"];
  const loadingToday = reqs.isLoading || svcs.isLoading;
  const caughtUp = !loadingToday && !reqs.isError && !svcs.isError && isCaughtUp(pending.length, drafts.length);
  const locale = lang === "ar" ? "ar-TN" : lang;
  return (
    <div className="space-y-8">
      {accepting === false && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <p className="flex min-w-0 items-start gap-2 font-medium"><PauseCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />{t("not_accepting_banner")}</p>
          <Link to="/profile" search={{ tab: "settings" }} hash="availability" className="btn btn-outline min-h-10 shrink-0">{t("change_availability")}</Link>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Briefcase} value={p?.serviceIds.length ?? 0} label={t("stat_services")} tone="var(--sea)" />
        <StatTile icon={Hourglass} value={pending.length} label={t("stat_pending")} tone="var(--warning)" />
        <StatTile icon={Handshake} value={(reqs.data ?? []).filter((r) => r.provider_id === userId && r.status === "accepted").length} label={t("stat_accepted")} tone="var(--success)" />
        <StatTile icon={Gauge} value={`${Math.round((done / Math.max(1, items.length)) * 100)}%`} label={t("dh_profile_done")} tone="var(--clay)" />
      </dl>

      {PRO_PLAN_ENABLED && <PlanCard userId={userId} publishedServices={p?.serviceIds.length ?? 0} />}

      <section aria-labelledby="today">
        <h2 id="today" className="mb-3 text-lg font-bold">{t("today_t")}</h2>
        {loadingToday ? <ListSkeleton rows={2} /> : reqs.isError ? <ErrorState onRetry={() => reqs.refetch()} /> : svcs.isError ? <ErrorState onRetry={() => svcs.refetch()} /> : caughtUp ? (
          <div className="panel p-6">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5 text-success" aria-hidden />{t("caught_up_t")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("caught_up_d")}</p>
            <div className="mt-4"><ShareKit path={profilePath(userId)} title={p?.display_name ?? "SkillLoop"} text="share_profile_text" label="share_profile" /></div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {pending.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("db_new_requests")} ({pending.length})</h3>
                <ul className="space-y-3">{pending.map((r) => <RequestItem key={r.id} r={r} received waited={formatWait(r.created_at, locale)} />)}</ul>
              </div>
            )}
            {drafts.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("drafts_t")} ({drafts.length})</h3>
                <ul className="space-y-3">
                  {drafts.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-clay/50 bg-card p-4">
                      <div className="min-w-0">
                        <p dir="auto" className="truncate font-semibold">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{t("draft_hint")}</p>
                      </div>
                      <Link to="/offer" search={{ edit: d.id }} className="btn btn-lime min-h-10"><Pencil className="size-4" aria-hidden />{t("draft_finish")}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="max-w-2xl">
      {done < items.length ? (
        <section aria-labelledby="checklist" className="panel p-6">
          <div className="flex items-center gap-4">
            <LoopProgress value={done} total={items.length} label={t("loop_progress_label", { n: done, total: items.length })} className="w-24 shrink-0" />
            <div className="min-w-0">
              <h2 id="checklist" className="text-lg font-bold">{t("db_checklist")}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("db_check_progress", { n: done, total: items.length })}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {items.map((x) => (
              <li key={x.key} className="flex items-center gap-3 text-sm">
                {x.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                {x.done ? (
                  <span className="text-muted-foreground line-through">{t(x.key)}</span>
                ) : x.key === "db_check_service" ? (
                  <Link to="/offer" className="font-medium text-sea underline-offset-4 hover:underline">{t(x.key)}</Link>
                ) : (
                  <Link to="/profile" search={{ tab: "settings" }} hash={CHECK_ANCHOR[x.key] ?? ""} className="font-medium text-sea underline-offset-4 hover:underline">{t(x.key)}</Link>
                )}
                <span className="sr-only">— {t(x.done ? "db_done" : "db_todo")}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {(p?.serviceIds.length ?? 0) === 0 && <Link to="/offer" className="btn btn-lime"><PlusCircle className="size-4" aria-hidden />{t("offer_service")}</Link>}
            <Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline">{t("db_edit_profile")}</Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="ready" className="panel-action p-6 pt-7">
          <div className="flex items-center gap-4">
            <LoopProgress value={done} total={items.length} label={t("loop_progress_label", { n: done, total: items.length })} className="w-24 shrink-0" />
            <h2 id="ready" className="text-lg font-bold">{t("ready_t")}</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("ready_d")}</p>
          <div className="mt-4 space-y-3">
            <Link to="/pros/$id" params={{ id: userId }} className="btn btn-lime min-h-10"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
            {/* The "all caught up" card above already offers sharing; don't repeat it. */}
            {!caughtUp && <ShareKit path={profilePath(userId)} title={p?.display_name ?? "SkillLoop"} text="share_profile_text" label="share_profile" />}
          </div>
        </section>
      )}
      </div>
      <section aria-labelledby="my-svcs"><h2 id="my-svcs" className="mb-3 text-lg font-bold">{t("my_services")}</h2><Services userId={userId} /></section>
    </div>
  );
}

function Services({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery(myServicesQuery(userId));
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data?.length)
    return <EmptyState icon={Briefcase} title={t("db_no_services")} sub={t("db_no_services_sub")}
      action={<div className="flex w-full flex-col items-center gap-4"><ListingSketch /><Link to="/offer" className="btn btn-lime"><PlusCircle className="size-4" aria-hidden />{t("offer_service")}</Link></div>} />;
  return (
    <ul className="sd-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {draftsFirst(q.data).map((x) => (
        <ServiceTile key={x.id} s={x} actions={
          <>
            <Link to="/offer" search={{ edit: x.id }} className={`btn min-h-10 ${x.status === "draft" ? "btn-lime" : "btn-outline"}`}><Pencil className="size-4" aria-hidden />{t(x.status === "draft" ? "draft_finish" : "portfolio_edit")}</Link>
            <Link to="/profile" search={{ space: "pro", tab: "services" }} className="btn btn-outline min-h-10">{t("db_manage")}</Link>
          </>
        } />
      ))}
    </ul>
  );
}

function RequestItem({ r, received, waited }: { r: RequestRow; received: boolean; waited?: string }) {
  const { t } = useI18n();
  const next = received ? null : clientNextStep(r.status);
  const other = (received ? r.client?.display_name : r.provider?.display_name) || t("account_deleted_name");
  const progress = REQUEST_PROGRESS_ENABLED ? { ...r, remote: !!r.services?.remote } : undefined;
  return (
    <li className="row-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to="/messages" search={{ r: r.id }} dir="auto" className="stretched-link block truncate font-semibold">{r.services?.title}</Link>
          {other && <p className="text-xs text-muted-foreground">{t(received ? "from_client" : "to_provider")} <span dir="auto">{other}</span></p>}
        </div>
        <span className="relative z-[2] flex flex-wrap items-center gap-2">
          {waited && <span className="badge badge-warning"><Clock className="size-3.5" aria-hidden />{t("waiting_since", { d: waited })}</span>}
          <StatusBadge status={r.status} progress={progress} />
        </span>
      </div>
      <p dir="auto" className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.message}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <RequestTimeline status={r.status} createdAt={r.created_at} progress={progress} />
        <Link to="/messages" search={{ r: r.id }} className={`btn relative z-[2] min-h-10 ${(received && r.status === "pending") || (!received && next?.action === "chat") ? "btn-lime" : "btn-outline"}`}>{t(received && r.status === "pending" ? "db_reply" : "open_chat")}</Link>
      </div>
      {next?.action && (
        // Client side (pending is already explained by the timeline above): one clear next step for this request's status.
        <div className="relative z-[2] mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm">
          <span>{t(next.key)}</span>
          {next.action === "similar" && (
            <Link to="/explore" search={r.services?.category ? { category: r.services.category } : {}} className="font-semibold text-sea underline-offset-4 hover:underline">
              {t(r.status === "cancelled" ? "trk_ask_other" : "rq_similar")}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function Requests({ userId, received }: { userId: string; received: boolean }) {
  const { t } = useI18n();
  const q = useQuery(myRequestsQuery(userId));
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const list = (q.data ?? []).filter((r) => (received ? r.provider_id === userId : r.client_id === userId));
  if (!list.length)
    return <EmptyState icon={Inbox} title={t("db_no_requests")} sub={t(received ? "db_no_requests_pro" : "db_no_requests_client")}
      action={received ? <Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline">{t("db_edit_profile")}</Link> : <><Link to="/explore" className="btn btn-ink"><Search className="size-4" aria-hidden />{t("explore_services")}</Link><div className="w-full"><StartShortcuts /></div></>} />;
  return <ul className="sd-stagger space-y-3">{list.map((r) => <RequestItem key={r.id} r={r} received={received} />)}</ul>;
}

function Portfolio({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery(profileQuery(userId));
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const items = q.data?.portfolio ?? [];
  if (!items.length)
    return <EmptyState icon={ImageIcon} title={t("db_no_portfolio")} sub={t("db_no_portfolio_sub")} action={<Link to="/profile" search={{ tab: "settings" }} hash="portfolio" className="btn btn-lime">{t("portfolio_add")}</Link>} />;
  return (
    <div className="space-y-4">
    <div className="flex justify-end"><Link to="/profile" search={{ tab: "settings" }} hash="portfolio" className="btn btn-outline min-h-10">{t("db_manage")}</Link></div>
    <ul className="sd-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((x) => (
        <li key={x.id} className="listing-card" data-tilt>
          {x.image ? <div className="overflow-hidden"><img src={x.image} alt="" loading="lazy" className="sd-parallax aspect-[4/3] w-full object-cover" /></div> : <div className="aspect-[4/3] bg-muted" />}
          <div className="p-3"><p dir="auto" className="font-semibold">{x.title}</p>{x.description && <p dir="auto" className="line-clamp-2 text-sm text-muted-foreground">{x.description}</p>}</div>
        </li>
      ))}
    </ul>
    </div>
  );
}

function Preview({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery(profileQuery(userId));
  if (q.isLoading) return <ListSkeleton rows={2} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const p = q.data;
  if (!p) return <EmptyState title={t("db_checklist")} action={<Link to="/profile" search={{ tab: "settings" }} className="btn btn-outline">{t("db_edit_profile")}</Link>} />;
  const pd = (p.professional_details ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("db_preview_note")}</p>
        <Link to="/pros/$id" params={{ id: userId }} className="btn btn-outline min-h-10"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
      </div>
      <ShareKit path={profilePath(userId)} title={p.display_name || "SkillLoop"} text="share_profile_text" label="share_profile" />
      <article className="pro-id overflow-hidden" data-tilt>
        <div className="dash-hero h-28" aria-hidden><BrandBackdrop variant="intro" /></div>
        <div className="-mt-14 p-6">
          <ProfilePhoto src={p.avatar ?? undefined} name={p.display_name} />
          <h2 dir="auto" className="display-title mt-4 text-2xl">{p.display_name}</h2>
          {p.title && <p dir="auto" className="text-muted-foreground">{p.title}</p>}
          {p.city && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden /><span dir="auto">{p.city}</span></p>}
          {typeof pd["accepting"] === "boolean" && <p className={`badge mt-3 ${pd["accepting"] ? "badge-success" : "badge-muted"}`}>{t(pd["accepting"] ? "accepting" : "not_accepting")}</p>}
          {p.bio && <p dir="auto" className="mt-4 whitespace-pre-line text-sm">{p.bio}</p>}
        </div>
      </article>
    </div>
  );
}
