import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { limitMessage } from "@/lib/limits";
import { setReturnTo } from "@/lib/return-to";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, Pencil, CheckCircle2, ChevronRight, Clock, ImageOff, Info, Languages, MapPin, Package, Send, Tag, User, Wifi } from "lucide-react";
import { Avatar, EnlargeHint, FramedImage, MediaViewer } from "@/components/media-viewer";
import { ErrorState } from "@/components/states";
import { profileQuery } from "@/lib/profiles-db";
import { requestGuide, guideLine } from "@/lib/request-guides";
import { useI18n, type TKey } from "@/lib/i18n";
import { CATEGORIES, type Service } from "@/lib/data";
import { ServiceCard, formatPrice, useAllServices } from "@/components/site";
import { fetchPublicService, isUuid, serviceQuery } from "@/lib/services-db";
import { serviceSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { submitRequest } from "@/lib/marketplace-writes";
import { myRequestsQuery } from "@/lib/requests-db";
import { requestGate } from "@/lib/request-timeline";
import { addPromptLine } from "@/lib/conversations";
import { vtName } from "@/lib/view-transitions";
import { ShareKit } from "@/components/share-kit";
import { CATEGORY_ICONS } from "@/components/brand";
import { servicePath } from "@/lib/share";

export const Route = createFileRoute("/services/$id")({
  loader: async ({ params, context }) => {
    if (!isUuid(params.id)) throw notFound();
    // Server render: anonymous read, so drafts and archived services are a real 404 and nothing private is in the HTML.
    // In the browser the user's session is used, so owners can still open their own drafts.
    const service = typeof window === "undefined"
      ? await fetchPublicService(params.id)
      : await context.queryClient.ensureQueryData(serviceQuery(params.id));
    if (!service) throw notFound();
    return { service };
  },
  head: ({ loaderData }) => serviceSeo(loaderData?.service),
  notFoundComponent: NotFound,
  errorComponent: LoadError,
  pendingComponent: DetailSkeleton,
  component: Page,
});

/** 404 for visitors. After a full reload of an owner's draft (404 from the server), the signed-in owner still gets it. */
function NotFound() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const { user } = useAuth();
  const own = useQuery({ ...serviceQuery(id), enabled: !!user && isUuid(id) });
  if (own.data) return <Detail s={own.data} />;
  if (own.isLoading) return <DetailSkeleton />;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{t("not_found")}</h1>
      <Link to="/explore" className="btn btn-lime mt-6">{t("explore_services")}</Link>
    </div>
  );
}

function LoadError() {
  const router = useRouter();
  return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={() => router.invalidate()} /></div>;
}

function Page() {
  const { service } = Route.useLoaderData();
  const { id } = Route.useParams();
  // Seeded by the loader (server HTML); refreshed in the browser with the user's session.
  const q = useQuery({ ...serviceQuery(id), initialData: service });
  return <Detail s={q.data ?? service} />;
}

