import { useState } from "react";
import { limitMessage } from "@/lib/limits";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, ImageIcon, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { applyContactOps, deletePortfolioItem, savePortfolioItem, saveProfessionalDetails, validatePortfolio } from "@/lib/marketplace-writes";
import { COMMITMENTS, COMMITMENT_KEYS, METHOD_STEPS, METHOD_STEP_MAX, WARRANTY_MAX_DAYS, readCarnet, validateCarnet, writeCarnet, type CarnetDraft, type Commitment } from "@/lib/carnet";
import { BEFORE_AFTER_ENABLED } from "@/lib/before-after";
import { profileQuery } from "@/lib/profiles-db";
import type { TKey } from "@/lib/i18n";
import { CONTACT_KINDS, contactOps, normalizeContact, type ContactDraft, type ContactKind, type ContactRow } from "@/lib/profile-contacts";
import { PhotoPicker } from "@/components/photo-picker";
import { EmptyState } from "@/components/states";
import { CONTACT_META } from "@/components/contact-meta";

export type PortfolioItem = {
  id: string; title: string; description: string | null; image_url: string; image?: string | undefined;
  before_image_url?: string | null | undefined; before?: string | undefined;
};

/* ---------- Carnet: method + commitments ---------- */

const STEP_PH: TKey[] = ["carnet_step_ph1", "carnet_step_ph2", "carnet_step_ph3"];

/**
 * "Mon carnet" (Phase 2): up to three method steps and commitments from a fixed list, saved into
 * professional_details (merged into the freshly loaded details so other settings are never overwritten).
 */
