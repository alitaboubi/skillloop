import { useId, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ACCOUNT_DELETION_ENABLED, PHOTO_BUCKET, deleteMyAccount, type DeletionClient } from "@/lib/account-deletion";
import { clearOfferDraft, clearWizardDraft } from "@/lib/offer-draft";
import { clearReturnTo } from "@/lib/return-to";

const client: DeletionClient = {
  list: async (prefix) => {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).list(prefix, { limit: 1000 });
    return { data: data?.map((x) => ({ name: x.name, id: x.id ?? null })) ?? null, error };
  },
  remove: async (paths) => ({ error: (await supabase.storage.from(PHOTO_BUCKET).remove(paths)).error }),
  rpc: async () => ({ error: (await supabase.rpc("delete_my_account" as never)).error }),
};

/**
 * Settings → "Delete my account". Two explicit steps: open, then tick "I understand" and confirm (the confirmation
 * can't be skipped). Before the migration is applied (flag off) it explains how to ask for deletion instead.
 */
export function DeleteAccount({ userId }: { userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<"files" | "account" | null>(null);

  const run = async () => {
    setBusy(true);
    setFailed(null);
    const res = await deleteMyAccount(client, userId);
    if (!res.ok) { setBusy(false); setFailed(res.step); return; }
    // The sign-in account no longer exists on the server: only clear this browser's session and local data.
    await supabase.auth.signOut({ scope: "local" });
    qc.clear();
    clearOfferDraft();
    clearWizardDraft();
    clearReturnTo();
    navigate({ to: "/" });
    toast.success(t("da_done"));
  };

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-[1.25rem] border border-destructive/40 p-5 sm:p-6">
      <h2 id={`${id}-h`} className="flex items-center gap-2 text-lg font-bold"><TriangleAlert className="size-5 text-destructive" aria-hidden />{t("da_title")}</h2>
      {!ACCOUNT_DELETION_ENABLED ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("da_unavailable")} <Link to="/privacy" className="link-sea">{t("privacy_title")}</Link>
        </p>
      ) : !open ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t("da_intro")}</p>
          <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-4">{t("da_start")}</button>
        </>
      ) : (
        <div role="group" aria-labelledby={`${id}-h`} className="mt-3 space-y-3">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border bg-surface-sunken p-3">
              <p className="font-semibold">{t("da_deleted_h")}</p>
              <p className="mt-1 text-muted-foreground">{t("da_deleted_d")}</p>
            </div>
            <div className="rounded-xl border bg-surface-sunken p-3">
              <p className="font-semibold">{t("da_kept_h")}</p>
              <p className="mt-1 text-muted-foreground">{t("da_kept_d")}</p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-destructive" />
            {t("da_ack")}
          </label>
          {failed && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{t(failed === "files" ? "da_failed_files" : "da_failed")}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" autoFocus disabled={busy} onClick={() => { setOpen(false); setAck(false); setFailed(null); }} className="btn btn-outline">{t("cancel")}</button>
            <button type="button" disabled={!ack || busy} aria-busy={busy} onClick={run} className="btn btn-danger">{busy ? t("loading") : t("da_confirm")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
