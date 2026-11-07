import { useEffect, useId, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, Briefcase, Clapperboard, Crown, DatabaseZap, ExternalLink, History, Hourglass, LayoutDashboard,
  LifeBuoy, MessageSquare, Receipt, Search, ShieldCheck, Sparkles, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { Avatar } from "@/components/media-viewer";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  GRANT_MAX, GRANT_PRESETS, SECTION_LABEL, SUB_FILTERS, consoleErrorKey, daysLeft, grantEnd, isMissingFunction, validDays,
  type ConsoleSection, type SubFilter, type SubRow,
} from "@/lib/admin-console";
import { PAGE_SIZE, logQuery, subsQuery, todoQuery, useProAccess, userQuery, usersQuery } from "@/lib/admin-console-db";

export type Role = "all" | "pro" | "client";
export type Sort = "new" | "name";

const SECTION_ICON: Record<ConsoleSection, LucideIcon> = {
  overview: LayoutDashboard, messages: LifeBuoy, users: Users, social: Clapperboard, subscriptions: Crown, payments: Receipt,
};

function useFmt() {
  const { lang } = useI18n();
  const locale = lang === "ar" ? "ar-TN" : lang;
  return {
    locale,
    date: (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)),
    num: (n: number) => new Intl.NumberFormat(locale).format(n),
  };
}

/** The migration behind a block is not applied yet: say which one, instead of an error. */
function MissingMigration({ file }: { file: string }) {
  const { t } = useI18n();
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border border-dashed p-4 text-sm">
      <DatabaseZap className="mt-0.5 size-5 shrink-0 text-sea" aria-hidden />
      <div>
        <p className="font-semibold">{t("ac_missing_t")}</p>
        <p className="mt-1 text-muted-foreground">{t("ac_missing_d")} <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-sm">{file}</code></p>
      </div>
    </div>
  );
}

