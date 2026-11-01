import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Car, CheckCircle2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  REQUEST_PROGRESS_ENABLED, STEP_ACTION_KEY, STEP_CLIENT_KEY, STEP_COLUMN, STEP_KEY,
  fromLocalInput, isValidAppointment, latestStep, nextStep, toLocalInput, type Progress, type ProgressStep,
} from "@/lib/request-progress";

type Req = Progress & { id: string; status: string; provider_id: string };
const STEP_ICON = { on_the_way: Car, started: Wrench, completed: CheckCircle2 } as const;

/**
 * Suivi d'intervention for an accepted request: the appointment and the pro's latest step, for both sides. The pro sets
 * the appointment and records each step (asked first: steps are final in the database).
 */
export function RequestProgress({ req, userId, proName, remote }: { req: Req; userId: string; proName: string; remote: boolean }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const [confirming, setConfirming] = useState<ProgressStep | null>(null);
  const [busy, setBusy] = useState(false);
  if (!REQUEST_PROGRESS_ENABLED || req.status !== "accepted") return null;

  const isPro = req.provider_id === userId;
  const done = !!req.completed_at;
  const step = latestStep(req);
  const next = isPro ? nextStep(req, remote) : null;
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { dateStyle: "full", timeStyle: "short" });
  const short = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { timeStyle: "short" });

  const save = async (patch: Record<string, string | null>, ok: string) => {
    setBusy(true);
    // Columns of the pending migration are not in the generated types yet.
    const { error } = await supabase.from("requests").update(patch as never).eq("id", req.id);
    setBusy(false);
    if (error) { toast.error(t(error.message.includes("progress_invalid") ? "pg_appt_invalid" : "err_generic")); return false; }
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["requests"] });
    return true;
  };

  const saveAppointment = async () => {
    const iso = fromLocalInput(when);
    if (!isValidAppointment(iso)) { toast.error(t("pg_appt_invalid")); return; }
    if (await save({ scheduled_for: iso }, t("pg_appt_saved"))) setEditing(false);
  };

  const record = async (s: ProgressStep) => {
    // The database stamps its own time; the value sent only marks the step as recorded.
    if (await save({ [STEP_COLUMN[s]]: new Date().toISOString() }, t(STEP_KEY[s]))) setConfirming(null);
  };

  const StepIcon = step ? STEP_ICON[step] : CalendarClock;
  const at = step ? req[STEP_COLUMN[step]] : null;

  return (
    <section aria-label={t("pg_title")} className="space-y-3 border-b px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <CalendarClock className="size-4 shrink-0 text-sea" aria-hidden />
          {req.scheduled_for
            ? <span><span className="font-semibold">{t("pg_appt")}</span> · <time dateTime={req.scheduled_for}>{fmt.format(new Date(req.scheduled_for))}</time></span>
            : <span className="text-muted-foreground">{t(isPro ? "pg_appt_none_pro" : "pg_appt_none")}</span>}
        </p>
        {isPro && !done && !editing && (
          <button type="button" onClick={() => { setWhen(toLocalInput(req.scheduled_for)); setEditing(true); }} className="btn btn-outline min-h-10">
            {t(req.scheduled_for ? "pg_appt_change" : "pg_appt_set")}
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-surface-sunken p-3">
          <label className="grid gap-1 text-sm font-semibold">
            {t("pg_appt")}
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} min={toLocalInput(new Date().toISOString())}
              className="min-h-10 rounded-xl border bg-card px-3 text-base font-normal" />
          </label>
          <button type="button" disabled={busy || !when} onClick={saveAppointment} className="btn btn-lime min-h-10">{busy ? t("loading") : t("pg_appt_save")}</button>
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className="btn btn-outline min-h-10">{t("keep_as_is")}</button>
        </div>
      )}

      {step && (
        <p role="status" className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${done ? "bg-success/10" : "bg-lime/15"}`}>
          <StepIcon className="size-4 shrink-0" aria-hidden />
          <span>{isPro ? t(STEP_KEY[step]) : t(STEP_CLIENT_KEY[step], { name: proName })}</span>
          {at && <time dateTime={at} className="ms-auto text-xs font-normal text-muted-foreground">{short.format(new Date(at))}</time>}
        </p>
      )}
      {!step && !isPro && <p className="text-sm text-muted-foreground">{t("pg_client_wait", { name: proName })}</p>}

      {next && (confirming ? (
        <div role="group" aria-label={t("pg_confirm")} className="space-y-2 rounded-2xl border bg-surface-sunken p-3">
          <p className="text-sm font-semibold">{t(STEP_ACTION_KEY[confirming])} — {t("pg_confirm")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" autoFocus disabled={busy} onClick={() => setConfirming(null)} className="btn btn-outline min-h-10">{t("keep_as_is")}</button>
            <button type="button" disabled={busy} onClick={() => record(confirming)} className="btn btn-lime min-h-10">{busy ? t("loading") : t("confirm_yes")}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(next)} className="btn btn-lime min-h-10">
          {(() => { const I = STEP_ICON[next]; return <I className="size-4" aria-hidden />; })()}
          {t(STEP_ACTION_KEY[next])}
        </button>
      ))}
      <p className="text-xs text-muted-foreground">{t("pg_note")}</p>
    </section>
  );
}