/** What happens after sending — honest: a request is not a booking or a payment. */
function NextSteps() {
  const { t } = useI18n();
  const steps: { key: TKey; done?: boolean }[] = [{ key: "tl_sent", done: true }, { key: "rq_next_2" }, { key: "rq_next_3" }];
  return (
    <section aria-labelledby="rq-next">
      <h3 id="rq-next" className="text-sm font-bold">{t("rq_next_title")}</h3>
      <ol className="mt-2 space-y-2">
        {steps.map((x, i) => (
          <li key={x.key} className="flex items-start gap-2.5 text-sm">
            <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${x.done ? "bg-lime text-lime-foreground" : "bg-muted text-muted-foreground"}`}>
              {x.done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={x.done ? "font-semibold" : "text-muted-foreground"}>{t(x.key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RequestBox({ s }: { s: Service }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  // Focus follows the step: the review heading when reviewing, the text field when going back to edit.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (reviewing) reviewHeading.current?.focus(); else area.current?.focus();
  }, [reviewing]);
  const qc = useQueryClient();
  // Pre-flight from real data: is the provider accepting, and does this client already have an open request here?
  const owner = useQuery({ ...profileQuery(s.ownerId ?? ""), enabled: !!s.ownerId && !!user });
  const mine = useQuery({ ...myRequestsQuery(user?.id ?? ""), enabled: !!user });

  const notice = <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t("sd_not_booking")}</p>;

  if (!s.real) return <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t("demo_service_note")}</p>;
  if (!user)
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("login_to_request")}</p>
        <Link to="/login" onClick={() => setReturnTo(`/services/${s.id}#request`)} className="btn btn-lime w-full">{t("request_quote")}</Link>
        {notice}
      </div>
    );
  if (user.id === s.ownerId)
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-muted p-3 text-sm">{t("own_service")}</p>
        <Link to="/offer" search={{ edit: s.id }} className="btn btn-outline w-full"><Pencil className="size-4" aria-hidden />{t("edit_service")}</Link>
      </div>
    );
  if (sent)
    return (
      <div className="space-y-4">
        <p role="status" className="flex items-start gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm font-semibold text-success"><CheckCircle2 className="size-5 shrink-0" aria-hidden />{t("request_sent")}</p>
        <NextSteps />
        <button onClick={() => navigate({ to: "/messages", search: { r: sent } })} className="btn btn-lime w-full">{t("open_chat")}</button>
      </div>
    );
  if (mine.isLoading || owner.isLoading) return <div role="status" aria-label={t("loading")} className="skeleton-block h-36 w-full rounded-2xl" />;
  const gate = requestGate({
    userId: user.id, ownerId: s.ownerId, serviceId: s.id, myRequests: mine.data ?? [],
    accepting: ((owner.data?.professional_details ?? {}) as Record<string, unknown>)["accepting"],
  });
  if (gate.kind === "open")
    return (
      <div className="space-y-3">
        <div role="status" className="rounded-xl bg-sea-soft p-3 text-sm text-sea">
          <p className="font-semibold">{t(gate.status === "accepted" ? "rq_open_accepted_t" : "rq_open_pending_t")}</p>
          <p className="mt-1">{t("rq_open_d")}</p>
        </div>
        <Link to="/messages" search={{ r: gate.requestId }} className="btn btn-lime w-full">{t("rq_continue")}</Link>
        {notice}
      </div>
    );
  if (gate.kind === "not_accepting")
    return (
      <div className="space-y-3">
        <div role="status" className="rounded-xl bg-muted p-3 text-sm">
          <p className="font-semibold">{t("rq_not_accepting_t")}</p>
          <p className="mt-1 text-muted-foreground">{t("rq_not_accepting_d")}</p>
        </div>
        <Link to="/explore" search={{ category: s.category }} className="btn btn-outline w-full">{t("rq_similar")}</Link>
      </div>
    );
  // Guided request: this category's questions (request-guides.ts); each chip adds an editable line to the client's text.
  const prompts = requestGuide(s.category).map((key) => ({ chip: key, line: guideLine(t(key), lang) }));
  const addPrompt = (line: string) => {
    const r = addPromptLine(msg, line);
    if (r.added) setMsg(r.value);
    requestAnimationFrame(() => { const el = area.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } });
  };
  const send = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await submitRequest(supabase, { serviceId: s.id, clientId: user.id, providerId: s.ownerId!, message: msg });
    setBusy(false);
    if (error || !data) { const lim = limitMessage(error); return setErr(lim ? t(lim.key, lim.vars) : t("err_generic")); }
    setSent(data.id);
    qc.invalidateQueries({ queryKey: ["requests"] });
  };

  if (reviewing)
    return (
      <div className="space-y-3">
        <h3 ref={reviewHeading} tabIndex={-1} className="text-sm font-bold outline-none">{t("rq_review_title", { name: s.provider })}</h3>
        {/* The provider sees exactly this text, as the first message of the conversation. */}
        <div className="flex justify-end">
          <p dir="auto" className="max-w-[90%] whitespace-pre-line break-words rounded-2xl bg-ink px-4 py-3 text-sm text-ink-foreground">{msg.trim()}</p>
        </div>
        <p id="req-err" role="alert" className="text-sm text-destructive empty:hidden">{err}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => { setReviewing(false); setErr(""); }} className="btn btn-outline">{t("rq_review_edit")}</button>
          <button type="button" disabled={busy} onClick={send} className="btn btn-lime flex-1"><Send className="size-4 rtl:-scale-x-100" aria-hidden />{busy ? t("loading") : t("rq_review_send")}</button>
        </div>
        {notice}
      </div>
    );

  return (
    <form noValidate className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      if (msg.trim().length < 10) { setErr(t("err_short", { n: 10 })); area.current?.focus(); return; }
      setErr("");
      setReviewing(true);
    }}>
      <div>
        <label htmlFor="req-msg" className="block text-sm font-semibold">{t("req_message_label")}</label>
        <div className="mt-2">
          <p id="req-prompts" className="text-xs text-muted-foreground">{t("rq_prompts_label")}</p>
          <div role="group" aria-labelledby="req-prompts" className="mt-1.5 flex flex-wrap gap-1.5">
            {prompts.map((p) => {
              const present = msg.split("\n").some((l) => l.trimStart().startsWith(p.line));
              return (
                <button key={p.chip} type="button" aria-pressed={present} onClick={() => addPrompt(p.line)}
                  className={`chip min-h-9 text-xs ${present ? "border-sea text-sea" : ""}`}>
                  {present && <Check className="size-3" aria-hidden />}{t(p.chip)}
                </button>
              );
            })}
          </div>
        </div>
        <textarea ref={area} id="req-msg" rows={5} maxLength={4000} dir="auto" className="field mt-2 py-2.5" value={msg}
          onChange={(e) => { setMsg(e.target.value); if (err && e.target.value.trim().length >= 10) setErr(""); }}
          placeholder={t("req_message_ph")} aria-invalid={!!err} aria-describedby="req-hint req-err" />
        <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
          <span id="req-hint">{t("sd_min_hint")}</span>
          <span aria-hidden>{t("sd_chars", { n: msg.length })}</span>
        </div>
        <p id="req-err" role="alert" className="mt-1 text-sm text-destructive empty:hidden">{err}</p>
      </div>
      <button className="btn btn-lime w-full">{t("rq_review_cta")}</button>
      {notice}
    </form>
  );
}

