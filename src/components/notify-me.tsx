import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { submitNotify, type NotifyInsert, type NotifyResult } from "@/lib/notify-me";

const insertRow: NotifyInsert = async (row) => {
  const { error } = await supabase.from("notify_requests" as never).insert(row as never);
  return { error };
};

/** Email capture for "Prévenez-moi" (see src/lib/notify-me.ts — rendered only when NOTIFY_ME_ENABLED). */
export function NotifyMe({ query, category, city, insert = insertRow }: { query?: string | undefined; category?: string | undefined; city?: string | undefined; insert?: NotifyInsert }) {
  const { t, lang } = useI18n();
  const id = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NotifyResult | null>(null);

  if (result === "ok")
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{t("nm_done", { email: email.trim() })}</span>
      </p>
    );

  return (
    <form
      noValidate
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await submitNotify(insert, { email, query, category, city, lang });
        setBusy(false);
        setResult(r);
      }}
    >
      <label htmlFor={`${id}-email`} className="block text-sm font-semibold">{t("nm_label")}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={`${id}-email`} type="email" dir="ltr" autoComplete="email" inputMode="email" value={email}
          onChange={(e) => { setEmail(e.target.value); if (result) setResult(null); }}
          aria-invalid={result === "invalid"} aria-describedby={`${id}-note${result ? ` ${id}-err` : ""}`}
          className="field min-h-12 flex-1 text-start" />
        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-lime min-h-12">{busy ? t("nm_sending") : t("nm_btn")}</button>
      </div>
      {result && (
        <p id={`${id}-err`} role="alert" className="text-sm font-medium text-destructive">
          {t(result === "invalid" ? "nm_err_email" : result === "limited" ? "nm_limited" : "nm_err")}
        </p>
      )}
      <p id={`${id}-note`} className="text-sm text-muted-foreground">
        {t("nm_privacy")} <Link to="/privacy" className="link-sea">{t("privacy_title")}</Link>
      </p>
    </form>
  );
}
