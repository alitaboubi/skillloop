import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck, Ban, Bell, BellRing, CalendarClock, Car, CheckCheck, CircleCheck, CircleX, Hammer, Inbox, LifeBuoy,
  MessageSquareQuote, Rocket, Sparkles, Star, type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  KIND_SPEC, NOTIFICATIONS_ENABLED, badgeText, groupByAge, relativeTime, targetOf, vars,
  type AppNotification, type NotificationFeed, type NotificationKind, type Tone,
} from "@/lib/notifications";
import { notificationsQuery, useMarkNotificationsRead, useNotificationsLive, type LiveRow } from "@/lib/notifications-db";
import { openSupport } from "@/lib/support";

const ICON: Record<NotificationKind, LucideIcon> = {
  welcome: Sparkles, service_live: Rocket, request_new: Inbox, request_accepted: CircleCheck, request_declined: CircleX,
  request_cancelled: Ban, job_scheduled: CalendarClock, job_on_the_way: Car, job_started: Hammer, job_completed: BadgeCheck,
  review_new: Star, review_reply: MessageSquareQuote, support_new: LifeBuoy, support_reply: LifeBuoy,
};
const WELL: Record<Tone, string> = {
  lime: "bg-lime text-lime-foreground",
  sea: "icon-well-sea",
  clay: "icon-well-clay",
  muted: "bg-muted text-muted-foreground",
};

