import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-card";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { TURNSTILE_SITE_KEY, captchaOptions } from "@/lib/turnstile";

/** Password-recovery form (kept outside the route file so the route stays code-split). */
export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  return (
    <AuthShell title={t("forgot_title")} sub={t("forgot_sub")}>
      <form noValidate className="mt-6 space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t("err_email"));
        setErr("");
        setFormErr("");
        // Bot check only when Turnstile is configured; otherwise this works exactly as before.
        if (TURNSTILE_SITE_KEY && !captcha) return setFormErr(t("captcha_needed"));
        const token = captcha;
        if (token) captchaRef.current?.reset(); // single-use token
        setBusy(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password", ...captchaOptions(token) });
        setBusy(false);
        // Account existence is never revealed ("link sent" either way); only a refused bot check is reported.
        if (TURNSTILE_SITE_KEY && error?.code === "captcha_failed") { setSent(false); return setFormErr(t("captcha_failed")); }
        setSent(true);
      }}>
        <label className="block text-sm font-semibold">{t("email")}
          <input type="email" dir="ltr" className="field mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} />
          {err && <span className="mt-1 block text-sm text-destructive">{err}</span>}
        </label>
        <Turnstile ref={captchaRef} action="reset" onToken={(tok) => { setCaptcha(tok); if (tok) setFormErr(""); }} />
        {formErr && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{formErr}</p>}
        <button disabled={busy} aria-busy={busy} className="btn btn-lime w-full">{busy ? t("loading") : t("send_link")}</button>
        {sent && <p role="status" className="rounded-xl bg-sea-soft p-3 text-center text-sm font-semibold text-sea">{t("link_sent")}</p>}
      </form>
      <p className="mt-6 text-center text-sm"><Link to="/login" className="link-sea">{t("back")}</Link></p>
    </AuthShell>
  );
}
