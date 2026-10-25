import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { TURNSTILE_SITE_KEY, captchaOptions } from "@/lib/turnstile";
import { basePostAuthPath, readOfferDraft, takePostAuthTarget } from "@/lib/offer-draft";
import { authContext, markOAuthReturn, peekReturnTo } from "@/lib/return-to";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Logo, LanguageSwitcher } from "@/components/site";
import { PointerField } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="bg-hero relative flex min-h-[80dvh] items-center overflow-hidden justify-center px-3 py-10 sm:px-4 sm:py-14">
      <PointerField />
      {/* Inner width stays ≥ 300px from a 360px phone up, so the Turnstile widget (300px) is never clipped. */}
      <div className="relative w-full max-w-md rounded-[1.25rem] bg-card p-4 shadow-raised sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitcher />
        </div>
        <h1 className="display-title mt-6 text-2xl sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>}
        {children}
        <p className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          {t("auth_legal")}{" "}
          <Link to="/terms" className="link-sea">{t("terms_title")}</Link>{" · "}
          <Link to="/privacy" className="link-sea">{t("privacy_title")}</Link>
        </p>
      </div>
    </div>
  );
}

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  // Back to the page that asked for sign-in (if any), else the default landing; one short line when resuming.
  const go = () => {
    const { path, resumed } = takePostAuthTarget();
    navigate({ href: path });
    if (resumed) toast.success(t("welcome_back_resume"));
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  // Why you're here (request / publish / messages), read after mount from the remembered page.
  const [why, setWhy] = useState<ReturnType<typeof authContext>>(null);
  useEffect(() => { setWhy(authContext(peekReturnTo(), !!readOfferDraft())); }, []);
  const isLogin = mode === "login";
  const pwOk = password.length >= 8;

  const submit = async () => {
    const e: typeof errs = {};
    if (!isLogin && name.trim().length < 2) e.name = t("err_required");
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = t("err_email");
    if (password.length < (isLogin ? 1 : 8)) e.password = isLogin ? t("err_required") : t("err_password");
    // Bot check only when Turnstile is configured; otherwise the form works exactly as before.
    if (TURNSTILE_SITE_KEY && !captcha && !Object.keys(e).length) e.form = t("captcha_needed");
    setErrs(e);
    setMsg("");
    if (Object.keys(e).length) return;
    setBusy(true);
    const token = captcha;
    // A Turnstile token is single-use: get a fresh one for any next attempt.
    if (token) captchaRef.current?.reset();
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaOptions(token) });
      setBusy(false);
      // A refused bot check is not a wrong password (CAPTCHA is enforced in Supabase Auth).
      if (error) return setErrs({ form: t(error.code === "captcha_failed" ? "captcha_failed" : "err_login") });
      go();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + basePostAuthPath(), data: { full_name: name.trim() }, ...captchaOptions(token) },
      });
      setBusy(false);
      if (error) return setErrs({ form: error.code === "captcha_failed" ? t("captcha_failed") : error.message || t("err_generic") });
      if (data.session) go();
      else setMsg(t("check_email"));
    }
  };

  const google = async () => {
    // Supabase's own Google provider. Google returns to Supabase, which redirects back here to the remembered
    // page (allowed by the project's Redirect URLs). <ReturnAfterOAuth /> stays as the safety net.
    markOAuthReturn();
    const back = peekReturnTo() ?? basePostAuthPath();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + back } });
    if (error) setErrs({ form: t("err_generic") });
  };

  return (
    <AuthShell title={isLogin ? t("welcome_back") : t("signup")} sub={isLogin ? t("login_sub") : t("create_sub")}>
      {why && <p role="note" className="mt-4 rounded-xl bg-sea-soft p-3 text-sm font-medium text-sea">{t(`auth_ctx_${why}_${isLogin ? "login" : "signup"}`)}</p>}
      <button type="button" onClick={google} className="btn btn-outline mt-6 w-full">{t("google")}</button>
      <p className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{t("or_continue")}</p>
      <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!isLogin && (
          <label className="block text-sm font-semibold">{t("full_name")}
            <input className="field mt-1.5" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errs.name} />
            {errs.name && <span className="mt-1 block text-sm text-destructive">{errs.name}</span>}
          </label>
        )}
        <label className="block text-sm font-semibold">{t("email")}
          <input type="email" dir="ltr" className="field mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errs.email} />
          {errs.email && <span className="mt-1 block text-sm text-destructive">{errs.email}</span>}
        </label>
        <div>
          <label htmlFor="auth-pw" className="block text-sm font-semibold">{t("password")}</label>
          <div dir="ltr" className="relative mt-1.5">
            <input id="auth-pw" type={showPw ? "text" : "password"} dir="ltr" className="field pe-12 text-start" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"} aria-invalid={!!errs.password}
              aria-describedby={[isLogin ? "" : "pw-rule", errs.password ? "pw-err" : ""].filter(Boolean).join(" ") || undefined} />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={t(showPw ? "hide_password" : "show_password")}
              className="absolute inset-y-0 end-1 my-auto grid size-10 place-items-center rounded-full text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          {!isLogin && (
            <p id="pw-rule" aria-live="polite" className={`mt-1 flex items-center gap-1.5 text-xs ${pwOk ? "text-success" : "text-muted-foreground"}`}>
              {pwOk ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}{t("pw_rule_8")}
            </p>
          )}
          {errs.password && <span id="pw-err" className="mt-1 block text-sm text-destructive">{errs.password}</span>}
        </div>
        <Turnstile ref={captchaRef} action={isLogin ? "login" : "signup"} onToken={(tok) => { setCaptcha(tok); if (tok) setErrs((e) => { if (e.form !== t("captcha_needed")) return e; const n = { ...e }; delete n.form; return n; }); }} />
        {isLogin && <p className="text-end text-sm"><Link to="/forgot-password" className="link-sea">{t("forgot")}</Link></p>}
        {errs.form && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{errs.form}</p>}
        <button disabled={busy} aria-busy={busy} className="btn btn-lime w-full">{busy ? t("loading") : isLogin ? t("login") : t("signup")}</button>
        {msg && <p role="status" className="rounded-xl bg-sea-soft p-3 text-center text-sm font-semibold text-sea">{msg}</p>}
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? t("no_account") : t("have_account")}{" "}
        <Link to={isLogin ? "/signup" : "/login"} className="link-sea">{isLogin ? t("signup") : t("login")}</Link>
      </p>
    </AuthShell>
  );
}
