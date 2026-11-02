import { createFileRoute, Link } from "@tanstack/react-router";
import { limitMessage } from "@/lib/limits";
import { rememberCurrentPage } from "@/lib/return-to";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Pencil, User, Wifi } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { CATEGORIES, CITIES, type CategoryId, type Service } from "@/lib/data";
import { PageHero, ServiceCard, ServiceCardSkeleton } from "@/components/site";
import { ShareKit } from "@/components/share-kit";
import { servicePath } from "@/lib/share";
import { PhotoPicker } from "@/components/photo-picker";
import { COVER_SIZE, coverGroups } from "@/lib/presets";
import { AiAssist } from "@/components/ai-assist";
import { ErrorState, EmptyState, ListSkeleton } from "@/components/states";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/profiles-db";
import { isUuid, serviceQuery, signImages } from "@/lib/services-db";
import { publishService, updateService } from "@/lib/marketplace-writes";
import { clearOfferDraft, clearWizardDraft, readOfferDraft, readWizardDraft, saveWizardDraft } from "@/lib/offer-draft";
import {
  LIMITS, OFFER_STEPS, changedGroups, emptyOffer, firstInvalidStep, offerToRow, parsePrice, rowToOfferForm, stepOf, validateOffer,
  type OfferErrors, type OfferField, type OfferForm, type ReviewGroup, type ServiceRow,
} from "@/lib/offer-wizard";

export { validateOffer } from "@/lib/offer-wizard";

type Search = { title?: string; edit?: string };

export const Route = createFileRoute("/offer")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["title"] === "string" && s["title"].trim() ? { title: s["title"].slice(0, 120) } : {}),
    ...(typeof s["edit"] === "string" && isUuid(s["edit"]) ? { edit: s["edit"] } : {}),
  }),
  head: () => seo("Proposer un service", "Publiez votre service sur SkillLoop et touchez des clients près de chez vous en Tunisie.", { noindex: true }),
  component: Offer,
});

const STEP_LABEL: TKey[] = ["step_basic", "step_pricing", "step_place", "step_review"];
const PRICE_MODELS: { v: string; label: TKey; desc: TKey }[] = [
  { v: "fixed", label: "pm_fixed", desc: "pm_fixed_d" },
  { v: "from", label: "pm_from", desc: "pm_from_d" },
  { v: "hourly", label: "per_hour", desc: "per_hour_d" },
  { v: "quote", label: "pm_quote", desc: "pm_quote_d" },
];
const UNIT: Record<string, Service["unit"]> = { fixed: "pm_fixed", from: "pm_from", hourly: "per_hour", quote: "pm_quote" };

function Offer() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const s = Route.useSearch();
  const editing = !!s.edit;
  return (
    <>
      <PageHero title={t(editing ? "edit_service" : "offer_title")} sub={t(editing ? "offer_edit_sub" : "offer_sub")} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-10">
        {!ready ? (
          <ListSkeleton rows={3} />
        ) : !user ? (
          <div className="panel p-6 py-10 text-center">
            <p className="font-semibold">{t("login_to_offer")}</p>
            <div className="mt-6 flex justify-center gap-3"><Link to="/login" onClick={rememberCurrentPage} className="btn btn-outline">{t("login")}</Link><Link to="/signup" onClick={rememberCurrentPage} className="btn btn-lime">{t("signup")}</Link></div>
          </div>
        ) : s.edit ? (
          <EditLoader key={s.edit} id={s.edit} userId={user.id} />
        ) : (
          <Wizard key="new" userId={user.id} titleParam={s.title ?? ""} />
        )}
      </div>
    </>
  );
}

/** Loads one of the user's own services; the wizard mounts only with loaded data, so nothing is saved over unseen values. */
function EditLoader({ id, userId }: { id: string; userId: string }) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["services", "edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services")
        .select("id, owner_id, title, description, category, price_model, price, city, remote, status, archived, image_url, details")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data || data.owner_id !== userId) return null;
      const urls = data.image_url ? await signImages([data.image_url]) : {};
      return { row: data as ServiceRow, image: data.image_url ? urls[data.image_url] : undefined };
    },
  });
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data)
    return <EmptyState title={t("edit_not_found")} action={<Link to="/profile" search={{ space: "pro", tab: "services" }} className="btn btn-outline">{t("manage_services")}</Link>} />;
  return <Wizard userId={userId} titleParam="" original={q.data} />;
}