function Row({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const { t, lang } = useI18n();
  const spec = KIND_SPEC[n.kind];
  const Icon = ICON[n.kind];
  const v = vars(n, t("account_deleted_name"), t("nt_someone"));
  const locale = lang === "ar" ? "ar-TN" : lang;
  return (
    <li>
      <button type="button" onClick={() => onOpen(n)}
        className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea ${n.read ? "" : "bg-sea-soft/40"}`}>
        <span aria-hidden className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${WELL[spec.tone]}`}><Icon className="size-[1.1rem]" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm ${n.read ? "font-semibold" : "font-bold"}`}>{t(spec.title, v)}</span>
            <time dateTime={n.createdAt} className="shrink-0 text-xs text-muted-foreground">{relativeTime(n.createdAt, locale)}</time>
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t(spec.body, v)}</span>
        </span>
        {!n.read && <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-lime ring-2 ring-card" />}
        {!n.read && <span className="sr-only">{t("nt_unread_sr")}</span>}
      </button>
    </li>
  );
}

/** The bell's panel content (header, grouped list or empty/error state, help link). Pure: data in, callbacks out. */
export function NotificationPanel({ feed, loading, error, onRetry, onOpen, onMarkAll, onHelp }: {
  feed: NotificationFeed | undefined; loading: boolean; error: boolean; onRetry: () => void;
  onOpen: (n: AppNotification) => void; onMarkAll: () => void; onHelp: () => void;
}) {
  const { t } = useI18n();
  const unread = feed?.unread ?? 0;
  const groups = groupByAge(feed?.items ?? []);
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-base font-bold">{t("nt_title")}</h2>
        {unread > 0 && (
          <button type="button" onClick={onMarkAll} className="link-sea inline-flex items-center gap-1.5 text-sm font-semibold">
            <CheckCheck className="size-4" aria-hidden />{t("nt_mark_all")}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {loading ? (
          <ul aria-busy className="space-y-2 p-2">{[0, 1, 2].map((i) => <li key={i} className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}</ul>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <p>{t("nt_error")}</p>
            <button type="button" onClick={onRetry} className="link-sea mt-2 font-semibold">{t("retry")}</button>
          </div>
        ) : groups.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span aria-hidden className="icon-well-sea mx-auto size-12"><Bell className="size-5" /></span>
            <p className="mt-3 font-bold">{t("nt_empty_t")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("nt_empty_d")}</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-label={t(`nt_group_${g.key}`)} className="mb-1">
              <h3 className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t(`nt_group_${g.key}`)}</h3>
              <ul>{g.items.map((n) => <Row key={n.id} n={n} onOpen={onOpen} />)}</ul>
            </section>
          ))
        )}
      </div>
      <div className="border-t px-4 py-3 text-sm">
        <button type="button" onClick={onHelp} className="link-sea inline-flex items-center gap-1.5 font-semibold">
          <LifeBuoy className="size-4" aria-hidden />{t("nt_help")}
        </button>
      </div>
    </>
  );
}

/** Shared navigation for a notification (row click or toast action). */
function useGoTo() {
  const navigate = useNavigate();
  return useCallback((n: Pick<AppNotification, "kind" | "requestId" | "serviceId">) => {
    const target = targetOf(n);
    if (target.kind === "support") { openSupport("chat"); return; }
    if (target.to === "/services/$id") void navigate({ to: target.to, params: target.params });
    else void navigate({ to: target.to, search: target.search as never });
  }, [navigate]);
}

/**
 * Live alerts, mounted ONCE in SiteHeader (the bell renders in both the desktop and the phone header): a new notification
 * refreshes the feed and, while the tab is visible, shows a short toast whose action opens the thing itself.
 */
export function useNotificationAlerts() {
  const { t } = useI18n();
  const { user } = useAuth();
  const goTo = useGoTo();
  const onNew = useCallback((row: LiveRow) => {
    const kind = row.kind;
    if (document.visibilityState !== "visible" || typeof kind !== "string" || !(kind in KIND_SPEC)) return;
    const k = kind as NotificationKind;
    const id = (v: unknown) => (typeof v === "string" ? v : null);
    toast(t(KIND_SPEC[k].title), {
      icon: <BellRing className="size-4 text-sea" aria-hidden />,
      action: { label: t("nt_view"), onClick: () => goTo({ kind: k, requestId: id(row.request_id), serviceId: id(row.service_id) }) },
    });
  }, [t, goTo]);
  useNotificationsLive(NOTIFICATIONS_ENABLED ? user?.id : undefined, onNew);
}

/**
 * The bell in the header (signed in, VITE_NOTIFICATIONS=on): unread badge, a panel grouped by age, one click opens the
 * thing and marks it read; new rows arrive live and show a short toast. Wording per kind lives in KIND_SPEC (tested).
 */
export function NotificationBell() {
  const { t } = useI18n();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const goTo = useGoTo();
  const [open, setOpen] = useState(false);
  const feed = useQuery(notificationsQuery(userId));
  const mark = useMarkNotificationsRead(userId);
  const go = (n: AppNotification) => { setOpen(false); goTo(n); };

  // Close on navigation by the browser (back/forward).
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  if (!NOTIFICATIONS_ENABLED || !user) return null;
  const unread = feed.data?.unread ?? 0;
  const label = unread > 0 ? `${t("nt_title")} — ${t("nt_unread_count", { n: unread })}` : t("nt_title");
  const openOne = (n: AppNotification) => {
    if (!n.read) mark.mutate([n.id]);
    go(n);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={label} title={label}
        className="relative grid size-10 place-items-center rounded-full text-navy-muted transition-colors hover:bg-navy-foreground/10 hover:text-navy-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime data-[state=open]:bg-navy-foreground/10 data-[state=open]:text-navy-foreground max-lg:size-11 max-lg:text-navy-foreground">
        <span className="relative">
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span aria-hidden className="absolute -top-1 -end-1.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-lime px-1 text-xs font-bold leading-none text-lime-foreground ring-2 ring-navy">
              {badgeText(unread)}
            </span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} collisionPadding={12}
        className="flex max-h-[min(34rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl p-0 shadow-lg">
        <NotificationPanel feed={feed.data} loading={feed.isLoading} error={feed.isError} onRetry={() => void feed.refetch()}
          onOpen={openOne} onMarkAll={() => mark.mutate(null)} onHelp={() => { setOpen(false); openSupport(); }} />
      </PopoverContent>
    </Popover>
  );
}