function Block({ id, icon: Icon, title, sub, action, children }: { id: string; icon: LucideIcon; title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-t`} className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id={`${id}-t`} className="flex items-center gap-2 text-lg font-bold"><Icon className="size-5 text-clay-strong" aria-hidden />{title}</h2>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ---------- Navigation ---------- */

/** Sticky section tabs (same pattern as the dashboard), with live counts from admin_todo: unread support, pending payments. */
export function ConsoleNav({ sections, current }: { sections: ConsoleSection[]; current: ConsoleSection }) {
  const { t } = useI18n();
  const todo = useQuery(todoQuery());
  const count = (s: ConsoleSection) => (s === "messages" ? todo.data?.supportUnread ?? 0 : s === "payments" ? todo.data?.paymentsPending ?? 0 : 0);
  return (
    <nav aria-label={t("ac_nav")} className="dash-tabs sd-sticky-shadow">
      <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:px-6">
        {sections.map((s) => {
          const Icon = SECTION_ICON[s];
          const n = count(s);
          return (
            <li key={s}>
              <Link to="/admin" search={(p) => ({ days: p.days, section: s === "overview" ? undefined : s })} aria-current={current === s ? "page" : undefined} className="dash-tab">
                <Icon className="size-4" aria-hidden />{t(SECTION_LABEL[s])}
                {n > 0 && <span className="dash-tab-n">{n}<span className="sr-only"> {t("nt_unread_sr")}</span></span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Overview: what needs you today ---------- */

type TodoCard = { key: string; icon: LucideIcon; value: number; label: TKey; hint: TKey; to: ConsoleSection; urgent: boolean };

export function TodoBoard({ sections }: { sections: ConsoleSection[] }) {
  const { t } = useI18n();
  const f = useFmt();
  const q = useQuery(todoQuery());
  if (q.isLoading) return <ListSkeleton rows={1} />;
  if (q.isError) return isMissingFunction(q.error) ? <MissingMigration file="20261107130000_admin_console.sql" /> : <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data!;
  const cards: TodoCard[] = [
    { key: "support", icon: LifeBuoy, value: d.supportUnread, label: "ac_todo_support", hint: "ac_todo_support_h", to: "messages", urgent: d.supportUnread > 0 },
    { key: "consent", icon: Clapperboard, value: d.consentPending, label: "ac_todo_consent", hint: "ac_todo_consent_h", to: "social", urgent: false },
    { key: "waiting", icon: Hourglass, value: d.requestsWaiting, label: "ac_todo_waiting", hint: "ac_todo_waiting_h", to: "users", urgent: d.requestsWaiting > 0 },
    { key: "new", icon: UserPlus, value: d.newUsers, label: "ac_todo_new", hint: "ac_todo_new_h", to: "users", urgent: false },
  ];
  if (d.paymentsPending !== null) cards.push({ key: "pay", icon: Receipt, value: d.paymentsPending, label: "ac_todo_payments", hint: "ac_todo_payments_h", to: "payments", urgent: d.paymentsPending > 0 });
  if (d.trialsEnding !== null) cards.push({ key: "trial", icon: Crown, value: d.trialsEnding, label: "ac_todo_trials", hint: "ac_todo_trials_h", to: "subscriptions", urgent: false });
  const shown = cards.filter((c) => sections.includes(c.to));
  const calm = shown.every((c) => !c.urgent);
  return (
    <section aria-labelledby="ac-todo-t" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ac-todo-t" className="text-lg font-bold">{t("ac_todo_t")}</h2>
        {calm && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><BadgeCheck className="size-4 text-success" aria-hidden />{t("ac_todo_calm")}</p>}
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.key}>
            <Link to="/admin" search={(p) => ({ days: p.days, section: c.to })}
              className={`group flex h-full items-start gap-3 rounded-2xl border p-4 transition-colors hover:border-sea focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${c.urgent ? "border-lime bg-lime/10" : "bg-card"}`}>
              <span aria-hidden className={`${c.urgent ? "bg-lime text-lime-foreground" : "icon-well-sea"} grid size-10 shrink-0 place-items-center rounded-xl`}><c.icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums">{f.num(c.value)}</span><span className="font-semibold">{t(c.label)}</span></span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t(c.hint)}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- People ---------- */

export function UsersSection({ q, role, sort, onFilter, onOpen }: {
  q: string; role: Role; sort: Sort; onFilter: (p: { q?: string; role?: Role; sort?: Sort }) => void; onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  const f = useFmt();
  const id = useId();
  const [text, setText] = useState(q);
  const [page, setPage] = useState(0);
  // Typing updates the address after a short pause (the filter lives in the URL); a new filter starts at page 1.
  useEffect(() => { const h = setTimeout(() => { if (text !== q) onFilter({ q: text }); }, 300); return () => clearTimeout(h); }, [text, q, onFilter]);
  useEffect(() => setPage(0), [q, role, sort]);
  const list = useQuery(usersQuery(q, role, sort, page));
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const roles: { id: Role; label: TKey }[] = [{ id: "all", label: "ac_role_all" }, { id: "pro", label: "ac_role_pro" }, { id: "client", label: "ac_role_client" }];
  return (
    <Block id="ac-users" icon={Users} title={t("ac_users")} sub={t("ac_users_sub")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <label htmlFor={`${id}-q`} className="sr-only">{t("ac_users_search")}</label>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id={`${id}-q`} type="search" value={text} onChange={(e) => setText(e.target.value)} dir="auto" autoComplete="off"
            placeholder={t("ac_users_search")} className="field ps-9 text-sm" />
        </div>
        <div role="group" aria-label={t("ac_role")} className="flex gap-1.5">
          {roles.map((r) => <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => onFilter({ role: r.id })} className="chip">{t(r.label)}</button>)}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("ac_sort")}</span>
          <select value={sort} onChange={(e) => onFilter({ sort: e.target.value as Sort })} className="field min-h-10 w-auto py-1.5 text-sm">
            <option value="new">{t("ac_sort_new")}</option>
            <option value="name">{t("ac_sort_name")}</option>
          </select>
        </label>
      </div>

      <div className="mt-5" aria-busy={list.isFetching || undefined}>
        {list.isLoading ? <ListSkeleton rows={4} /> : list.isError ? (
          isMissingFunction(list.error) ? <MissingMigration file="20261107130000_admin_console.sql" /> : <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data!.items.length ? (
          <p className="text-sm text-muted-foreground">{t("ac_none_found")}</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted-foreground">{t("ac_users_count", { n: f.num(list.data!.total) })}</p>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-surface-sunken text-start text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t("ac_col_person")}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t("ac_col_role")}</th>
                    <th scope="col" className="px-4 py-2.5 text-end font-semibold">{t("ac_col_services")}</th>
                    <th scope="col" className="px-4 py-2.5 text-end font-semibold">{t("ac_col_requests")}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t("ac_col_since")}</th>
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">{t("ac_open")}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.data!.items.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/60">
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => onOpen(u.id)} className="flex items-center gap-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea rounded-lg">
                          <Avatar src={u.avatar} name={u.name} size="sm" />
                          <span className="min-w-0">
                            <span dir="auto" className="block truncate font-semibold">{u.name}</span>
                            {u.city && <span dir="auto" className="block truncate text-muted-foreground">{u.city}</span>}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${u.pro ? "bg-sea-soft text-sea" : "bg-muted text-muted-foreground"}`}>{t(u.pro ? "sf_adm_pro" : "sf_adm_client")}</span>
                        {u.support === "open" && <span className="ms-1.5 inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 font-semibold text-clay-strong"><LifeBuoy className="size-3.5" aria-hidden />{t("ac_support_open")}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums">{f.num(u.services)}</td>
                      <td className="px-4 py-2.5 text-end tabular-nums">{f.num(u.requests)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{u.createdAt ? <time dateTime={u.createdAt}>{f.date(u.createdAt)}</time> : "—"}</td>
                      <td className="px-4 py-2.5 text-end">
                        <button type="button" onClick={() => onOpen(u.id)} className="btn btn-outline min-h-9 px-3 text-sm">{t("ac_open")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn btn-outline min-h-10">{t("ac_prev")}</button>
                <span className="text-muted-foreground">{t("ac_page", { p: page + 1, n: pages })}</span>
                <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline min-h-10">{t("ac_next")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Block>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-sunken p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/** One account, in a side panel: facts, services, and the actions (public profile, write, Pro access). */
export function UserSheet({ id, onClose, onWrite, canWrite }: { id: string | null; onClose: () => void; onWrite: (id: string) => void; canWrite: boolean }) {
  const { t } = useI18n();
  const f = useFmt();
  const q = useQuery(userQuery(id ?? ""));
  const subs = useQuery(subsQuery("all"));
  const u = q.data;
  const sub = subs.data?.find((s) => s.userId === id) ?? null;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {q.isLoading || !id ? <div className="p-6"><ListSkeleton rows={3} /></div> : q.isError || !u ? (
          <div className="p-6"><SheetTitle className="sr-only">{t("ac_users")}</SheetTitle><ErrorState onRetry={() => q.refetch()} /></div>
        ) : (
          <>
            <div className="bg-ink-hero px-6 pb-6 pt-12 text-ink-foreground">
              <div className="flex items-center gap-4">
                <Avatar src={u.avatar} name={u.name} size="lg" />
                <div className="min-w-0">
                  <SheetTitle asChild><h2 dir="auto" className="truncate text-xl font-bold">{u.name}</h2></SheetTitle>
                  <SheetDescription className="text-sm text-navy-muted">
                    {[u.title, [u.area, u.city].filter(Boolean).join(", "), u.createdAt ? t("ac_member_since", { d: f.date(u.createdAt) }) : null].filter(Boolean).join(" · ")}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.services.some((s) => s.status === "published" && !s.archived) && <span className="rounded-full bg-lime px-2 py-0.5 text-sm font-semibold text-lime-foreground">{t("sf_adm_pro")}</span>}
                    {sub?.pro && <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-sm font-semibold text-clay-strong"><Crown className="size-3.5" aria-hidden />{t(sub.status === "trial" ? "ac_sub_trial" : "ac_sub_pro")}</span>}
                    {u.admin && <span className="inline-flex items-center gap-1 rounded-full bg-sea-soft px-2 py-0.5 text-sm font-semibold text-sea"><ShieldCheck className="size-3.5" aria-hidden />{t("ac_operator")}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                <Link to="/pros/$id" params={{ id: u.id }} target="_blank" className="btn btn-outline min-h-10 text-sm"><ExternalLink className="size-4" aria-hidden />{t("view_public_profile")}</Link>
                {canWrite && <button type="button" onClick={() => onWrite(u.id)} className="btn btn-ink min-h-10 text-sm"><MessageSquare className="size-4" aria-hidden />{t("ac_write")}</button>}
              </div>
              <dl className="grid grid-cols-2 gap-2.5">
                <Fact label={t("ac_f_requests_pro")} value={f.num(u.requests.asPro)} />
                <Fact label={t("ac_f_requests_client")} value={f.num(u.requests.asClient)} />
                <Fact label={t("ac_f_pending")} value={f.num(u.requests.pending)} />
                <Fact label={t("ac_f_accepted")} value={f.num(u.requests.accepted)} />
                <Fact label={t("ac_f_portfolio")} value={f.num(u.portfolio)} />
                <Fact label={t("ac_f_features")} value={f.num(u.features)} />
              </dl>
              {u.support && (
                <p className="flex items-center gap-2 text-sm"><LifeBuoy className="size-4 text-clay-strong" aria-hidden />
                  {t(u.support.status === "open" ? "ac_support_open" : "ac_support_closed")}{u.support.lastAt && ` · ${f.date(u.support.lastAt)}`}</p>
              )}
              <section aria-labelledby="ac-u-services">
                <h3 id="ac-u-services" className="mb-2 flex items-center gap-2 font-bold"><Briefcase className="size-4 text-clay-strong" aria-hidden />{t("my_services")} <span className="text-muted-foreground">({u.services.length})</span></h3>
                {u.services.length ? (
                  <ul className="divide-y rounded-2xl border">
                    {u.services.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                        <Link to="/services/$id" params={{ id: s.id }} target="_blank" dir="auto" className="link-sea min-w-0 truncate font-semibold">{s.title}</Link>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${s.archived ? "bg-muted text-muted-foreground" : s.status === "published" ? "bg-sea-soft text-sea" : "bg-clay-soft text-clay-strong"}`}>
                          {t(s.archived ? "st_archived" : s.status === "published" ? "st_published" : "st_draft")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">{t("ac_no_services")}</p>}
              </section>
              <section aria-labelledby="ac-u-pro" className="rounded-2xl border p-4">
                <h3 id="ac-u-pro" className="mb-3 flex items-center gap-2 font-bold"><Crown className="size-4 text-clay-strong" aria-hidden />{t("ac_subs")}</h3>
                {subs.isError && isMissingFunction(subs.error) ? <MissingMigration file="20261107140000_admin_subscriptions.sql" />
                  : <ProAccess userId={u.id} name={u.name} sub={sub} />}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Pro access ---------- */

function SubBadge({ s }: { s: Pick<SubRow, "pro" | "status" | "until" | "founder"> | null }) {
  const { t } = useI18n();
  const f = useFmt();
  if (!s) return <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-semibold text-muted-foreground">{t("ac_sub_free")}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${s.pro ? (s.status === "trial" ? "bg-sea-soft text-sea" : "bg-lime text-lime-foreground") : "bg-muted text-muted-foreground"}`}>
        {t(s.pro ? (s.status === "trial" ? "ac_sub_trial" : "ac_sub_pro") : "ac_sub_ended")}
      </span>
      {s.founder && <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-sm font-semibold text-clay-strong"><Sparkles className="size-3.5" aria-hidden />{t("ac_founder")}</span>}
      {s.until && <span className="text-sm text-muted-foreground">{t(s.pro ? "ac_until" : "ac_ended_on", { d: f.date(s.until) })}{s.pro && ` · ${t("ac_days_left", { n: daysLeft(s.until) })}`}</span>}
    </span>
  );
}

/** Give Pro for N days (quick choices or a number) with a note, or end it now (confirmed). Every change is logged. */
export function ProAccess({ userId, name, sub }: { userId: string; name: string; sub: SubRow | null }) {
  const { t } = useI18n();
  const f = useFmt();
  const id = useId();
  const { grant, end } = useProAccess();
  const [days, setDays] = useState<number>(30);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<"grant" | "end" | null>(null);
  const ok = validDays(days);
  const until = sub?.pro ? sub.until : null;
  const doGrant = () => grant.mutate({ userId, days, note }, {
    onSuccess: (d) => { toast.success(t("ac_granted", { n: name, d: d ? f.date(d) : "" })); setConfirming(null); setNote(""); },
    onError: (e) => toast.error(t(consoleErrorKey(e))),
  });
  const doEnd = () => end.mutate({ userId, note }, {
    onSuccess: () => { toast.success(t("ac_ended", { n: name })); setConfirming(null); setNote(""); },
    onError: (e) => toast.error(t(consoleErrorKey(e))),
  });
  return (
    <div className="space-y-4">
      <SubBadge s={sub} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t(until ? "ac_extend" : "ac_give")}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {GRANT_PRESETS.map((n) => <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className="chip">{t("ac_days", { n })}</button>)}
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t("ac_days_custom")}</span>
            <input type="number" inputMode="numeric" min={1} max={GRANT_MAX} value={days} onChange={(e) => setDays(Math.floor(Number(e.target.value)))}
              aria-invalid={!ok || undefined} className="field min-h-10 w-24 py-1.5 text-sm" />
            <span className="text-muted-foreground">{t("ac_days_unit")}</span>
          </label>
        </div>
        {ok ? <p className="text-sm text-muted-foreground">{t("ac_will_end", { d: f.date(grantEnd(until, days).toISOString()) })}</p>
          : <p className="text-sm text-destructive">{t("ac_err_days")}</p>}
      </fieldset>
      <div>
        <label htmlFor={`${id}-note`} className="text-sm font-semibold">{t("ac_note")}</label>
        <input id={`${id}-note`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} dir="auto" placeholder={t("ac_note_ph")} className="field mt-1 text-sm" />
      </div>
      {confirming ? (
        <div role="group" aria-label={t(confirming === "grant" ? "ac_confirm_grant" : "ac_confirm_end")} className="space-y-2 rounded-2xl border bg-surface-sunken p-3">
          <p className="text-sm font-semibold" dir="auto">{confirming === "grant" ? t("ac_confirm_grant_q", { n: name, k: days }) : t("ac_confirm_end_q", { n: name })}</p>
          <div className="flex gap-2">
            <button type="button" disabled={grant.isPending || end.isPending} onClick={confirming === "grant" ? doGrant : doEnd}
              className={`btn min-h-10 ${confirming === "grant" ? "btn-lime" : "btn-danger"}`}>{grant.isPending || end.isPending ? t("loading") : t("confirm_yes")}</button>
            <button type="button" onClick={() => setConfirming(null)} className="btn btn-ghost min-h-10">{t("cancel")}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!ok} onClick={() => setConfirming("grant")} className="btn btn-lime min-h-10"><Crown className="size-4" aria-hidden />{t(until ? "ac_extend_btn" : "ac_give_btn")}</button>
          {sub?.pro && <button type="button" onClick={() => setConfirming("end")} className="btn btn-ghost min-h-10 text-destructive">{t("ac_end_btn")}</button>}
        </div>
      )}
    </div>
  );
}

export function SubscriptionsSection({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<SubFilter>("active");
  const q = useQuery(subsQuery(filter));
  const label: Record<SubFilter, TKey> = { active: "ac_sub_f_active", trial: "ac_sub_f_trial", ended: "ac_sub_f_ended", all: "ac_role_all" };
  return (
    <div className="space-y-6">
      <Block id="ac-subs" icon={Crown} title={t("ac_subs")} sub={t("ac_subs_sub")}
        action={<div role="group" aria-label={t("ac_subs")} className="flex flex-wrap gap-1.5">{SUB_FILTERS.map((x) => <button key={x} type="button" aria-pressed={filter === x} onClick={() => setFilter(x)} className="chip">{t(label[x])}</button>)}</div>}>
        {q.isLoading ? <ListSkeleton rows={3} /> : q.isError ? (
          isMissingFunction(q.error) ? <MissingMigration file="20261107140000_admin_subscriptions.sql" /> : <ErrorState onRetry={() => q.refetch()} />
        ) : !q.data!.length ? <p className="text-sm text-muted-foreground">{t("ac_subs_empty")}</p> : (
          <ul className="divide-y rounded-2xl border">
            {q.data!.map((s) => (
              <li key={s.userId}>
                <button type="button" onClick={() => onOpenUser(s.userId)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60">
                  <Avatar src={s.avatar} name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block truncate font-semibold">{s.name}</span>
                    {s.city && <span dir="auto" className="block text-sm text-muted-foreground">{s.city}</span>}
                  </span>
                  <SubBadge s={s} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted-foreground">{t("ac_subs_how")}</p>
      </Block>
      <ActivityLog onOpenUser={onOpenUser} />
    </div>
  );
}

const LOG_LABEL: Record<string, TKey> = { pro_granted: "ac_log_granted", pro_ended: "ac_log_ended" };

export function ActivityLog({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const { t } = useI18n();
  const f = useFmt();
  const q = useQuery(logQuery());
  return (
    <Block id="ac-log" icon={History} title={t("ac_log")} sub={t("ac_log_sub")}>
      {q.isLoading ? <ListSkeleton rows={2} /> : q.isError ? (
        isMissingFunction(q.error) ? <MissingMigration file="20261107130000_admin_console.sql" /> : <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data!.length ? <p className="text-sm text-muted-foreground">{t("ac_log_empty")}</p> : (
        <ol className="space-y-3">
          {q.data!.map((e) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-sea" />
              <div className="min-w-0">
                <p>
                  <span dir="auto" className="font-semibold">{e.actorName || t("account_deleted_name")}</span>{" "}
                  {t(LOG_LABEL[e.action] ?? "ac_log_other")}{" "}
                  {e.targetId ? <button type="button" onClick={() => onOpenUser(e.targetId!)} dir="auto" className="link-sea font-semibold">{e.targetName || t("account_deleted_name")}</button> : null}
                  {e.detail.days ? ` · ${t("ac_days", { n: e.detail.days })}` : ""}{e.detail.until ? ` → ${f.date(e.detail.until)}` : ""}
                </p>
                {e.detail.note && <p dir="auto" className="text-muted-foreground">« {e.detail.note} »</p>}
                <time dateTime={e.at} className="text-muted-foreground">{f.date(e.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

