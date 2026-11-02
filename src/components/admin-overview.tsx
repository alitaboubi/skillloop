import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Crown, FileText, Inbox, LogIn, MapPin, MessageSquare, RefreshCw, ShieldCheck, Shapes, Users, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { rememberCurrentPage } from "@/lib/return-to";
import { CATEGORIES } from "@/lib/data";
import { STATUS_KEY } from "@/lib/requests-db";
import { ADMIN_PERIODS, acceptanceRate, adminOverviewQuery, amIAdminQuery, proShare, type AdminDay, type AdminOverview, type AdminPeriod } from "@/lib/admin";
import { DashHero, SegSlide, StatTile } from "@/components/dash-kit";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { PageHero } from "@/components/site";
import { profileQuery } from "@/lib/profiles-db";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { AdminPayments } from "@/components/checkout";

function Panel({ id, icon: Icon, title, sub, children }: { id: string; icon: LucideIcon; title: string; sub?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-t`} className="panel p-6">
      <h2 id={`${id}-t`} className="flex items-center gap-2 text-lg font-bold"><Icon className="size-5 text-clay-strong" aria-hidden />{title}</h2>
      {sub && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function useFormat() {
  const { lang } = useI18n();
  const locale = lang === "ar" ? "ar-TN" : lang;
  return {
    num: (n: number) => new Intl.NumberFormat(locale).format(n),
    day: (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)),
    time: (iso: string) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)),
  };
}

/** One daily series as thin bars (info colour, 2 px gaps), a hover read-out and a screen-reader table. */
function DayBars({ series, field, label }: { series: AdminDay[]; field: "users" | "services" | "requests"; label: string }) {
  const { t } = useI18n();
  const f = useFormat();
  const [hover, setHover] = useState<number | null>(null);
  if (!series.length) return null;
  const values = series.map((p) => p[field]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const peak = values.indexOf(Math.max(...values));
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        <span>{label} <span className="font-normal tabular-nums text-muted-foreground">· {f.num(total)}</span></span>
        <span aria-live="polite" className="font-normal tabular-nums text-muted-foreground">
          {hover !== null ? `${f.day(series[hover]!.day)} · ${f.num(values[hover]!)}` : ""}
        </span>
      </figcaption>
      <div role="img" aria-label={t("adm_chart_sr", { label, total: f.num(total), n: series.length, max: f.num(values[peak]!), d: f.day(series[peak]!.day) })}
        className="relative mt-3 flex h-28 items-end gap-[2px] border-b border-border" onMouseLeave={() => setHover(null)}>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        {series.map((p, i) => (
          <span key={p.day} aria-hidden onMouseEnter={() => setHover(i)} className="flex h-full min-w-0 flex-1 items-end">
            <span className={`w-full rounded-t-[4px] transition-opacity ${hover === null || hover === i ? "bg-sea" : "bg-sea opacity-40"}`}
              style={{ height: values[i] ? `${Math.max(4, (values[i]! / max) * 100)}%` : "0" }} />
          </span>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between text-sm text-muted-foreground"><span>{f.day(series[0]!.day)}</span><span>{f.day(series.at(-1)!.day)}</span></div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{series.map((p, i) => <tr key={p.day}><th scope="row">{f.day(p.day)}</th><td>{values[i]}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** A ranked list with one bar per row; the label and the value are text, the bar only shows the proportion. */
function RankBars({ rows, empty }: { rows: { label: string; value: number; userText?: boolean }[]; empty: string }) {
  const f = useFormat();
  if (!rows.length || rows.every((r) => !r.value)) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span dir={r.userText ? "auto" : undefined} className="truncate font-semibold">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{f.num(r.value)}</span>
          </div>
          <div aria-hidden className="mt-1.5 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-sea" style={{ width: r.value ? `${Math.max(2, (r.value / max) * 100)}%` : "0" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Figures({ o }: { o: AdminOverview }) {
  const { t } = useI18n();
  const f = useFormat();
  const rate = acceptanceRate(o.requests);
  const share = proShare(o);
  const newHint = (n: number) => t("adm_new", { n: f.num(n) });
  const catLabel = (id: string) => { const c = CATEGORIES.find((x) => x.id === id); return c ? t(c.key) : id; };
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile icon={Users} value={o.users.total} label={t("adm_users")} hint={newHint(o.users.new)} />
        <StatTile icon={Briefcase} value={o.pros.total} label={t("adm_pros")} hint={newHint(o.pros.new)} tone="var(--clay)" />
        <StatTile icon={FileText} value={o.services.published} label={t("adm_services")} hint={newHint(o.services.new)} tone="var(--lime)" />
        <StatTile icon={Inbox} value={o.requests.total} label={t("adm_requests")} hint={newHint(o.requests.new)} />
        <StatTile icon={MessageSquare} value={o.messages.total} label={t("adm_messages")} hint={newHint(o.messages.new)} tone="var(--clay)" />
      </dl>

      <Panel id="adm-activity" icon={RefreshCw} title={t("adm_activity")} sub={t("adm_activity_sub", { n: o.days })}>
        <div className="grid gap-8 md:grid-cols-3">
          <DayBars series={o.series} field="users" label={t("adm_series_users")} />
          <DayBars series={o.series} field="services" label={t("adm_series_services")} />
          <DayBars series={o.series} field="requests" label={t("adm_series_requests")} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="adm-requests" icon={Inbox} title={t("adm_req_t")}>
          <dl className="mb-5 grid grid-cols-2 gap-3">
            <Fact label={t("adm_accept_rate")} value={rate === null ? "—" : `${f.num(rate)} %`} />
            <Fact label={t("adm_pending_now")} value={f.num(o.requests.pending)} />
          </dl>
          <RankBars empty={t("adm_none")} rows={(Object.keys(STATUS_KEY) as (keyof typeof STATUS_KEY)[]).map((k) => ({ label: t(STATUS_KEY[k]), value: o.requests[k] }))} />
        </Panel>
        <Panel id="adm-catalogue" icon={FileText} title={t("adm_catalogue_t")}>
          <dl className="mb-5 grid grid-cols-2 gap-3">
            <Fact label={t("adm_pro_share")} value={share === null ? "—" : `${f.num(share)} %`} />
            <Fact label={t("adm_portfolio")} value={f.num(o.portfolio)} />
          </dl>
          <RankBars empty={t("adm_none")} rows={[
            { label: t("st_published"), value: o.services.published },
            { label: t("st_draft"), value: o.services.draft },
            { label: t("st_archived"), value: o.services.archived },
          ]} />
        </Panel>
        <Panel id="adm-categories" icon={Shapes} title={t("adm_categories_t")} sub={t("adm_published_only")}>
          <RankBars empty={t("adm_none")} rows={o.categories.map((c) => ({ label: catLabel(c.category), value: c.count }))} />
        </Panel>
        <Panel id="adm-cities" icon={MapPin} title={t("adm_cities_t")} sub={t("adm_published_only")}>
          <RankBars empty={t("adm_none")} rows={o.cities.map((c) => ({ label: c.city, value: c.count, userText: true }))} />
        </Panel>
      </div>

      {(o.plans || o.notify !== null) && (
        <Panel id="adm-plans" icon={Crown} title={t("adm_more_t")}>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {o.plans && (
              <>
                <Fact label={t("adm_plan_trial")} value={f.num(o.plans.trial)} />
                <Fact label={t("adm_plan_active")} value={f.num(o.plans.active)} />
                <Fact label={t("adm_plan_ended")} value={f.num(o.plans.ended)} />
                <Fact label={t("adm_plan_founders")} value={f.num(o.plans.founders)} />
              </>
            )}
            {o.notify !== null && <Fact label={t("adm_notify")} value={f.num(o.notify)} />}
          </dl>
        </Panel>
      )}

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        {t("adm_privacy")}{o.users.deleted ? ` ${t("adm_deleted", { n: f.num(o.users.deleted) })}` : ""}
      </p>
    </div>
  );
}

/** The operator space. The database is the gate (admin_overview refuses non-admins); the UI only mirrors it. */
export function AdminPage({ days }: { days: AdminPeriod }) {
  const { t } = useI18n();
  const f = useFormat();
  const { user, ready } = useAuth();
  const admin = useQuery({ ...amIAdminQuery(user?.id ?? ""), enabled: !!user });
  const me = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user && admin.data === true });
  const q = useQuery({ ...adminOverviewQuery(days), enabled: admin.data === true });

  if (!ready || (user && admin.isLoading)) return <div className="mx-auto max-w-5xl px-4 py-10"><ListSkeleton /></div>;
  if (!user)
    return (
      <>
        <PageHero title={t("adm_title")} />
        <div className="mx-auto max-w-xl px-4 py-12">
          <EmptyState icon={LogIn} title={t("adm_signin")} action={<Link to="/login" onClick={rememberCurrentPage} className="btn btn-lime">{t("login")}</Link>} />
        </div>
      </>
    );
  if (admin.isError) return <div className="mx-auto max-w-xl px-4 py-12"><ErrorState onRetry={() => admin.refetch()} /></div>;
  if (!admin.data)
    return (
      <>
        <PageHero title={t("adm_title")} />
        <div className="mx-auto max-w-xl px-4 py-12">
          <EmptyState icon={ShieldCheck} title={t("adm_denied_t")} sub={t("adm_denied_d")} action={<Link to="/dashboard" className="btn btn-outline">{t("dashboard")}</Link>} />
        </div>
      </>
    );

  const name = me.data?.display_name || user.email?.split("@")[0] || "";
  return (
    <>
      <DashHero name={name} avatar={me.data?.avatar ?? undefined} eyebrow={t("adm_title")} sub={t("adm_sub")}>
        <SegSlide index={ADMIN_PERIODS.indexOf(days)} count={ADMIN_PERIODS.length} label={t("adm_period")}>
          {ADMIN_PERIODS.map((d) => (
            <Link key={d} to="/admin" search={{ days: d }} aria-current={d === days ? "page" : undefined}>{t("adm_days", { n: d })}</Link>
          ))}
        </SegSlide>
        <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className="dash-action">
          <RefreshCw className={`size-4 ${q.isFetching ? "motion-safe:animate-spin" : ""}`} aria-hidden />{t("adm_refresh")}
        </button>
        {q.data?.generatedAt && <span aria-live="polite" className="text-sm text-navy-muted">{t("adm_updated", { t: f.time(q.data.generatedAt) })}</span>}
      </DashHero>
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
        {PAYMENTS_ENABLED && <AdminPayments />}
        {q.isLoading ? <ListSkeleton rows={4} /> : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} /> : <Figures o={q.data} />}
      </div>
    </>
  );
}
