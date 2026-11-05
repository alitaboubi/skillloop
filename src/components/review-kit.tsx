import { useId, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, EyeOff, Flag, MessageSquareQuote, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  COMMENT_MAX, EDIT_WINDOW_DAYS, LOW_RATING_COMMENT_MIN, REPLY_MAX, REPORT_MAX, REPORT_MIN, REVIEWS_ENABLED,
  canEditReview, canReply, formatRating, reviewAuthor, reviewCountKey, reviewEligibility, reviewErrorKey, summaryDisplay, validateReview,
  type ReviewSummary,
} from "@/lib/reviews";
import {
  myReviewsQuery, providerReviewsQuery, providerSummaryQuery, replyToReview, reportReview, submitReview, updateReview,
  type OwnReviewRow,
} from "@/lib/reviews-db";
import { myRequestsQuery, type RequestRow } from "@/lib/requests-db";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";

const DAY = 86_400_000;
const useDate = () => {
  const { lang } = useI18n();
  const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { day: "numeric", month: "long", year: "numeric" });
  return (d: string | Date) => f.format(typeof d === "string" ? new Date(d) : d);
};

/** Read-only stars (whole + half by fill width). Screen readers get "4,7 sur 5". */
export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const { t, lang } = useI18n();
  const cls = size === "md" ? "size-5" : "size-4";
  return (
    <span role="img" aria-label={t("rv_stars_aria", { n: formatRating(value, lang) })} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} aria-hidden className={`relative ${cls}`}>
            <Star className={`${cls} text-star/35`} />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${cls} fill-current text-star`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4,7 · 12 avis" — nothing at all without reviews. */
export function RatingBadge({ summary, className = "" }: { summary: ReviewSummary | null | undefined; className?: string }) {
  const { t, lang } = useI18n();
  const d = summaryDisplay(summary);
  if (!d) return null;
  return (
    <span className={`rating-badge ${className}`}>
      <Star className="size-4 fill-current text-star" aria-hidden />
      <span className="font-bold tabular-nums">{formatRating(d.avg, lang)}</span>
      <span className="sr-only">{t("rv_stars_aria", { n: formatRating(d.avg, lang) })}</span>
      <span aria-hidden>·</span>
      <span>{t(reviewCountKey(lang, d.count), { n: d.count })}</span>
    </span>
  );
}

/** A pro's summary from the database (provider_review_summary); renders nothing while off, loading or without reviews. */
export function ProviderRating({ providerId, href, className = "" }: { providerId: string; href?: boolean; className?: string }) {
  const q = useQuery(providerSummaryQuery(providerId));
  if (!REVIEWS_ENABLED || !summaryDisplay(q.data)) return null;
  const badge = <RatingBadge summary={q.data} className={className} />;
  return href ? <Link to="/pros/$id" params={{ id: providerId }} hash="reviews" className="rounded-full">{badge}</Link> : badge;
}

/** 1–5 stars as a radio group: arrows move, each star says what it means ("4 — Bien"). */
export function StarInput({ value, onChange, labelledBy, describedBy, invalid }: {
  value: number | null; onChange: (n: number) => void; labelledBy: string; describedBy?: string | undefined; invalid?: boolean | undefined;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const name = useId();
  const shown = hover ?? value ?? 0;
  const meaning = (["rv_r1", "rv_r2", "rv_r3", "rv_r4", "rv_r5"] as const);
  return (
    <div>
      <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid || undefined}
        className="flex items-center gap-1" onPointerLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="star-choice" onPointerEnter={(e) => e.pointerType === "mouse" && setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only"
              aria-label={`${n} — ${t(meaning[n - 1]!)}`} />
            <Star aria-hidden className={`size-8 transition-transform ${n <= shown ? "fill-current text-star" : "text-muted-foreground/50"}`} />
          </label>
        ))}
        <span aria-hidden className="ms-2 min-w-[7rem] text-sm font-semibold">{shown ? t(meaning[shown - 1]!) : ""}</span>
      </div>
    </div>
  );
}

/** One review as everybody sees it (stars, author, date, service, comment, the pro's reply). */
export function ReviewCard({ rating, author, createdAt, edited, serviceTitle, comment, reply, proName, children }: {
  rating: number; author: string | null; createdAt: string; edited?: boolean; serviceTitle?: string | null | undefined;
  comment: string | null; reply: string | null; proName: string; children?: ReactNode;
}) {
  const { t } = useI18n();
  const date = useDate();
  return (
    <article className="review-card">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Stars value={rating} />
        <p className="text-sm text-muted-foreground">
          {author && <span dir="auto" className="font-semibold text-foreground">{author}</span>}
          {author && " · "}<time dateTime={createdAt}>{date(createdAt)}</time>{edited && ` · ${t("rv_edited")}`}
        </p>
      </header>
      {serviceTitle && <p dir="auto" className="mt-1 line-clamp-1 text-sm text-muted-foreground">{t("rv_for", { s: serviceTitle })}</p>}
      {comment && <p dir="auto" className="mt-3 whitespace-pre-line break-words leading-relaxed">{comment}</p>}
      {reply && (
        <div className="mt-4 rounded-2xl bg-surface-sunken p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-bold"><CornerDownRight className="size-4 text-sea rtl:-scale-x-100" aria-hidden /><span dir="auto">{t("rv_reply_from", { n: proName })}</span></p>
          <p dir="auto" className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{reply}</p>
        </div>
      )}
      {children}
    </article>
  );
}

/** Public list on a pro's page: summary + visible reviews, newest first, "more" pages. Hidden without reviews. */
export function ProviderReviewsSection({ providerId, proName, id = "reviews", limit }: { providerId: string; proName: string; id?: string; limit?: number }) {
  const { t, lang } = useI18n();
  const hid = useId();
  const sum = useQuery(providerSummaryQuery(providerId));
  const list = useInfiniteQuery(providerReviewsQuery(providerId));
  const d = summaryDisplay(sum.data);
  if (!REVIEWS_ENABLED || !d) return null;
  const items = (list.data?.pages ?? []).flat();
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <section id={id} aria-labelledby={hid} className="scroll-mt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={hid} className="section-title">{t("rv_section")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("rv_section_sub")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold tabular-nums">{formatRating(d.avg, lang)}</span>
          <span className="flex flex-col gap-0.5">
            <Stars value={d.avg} size="md" />
            <span className="text-sm text-muted-foreground">{t(reviewCountKey(lang, d.count), { n: d.count })}</span>
          </span>
        </div>
      </div>
      {list.isLoading ? <div className="mt-5"><ListSkeleton rows={2} /></div> : list.isError ? <div className="mt-5"><ErrorState onRetry={() => list.refetch()} /></div> : (
        <>
          <ul className="sd-stagger mt-5 grid gap-4 md:grid-cols-2">
            {shown.map((r) => (
              <li key={r.id} className="min-w-0">
                <ReviewCard rating={r.rating} author={r.author} createdAt={r.created_at} edited={!!r.updated_at} serviceTitle={r.service_title}
                  comment={r.comment} reply={r.reply} proName={proName} />
              </li>
            ))}
          </ul>
          {limit ? (items.length > limit || d.count > limit) && (
            <Link to="/pros/$id" params={{ id: providerId }} hash="reviews" className="link-sea line-link mt-4 inline-flex text-sm font-semibold">{t("rv_more")}</Link>
          ) : list.hasNextPage && (
            <button type="button" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} aria-busy={list.isFetchingNextPage} className="btn btn-outline mt-5">
              {list.isFetchingNextPage ? t("loading") : t("rv_more")}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Client: write (or edit) the review of one request. */
function ReviewForm({ requestId, initial, onDone, onCancel }: { requestId: string; initial?: OwnReviewRow | undefined; onDone: () => void; onCancel?: (() => void) | undefined }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [err, setErr] = useState<{ field: "rating" | "comment" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const ids = { label: useId(), hint: useId(), err: useId() };
  const low = rating !== null && rating <= 2;
  const submit = async () => {
    const v = validateReview({ rating, comment });
    if (v) { setErr({ field: v.field, text: t(v.key, { n: v.n ?? "" }) }); if (v.field === "comment") area.current?.focus(); return; }
    setBusy(true);
    const { error } = initial ? await updateReview(initial.id, rating!, comment) : await submitReview(requestId, rating!, comment);
    setBusy(false);
    if (error) { const k = reviewErrorKey(error.message); setErr({ field: "form", text: t(k ?? "err_generic", { n: LOW_RATING_COMMENT_MIN }) }); return; }
    await qc.invalidateQueries({ queryKey: ["reviews"] });
    if (!initial) toast.success(t("rv_thanks"));
    onDone();
  };
  return (
    <form noValidate aria-busy={busy} className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div>
        <p id={ids.label} className="text-sm font-semibold">{t("rv_rating_label")} *</p>
        <div className="mt-1.5"><StarInput value={rating} onChange={(n) => { setRating(n); if (err?.field !== "form") setErr(null); }} labelledBy={ids.label}
          invalid={err?.field === "rating"} describedBy={err?.field === "rating" ? ids.err : undefined} /></div>
      </div>
      <div>
        <label htmlFor={`${ids.label}-c`} className="block text-sm font-semibold">{t("rv_comment_label")}{low ? " *" : ""}</label>
        <textarea ref={area} id={`${ids.label}-c`} rows={4} maxLength={COMMENT_MAX} dir="auto" className="field mt-1.5 py-2.5" value={comment}
          onChange={(e) => { setComment(e.target.value); if (err?.field === "comment") setErr(null); }} placeholder={t("rv_comment_ph")}
          aria-invalid={err?.field === "comment" || undefined} aria-describedby={`${ids.hint}${err?.field === "comment" ? ` ${ids.err}` : ""}`} />
        <div className="mt-1 flex justify-between gap-3 text-sm text-muted-foreground">
          <span id={ids.hint} className={low ? "font-medium text-foreground" : ""}>{low ? t("rv_err_low_explain", { n: LOW_RATING_COMMENT_MIN }) : ""}</span>
          <span aria-hidden className="shrink-0 tabular-nums">{t("char_count", { n: comment.length, max: COMMENT_MAX })}</span>
        </div>
      </div>
      <p id={ids.err} role="alert" className="text-sm font-medium text-destructive empty:hidden">{err?.text ?? ""}</p>
      <div className="flex flex-wrap gap-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="btn btn-outline">{t("cancel")}</button>}
        <button type="submit" disabled={busy} className="btn btn-lime">{busy ? t("loading") : initial ? t("save_changes") : t("rv_publish")}</button>
      </div>
    </form>
  );
}

/** In the conversation, client side: waiting note → form → their published review (editable 14 days, until a reply). */
export function ClientReviewPanel({ req, userId, proName }: { req: RequestRow; userId: string; proName: string }) {
  const { t } = useI18n();
  const date = useDate();
  const mine = useQuery(myReviewsQuery(userId));
  const [editing, setEditing] = useState(false);
  if (!REVIEWS_ENABLED || req.client_id !== userId || req.status !== "accepted" || mine.isLoading) return null;
  const own = (mine.data ?? []).find((r) => r.request_id === req.id);
  const shell = (children: ReactNode) => <section aria-label={t("rv_section")} className="review-panel">{children}</section>;
  if (own && !editing) {
    const editable = canEditReview(own) && !own.hidden_at;
    return shell(
      <>
        <p className="mb-2 text-sm font-bold">{t("rv_yours")}</p>
        <ReviewCard rating={own.rating} author={null} createdAt={own.created_at} edited={!!own.updated_at} comment={own.comment} reply={own.reply} proName={proName}>
          {own.hidden_at && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><EyeOff className="size-4" aria-hidden />{t("rv_hidden_note")}</p>}
          {editable && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <p className="text-sm text-muted-foreground">{t("rv_edit_until", { d: date(new Date(new Date(own.created_at).getTime() + EDIT_WINDOW_DAYS * DAY)), n: proName })}</p>
              <button type="button" onClick={() => setEditing(true)} className="btn btn-outline min-h-10"><Pencil className="size-4" aria-hidden />{t("rv_edit")}</button>
            </div>
          )}
        </ReviewCard>
      </>,
    );
  }
  const el = reviewEligibility(req);
  if (!own && el.kind !== "eligible") {
    if (el.kind === "not_accepted") return null;
    return shell(<p className="flex items-start gap-2 text-sm text-muted-foreground"><Star className="mt-0.5 size-4 shrink-0 text-star" aria-hidden />
      <span dir="auto">{el.until ? t("rv_wait", { d: date(el.until) }) : t("rv_wait_done", { n: proName })}</span></p>);
  }
  return shell(
    <>
      <h3 dir="auto" className="text-base font-bold">{t("rv_ask_t", { n: proName })}</h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("rv_ask_d")}</p>
      <ReviewForm requestId={req.id} initial={own} onDone={() => setEditing(false)} onCancel={own ? () => setEditing(false) : undefined} />
    </>,
  );
}

/** Pro side of one review: public reply (once) and report (once). */
function ProReviewActions({ review }: { review: OwnReviewRow }) {
  const { t } = useI18n();
  const date = useDate();
  const qc = useQueryClient();
  const [open, setOpen] = useState<"reply" | "report" | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fid = useId();
  const reply = open === "reply";
  const send = async () => {
    const v = text.trim();
    if (reply ? v.length < 1 : v.length < REPORT_MIN) { setErr(t("err_short", { n: reply ? 1 : REPORT_MIN })); return; }
    setBusy(true);
    const { error } = reply ? await replyToReview(review.id, v) : await reportReview(review.id, v);
    setBusy(false);
    if (error) { setErr(t(reviewErrorKey(error.message) ?? "err_generic")); return; }
    await qc.invalidateQueries({ queryKey: ["reviews"] });
    toast.success(t(reply ? "rv_replied" : "rv_report_sent"));
    setOpen(null); setText("");
  };
  return (
    <div className="mt-3 border-t pt-3">
      {review.reported_at && <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Flag className="size-4" aria-hidden />{t("rv_reported", { d: date(review.reported_at) })}</p>}
      {review.hidden_at && <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><EyeOff className="size-4" aria-hidden />{t("rv_hidden_note")}</p>}
      {open ? (
        <form noValidate aria-busy={busy} className="space-y-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <label htmlFor={fid} className="block text-sm font-semibold">{t(reply ? "rv_reply_label" : "rv_report_label")}</label>
          <textarea id={fid} rows={3} dir="auto" autoFocus maxLength={reply ? REPLY_MAX : REPORT_MAX} className="field py-2.5" value={text}
            onChange={(e) => { setText(e.target.value); setErr(""); }} aria-describedby={`${fid}-h`} aria-invalid={!!err || undefined} />
          <p id={`${fid}-h`} className="text-sm text-muted-foreground">{t(reply ? "rv_reply_hint" : "rv_report_hint")}</p>
          <p role="alert" className="text-sm font-medium text-destructive empty:hidden">{err}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setOpen(null); setText(""); setErr(""); }} disabled={busy} className="btn btn-outline">{t("cancel")}</button>
            <button type="submit" disabled={busy} className={reply ? "btn btn-lime" : "btn btn-danger"}>{busy ? t("loading") : t(reply ? "rv_reply_send" : "rv_report_send")}</button>
          </div>
        </form>
      ) : (canReply(review) || !review.reported_at) && (
        <div className="flex flex-wrap gap-2">
          {canReply(review) && <button type="button" onClick={() => setOpen("reply")} className="btn btn-outline min-h-10"><MessageSquareQuote className="size-4" aria-hidden />{t("rv_reply")}</button>}
          {!review.reported_at && <button type="button" onClick={() => setOpen("report")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"><Flag className="size-4" aria-hidden />{t("rv_report")}</button>}
        </div>
      )}
    </div>
  );
}

/** In the conversation, pro side: the client's review of this request, with reply/report. */
export function ProReviewInThread({ req, userId, proName, clientName }: { req: RequestRow; userId: string; proName: string; clientName: string }) {
  const mine = useQuery(myReviewsQuery(userId));
  const { t } = useI18n();
  if (!REVIEWS_ENABLED || req.provider_id !== userId) return null;
  const r = (mine.data ?? []).find((x) => x.request_id === req.id);
  if (!r) return null;
  return (
    <section aria-label={t("rv_section")} className="review-panel">
      <ReviewCard rating={r.rating} author={reviewAuthor(clientName)} createdAt={r.created_at} edited={!!r.updated_at} comment={r.comment} reply={r.reply} proName={proName}>
        <ProReviewActions review={r} />
      </ReviewCard>
    </section>
  );
}

/** Dashboard (pro): every review received, newest first, with reply/report. */
export function ProReviews({ userId, proName }: { userId: string; proName: string }) {
  const { t } = useI18n();
  const mine = useQuery(myReviewsQuery(userId));
  const reqs = useQuery(myRequestsQuery(userId));
  if (mine.isLoading) return <ListSkeleton rows={2} />;
  if (mine.isError) return <ErrorState onRetry={() => mine.refetch()} />;
  const received = (mine.data ?? []).filter((r) => r.provider_id === userId);
  if (!received.length) return <EmptyState icon={Star} title={t("rv_pro_empty_t")} sub={t("rv_pro_empty_d")} />;
  const byReq = new Map((reqs.data ?? []).map((r) => [r.id, r]));
  const visible = received.filter((r) => !r.hidden_at);
  const avg = visible.length ? visible.reduce((a, r) => a + r.rating, 0) / visible.length : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t("rv_pro_t")}</h2>
        {avg !== null && <RatingBadge summary={{ review_count: visible.length, rating_avg: Math.round(avg * 10) / 10 }} />}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {received.map((r) => {
          const q = byReq.get(r.request_id);
          return (
            <li key={r.id} className="min-w-0">
              <ReviewCard rating={r.rating} author={reviewAuthor(q?.client?.display_name)} createdAt={r.created_at} edited={!!r.updated_at}
                serviceTitle={q?.services?.title} comment={r.comment} reply={r.reply} proName={proName}>
                <ProReviewActions review={r} />
                {q && <Link to="/messages" search={{ r: q.id }} className="link-sea line-link mt-3 inline-flex text-sm font-semibold">{t("open_chat")}</Link>}
              </ReviewCard>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">{t("rv_section_sub")}</p>
    </div>
  );
}

/** Dashboard (client): finished jobs not reviewed yet → straight to the conversation's review form. */
export function ReviewTodo({ userId }: { userId: string }) {
  const { t } = useI18n();
  const reqs = useQuery(myRequestsQuery(userId));
  const mine = useQuery(myReviewsQuery(userId));
  if (!REVIEWS_ENABLED || reqs.isLoading || mine.isLoading || !reqs.data || !mine.data) return null;
  const done = new Set(mine.data.map((r) => r.request_id));
  const todo = reqs.data.filter((r) => r.client_id === userId && !done.has(r.id) && reviewEligibility(r).kind === "eligible");
  if (!todo.length) return null;
  return (
    <section aria-labelledby="rv-todo" className="panel-action p-5 pt-6 sm:p-6">
      <h2 id="rv-todo" className="flex items-center gap-2 text-lg font-bold"><Star className="size-5 fill-current text-star" aria-hidden />{t("rv_todo_t")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rv_todo_d")}</p>
      <ul className="mt-4 divide-y">
        {todo.slice(0, 5).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0">
              <span dir="auto" className="block truncate font-semibold">{r.provider?.display_name || t("account_deleted_name")}</span>
              {r.services?.title && <span dir="auto" className="block truncate text-sm text-muted-foreground">{r.services.title}</span>}
            </span>
            <Link to="/messages" search={{ r: r.id }} className="btn btn-lime min-h-10 shrink-0">{t("rv_todo_cta")}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