function DetailSkeleton() {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("loading")} className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="skeleton-block h-4 w-64" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5"><div className="skeleton-block h-9 w-3/4" /><div className="skeleton-block h-5 w-1/3" /><div className="skeleton-block aspect-[16/10] w-full rounded-3xl" /><div className="skeleton-block h-24 w-full" /></div>
        <div className="skeleton-block h-96 w-full rounded-3xl" />
      </div>
    </div>
  );
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const lines = (v: unknown) => (text(v) ?? "").split(/\n|•|;/).map((x) => x.replace(/^[-*\s]+/, "").trim()).filter(Boolean);

function ProviderSummary({ s }: { s: Service }) {
  const { t } = useI18n();
  const q = useQuery({ ...profileQuery(s.ownerId!), enabled: !!s.ownerId });
  const p = q.data;
  const name = p?.display_name || s.provider;
  const place = [p?.area, p?.city].filter(Boolean).join(", ");
  return (
    <section aria-labelledby="about-provider" className="panel p-5 sm:p-6">
      <h2 id="about-provider" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sd_by")}</h2>
      <div className="mt-3 flex items-center gap-4">
        {q.isLoading ? <span className="skeleton-block size-14 rounded-full" aria-hidden /> : <Avatar src={p?.avatar} name={name} />}
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate text-lg font-bold">{name}</p>
          {(p?.title || s.profession) && <p dir="auto" className="truncate text-sm text-muted-foreground">{p?.title || s.profession}</p>}
          {place && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{place}</span></p>}
        </div>
      </div>
      {p?.bio && <p dir="auto" className="mt-4 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{p.bio}</p>}
      {s.ownerId && (
        <Link to="/pros/$id" params={{ id: s.ownerId }} className="btn btn-outline mt-5 w-full">
          {t("sd_view_profile")}<ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      )}
    </section>
  );
}

/** "Before you request": real facts only — member since, accepting status, mode/city — plus the no-booking rule and Share. */
function TrustPanel({ s }: { s: Service }) {
  const { t, lang } = useI18n();
  const hid = useId();
  const q = useQuery({ ...profileQuery(s.ownerId ?? ""), enabled: !!s.ownerId });
  const p = q.data;
  const since = p?.created_at ? new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { month: "long", year: "numeric" }).format(new Date(p.created_at)) : null;
  const accepting = ((p?.professional_details ?? {}) as Record<string, unknown>)["accepting"];
  const facts: { icon: typeof Clock; text: string; tone?: string }[] = [
    ...(typeof accepting === "boolean" ? [{ icon: accepting ? CheckCircle2 : Info, text: t(accepting ? "accepting" : "trust_not_accepting"), tone: accepting ? "text-success" : "text-muted-foreground" }] : []),
    { icon: s.remote ? Wifi : User, text: `${t(s.remote ? "remote" : "on_site")}${s.city ? ` · ${s.city}` : ""}` },
    ...(since ? [{ icon: Clock, text: t("sd_member_since", { d: since }) }] : []),
  ];
  return (
    <section aria-labelledby={hid} className="panel p-5 sm:p-6">
      <h2 id={hid} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("trust_t")}</h2>
      {q.isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden><div className="skeleton-block h-4 w-3/4" /><div className="skeleton-block h-4 w-1/2" /></div>
      ) : (
        <ul className="mt-3 space-y-2.5 text-sm">
          {facts.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5"><f.icon className={`mt-0.5 size-4 shrink-0 ${f.tone ?? "text-sea"}`} aria-hidden /><span dir="auto">{f.text}</span></li>
          ))}
        </ul>
      )}
      <p className="mt-4 flex items-start gap-2.5 border-t pt-4 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t("trust_no_payment")}</p>
      <div className="mt-4"><ShareKit path={servicePath(s.id)} title={s.title} text="share_service_text" label="share_this" /></div>
    </section>
  );
}

