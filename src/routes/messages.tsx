import { ErrorState, RequestTimeline, StatusBadge } from "@/components/states";
import { limitMessage } from "@/lib/limits";
import { toast } from "sonner";
import { RequestActions } from "@/components/request-actions";
import { threadGuidance } from "@/lib/request-timeline";
import { rememberCurrentPage } from "@/lib/return-to";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { MapPin, MessageSquare, Send, User, Wifi } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lastMessagesQuery, myRequestsQuery, type RequestRow } from "@/lib/requests-db";
import { lastByRequest, relativeDay, sortByActivity, withDaySeparators } from "@/lib/conversations";
import { useUnread } from "@/lib/use-unread";
import { markRead } from "@/lib/unread";
import { Avatar } from "@/components/media-viewer";
import { useViewTransitions, vtName } from "@/lib/view-transitions";
import { PageHero, formatPrice } from "@/components/site";

export const Route = createFileRoute("/messages")({
  validateSearch: z.object({ r: z.string().optional() }),
  head: () => seo("Messages", "Vos conversations avec les professionnels SkillLoop.", { noindex: true }),
  component: Page,
});

function Page() {
  const { t, lang } = useI18n();
  const { user, ready } = useAuth();
  const { r } = Route.useSearch();
  const navigate = Route.useNavigate();
  const reqs = useQuery({ ...myRequestsQuery(user?.id ?? ""), enabled: !!user });
  const lastQ = useQuery({ ...lastMessagesQuery(user?.id ?? ""), enabled: !!user });
  const unread = useUnread(user?.id);
  const vt = useViewTransitions();
  const qc = useQueryClient();
  // Keep previews and ordering fresh; realtime only delivers rows this user may read (RLS).
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => qc.invalidateQueries({ queryKey: ["messages", "last", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  if (!ready) return <p className="py-24 text-center text-muted-foreground">{t("loading")}</p>;
  if (!user)
    return (
      <>
        <PageHero title={t("messages")} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <MessageSquare className="mx-auto size-12 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-muted-foreground">{t("messages_sub")}</p>
          <Link to="/login" onClick={rememberCurrentPage} className="btn btn-lime mt-6">{t("login")}</Link>
        </div>
      </>
    );

  const locale = lang === "ar" ? "ar-TN" : lang;
  // Today: time only; earlier: short date.
  const when = (iso: string) => new Intl.DateTimeFormat(locale, relativeDay(iso) === "day_today" ? { timeStyle: "short" } : { dateStyle: "short" }).format(new Date(iso));
  const last = lastByRequest(lastQ.data ?? []);
  const list = sortByActivity(reqs.data ?? [], last);
  const active = list.find((x) => x.id === r);
  return (
    <>
      <PageHero title={t("messages")} />
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[300px_1fr]">
        <ul className={`space-y-2 ${active ? "hidden md:block" : ""}`}>
          {reqs.isLoading && <li className="text-sm text-muted-foreground">{t("loading")}</li>}
          {reqs.isError && <li><ErrorState onRetry={() => reqs.refetch()} /></li>}
          {!reqs.isLoading && !reqs.isError && !list.length && (
            <li className="rounded-2xl border border-dashed p-5 text-sm">
              <p className="font-semibold">{t("msgs_empty_t")}</p>
              <p className="mt-3 text-muted-foreground">{t("msgs_empty_client")}</p>
              <Link to="/explore" className="btn btn-ink mt-2 min-h-10 w-full">{t("explore_services")}</Link>
              <p className="mt-4 text-muted-foreground">{t("msgs_empty_pro")}</p>
              <Link to="/offer" className="btn btn-outline mt-2 min-h-10 w-full">{t("offer_service")}</Link>
            </li>
          )}
          {list.map((x) => {
            const mineAsClient = x.client_id === user.id;
            const other = (mineAsClient ? x.provider?.display_name : x.client?.display_name) || t("account_deleted_name");
            const lm = last.get(x.id);
            const at = lm?.created_at ?? x.created_at;
            const preview = lm ? `${lm.sender_id === user.id ? t("you_prefix") : ""}${lm.body}` : x.message;
            const isUnread = unread.ids.has(x.id) && x.id !== r;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => navigate({ search: { r: x.id }, viewTransition: vt })} aria-current={x.id === r ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-start transition-colors ${x.id === r ? "border-sea/40 bg-sea-soft" : "bg-card hover:bg-surface-sunken"}`}>
                  {/* Unique name in both states: the open conversation's avatar lives in the thread header instead. */}
                  <span className="shrink-0" style={x.id === r ? undefined : { viewTransitionName: vtName("conv", x.id) }}>
                    <Avatar src={mineAsClient ? x.provider_avatar : x.client_avatar} name={other} size="sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {isUnread && <span className="size-2 shrink-0 rounded-full bg-lime ring-2 ring-lime/30" role="img" aria-label={t("unread_dot")} />}
                        <span dir="auto" className={`truncate ${isUnread ? "font-extrabold" : "font-semibold"}`}>{other}</span>
                      </span>
                      <time dateTime={at} className="shrink-0 text-xs text-muted-foreground">{when(at)}</time>
                    </span>
                    <span dir="auto" className="block truncate text-xs text-muted-foreground">{x.services?.title ?? t("svc_unavailable")}</span>
                    <span dir="auto" className={`mt-1 block truncate text-sm ${isUnread ? "font-semibold text-foreground" : ""}`}>{preview}</span>
                    <span className="mt-1.5 inline-block"><StatusBadge status={x.status} /></span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {active ? <Thread req={active} userId={user.id} onBack={() => navigate({ search: {}, viewTransition: vt })} /> : (
          <div className="hidden place-items-center rounded-3xl border border-dashed p-10 text-muted-foreground md:grid">{t("select_conv")}</div>
        )}
      </div>
    </>
  );
}

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Outgoing = { id: string; body: string; state: "sending" | "failed" };

export function Thread({ req, userId, onBack }: { req: RequestRow; userId: string; onBack: () => void }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  // Messages not yet confirmed by the server stay visible; a failure keeps the text with Retry / Remove.
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const key = ["messages", req.id];
  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("request_id", req.id).order("created_at");
      if (error) throw error;
      return data as Msg[];
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`msgs-${req.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${req.id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [msgs.data?.length, outbox.length]);
  // Opening a conversation (or receiving a message while it is open and visible) marks it read on this device.
  const newestAt = msgs.data?.length ? msgs.data[msgs.data.length - 1]!.created_at : null;
  useEffect(() => {
    if (!newestAt) return;
    const mark = () => { if (document.visibilityState === "visible") markRead(userId, req.id, newestAt); };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [newestAt, req.id, userId]);
  const role = req.provider_id === userId ? "provider" : "client";
  const locale = lang === "ar" ? "ar-TN" : lang;
  // Within a day the separator carries the date, so bubbles show only the time.
  const time = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const dayLabel = (iso: string) => { const r = relativeDay(iso); return r ? t(r) : new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso)); };
  const otherId = role === "client" ? req.provider_id : req.client_id;
  const otherName = (role === "client" ? req.provider?.display_name : req.client?.display_name) || t("account_deleted_name");
  const otherAvatar = role === "client" ? req.provider_avatar : req.client_avatar;
  const svc = req.services;
  const price = !svc ? "" : svc.price_model === "quote" ? t("pm_quote") : svc.price == null || svc.price <= 0 ? t("sd_price_missing")
    : `${svc.price_model === "from" ? `${t("price_from")} ` : ""}${formatPrice(svc.price, lang)}${svc.price_model === "hourly" ? ` ${t("per_hour")}` : ""}`;

  const deliver = async (item: Outgoing) => {
    setOutbox((o) => o.map((x) => (x.id === item.id ? { ...x, state: "sending" } : x)));
    const { error } = await supabase.from("messages").insert({ request_id: req.id, sender_id: userId, body: item.body });
    if (error) {
      setOutbox((o) => o.map((x) => (x.id === item.id ? { ...x, state: "failed" } : x)));
      const lim = limitMessage(error);
      if (lim) toast.error(t(lim.key, lim.vars));
      return;
    }
    await qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["messages", "last"] });
    setOutbox((o) => o.filter((x) => x.id !== item.id));
  };
  const send = () => {
    const text = body.trim();
    if (!text) return;
    const item: Outgoing = { id: crypto.randomUUID(), body: text, state: "sending" };
    setOutbox((o) => [...o, item]);
    setBody("");
    void deliver(item);
  };

  return (
    <section className="panel flex min-h-[60dvh] flex-col">
      <header className="space-y-3 border-b p-4">
        <button type="button" onClick={onBack} className="min-h-10 text-sm text-sea md:hidden">{t("back")}</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0" style={{ viewTransitionName: vtName("conv", req.id) }}>
              <Avatar src={otherAvatar} name={otherName} size="sm" />
            </span>
            <div className="min-w-0">
              <h2 className="sr-only">{t("thread_with", { name: otherName })}</h2>
              <Link to="/pros/$id" params={{ id: otherId }} dir="auto" className="block truncate font-bold underline-offset-4 hover:underline">{otherName}</Link>
              <StatusBadge status={req.status} />
            </div>
          </div>
          <RequestActions req={req} userId={userId} />
        </div>
        {/* Mini service card: what this conversation is about. */}
        {svc ? (
          <Link to="/services/$id" params={{ id: req.service_id }} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border p-3 text-sm transition-colors hover:bg-muted/60">
            <span dir="auto" className="min-w-0 truncate font-semibold">{svc.title}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{price}</span>
              <span className="inline-flex items-center gap-1">{svc.remote ? <Wifi className="size-3.5" aria-hidden /> : <User className="size-3.5" aria-hidden />}{t(svc.remote ? "remote" : "on_site")}</span>
              {svc.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{svc.city}</span></span>}
            </span>
          </Link>
        ) : (
          <p className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">{t("svc_unavailable")}</p>
        )}
      </header>
      <div role="note" className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm ${req.status === "accepted" ? "bg-success/10" : req.status === "pending" ? "bg-sea-soft/60" : "bg-muted"}`}>
        <p className="min-w-0">{t(threadGuidance(req.status, role))}</p>
        {req.status === "declined" && role === "client" && <Link to="/explore" className="shrink-0 font-semibold text-sea underline-offset-4 hover:underline">{t("explore_services")}</Link>}
      </div>
      <details className="border-b px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">{t("tl_title")}</summary>
        <div className="mt-3"><RequestTimeline status={req.status} createdAt={req.created_at} /></div>
      </details>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-busy={msgs.isLoading}>
        {msgs.isLoading ? (
          <div role="status" aria-label={t("loading")} className="space-y-3">
            <div className="skeleton-block h-12 w-2/3 rounded-2xl" />
            <div className="skeleton-block ms-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : msgs.isError ? (
          <ErrorState onRetry={() => msgs.refetch()} />
        ) : (
          withDaySeparators(msgs.data ?? []).map((item) =>
            item.kind === "day" ? (
              <p key={`d-${item.key}`} className="flex items-center gap-3 py-1 text-xs font-semibold text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                <time dateTime={item.at}>{dayLabel(item.at)}</time>
              </p>
            ) : (
              <div key={item.m.id} className={`flex ${item.m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${item.m.sender_id === userId ? "bubble-own" : "bg-muted"}`}>
                  <p dir="auto" className="whitespace-pre-line break-words text-sm">{item.m.body}</p>
                  <p className="mt-1 text-xs opacity-70">{time.format(new Date(item.m.created_at))}</p>
                </div>
              </div>
            ),
          )
        )}
        {outbox.map((m) => (
          <div key={m.id} className="flex flex-col items-end gap-1">
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.state === "failed" ? "border border-destructive/50 bg-destructive/10" : "bubble-own opacity-75"}`}>
              <p dir="auto" className="whitespace-pre-line break-words text-sm">{m.body}</p>
              {m.state === "sending" && <p className="mt-1 text-xs opacity-80">{t("msg_sending")}</p>}
            </div>
            {m.state === "failed" && (
              <p role="alert" className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-destructive">{t("msg_not_sent")}</span>
                <button type="button" onClick={() => deliver(m)} className="min-h-9 rounded-full px-2 font-semibold text-sea underline-offset-4 hover:underline">{t("msg_retry")}</button>
                <button type="button" onClick={() => setOutbox((o) => o.filter((x) => x.id !== m.id))} className="min-h-9 rounded-full px-2 text-muted-foreground underline-offset-4 hover:underline">{t("msg_discard")}</button>
              </p>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form className="border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="flex items-end gap-2">
          <textarea dir="auto" rows={1} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Desktop: Enter sends, Shift+Enter breaks the line. Touch keyboards: Enter always breaks the line.
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
              if (window.matchMedia("(pointer: coarse)").matches) return;
              e.preventDefault();
              send();
            }}
            placeholder={t("type_message")} aria-label={t("type_message")} aria-describedby="composer-hint"
            className="field max-h-40 min-h-11 flex-1 resize-none py-2.5 [field-sizing:content]" />
          <button type="submit" disabled={!body.trim()} className="btn btn-lime shrink-0" aria-label={t("send")}><Send className="size-4 rtl:-scale-x-100" aria-hidden /></button>
        </div>
        <p id="composer-hint" className="mt-1.5 hidden text-xs text-muted-foreground pointer-fine:block">{t("composer_hint")}</p>
      </form>
    </section>
  );
}
