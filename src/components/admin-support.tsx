import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, LifeBuoy, RotateCcw, Search, SendHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { relativeTime } from "@/lib/notifications";
import { SUPPORT_MAX, checkBody } from "@/lib/support";
import { adminSupportThreadQuery, supportInboxQuery, useAdminSupportActions } from "@/lib/support-db";
import { ErrorState, ListSkeleton } from "@/components/states";

type Filter = "open" | "closed" | "all";

function Thread({ userId }: { userId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const locale = lang === "ar" ? "ar-TN" : lang;
  const q = useQuery(adminSupportThreadQuery(userId));
  const { reply, setStatus } = useAdminSupportActions(userId);
  const [body, setBody] = useState("");
  // Opening a conversation marks it read in the database: refresh the inbox counts and the operator's bell.
  useEffect(() => {
    if (!q.dataUpdatedAt) return;
    void qc.invalidateQueries({ queryKey: ["support", "inbox"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [q.dataUpdatedAt, qc]);

  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data;
  const send = () => {
    if (checkBody(body)) return;
    reply.mutate(body, { onSuccess: () => setBody(""), onError: () => toast.error(t("sup_err_send")) });
  };
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <p dir="auto" className="truncate text-lg font-bold">{d.user.name || t("account_deleted_name")}</p>
          <p className="text-sm text-muted-foreground">
            {[d.user.city, t("sup_adm_facts", { s: d.user.services, r: d.user.requests })].filter(Boolean).join(" · ")}
          </p>
        </div>
        {d.status === "open"
          ? <button type="button" onClick={() => setStatus.mutate("closed")} disabled={setStatus.isPending} className="btn btn-outline min-h-10 gap-2 text-sm"><CheckCircle2 className="size-4" aria-hidden />{t("sup_adm_close")}</button>
          : <button type="button" onClick={() => setStatus.mutate("open")} disabled={setStatus.isPending} className="btn btn-outline min-h-10 gap-2 text-sm"><RotateCcw className="size-4" aria-hidden />{t("sup_adm_reopen")}</button>}
      </div>
      <ol className="max-h-[28rem] space-y-3 overflow-y-auto py-4">
        {d.messages.map((m) => (
          <li key={m.id} className={m.fromTeam ? "flex justify-end" : "flex"}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.fromTeam ? "bubble-own rounded-se-md" : "rounded-ss-md bg-muted"}`}>
              <p dir="auto" className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-xs opacity-75">
                <time dateTime={m.createdAt}>{relativeTime(m.createdAt, locale)}</time>
                {m.page && !m.fromTeam && <> · <span dir="ltr">{m.page}</span></>}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <form className="border-t pt-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="adm-support-reply" className="sr-only">{t("sup_adm_reply")}</label>
        <div className="flex items-end gap-2">
          <textarea id="adm-support-reply" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={SUPPORT_MAX} dir="auto"
            placeholder={t("sup_adm_reply")} className="field min-h-12 flex-1 resize-y text-sm" />
          <button type="submit" disabled={reply.isPending || !!checkBody(body)} aria-label={t("send")} title={t("send")}
            className="btn btn-lime grid size-12 shrink-0 place-items-center p-0 disabled:opacity-50">
            <SendHorizontal className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("sup_adm_reply_note")}</p>
      </form>
    </div>
  );
}

/**
 * Operator inbox on /admin (VITE_SUPPORT + VITE_ADMIN): conversations list + the selected one. The database is the gate.
 * In the console the open conversation lives in the URL (?c=), so « Écrire » on an account opens it here.
 */
export function AdminSupport({ selected: chosen, onSelect }: { selected?: string | null; onSelect?: (userId: string | null) => void } = {}) {
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-TN" : lang;
  const [filter, setFilter] = useState<Filter>("open");
  const [own, setOwn] = useState<string | null>(null);
  const selected = chosen === undefined ? own : chosen;
  const setSelected = (id: string | null) => (onSelect ? onSelect(id) : setOwn(id));
  const [q, setQ] = useState("");
  const inbox = useQuery(supportInboxQuery(filter));
  const all = inbox.data ?? [];
  const needle = q.trim().toLowerCase();
  const rows = needle ? all.filter((r) => r.name.toLowerCase().includes(needle) || r.lastBody.toLowerCase().includes(needle)) : all;
  const unread = all.reduce((a, r) => a + r.unread, 0);
  // Never auto-open: opening marks the conversation read for the whole team.
  const current = selected;
  const filters: { id: Filter; label: string }[] = [
    { id: "open", label: t("sup_adm_open") }, { id: "closed", label: t("sup_adm_closed") }, { id: "all", label: t("sup_adm_all") },
  ];
  return (
    <section id="support" aria-labelledby="adm-support-t" className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="adm-support-t" className="flex items-center gap-2 text-lg font-bold">
          <LifeBuoy className="size-5 text-clay-strong" aria-hidden />{t("sup_adm_title")}
          {unread > 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-sm font-bold text-lime-foreground">{unread}</span>}
        </h2>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setSelected(null); }} className="chip">{f.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        {inbox.isLoading ? <ListSkeleton rows={3} /> : inbox.isError ? <ErrorState onRetry={() => inbox.refetch()} /> : !all.length && !current ? (
          <p className="text-sm text-muted-foreground">{t("sup_adm_empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="space-y-2">
            <label htmlFor="adm-support-q" className="sr-only">{t("ac_msg_search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input id="adm-support-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} dir="auto" autoComplete="off"
                placeholder={t("ac_msg_search")} className="field ps-9 text-sm" />
            </div>
            {!rows.length && <p className="px-1 text-sm text-muted-foreground">{t("ac_none_found")}</p>}
            <ul className="space-y-1 lg:max-h-[36rem] lg:overflow-y-auto">
              {rows.map((r) => (
                <li key={r.userId}>
                  <button type="button" onClick={() => setSelected(r.userId)} aria-current={r.userId === current ? "true" : undefined}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-muted ${r.userId === current ? "bg-muted" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span dir="auto" className={`truncate text-sm ${r.unread ? "font-bold" : "font-semibold"}`}>{r.name || t("account_deleted_name")}</span>
                        {r.lastAt && <time dateTime={r.lastAt} className="shrink-0 text-xs text-muted-foreground">{relativeTime(r.lastAt, locale)}</time>}
                      </span>
                      <span dir="auto" className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">{r.lastFromTeam ? `${t("sup_adm_you")} ` : ""}{r.lastBody}</span>
                    </span>
                    {r.unread > 0 && <span className="mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-xs font-bold text-lime-foreground">{r.unread}<span className="sr-only"> {t("nt_unread_sr")}</span></span>}
                  </button>
                </li>
              ))}
            </ul>
            </div>
            {current ? <Thread key={current} userId={current} /> : <p className="self-center text-center text-sm text-muted-foreground">{t("sup_adm_pick")}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
