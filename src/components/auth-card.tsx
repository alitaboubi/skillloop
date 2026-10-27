import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, Check, Circle, Eye, EyeOff, MailCheck, MapPin, Repeat2, Search, Rocket } from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { TURNSTILE_SITE_KEY, captchaOptions } from "@/lib/turnstile";
import { basePostAuthPath, readOfferDraft, takePostAuthTarget } from "@/lib/offer-draft";
import { authContext, markOAuthReturn, peekReturnTo, takeReturnTo } from "@/lib/return-to";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Logo, LanguageSwitcher } from "@/components/site";
import { BrandBackdrop, PointerField } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

/** Identity & trust story (desktop side panel). Static art: no ambient motion on auth pages. */
function AuthStory() {
  const { t } = useI18n();
  const points = [
    { icon: MapPin, text: t("au_t1") },
    { icon: BadgeCheck, text: t("au_t2") },
    { icon: Repeat2, text: t("au_t3") },
  ];
  return (
    <aside className="bg-ink-hero relative hidden overflow-hidden text-ink-foreground lg:order-first lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
      <BrandBackdrop variant="intro" />
      <PointerField />
      <div className="relative"><Logo light /></div>
      <div className="relative max-w-md">
        <p className="display-title text-4xl xl:text-5xl">{t("au_vision")}</p>
        <ul className="mt-10 space-y-5">
          {points.map((p) => (
            <li key={p.text} className="flex items-center gap-4 text-lg">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-foreground/10 text-lime"><p.icon className="size-5" aria-hidden /></span>
              {p.text}
            </li>
          ))}
        </ul>
      </div>
      <Link to="/explore" className="relative inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-ink-foreground underline decoration-lime decoration-2 underline-offset-8 hover:text-lime">
        {t("au_discover")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </aside>
  );
}

/**
 * Split-screen shell for every auth page (login, signup, forgot, reset): the form comes first in the document
 * (first on phones and for screen readers); on wide screens the identity panel sits on the start side.
 */
export function AuthShell({ title, sub, children, legal = true }: { title: string; sub?: string; children: ReactNode; legal?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] bg-background lg:grid-cols-2">
      <div className="flex items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-md">
          {/* Phones: identity collapses to a compact header — logo + one trust line. */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="lg:hidden">
              <Logo />
              <p className="mt-2 text-sm text-muted-foreground">{t("au_t2")}</p>
            </div>
            <div className="ms-auto"><LanguageSwitcher /></div>
          </div>
          <h1 className="display-title text-[2rem] sm:text-4xl">{title}</h1>
          {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
          {children}
          {legal && (
            <p className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
              {t("auth_legal")}{" "}
              <Link to="/terms" className="link-sea">{t("terms_title")}</Link>{" · "}
              <Link to="/privacy" className="link-sea">{t("privacy_title")}</Link>
            </p>
          )}
        </div>
      </div>
      <AuthStory />
    </div>
  );
}

type Role = "client" | "pro";

function FieldError({ id, text }: { id: string; text?: string | undefined }) {
  return text ? <p id={id} className="mt-1.5 text-sm font-medium text-destructive">{text}</p> : null;
}

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const uid = useId();
  const isLogin = mode === "login";
  const [role, setRole] = useState<Role>("client");
  // Back to the page that asked for sign-in (if any); after a sign-up, else the chosen role's first step.
  const go = () => {
    if (!isLogin) {
      const back = takeReturnTo();
      navigate({ href: back ?? (role === "pro" ? "/offer" : "/explore") });
      if (back) toast.success(t("welcome_back_resume"));
      return;
    }
    const { path, resumed } = takePostAuthTarget();
    navigate({ href: path });
    if (resumed) toast.success(t("welcome_back_resume"));
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; email?: string; password?: string; terms?: string; form?: string }>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);
  // Why you're here (request / publish / messages), read after mount from the remembered page.
  const [why, setWhy] = useState<ReturnType<typeof authContext>>(null);
  useEffect(() => {
    const w = authContext(peekReturnTo(), !!readOfferDraft());
    setWhy(w);
    if (w === "offer") setRole("pro");
  }, []);
  const pwOk = password.length >= 8;
  const emailOk = (v: string) => /^\S+@\S+\.\S+$/.test(v);

  const submit = async () => {
    const e: typeof errs = {};
    if (!isLogin && name.trim().length < 2) e.name = t("err_required");
    if (!emailOk(email)) e.email = t("err_email");
    if (password.length < (isLogin ? 1 : 8)) e.password = isLogin ? t("err_required") : t("err_password");
    if (!isLogin && !terms) e.terms = t("au_err_terms");
    // Bot check only when Turnstile is configured; otherwise the form works exactly as before.
    if (TURNSTILE_SITE_KEY && !captcha && !Object.keys(e).length) e.form = t("captcha_needed");
    setErrs(e);
    setSent(false);
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
      else setSent(true);
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

  const clear = (k: keyof typeof errs) => setErrs((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  const roles: { k: Role; icon: typeof Search; title: string; desc: string }[] = [
    { k: "client", icon: Search, title: t("au_role_client_t"), desc: t("au_role_client_d") },
    { k: "pro", icon: Rocket, title: t("au_role_pro_t"), desc: t("au_role_pro_d") },
  ];

  if (sent)
    return (
      <AuthShell title={t("signup")} legal={false}>
        <div role="status" className="mt-6 space-y-4 rounded-2xl border bg-surface-sunken p-5">
          <p className="flex items-start gap-3 font-semibold"><MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />{t("check_email")}</p>
          <p className="text-muted-foreground">{t(role === "pro" ? "au_next_pro" : "au_next_client")}</p>
          <Link to={role === "pro" ? "/professionals" : "/explore"} className="btn btn-outline">{role === "pro" ? t("nav_pros") : t("au_next_client_btn")}</Link>
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title={isLogin ? t("welcome_back") : t("signup")} sub={isLogin ? t("login_sub") : t("create_sub")} legal={isLogin}>
      {why && <p role="note" className="mt-5 rounded-xl bg-sea-soft p-3 text-sm font-medium text-sea">{t(`auth_ctx_${why}_${isLogin ? "login" : "signup"}`)}</p>}
      <form noValidate className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {!isLogin && (
          <fieldset>
            <legend className="text-sm font-semibold">{t("au_role_label")}</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {roles.map((r) => (
                <label key={r.k} className={`flex min-h-12 cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${role === r.k ? "border-ink bg-surface-sunken dark:border-lime" : "hover:bg-surface-sunken"}`}>
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name={`${uid}-role`} value={r.k} checked={role === r.k} onChange={() => setRole(r.k)} className="size-4 accent-lime" />
                    <r.icon className="size-4" aria-hidden />{r.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{r.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {!isLogin && (
          <div>
            <label htmlFor={`${uid}-name`} className="block text-sm font-semibold">{t("full_name")}</label>
            <input id={`${uid}-name`} className="field mt-1.5 min-h-12" value={name} maxLength={80} autoComplete="name"
              onChange={(e) => { setName(e.target.value); clear("name"); }}
              aria-invalid={!!errs.name} aria-describedby={errs.name ? `${uid}-name-err` : undefined} />
            <FieldError id={`${uid}-name-err`} text={errs.name} />
          </div>
        )}
        <div>
          <label htmlFor={`${uid}-email`} className="block text-sm font-semibold">{t("email")}</label>
          <input id={`${uid}-email`} type="email" dir="ltr" inputMode="email" className="field mt-1.5 min-h-12 text-start" value={email} autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); clear("email"); }}
            onBlur={() => { if (email && !emailOk(email)) setErrs((x) => ({ ...x, email: t("err_email") })); }}
            aria-invalid={!!errs.email} aria-describedby={errs.email ? `${uid}-email-err` : undefined} />
          <FieldError id={`${uid}-email-err`} text={errs.email} />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="auth-pw" className="block text-sm font-semibold">{t("password")}</label>
            {isLogin && <Link to="/forgot-password" className="link-sea text-sm">{t("forgot")}</Link>}
          </div>
          <div dir="ltr" className="relative mt-1.5">
            <input id="auth-pw" type={showPw ? "text" : "password"} dir="ltr" className="field min-h-12 pe-12 text-start" value={password}
              onChange={(e) => { setPassword(e.target.value); clear("password"); }}
              autoComplete={isLogin ? "current-password" : "new-password"} aria-invalid={!!errs.password}
              aria-describedby={[isLogin ? "" : "pw-rule", errs.password ? "pw-err" : ""].filter(Boolean).join(" ") || undefined} />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={t(showPw ? "hide_password" : "show_password")}
              className="absolute inset-y-0 end-1 my-auto grid size-11 place-items-center rounded-full text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          {!isLogin && (
            <p id="pw-rule" aria-live="polite" className={`mt-1.5 flex items-center gap-1.5 text-sm ${pwOk ? "text-success" : "text-muted-foreground"}`}>
              {pwOk ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}{t("pw_rule_8")}
            </p>
          )}
          <FieldError id="pw-err" text={errs.password} />
        </div>
        {!isLogin && (
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); clear("terms"); }} className="mt-0.5 size-5 shrink-0 accent-lime"
                aria-invalid={!!errs.terms} aria-describedby={errs.terms ? `${uid}-terms-err` : undefined} />
              <span>{t("au_terms_ack")}</span>
            </label>
            <p className="ms-8 mt-1 text-sm">
              <Link to="/terms" className="link-sea">{t("terms_title")}</Link>{" · "}
              <Link to="/privacy" className="link-sea">{t("privacy_title")}</Link>
            </p>
            <FieldError id={`${uid}-terms-err`} text={errs.terms} />
          </div>
        )}
        <Turnstile ref={captchaRef} action={isLogin ? "login" : "signup"} onToken={(tok) => { setCaptcha(tok); if (tok) setErrs((e) => { if (e.form !== t("captcha_needed")) return e; const n = { ...e }; delete n.form; return n; }); }} />
        {errs.form && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{errs.form}</p>}
        <button disabled={busy} aria-busy={busy} className="btn btn-lime min-h-12 w-full">{busy ? t("loading") : isLogin ? t("login") : t("signup")}</button>
      </form>
      <p className="my-5 flex items-center gap-3 text-sm font-semibold text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{t("or_continue")}</p>
      <button type="button" onClick={google} className="btn btn-outline min-h-12 w-full">{t("google")}</button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? t("no_account") : t("have_account")}{" "}
        <Link to={isLogin ? "/signup" : "/login"} className="link-sea">{isLogin ? t("signup") : t("login")}</Link>
      </p>
    </AuthShell>
  );
}