type Original = { row: ServiceRow; image?: string | undefined };

function initialState(userId: string, titleParam: string, original?: Original): { form: OfferForm; step: number; restored: boolean; fromHome: boolean } {
  if (original) return { form: rowToOfferForm(original.row), step: 3, restored: false, fromHome: false };
  // A fresh homepage hand-off wins over an older wizard draft.
  const home = readOfferDraft();
  if (home) return { form: { ...emptyOffer(titleParam || home.title), description: home.description }, step: 0, restored: false, fromHome: true };
  const saved = readWizardDraft<OfferForm>(userId);
  if (saved && (saved.form.title?.trim() || saved.form.description?.trim()))
    return { form: { ...emptyOffer(), ...saved.form }, step: Math.min(Math.max(saved.step, 0), 3), restored: true, fromHome: false };
  return { form: emptyOffer(titleParam), step: 0, restored: false, fromHome: false };
}

function Wizard({ userId, titleParam, original }: { userId: string; titleParam: string; original?: Original }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [init] = useState(() => initialState(userId, titleParam, original));
  const [f, setF] = useState<OfferForm>(init.form);
  const [step, setStep] = useState(init.step);
  const [reached, setReached] = useState(init.step);
  const [restored, setRestored] = useState(init.restored);
  const [errors, setErrors] = useState<OfferErrors>({});
  const [focusField, setFocusField] = useState<OfferField | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"published" | "draft" | null>(null);
  const [submitErr, setSubmitErr] = useState("");
  const [done, setDone] = useState<{ id: string; status: "published" | "draft" } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const profile = useQuery(profileQuery(userId));

  // The homepage hand-off is consumed once it is in the wizard (cleared after mount, never inside render).
  useEffect(() => { if (init.fromHome) clearOfferDraft(); }, [init.fromHome]);
  // Create mode: keep input across reloads in this tab (the photo file itself is not stored).
  useEffect(() => {
    if (original || done) return;
    if (f.title.trim() || f.description.trim()) saveWizardDraft(userId, f, step);
  }, [f, step, userId, original, done]);
  useEffect(() => {
    if (!file) { setFileUrl(null); return; }
    const u = URL.createObjectURL(file);
    setFileUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  // Move focus to the new step heading (not on first render), or to the field that needs attention.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (focusField) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step, done, focusField]);
  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`of-${focusField}`);
    el?.focus();
    el?.scrollIntoView({ block: "center" });
    setFocusField(null);
  }, [focusField, step]);

  const photoUrl = fileUrl ?? (removed ? null : original?.image ?? null);
  const photoChanged = !!file || (removed && !!original?.row.image_url);
  const changes = original ? changedGroups(rowToOfferForm(original.row), f, photoChanged) : new Set<ReviewGroup>();

  const set = <K extends keyof OfferForm>(k: K, v: OfferForm[K]) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const showErrors = (e: OfferErrors) => {
    setErrors(e);
    const target = firstInvalidStep(e);
    const field = (Object.keys(e) as OfferField[]).find((k) => stepOf(k) === target);
    setStep(target);
    setFocusField(field ?? null);
  };
  const goTo = (i: number) => {
    if (i <= step) { setStep(i); return; }
    const e = validateOffer(f, i - 1);
    if (Object.keys(e).length) { showErrors(e); return; }
    setErrors({});
    setStep(i);
    setReached((r) => Math.max(r, i));
  };
  const submit = async (status: "published" | "draft") => {
    const e = validateOffer(f, 2);
    if (Object.keys(e).length) { showErrors(e); return; }
    setBusy(status);
    setSubmitErr("");
    const row = { ...offerToRow(f, original?.row.details), status };
    const r = original
      ? await updateService(supabase, userId, original.row.id, row, { file, removePhoto: removed, previous: original.row.image_url })
      : await publishService(supabase, userId, row, file);
    setBusy(null);
    // On failure every field stays as typed.
    if (r.error !== null) { const lim = limitMessage(r.error); setSubmitErr(lim ? t(lim.key, lim.vars) : t(r.error === "upload" ? "err_upload" : "err_generic")); return; }
    qc.invalidateQueries({ queryKey: ["services"] });
    qc.invalidateQueries({ queryKey: ["profile", userId] });
    qc.invalidateQueries({ queryKey: ["plan"] }); // a first publication starts the free month
    if (!original) { clearWizardDraft(); clearOfferDraft(); }
    setDone({ id: r.data.id, status });
  };
  const restart = () => {
    clearWizardDraft();
    setF(emptyOffer());
    setFile(null);
    setRemoved(false);
    setErrors({});
    setSubmitErr("");
    setRestored(false);
    setDone(null);
    setStep(0);
    setReached(0);
  };

  if (done) {
    const edited = !!original;
    const title: TKey = edited ? "saved" : done.status === "draft" ? "draft_saved" : "published";
    const sub: TKey = edited && done.status === "published" ? "done_updated_d" : done.status === "draft" ? "done_draft_d" : "done_published_d";
    return (
      <div className="swap-in panel-action p-6 py-10 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h2 ref={heading} tabIndex={-1} className="mt-3 text-xl font-bold outline-none">{t(title)}</h2>
        <p role="status" className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t(sub)}</p>
        {done.status === "published" && <LaunchKit id={done.id} />}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/services/$id" params={{ id: done.id }} className="btn btn-lime">{t("view_service")}</Link>
          <Link to="/profile" search={{ space: "pro", tab: "services" }} className="btn btn-outline">{t("manage_services")}</Link>
          {!edited && <button type="button" onClick={restart} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-sea underline-offset-4 hover:underline">{t("offer_another")}</button>}
        </div>
      </div>
    );
  }

  const field = (k: OfferField) => ({
    id: `of-${k}`,
    "aria-invalid": !!errors[k],
    "aria-describedby": [`of-${k}-help`, errors[k] ? `of-${k}-err` : ""].filter(Boolean).join(" "),
  });
  const err = (k: OfferField) => errors[k] && <p id={`of-${k}-err`} className="mt-1 text-sm font-medium text-destructive">{t(errors[k]!.key, { n: errors[k]!.n ?? "" })}</p>;
  const count = (n: number, max: number) => <span aria-hidden className="shrink-0 tabular-nums">{t("char_count", { n, max })}</span>;
  const draftOrEditOfDraft = !original || original.row.status === "draft";
  // Minimal listing context for writing help — never ids, email or contacts.
  const catKey = CATEGORIES.find((c) => c.id === f.category)?.key;
  const aiContext = { title: f.title, category: catKey ? t(catKey) : "", description: f.description };

  return (
    <div>
      <Stepper step={step} reached={Math.max(reached, step)} onGo={goTo} />

      {restored && (
        <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sea-soft px-4 py-3 text-sm text-sea">
          <span>{t("draft_restored")}</span>
          <button type="button" onClick={restart} className="font-semibold underline underline-offset-4">{t("restart")}</button>
        </div>
      )}

      <form noValidate aria-busy={!!busy} onSubmit={(e) => { e.preventDefault(); if (step < 3) goTo(step + 1); else submit("published"); }}
        className="panel-action mt-5 p-5 pt-6 sm:p-7 sm:pt-8">
        <div key={step} className="swap-in space-y-6">
          <header>
            <h2 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">{t(step === 0 ? "st0_h" : step === 1 ? "st1_h" : step === 2 ? "st2_h" : original ? "st3_h_edit" : "st3_h")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t(step === 0 ? "st0_d" : step === 1 ? "st1_d" : step === 2 ? "st2_d" : "st3_d")}</p>
            {step < 3 && <p className="mt-2 text-xs text-muted-foreground">{t("req_hint")}</p>}
          </header>

          {step === 0 && (
            <>
              <div>
                <label htmlFor="of-title" className="block text-sm font-semibold">{t("f_title")} *</label>
                <input {...field("title")} dir="auto" maxLength={LIMITS.title} className="field mt-1.5" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={t("f_title_ph")} />
                <div className="mt-1 flex justify-end text-xs text-muted-foreground"><span id="of-title-help" className="sr-only">{t("err_short", { n: 5 })}</span>{count(f.title.length, LIMITS.title)}</div>
                {err("title")}
                <AiAssist field="title" value={f.title} onApply={(v) => set("title", v)} context={aiContext} />
              </div>
              <div>
                <label htmlFor="of-category" className="block text-sm font-semibold">{t("f_category")} *</label>
                <select {...field("category")} className="field mt-1.5" value={f.category} onChange={(e) => set("category", e.target.value)}>
                  <option value="">{t("f_choose")}</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{t(c.key)}</option>)}
                </select>
                {err("category")}
              </div>
              {f.category === "healthcare" && (
                <div className="rounded-2xl border border-sea/30 bg-sea-soft/40 p-4">
                  <p id="of-regulatedAck-help" className="text-sm text-muted-foreground">{t("regulated_note")}</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm font-semibold">
                    <input type="checkbox" {...field("regulatedAck")} className="mt-0.5 size-4 shrink-0 accent-sea" checked={!!f.regulatedAck} onChange={(e) => set("regulatedAck", e.target.checked)} />
                    {t("regulated_ack")}
                  </label>
                  {err("regulatedAck")}
                </div>
              )}
              <div>
                <label htmlFor="of-description" className="block text-sm font-semibold">{t("f_description")} *</label>
                <textarea {...field("description")} dir="auto" rows={6} maxLength={LIMITS.description} className="field mt-1.5 py-2.5" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={t("f_description_ph")} />
                <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground"><span id="of-description-help">{t("desc_help")}</span>{count(f.description.length, LIMITS.description)}</div>
                {err("description")}
                <AiAssist field="description" value={f.description} onApply={(v) => set("description", v)} context={aiContext} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">{t("f_price_model")} *</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PRICE_MODELS.map((m) => (
                    <Choice key={m.v} name="priceModel" checked={f.priceModel === m.v} onChange={() => set("priceModel", m.v)} title={t(m.label)} desc={t(m.desc)} />
                  ))}
                </div>
              </fieldset>
              {f.priceModel === "quote" ? (
                <p className="rounded-2xl border bg-surface-sunken p-4 text-sm text-muted-foreground">{t("quote_note")}</p>
              ) : (
                <div>
                  <label htmlFor="of-price" className="block text-sm font-semibold">{t("f_price")} *</label>
                  <div dir="ltr" className="relative mt-1.5 max-w-xs rtl:ms-auto rtl:me-0">
                    <input {...field("price")} inputMode="decimal" dir="ltr" className="field pe-14 text-start" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="50" />
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm font-semibold text-muted-foreground">TND</span>
                  </div>
                  <p id="of-price-help" className="mt-1 text-xs text-muted-foreground">{t("price_help")}</p>
                  {err("price")}
                </div>
              )}
              <div>
                <label htmlFor="of-duration" className="block text-sm font-semibold">{t("f_duration")} <span className="font-normal text-muted-foreground">({t("optional")})</span></label>
                <input {...field("duration")} dir="auto" maxLength={LIMITS.duration} className="field mt-1.5" value={f.duration ?? ""} onChange={(e) => set("duration", e.target.value)} placeholder={t("f_duration_ph")} />
                {err("duration")}
              </div>
              <div>
                <label htmlFor="of-deliverables" className="block text-sm font-semibold">{t("f_deliverables")} <span className="font-normal text-muted-foreground">({t("optional")})</span></label>
                <textarea {...field("deliverables")} dir="auto" rows={4} maxLength={LIMITS.deliverables} className="field mt-1.5 py-2.5" value={f.deliverables ?? ""} onChange={(e) => set("deliverables", e.target.value)} />
                <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground"><span id="of-deliverables-help">{t("f_deliverables_help")}</span>{count((f.deliverables ?? "").length, LIMITS.deliverables)}</div>
                {err("deliverables")}
                <AiAssist field="deliverables" value={f.deliverables ?? ""} onApply={(v) => set("deliverables", v)} context={aiContext} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">{t("f_mode")} *</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Choice name="mode" checked={f.mode !== "remote"} onChange={() => set("mode", "inperson")} title={t("mode_inperson")} icon={<User className="size-4" aria-hidden />} />
                  <Choice name="mode" checked={f.mode === "remote"} onChange={() => set("mode", "remote")} title={t("mode_remote")} icon={<Wifi className="size-4" aria-hidden />} />
                </div>
              </fieldset>
              <div>
                <label htmlFor="of-city" className="block text-sm font-semibold">{t("f_city")} *</label>
                <select {...field("city")} className="field mt-1.5 max-w-xs" value={f.city} onChange={(e) => set("city", e.target.value)}>
                  <option value="">{t("f_choose")}</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <p id="of-city-help" className="mt-1 text-xs text-muted-foreground">{t("f_city_help")}</p>
                {err("city")}
              </div>
              <div>
                <p className="text-sm font-semibold">{t("f_image")} <span className="font-normal text-muted-foreground">({t("optional")})</span></p>
                <div className="mt-2">
                  <PhotoPicker image={photoUrl} onPick={(fl) => { setFile(fl); setRemoved(!fl); }}
                    presets={{ groups: coverGroups(f.category), size: COVER_SIZE, pick: "preset_cover_pick", title: "preset_cover_title", description: "preset_cover_desc" }} />
                </div>
                {!photoUrl && <p className="mt-2 text-xs text-muted-foreground">{t("photo_hint_none")}</p>}
              </div>
            </>
          )}

          {step === 3 && (
            <Review f={f} photoUrl={photoUrl} changes={changes} provider={profile.data?.display_name || "—"} profession={profile.data?.title ?? undefined} lang={lang} onEdit={(i, k) => { setStep(i); setFocusField(k); }} />
          )}
        </div>

        {submitErr && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{submitErr}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          {step > 0 ? <button type="button" onClick={() => goTo(step - 1)} className="btn btn-outline">{t("back")}</button> : <span />}
          {step < 3 ? (
            <button type="submit" className="btn btn-lime">{t("next")}</button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {draftOrEditOfDraft && (
                <button type="button" disabled={!!busy} onClick={() => submit("draft")} aria-busy={busy === "draft"} className="btn btn-outline">{busy === "draft" ? t("loading") : t("save_draft")}</button>
              )}
              <button type="submit" disabled={!!busy} aria-busy={busy === "published"} className="btn btn-lime">
                {busy === "published" ? t("loading") : t(original && original.row.status === "published" ? "save_changes" : "publish")}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/** Launch moment: the real Explore card of the service just published, plus its public link to share. Drafts get none (not public). */
function LaunchKit({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useQuery(serviceQuery(id));
  return (
    <div className="mx-auto mt-8 grid max-w-2xl gap-6 text-start sm:grid-cols-[15rem_1fr] sm:items-center">
      <div>{q.data ? <ServiceCard s={q.data} /> : <ServiceCardSkeleton />}</div>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("launch_d")}</p>
        <ShareKit full path={servicePath(id)} title={q.data?.title ?? "SkillLoop"} text="share_my_service_text" label="share_this" />
      </div>
    </div>
  );
}

function Stepper({ step, reached, onGo }: { step: number; reached: number; onGo: (i: number) => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("step_x_of", { n: step + 1, total: OFFER_STEPS.length })}>
      <ol className="flex items-center gap-2">
        {OFFER_STEPS.map((_, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          const dot = (
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${state === "todo" ? "bg-muted text-muted-foreground" : state === "current" ? "bg-lime text-lime-foreground ring-4 ring-lime/25" : "bg-ink text-ink-foreground dark:bg-sea dark:text-ink"}`}>
              {state === "done" ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
          );
          const label = <span className={`hidden truncate text-sm sm:inline ${state === "current" ? "font-semibold" : "text-muted-foreground"}`}>{t(STEP_LABEL[i]!)}</span>;
          return (
            <li key={i} className="flex min-w-0 flex-1 items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
              {i <= reached && i !== step ? (
                <button type="button" onClick={() => onGo(i)} className="flex min-h-11 min-w-0 items-center gap-2 rounded-full pe-2 hover:opacity-80">
                  {dot}{label}<span className="sr-only sm:hidden">{t(STEP_LABEL[i]!)}</span>
                </button>
              ) : (
                <span className="flex min-h-11 min-w-0 items-center gap-2">{dot}{label}<span className="sr-only sm:hidden">{t(STEP_LABEL[i]!)}</span></span>
              )}
              {i < OFFER_STEPS.length - 1 && <span aria-hidden className={`h-0.5 flex-1 rounded-full ${i < step ? "bg-sea" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground sm:hidden">{t("step_x_of", { n: step + 1, total: OFFER_STEPS.length })} · <span className="font-semibold text-foreground">{t(STEP_LABEL[step]!)}</span></p>
    </nav>
  );
}

function Choice({ name, checked, onChange, title, desc, icon }: { name: string; checked: boolean; onChange: () => void; title: string; desc?: string; icon?: ReactNode }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${checked ? "border-sea bg-sea-soft" : "hover:bg-muted"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-sea" />
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 font-semibold ${checked ? "text-sea" : ""}`}>{icon}{title}</span>
        {desc && <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>}
      </span>
    </label>
  );
}

function Review({ f, photoUrl, changes, provider, profession, lang, onEdit }: {
  f: OfferForm; photoUrl: string | null; changes: Set<ReviewGroup>; provider: string; profession: string | undefined; lang: string;
  onEdit: (step: number, field: OfferField | null) => void;
}) {
  const { t } = useI18n();
  const cat = CATEGORIES.find((c) => c.id === f.category);
  const price = parsePrice(f.price);
  const quote = f.priceModel === "quote";
  const preview: Service = {
    id: "preview", title: f.title.trim() || "—", description: f.description, category: (f.category || "other") as CategoryId,
    price: price ?? 0, unit: UNIT[f.priceModel ?? "fixed"] ?? "pm_fixed", city: f.city, remote: f.mode === "remote", image: photoUrl ?? "",
    provider, profession, delivery: "—", languages: "—", publishedDaysAgo: 0, quoteOnly: quote, hasPhoto: !!photoUrl, priceMissing: !quote && !price,
  };
  const fmt = new Intl.NumberFormat(lang === "ar" ? "ar-TN" : lang, { maximumFractionDigits: 3 });
  const items = (f.deliverables ?? "").split("\n").map((x) => x.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);
  const rows: { g: ReviewGroup; step: number; field: OfferField | null; label: TKey; value: ReactNode }[] = [
    { g: "title", step: 0, field: "title", label: "f_title", value: <span dir="auto">{f.title}</span> },
    { g: "category", step: 0, field: "category", label: "f_category", value: cat ? t(cat.key) : "—" },
    { g: "description", step: 0, field: "description", label: "f_description", value: <span dir="auto" className="line-clamp-5 whitespace-pre-line">{f.description}</span> },
    { g: "price", step: 1, field: "price", label: "f_price", value: quote ? t("pm_quote") : `${price !== null ? fmt.format(price) : "—"} TND · ${t(UNIT[f.priceModel ?? "fixed"] ?? "pm_fixed")}` },
    ...((f.duration ?? "").trim() ? [{ g: "duration" as const, step: 1, field: "duration" as const, label: "f_duration" as const, value: <span dir="auto">{f.duration}</span> }] : []),
    ...(items.length ? [{ g: "deliverables" as const, step: 1, field: "deliverables" as const, label: "f_deliverables" as const, value: <ul className="list-disc space-y-0.5 ps-5">{items.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul> }] : []),
    { g: "place", step: 2, field: "city", label: "f_city", value: `${f.city || "—"} · ${t(f.mode === "remote" ? "mode_remote" : "mode_inperson")}` },
    { g: "photo", step: 2, field: null, label: "f_image", value: photoUrl ? t("photo_current") : <span className="text-muted-foreground">{t("photo_hint_none")}</span> },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <div>
        <p className="eyebrow mb-2">{t("card_preview")}</p>
        {/* Exactly the Explore card, made inert so it can't navigate to a service that doesn't exist yet. */}
        <div inert className="pointer-events-none"><ServiceCard s={preview} /></div>
      </div>
      <dl className="divide-y">
        {rows.map((r) => (
          <div key={r.g} className="flex items-start justify-between gap-3 py-3 first:pt-0">
            <div className="min-w-0">
              <dt className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                {t(r.label)}
                {changes.has(r.g) && <span className="tag tag-new">{t("changed")}</span>}
              </dt>
              <dd className="mt-0.5 break-words text-sm font-medium">{r.value}</dd>
            </div>
            <button type="button" onClick={() => onEdit(r.step, r.field)} aria-label={t("edit_section_aria", { s: t(r.label) })}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </dl>
    </div>
  );
}
