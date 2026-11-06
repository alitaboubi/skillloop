import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ChevronDown, LifeBuoy, LogIn, Mail, MessageCircle, SendHorizontal, ShieldCheck, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { profileQuery } from "@/lib/profiles-db";
import { rememberCurrentPage } from "@/lib/return-to";
import { relativeTime } from "@/lib/notifications";
import {
  HELP_TOPICS, SUPPORT_CHAT_ENABLED, SUPPORT_EMAIL, SUPPORT_MAX, SUPPORT_WHATSAPP, checkBody, mailtoUrl, pagePath,
  supportErrorKey, whatsappUrl,
  type SupportDraft,
} from "@/lib/support";
import { markSupportRead, supportThreadQuery, useSendSupport, useSupportLive } from "@/lib/support-db";

type Tab = "help" | "chat";

function Contact() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      <a href={mailtoUrl(t("sup_mail_subject"))} className="btn btn-outline min-h-10 gap-2 px-3 text-sm"><Mail className="size-4" aria-hidden /><span dir="ltr">{SUPPORT_EMAIL}</span></a>
      {SUPPORT_WHATSAPP && (
        <a href={whatsappUrl(SUPPORT_WHATSAPP, t("sup_wa_text"))} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-10 gap-2 px-3 text-sm">
          <MessageCircle className="size-4" aria-hidden />WhatsApp
        </a>
      )}
    </div>
  );
}

