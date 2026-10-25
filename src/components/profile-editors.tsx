import { useState } from "react";
import { limitMessage } from "@/lib/limits";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, ImageIcon, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { applyContactOps, deletePortfolioItem, savePortfolioItem, validatePortfolio } from "@/lib/marketplace-writes";
import { CONTACT_KINDS, contactOps, normalizeContact, type ContactDraft, type ContactKind, type ContactRow } from "@/lib/profile-contacts";
import { PhotoPicker } from "@/components/photo-picker";
import { EmptyState } from "@/components/states";
import { CONTACT_META } from "@/components/contact-meta";

export type PortfolioItem = { id: string; title: string; description: string | null; image_url: string; image?: string | undefined };

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
                <div className="aspect-[4/3] bg-muted">
                  {x.image ? <img src={x.image} alt={x.title} loading="lazy" className="size-full object-cover" /> : <span className="media-fallback"><ImageIcon className="size-8" aria-hidden /></span>}
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
      setBusy(true);
      const r = await savePortfolioItem(supabase, userId, { ...(item ? { id: item.id } : {}), title, description, previousImage: item?.image_url ?? null }, file);
      setBusy(false);
      // Inputs stay as typed on failure so nothing is lost.
      if (r.error !== null) { const lim = limitMessage(r.error); toast.error(lim ? t(lim.key, lim.vars) : t(r.error === "upload" ? "err_upload" : "err_generic")); return; }
      toast.success(t("portfolio_saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      onDone();
    }}>
      <div id={`pf-${fid}-image`} tabIndex={-1} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <p className="mb-2 text-sm font-semibold">{t("f_project_photo")} *</p>
        <PhotoPicker alt="f_project_photo" image={imageRemoved ? null : item?.image ?? null} onPick={(fl) => { setFile(fl); setImageRemoved(!fl); if (fl) clear("image"); }} />
        {err("image")}
      </div>
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
