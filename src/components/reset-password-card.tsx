import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-card";
import { supabase } from "@/integrations/supabase/client";
import { parseAuthHashError, passwordUpdateErrorKey } from "@/lib/auth-url";

type Phase = "checking" | "ready" | "invalid" | "done";

/**
 * Set a new password from a recovery email link. Shows the form only with a recovery/signed-in session;
 * an expired, already-used or superseded link gets a clear message and a way to request a new one.
 */
export function ResetPassword() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("checking");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase reports a rejected link in the hash (e.g. otp_expired): never offer a form that cannot work.
    if (parseAuthHashError(window.location.hash)) { setPhase("invalid"); return; }
    let settled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) { settled = true; setPhase((p) => (p === "done" ? p : "ready")); }
    });
    // getSession resolves after the client has processed the link in the URL.
    supabase.auth.getSession().then(({ data: d }) => {
      if (!settled) setPhase((p) => (p === "checking" ? (d.session ? "ready" : "invalid") : p));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const pwOk = pw.length >= 8;
  return (
    <AuthShell title={t("reset_title")}>
      {phase === "checking" && <p role="status" className="mt-6 text-sm text-muted-foreground">{t("loading")}</p>}

      {phase === "invalid" && (
        <div role="alert" className="mt-6 space-y-4">
          <div className="rounded-xl bg-destructive/10 p-4 text-sm">
            <p className="font-semibold text-destructive">{t("reset_link_invalid_t")}</p>
            <p className="mt-1 text-muted-foreground">{t("reset_link_invalid_d")}</p>
          </div>
          <Link to="/forgot-password" className="btn btn-lime w-full">{t("reset_request_new")}</Link>
        </div>
      )}

      {(phase === "ready" || phase === "done") && (
        <form noValidate className="mt-6 space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!pwOk) return setErr(t("err_password"));
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) {
            const key = passwordUpdateErrorKey(error);
            if (key === "reset_link_invalid_t") { setPhase("invalid"); return; }
            return setErr(t(key));
          }
          setErr("");
          setPw("");
          setPhase("done");
        }}>
          <div>
            <label htmlFor="reset-pw" className="block text-sm font-semibold">{t("password")}</label>
            <div dir="ltr" className="relative mt-1.5">
              <input id="reset-pw" type={show ? "text" : "password"} dir="ltr" className="field pe-12 text-start" value={pw} disabled={phase === "done"}
                onChange={(e) => { setPw(e.target.value); if (err) setErr(""); }} autoComplete="new-password"
                aria-invalid={!!err} aria-describedby={["reset-rule", err ? "reset-err" : ""].filter(Boolean).join(" ")} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={t(show ? "hide_password" : "show_password")}
                className="absolute inset-y-0 end-1 my-auto grid size-10 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            <p id="reset-rule" aria-live="polite" className={`mt-1 flex items-center gap-1.5 text-xs ${pwOk ? "text-success" : "text-muted-foreground"}`}>
              {pwOk ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}{t("pw_rule_8")}
            </p>
            {err && <p id="reset-err" role="alert" className="mt-1 text-sm text-destructive">{err}</p>}
          </div>
          {phase === "ready" && <button disabled={busy} aria-busy={busy} className="btn btn-lime w-full">{busy ? t("loading") : t("update_password")}</button>}
          {phase === "done" && (
            <p role="status" className="rounded-xl bg-sea-soft p-3 text-center text-sm font-semibold text-sea">
              {t("password_updated")} <Link to="/dashboard" className="underline">{t("my_account")}</Link>
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
}