function Help({ name, onChat, close }: { name: string; onChat: () => void; close: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="text-lg font-bold" dir="auto">{name ? t("sup_hello_name", { name }) : t("sup_hello")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("sup_hello_d")}</p>
      </div>
      <ul className="divide-y rounded-2xl border">
        {HELP_TOPICS.map((h) => (
          <li key={h.id}>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sea [&::-webkit-details-marker]:hidden">
                {t(h.q)}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                <p>{t(h.a)}</p>
                {h.cta && (
                  <Link to={h.cta.to} search={h.cta.search as never} onClick={close} className="link-sea mt-2 inline-flex items-center gap-1 font-semibold">
                    {t(h.cta.label)}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                  </Link>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-muted p-4">
        <p className="font-bold">{t("sup_not_found_t")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{SUPPORT_CHAT_ENABLED ? t("sup_not_found_chat") : t("sup_not_found_mail")}</p>
        <div className="mt-3">
          {SUPPORT_CHAT_ENABLED
            ? <button type="button" onClick={onChat} className="btn btn-lime min-h-10 gap-2 text-sm"><MessageCircle className="size-4" aria-hidden />{t("sup_write_team")}</button>
            : <Contact />}
        </div>
      </div>
    </div>
  );
}

function Chat({ userId, open, draft }: { userId: string; open: boolean; draft: SupportDraft | null }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const thread = useQuery(supportThreadQuery(userId));
  const send = useSendSupport(userId);
  const [body, setBody] = useState(draft?.text ?? "");
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  // A ready message (e.g. « je veux ma vidéo » from a notification) fills the box; the user still reads it and sends.
  useEffect(() => { if (draft) setBody(draft.text); }, [draft]);
  useSupportLive(userId, open);
  const locale = lang === "ar" ? "ar-TN" : lang;
  const messages = thread.data?.messages ?? [];
  const lastTeam = [...messages].reverse().find((m) => m.fromTeam)?.createdAt ?? null;

  // Reading the panel marks the team's replies read (and clears the bell's support alert).
  useEffect(() => {
    if (!open || !lastTeam || document.visibilityState !== "visible") return;
    const readAt = thread.data?.userReadAt;
    if (readAt && Date.parse(readAt) >= Date.parse(lastTeam)) return;
    void markSupportRead().then(() => qc.invalidateQueries({ queryKey: ["notifications", userId] })).catch(() => {});
  }, [open, lastTeam, thread.data?.userReadAt, qc, userId]);

  useEffect(() => { list.current?.lastElementChild?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const submit = () => {
    const problem = checkBody(body);
    if (problem) { setErr(t(problem === "empty" ? "sup_err_empty" : "sup_err_long", { n: SUPPORT_MAX })); return; }
    setErr(null);
    send.mutate({ body, page: pagePath(pathname) }, {
      onSuccess: () => setBody(""),
      onError: (e) => setErr(t(supportErrorKey(e))),
    });
  };

  if (!SUPPORT_CHAT_ENABLED) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol ref={list} aria-live="polite" aria-label={t("sup_conversation")} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
        <li className="flex items-start gap-2.5">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-lime"><LifeBuoy className="size-4" /></span>
          <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-muted px-3.5 py-2.5 text-sm">
            <p className="font-semibold">{t("sup_team")}</p>
            <p className="mt-0.5 text-muted-foreground">{t("sup_intro")}</p>
          </div>
        </li>
        {thread.isLoading && <li aria-busy className="h-12 w-2/3 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />}
        {thread.isError && (
          <li className="text-sm text-muted-foreground">{t("sup_err_load")} <button type="button" className="link-sea font-semibold" onClick={() => thread.refetch()}>{t("retry")}</button></li>
        )}
        {messages.map((m) => m.fromTeam ? (
          <li key={m.id} className="flex items-start gap-2.5">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-lime"><LifeBuoy className="size-4" /></span>
            <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-muted px-3.5 py-2.5 text-sm">
              <p className="sr-only">{t("sup_team")}</p>
              <p dir="auto" className="whitespace-pre-wrap break-words">{m.body}</p>
              <time dateTime={m.createdAt} className="mt-1 block text-xs text-muted-foreground">{relativeTime(m.createdAt, locale)}</time>
            </div>
          </li>
        ) : (
          <li key={m.id} className="flex justify-end">
            <div className="bubble-own max-w-[85%] rounded-2xl rounded-se-md px-3.5 py-2.5 text-sm">
              <p className="sr-only">{t("sup_you")}</p>
              <p dir="auto" className="whitespace-pre-wrap break-words">{m.body}</p>
              <time dateTime={m.createdAt} className="mt-1 block text-xs opacity-75">{relativeTime(m.createdAt, locale)}</time>
            </div>
          </li>
        ))}
        {messages.length > 0 && !messages.at(-1)!.fromTeam && (
          <li className="text-center text-sm text-muted-foreground">{t("sup_sent_note")}</li>
        )}
      </ol>
      <form className="border-t p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="support-body" className="sr-only">{t("sup_placeholder")}</label>
        <div className="flex items-end gap-2">
          <textarea id="support-body" value={body} rows={2} maxLength={SUPPORT_MAX + 200} dir="auto"
            onChange={(e) => { setBody(e.target.value); if (err) setErr(null); }}
            onKeyDown={(e) => {
              // Desktop: Enter sends, Shift+Enter breaks the line. Touch keyboards: Enter always breaks the line.
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
              if (window.matchMedia("(pointer: coarse)").matches) return;
              e.preventDefault(); submit();
            }}
            placeholder={t("sup_placeholder")} aria-invalid={!!err} aria-describedby={err ? "support-err" : "support-note"}
            className="field max-h-40 min-h-12 flex-1 resize-none text-sm" />
          <button type="submit" disabled={send.isPending || !body.trim()} aria-label={t("send")} title={t("send")}
            className="btn btn-lime grid size-12 shrink-0 place-items-center p-0 disabled:opacity-50">
            <SendHorizontal className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        </div>
        {err
          ? <p id="support-err" role="alert" className="mt-2 text-sm text-destructive">{err}</p>
          : <p id="support-note" className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{t("sup_privacy")}</p>}
        {body.length > SUPPORT_MAX - 200 && <p className="mt-1 text-end text-sm tabular-nums text-muted-foreground">{body.trim().length}/{SUPPORT_MAX}</p>}
      </form>
    </div>
  );
}

/** The support panel: a full screen sheet on phones, a floating card at the bottom end on larger screens. */
export function SupportPanel({ open, onOpenChange, tab, onTab, draft = null }: { open: boolean; onOpenChange: (v: boolean) => void; tab: Tab; onTab: (t: Tab) => void; draft?: SupportDraft | null }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const prof = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user && open });
  const name = (prof.data?.display_name || "").trim().split(/\s+/)[0] ?? "";
  const close = () => onOpenChange(false);
  const tabs: { id: Tab; label: string }[] = [
    { id: "help", label: t("sup_tab_help") },
    { id: "chat", label: SUPPORT_CHAT_ENABLED ? t("sup_tab_chat") : t("sup_tab_contact") },
  ];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 md:bg-transparent data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content aria-describedby="support-sub"
          // Focus the panel itself (not the close button), or the message box when the chat is open and signed in.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const box = document.getElementById("support-body");
            (box ?? (e.currentTarget as HTMLElement | null))?.focus();
          }}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card text-card-foreground outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 motion-reduce:animate-none md:inset-auto md:bottom-6 md:end-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[25rem] md:rounded-3xl md:border md:shadow-xl">
          <div className="bg-hero relative shrink-0 px-5 pb-4 pt-5 text-navy-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-10 place-items-center rounded-full bg-lime text-lime-foreground"><LifeBuoy className="size-5" /></span>
                <div>
                  <Dialog.Title className="text-lg font-bold">{t("sup_title")}</Dialog.Title>
                  <p id="support-sub" className="text-sm text-navy-muted">{t("sup_sub")}</p>
                </div>
              </div>
              <Dialog.Close aria-label={t("sup_close")} className="grid size-10 place-items-center rounded-full text-navy-muted transition-colors hover:bg-navy-foreground/10 hover:text-navy-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime">
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>
            <div role="tablist" aria-label={t("sup_title")} className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-navy-foreground/10 p-1">
              {tabs.map((x) => (
                <button key={x.id} type="button" role="tab" id={`sup-tab-${x.id}`} aria-selected={tab === x.id} aria-controls={`sup-panel-${x.id}`}
                  onClick={() => onTab(x.id)}
                  className={`min-h-10 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${tab === x.id ? "bg-lime text-lime-foreground" : "text-navy-foreground hover:bg-navy-foreground/10"}`}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
          <div role="tabpanel" id={`sup-panel-${tab}`} aria-labelledby={`sup-tab-${tab}`} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {tab === "help" ? (
              <Help name={user ? name : ""} onChat={() => onTab("chat")} close={close} />
            ) : !SUPPORT_CHAT_ENABLED ? (
              <div className="space-y-4 p-5">
                <p className="text-sm text-muted-foreground">{t("sup_contact_d")}</p>
                <Contact />
              </div>
            ) : !user ? (
              <div className="space-y-4 p-5 text-center">
                <span aria-hidden className="icon-well-sea mx-auto size-12"><LogIn className="size-5" /></span>
                <p className="font-bold">{t("sup_signin_t")}</p>
                <p className="text-sm text-muted-foreground">{t("sup_signin_d")}</p>
                <Link to="/login" onClick={() => { rememberCurrentPage(); close(); }} className="btn btn-lime">{t("login")}</Link>
                <div className="border-t pt-4 text-start">
                  <p className="mb-2 text-sm text-muted-foreground">{t("sup_or_contact")}</p>
                  <Contact />
                </div>
              </div>
            ) : (
              <Chat userId={user.id} open={open} draft={draft} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