function PriceBlock({ s, size = "lg" }: { s: Service; size?: "lg" | "sm" }) {
  const { t, lang } = useI18n();
  const big = size === "lg" ? "text-3xl" : "text-lg";
  if (s.quoteOnly) return <p className={`${big} font-extrabold text-clay-strong`}>{t("pm_quote")}</p>;
  if (s.priceMissing) return <p className={`${size === "lg" ? "text-xl" : "text-base"} font-bold text-muted-foreground`}>{t("sd_price_missing")}</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      {s.unit === "pm_from" && <span className="text-sm text-muted-foreground">{t("price_from")}</span>}
      <span className={`${big} font-extrabold tabular-nums`}>{formatPrice(s.price, lang)}</span>
      {s.unit !== "pm_from" && <span className="text-sm text-muted-foreground">{t(s.unit)}</span>}
    </p>
  );
}

function priceNote(s: Service) {
  if (s.quoteOnly) return "sd_note_quote" as const;
  if (s.priceMissing) return null;
  if (s.unit === "pm_from") return "sd_note_from" as const;
  if (s.unit === "per_hour") return "sd_note_hourly" as const;
  return null;
}

function Gallery({ s }: { s: Service }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!s.hasPhoto)
    return (
      <div className="media-frame aspect-[16/10] rounded-3xl">
        <span className="media-empty"><ImageOff className="size-8" aria-hidden /><span className="text-sm font-medium">{t("sd_no_photo")}</span></span>
      </div>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="media-trigger" aria-label={t("sd_open_photo")} style={{ viewTransitionName: vtName("svc", s.id) }}>
        <FramedImage src={s.image} alt={s.title} eager className="aspect-[16/10]" />
        <EnlargeHint />
      </button>
      <MediaViewer items={[{ src: s.image, alt: s.title, caption: s.title }]} index={0} onIndex={() => {}} open={open} onOpenChange={setOpen} />
    </>
  );
}