export function CarnetEditor({ userId, details }: { userId: string; details: unknown }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const saved = readCarnet(details);
  const [d, setD] = useState<CarnetDraft>(() => ({
    method: Array.from({ length: METHOD_STEPS }, (_, i) => saved.method[i] ?? ""),
    commitments: saved.commitments,
    warrantyDays: saved.warrantyDays ? String(saved.warrantyDays) : "",
  }));
  const [errors, setErrors] = useState<ReturnType<typeof validateCarnet>>({});
  const [busy, setBusy] = useState(false);
  const toggle = (c: Commitment) => {
    setD((cur) => ({ ...cur, commitments: cur.commitments.includes(c) ? cur.commitments.filter((x) => x !== c) : [...cur.commitments, c] }));
    if (c === "warranty") setErrors(({ warranty: _w, ...rest }) => rest);
  };

  return (
    <form id="carnet" noValidate aria-busy={busy} aria-labelledby="cn-title" className="max-w-2xl scroll-mt-24 space-y-6 panel p-6" onSubmit={async (e) => {
      e.preventDefault();
      const v = validateCarnet(d);
      setErrors(v);
      if (v.method) { document.getElementById("cn-step-0")?.focus(); return; }
      if (v.warranty) { document.getElementById("cn-days")?.focus(); return; }
      setBusy(true);
      // Merge into the latest stored details (another tab or the settings form may have changed them).
      const fresh = await qc.fetchQuery({ ...profileQuery(userId), staleTime: 0 }).catch(() => null);
      const error = await saveProfessionalDetails(supabase, userId, writeCarnet(fresh?.professional_details ?? details, d));
      setBusy(false);
      if (error) { toast.error(t("err_generic")); return; }
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    }}>
      <div>
        <h2 id="cn-title" className="text-lg font-bold">{t("carnet_title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("carnet_intro")}</p>
      </div>
      <fieldset aria-describedby="cn-method-help">
        <legend className="text-sm font-semibold">{t("carnet_method")}</legend>
        <p id="cn-method-help" className="text-sm text-muted-foreground">{t("carnet_method_help")}</p>
        <ol className="mt-3 space-y-3">
          {d.method.map((step, i) => (
            <li key={i}>
              <label htmlFor={`cn-step-${i}`} className="block text-sm font-semibold text-muted-foreground">{t("carnet_step", { n: i + 1 })}</label>
              <input id={`cn-step-${i}`} dir="auto" maxLength={METHOD_STEP_MAX} className="field mt-1.5" value={step} placeholder={t(STEP_PH[i]!)}
                onChange={(e) => { const v = e.target.value; setD((cur) => ({ ...cur, method: cur.method.map((x, j) => (j === i ? v : x)) })); }}
                aria-invalid={!!errors.method} aria-describedby={errors.method ? "cn-method-err" : undefined} />
            </li>
          ))}
        </ol>
        {errors.method && <p id="cn-method-err" className="mt-1 text-sm text-destructive">{t(errors.method.key, { n: errors.method.n ?? "" })}</p>}
      </fieldset>
      <fieldset aria-describedby="cn-cm-help">
        <legend className="text-sm font-semibold">{t("carnet_commitments")}</legend>
        <p id="cn-cm-help" className="text-sm text-muted-foreground">{t("carnet_commitments_help")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {COMMITMENTS.map((c) => (
            <label key={c} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${d.commitments.includes(c) ? "border-sea bg-sea-soft font-semibold text-sea" : "hover:bg-muted"}`}>
              <input type="checkbox" className="size-4 shrink-0 accent-sea" checked={d.commitments.includes(c)} onChange={() => toggle(c)} />
              {t(COMMITMENT_KEYS[c])}
            </label>
          ))}
        </div>
        {d.commitments.includes("warranty") && (
          <div className="mt-3 max-w-xs">
            <label htmlFor="cn-days" className="block text-sm font-semibold">{t("cm_days_label")}</label>
            <input id="cn-days" type="number" inputMode="numeric" min={1} max={WARRANTY_MAX_DAYS} dir="ltr" className="field mt-1.5" value={d.warrantyDays}
              onChange={(e) => { const v = e.target.value; setD((cur) => ({ ...cur, warrantyDays: v })); setErrors(({ warranty: _w, ...rest }) => rest); }}
              aria-invalid={!!errors.warranty} aria-describedby={errors.warranty ? "cn-days-err" : undefined} />
            {errors.warranty && <p id="cn-days-err" className="mt-1 text-sm text-destructive">{t(errors.warranty.key, { n: errors.warranty.n ?? "" })}</p>}
          </div>
        )}
      </fieldset>
      <button disabled={busy} aria-busy={busy} className="btn btn-lime">{busy ? t("loading") : t("save")}</button>
    </form>
  );
}

/* ---------- Portfolio ---------- */

export function PortfolioEditor({ userId, items }: { userId: string; items: PortfolioItem[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null); // item id, "new" or null
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (item: PortfolioItem) => {
    setRemoving(item.id);
    const error = await deletePortfolioItem(supabase, item);
    setRemoving(null);
    setConfirming(null);
    if (error) { toast.error(t("err_generic")); return; }
    toast.success(t("portfolio_removed"));
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  };
  const done = () => setEditing(null);

  return (
    <section id="portfolio" aria-labelledby="pe-title" className="max-w-2xl scroll-mt-24 panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-md">
          <h2 id="pe-title" className="text-lg font-bold">{t("sd_portfolio")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("portfolio_intro")}</p>
        </div>
        {items.length > 0 && editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className="btn btn-outline min-h-10"><Plus className="size-4" aria-hidden />{t("portfolio_add")}</button>
        )}
      </div>

      {editing === "new" && <div className="mt-5"><PortfolioForm userId={userId} onDone={done} /></div>}

      {items.length === 0 && editing !== "new" ? (
        <div className="mt-5">
          <EmptyState icon={ImageIcon} title={t("db_no_portfolio")} sub={t("db_no_portfolio_sub")}
            action={<button type="button" onClick={() => setEditing("new")} className="btn btn-lime"><Plus className="size-4" aria-hidden />{t("portfolio_add")}</button>} />
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {items.map((x) =>
            editing === x.id ? (
              <li key={x.id} className="sm:col-span-2"><PortfolioForm userId={userId} item={x} onDone={done} /></li>
            ) : (
              <li key={x.id} className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-border">
                <div className="relative aspect-[4/3] bg-muted">
                  {x.image ? <img src={x.image} alt={x.title} loading="lazy" className="size-full object-cover" /> : <span className="media-fallback"><ImageIcon className="size-8" aria-hidden /></span>}
                  {x.before && <span className="tag tag-ink absolute start-2 top-2">{t("ba_before")} / {t("ba_after")}</span>}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p dir="auto" className="break-words font-semibold">{x.title}</p>
                  {x.description && <p dir="auto" className="line-clamp-2 break-words text-sm text-muted-foreground">{x.description}</p>}
                  {confirming === x.id ? (
                    <div role="group" aria-label={t("portfolio_remove")} className="mt-auto space-y-2 pt-3">
                      <p dir="auto" className="text-sm font-semibold">{t("portfolio_remove_confirm", { t: x.title })}</p>
                      <div className="flex gap-2">
                        <button type="button" autoFocus onClick={() => setConfirming(null)} className="btn btn-outline min-h-10 flex-1">{t("cancel")}</button>
                        <button type="button" disabled={removing === x.id} onClick={() => remove(x)} className="btn btn-danger min-h-10 flex-1">{removing === x.id ? t("loading") : t("portfolio_remove")}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2 pt-3">
                      <button type="button" onClick={() => { setConfirming(null); setEditing(x.id); }} className="btn btn-outline min-h-10 flex-1"><Pencil className="size-4" aria-hidden />{t("portfolio_edit")}</button>
                      <button type="button" onClick={() => setConfirming(x.id)} className="btn btn-outline min-h-10 flex-1 hover:border-destructive hover:text-destructive"><Trash2 className="size-4" aria-hidden />{t("portfolio_remove")}</button>
                    </div>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {items.length > 1 && <p className="mt-4 text-xs text-muted-foreground">{t("portfolio_order_note")}</p>}
    </section>
  );
}

function PortfolioForm({ userId, item, onDone }: { userId: string; item?: PortfolioItem; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforeRemoved, setBeforeRemoved] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentErr, setConsentErr] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validatePortfolio>>({});
  const [busy, setBusy] = useState(false);
  const fid = item?.id ?? "new";
  const clear = (k: keyof typeof errors) => setErrors((c) => { const n = { ...c }; delete n[k]; return n; });
  const err = (k: keyof typeof errors) => errors[k] && <p id={`pf-${fid}-${k}-err`} className="mt-1 text-sm text-destructive">{t(errors[k]!.key, { n: errors[k]!.n ?? "" })}</p>;

  return (
    <form noValidate aria-busy={busy} className="space-y-4 rounded-2xl border border-sea/30 bg-sea-soft/40 p-4" onSubmit={async (e) => {
      e.preventDefault();
      const v = validatePortfolio({ title, description, hasImage: !!file || (!!item && !imageRemoved) });
      setErrors(v);
      const first = (Object.keys(v) as (keyof typeof v)[])[0];
      if (first) { document.getElementById(`pf-${fid}-${first}`)?.focus(); return; }
      // A new "before" photo is only published with the pro's consent statement.
      if (BEFORE_AFTER_ENABLED && beforeFile && !consent) { setConsentErr(true); document.getElementById(`pf-${fid}-consent`)?.focus(); return; }
      setBusy(true);
      const before = BEFORE_AFTER_ENABLED ? { file: beforeFile, remove: beforeRemoved, previous: item?.before_image_url ?? null, consent } : undefined;
      const r = await savePortfolioItem(supabase, userId, { ...(item ? { id: item.id } : {}), title, description, previousImage: item?.image_url ?? null }, file, before);
      setBusy(false);
      // Inputs stay as typed on failure so nothing is lost.
      if (r.error !== null) { const lim = limitMessage(r.error); toast.error(lim ? t(lim.key, lim.vars) : t(r.error === "upload" ? "err_upload" : r.error === "consent" ? "ba_err_consent" : "err_generic")); return; }
      toast.success(t("portfolio_saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      onDone();
    }}>
      <div id={`pf-${fid}-image`} tabIndex={-1} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <p className="mb-2 text-sm font-semibold">{t("f_project_photo")} *</p>
        <PhotoPicker alt="f_project_photo" image={imageRemoved ? null : item?.image ?? null} onPick={(fl) => { setFile(fl); setImageRemoved(!fl); if (fl) clear("image"); }} />
        {err("image")}
      </div>
      {BEFORE_AFTER_ENABLED && (
        <div className="space-y-3 rounded-xl border bg-card p-3">
          <div>
            <p className="text-sm font-semibold">{t("ba_before_photo")}</p>
            <p className="mb-2 text-sm text-muted-foreground">{t("ba_before_help")}</p>
            <PhotoPicker alt="ba_before_photo" image={beforeRemoved ? null : item?.before ?? null} onPick={(fl) => { setBeforeFile(fl); setBeforeRemoved(!fl); if (!fl) setConsentErr(false); }} />
          </div>
          {beforeFile && (
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input id={`pf-${fid}-consent`} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-sea" checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setConsentErr(false); }}
                  aria-invalid={consentErr} aria-describedby={consentErr ? `pf-${fid}-consent-err` : undefined} />
                {t("ba_consent")}
              </label>
              {consentErr && <p id={`pf-${fid}-consent-err`} className="mt-1 text-sm text-destructive">{t("ba_err_consent")}</p>}
            </div>
          )}
        </div>
      )}
      <div>
        <label htmlFor={`pf-${fid}-title`} className="block text-sm font-semibold">{t("f_project_title")} *</label>
        <input id={`pf-${fid}-title`} autoFocus dir="auto" maxLength={120} className="field mt-1.5" value={title}
          onChange={(e) => { setTitle(e.target.value); clear("title"); }}
          aria-invalid={!!errors.title} aria-describedby={errors.title ? `pf-${fid}-title-err` : undefined} />
        {err("title")}
      </div>
      <div>
        <label htmlFor={`pf-${fid}-description`} className="block text-sm font-semibold">{t("f_project_desc")}</label>
        <textarea id={`pf-${fid}-description`} dir="auto" rows={3} maxLength={1000} className="field mt-1.5 py-2.5" value={description}
          onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} aria-describedby={errors.description ? `pf-${fid}-description-err` : undefined} />
        <p aria-hidden className="mt-1 text-end text-xs tabular-nums text-muted-foreground">{t("char_count", { n: description.length, max: 1000 })}</p>
        {err("description")}
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} aria-busy={busy} className="btn btn-lime">{busy ? t("loading") : t("save")}</button>
        <button type="button" disabled={busy} onClick={onDone} className="btn btn-outline">{t("cancel")}</button>
      </div>
    </form>
  );
}

/* ---------- Public contacts ---------- */

export function ContactsEditor({ userId, saved }: { userId: string; saved: ContactRow[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<ContactKind, ContactDraft>>(() =>
    Object.fromEntries(CONTACT_KINDS.map((k) => {
      const row = saved.find((r) => r.kind === k);
      return [k, { value: row?.value ?? "", isPublic: row?.is_public ?? false }];
    })) as Record<ContactKind, ContactDraft>,
  );
  const [errors, setErrors] = useState<Partial<Record<ContactKind, "err_contact_phone" | "err_link" | "err_link_host">>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: ContactKind, patch: Partial<ContactDraft>) => {
    setDrafts((d) => ({ ...d, [k]: { ...d[k], ...patch } }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <form id="contacts" noValidate aria-busy={busy} aria-labelledby="ce-title" className="max-w-2xl scroll-mt-24 space-y-5 panel p-6" onSubmit={async (e) => {
      e.preventDefault();
      const next = { ...drafts };
      const errs: typeof errors = {};
      for (const k of CONTACT_KINDS) {
        const r = normalizeContact(k, drafts[k].value);
        if (r.error) errs[k] = r.error;
        else next[k] = { value: r.value, isPublic: r.value ? drafts[k].isPublic : false };
      }
      setErrors(errs);
      const first = CONTACT_KINDS.find((k) => errs[k]);
      if (first) { document.getElementById(`ce-${first}`)?.focus(); return; }
      setDrafts(next);
      setBusy(true);
      const failed = await applyContactOps(supabase, userId, contactOps(saved, next));
      // Wait for fresh rows so the next save diffs against what is really stored.
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      setBusy(false);
      if (failed) toast.error(t("contacts_partial_err")); else toast.success(t("saved"));
    }}>
      <div>
        <h2 id="ce-title" className="text-lg font-bold">{t("contacts_title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("contacts_intro")}</p>
      </div>
      <ul className="divide-y">
        {CONTACT_KINDS.map((k) => {
          const meta = CONTACT_META[k];
          const d = drafts[k];
          const phone = k === "phone" || k === "whatsapp";
          const empty = !d.value.trim();
          return (
            <li key={k} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[9rem_1fr] sm:items-start sm:gap-4">
              <label htmlFor={`ce-${k}`} className="flex items-center gap-2 pt-2.5 text-sm font-semibold">
                <meta.icon className="size-4 shrink-0 text-sea" aria-hidden />{t(meta.label)}
              </label>
              <div className="min-w-0">
                <input id={`ce-${k}`} dir="ltr" type={phone ? "tel" : "text"} inputMode={phone ? "tel" : "url"} autoComplete={k === "phone" ? "tel" : "off"}
                  autoCapitalize="none" spellCheck={false} maxLength={phone ? 20 : 500} placeholder={t(meta.ph)}
                  className="field text-start" value={d.value} onChange={(e) => set(k, { value: e.target.value })}
                  aria-invalid={!!errors[k]} aria-describedby={[empty ? "" : `ce-${k}-state`, errors[k] ? `ce-${k}-err` : ""].filter(Boolean).join(" ") || undefined} />
                {errors[k] && <p id={`ce-${k}-err`} className="mt-1 text-sm text-destructive">{t(errors[k]!)}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className={`inline-flex min-h-10 items-center gap-2 text-sm ${empty ? "text-muted-foreground" : "cursor-pointer"}`}>
                    <input type="checkbox" className="size-4 accent-sea" disabled={empty} checked={!empty && d.isPublic} onChange={(e) => set(k, { isPublic: e.target.checked })} />
                    {t("contact_public")}
                  </label>
                  {!empty && (
                    <span id={`ce-${k}-state`} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${d.isPublic ? "text-success" : "text-muted-foreground"}`}>
                      {d.isPublic ? <Eye className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                      {t(d.isPublic ? "contact_public_state" : "contact_private_state")}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button disabled={busy} aria-busy={busy} className="btn btn-lime">{busy ? t("loading") : t("save")}</button>
    </form>
  );
}
