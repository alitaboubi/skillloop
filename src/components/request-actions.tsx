import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { STATUS_KEY } from "@/lib/requests-db";
import { CONFIRM_STATUS } from "@/lib/request-timeline";

type Next = "accepted" | "declined" | "cancelled";

/**
 * Accept / decline (provider) or cancel (client) a pending request. Every change is final in the database,
 * so each one asks first, inline, with "keep as is" focused.
 */
export function RequestActions({ req, userId }: { req: { id: string; status: string; provider_id: string; client_id: string }; userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<Next | null>(null);
  const [busy, setBusy] = useState(false);
  if (req.status !== "pending") return null;
  const isProvider = req.provider_id === userId;

  const commit = async (status: Next) => {
    setBusy(true);
    const { error } = await supabase.from("requests").update({ status }).eq("id", req.id);
    setBusy(false);
    setConfirming(null);
    if (error) { toast.error(t("err_generic")); return; }
    toast.success(t(STATUS_KEY[status]));
    qc.invalidateQueries({ queryKey: ["requests"] });
  };

  if (confirming)
    return (
      <div role="group" aria-label={t(CONFIRM_STATUS[confirming])} className="w-full space-y-2 rounded-2xl border bg-surface-sunken p-3 sm:w-auto sm:max-w-sm">
        <p className="text-sm font-semibold">{t(CONFIRM_STATUS[confirming])}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" autoFocus disabled={busy} onClick={() => setConfirming(null)} className="btn btn-outline min-h-10">{t("keep_as_is")}</button>
          <button type="button" disabled={busy} onClick={() => commit(confirming)}
            className={`btn min-h-10 ${confirming === "accepted" ? "btn-lime" : "btn-danger"}`}>
            {busy ? t("loading") : t("confirm_yes")}
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-wrap gap-2">
      {isProvider ? (
        <>
          <button type="button" onClick={() => setConfirming("accepted")} className="btn btn-lime">{t("accept")}</button>
          <button type="button" onClick={() => setConfirming("declined")} className="btn btn-outline">{t("decline")}</button>
        </>
      ) : req.client_id === userId ? (
        <button type="button" onClick={() => setConfirming("cancelled")} className="btn btn-outline">{t("cancel")}</button>
      ) : null}
    </div>
  );
}