function Detail({ s }: { s: Service }) {
  const { t } = useI18n();
  const { services } = useAllServices();
  const cat = CATEGORIES.find((c) => c.id === s.category) ?? CATEGORIES[0]!;
  const CatIcon = CATEGORY_ICONS[s.category] ?? CATEGORY_ICONS.other;
  const d = s.details ?? {};
  const included = lines(d["deliverables"]);
  const packages = lines(d["packages"]);
  const duration = text(d["duration"]);
  const similar = services.filter((x) => x.id !== s.id && x.category === s.category).slice(0, 3);
  const note = priceNote(s);
  const rows = [
    { icon: s.remote ? Wifi : User, k: t("sd_format"), v: s.remote ? t("remote") : t("on_site") },
    s.city && { icon: MapPin, k: t("location"), v: s.city },
    { icon: Tag, k: t("sd_price_model"), v: t(s.unit) },
    duration && { icon: Clock, k: t("f_duration"), v: duration },
    s.languages !== "—" && { icon: Languages, k: t("languages"), v: s.languages },
  ].filter(Boolean) as { icon: typeof Clock; k: string; v: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li><Link to="/" className="line-link rounded hover:text-foreground">{t("home")}</Link></li>
          <li aria-hidden><ChevronRight className="size-4 rtl:-scale-x-100" /></li>
          <li><Link to="/explore" search={{ category: s.category }} className="line-link rounded hover:text-foreground">{t(cat.key)}</Link></li>
          <li aria-hidden><ChevronRight className="size-4 rtl:-scale-x-100" /></li>
          <li className="min-w-0 max-w-full"><span dir="auto" aria-current="page" className="line-clamp-1 text-foreground">{s.title}</span></li>
        </ol>
      </nav>

      <header className="mt-5 max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/explore" search={{ category: s.category }} className="tag tag-ink"><CatIcon className="size-3.5 text-lime" aria-hidden />{t(cat.key)}</Link>
          <span className="tag tag-sea">{s.remote ? <Wifi className="size-3.5" aria-hidden /> : <User className="size-3.5" aria-hidden />}{s.remote ? t("remote") : t("on_site")}</span>
          {s.city && <span className="tag tag-sea"><MapPin className="size-3.5" aria-hidden /><span dir="auto">{s.city}</span></span>}
        </div>
        <h1 dir="auto" className="display-title break-words text-[2rem] md:text-5xl">{s.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t("sd_by")}{" "}
          {s.ownerId ? <Link to="/pros/$id" params={{ id: s.ownerId }} dir="auto" className="font-semibold text-foreground underline-offset-4 hover:underline">{s.provider}</Link> : <span dir="auto" className="font-semibold text-foreground">{s.provider}</span>}
          {s.profession && <span dir="auto"> · {s.profession}</span>}
        </p>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <Gallery s={s} />

          <div className="panel p-5 lg:hidden">
            <PriceBlock s={s} />
            {note && <p className="mt-1 text-sm text-muted-foreground">{t(note)}</p>}
          </div>

          <section aria-labelledby="sd-about">
            <h2 id="sd-about" className="text-xl font-bold">{t("about_service")}</h2>
            <p dir="auto" className="mt-3 max-w-prose whitespace-pre-line break-words leading-relaxed text-muted-foreground">{s.description}</p>
          </section>

          {included.length > 0 && (
            <section aria-labelledby="sd-incl">
              <h2 id="sd-incl" className="text-xl font-bold">{t("sd_included")}</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {included.map((x) => <li key={x} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span dir="auto" className="break-words">{x}</span></li>)}
              </ul>
            </section>
          )}

          {packages.length > 0 && (
            <section aria-labelledby="sd-pkg">
              <h2 id="sd-pkg" className="text-xl font-bold">{t("sd_packages")}</h2>
              <ul className="mt-4 grid gap-2">
                {packages.map((x) => <li key={x} className="panel flex items-start gap-2.5 p-4 text-sm"><Package className="mt-0.5 size-4 shrink-0 text-clay-strong" aria-hidden /><span dir="auto" className="break-words">{x}</span></li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="sd-practical">
            <h2 id="sd-practical" className="text-xl font-bold">{t("sd_practical")}</h2>
            <dl className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
              {rows.map((r) => (
                <div key={r.k} className="info-row border-b sm:border-b">
                  <span className="info-icon"><r.icon className="size-4" aria-hidden /></span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{r.k}</dt>
                    <dd dir="auto" className="break-words font-semibold">{r.v}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {s.real && <div className="lg:hidden"><TrustPanel s={s} /></div>}
          {s.ownerId && <div className="lg:hidden"><ProviderSummary s={s} /></div>}
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-24">
          <section id="request" aria-labelledby="req-title" className="panel-action scroll-mt-24 p-5 pt-6 sm:p-6 sm:pt-7">
            <div className="hidden border-b pb-5 lg:block">
              <PriceBlock s={s} />
              {note && <p className="mt-1.5 text-sm text-muted-foreground">{t(note)}</p>}
            </div>
            <h2 id="req-title" className="text-lg font-bold lg:mt-5">{t("sd_request_cta")}</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("sd_request_for")} <span dir="auto" className="font-semibold text-foreground">{s.title}</span> · <span dir="auto">{s.provider}</span></p>
            <RequestBox s={s} />
          </section>
          {s.real && <div className="hidden lg:block"><TrustPanel s={s} /></div>}
          {s.ownerId && <div className="hidden lg:block"><ProviderSummary s={s} /></div>}
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="sd-similar" className="mt-16 border-t pt-10">
          <h2 id="sd-similar" className="text-xl font-bold">{t("similar")}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((x) => <ServiceCard key={x.id} s={x} />)}
          </div>
        </section>
      )}

      <div data-request-bar className="request-bar fixed inset-x-0 z-30 border-t bg-card/95 px-3 pt-3 shadow-raised backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0"><PriceBlock s={s} size="sm" /></div>
          <a href="#request" className="btn btn-lime shrink-0"><Send className="size-4 rtl:-scale-x-100" aria-hidden />{t("sd_request_cta")}</a>
        </div>
      </div>
      <div className="request-bar-spacer h-24 lg:hidden" aria-hidden />
    </div>
  );
}
