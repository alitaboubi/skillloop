/**
 * Cloudflare Turnstile (bot protection) on login, signup and password recovery.
 *
 * ── Configuration ───────────────────────────────────────────────────────────────────────────────────
 * VITE_TURNSTILE_SITE_KEY = the PUBLIC site key (safe in the client bundle). Unset → feature off:
 * no widget, no script loaded, forms behave exactly as before.
 *
 * ── Where the backend verification plugs in ─────────────────────────────────────────────────────────
 * The token is sent to Supabase Auth as `captchaToken` (signInWithPassword / signUp in
 * src/components/auth-card.tsx, resetPasswordForEmail in src/routes/forgot-password.tsx). Supabase verifies it with Cloudflare itself once
 *   Supabase dashboard → Authentication → Bot and Abuse Protection → Enable CAPTCHA protection,
 *   provider "Turnstile", secret key = the Turnstile SECRET key
 * is turned on (self-hosted equivalent: [auth.captcha] enabled/provider/secret in supabase/config.toml).
 * The secret key lives only there — never in this repo, .env or the client bundle.
 *
 * Rollout order: 1) set the site key here and deploy (tokens are sent and ignored while Supabase CAPTCHA is
 * off); 2) enable CAPTCHA in Supabase. Enabling it first would reject every password login and signup.
 * Supabase CAPTCHA also covers password recovery: /forgot-password has the widget too (action "reset").
 * Google sign-in is not affected.
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────
 */
export function readSiteKey(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
export const TURNSTILE_SITE_KEY = readSiteKey(import.meta.env["VITE_TURNSTILE_SITE_KEY"]);

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

/** Loads the Turnstile script once (only ever called when a site key is configured). A failed load can be retried. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => { s.remove(); loading = null; reject(new Error("turnstile load failed")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Supabase auth options carrying the token, or nothing when the feature is off / no token yet. */
export function captchaOptions(token: string | null): { captchaToken: string } | Record<string, never> {
  return token ? { captchaToken: token } : {};
}
