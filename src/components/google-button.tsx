import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { GOOGLE_CLIENT_ID, loadGis, makeNonce } from "@/lib/google-signin";

/**
 * "Continue with Google". With VITE_GOOGLE_CLIENT_ID: Google's own button (popup on this site's origin), which
 * hands back an ID token + the raw nonce for supabase.auth.signInWithIdToken. Without it, or when Google's
 * script cannot load (blocked, offline): our plain button and the Supabase redirect flow (`onRedirect`).
 */
export function GoogleButton({ onToken, onRedirect }: { onToken: (idToken: string, nonce: string) => void; onRedirect: () => void }) {
  const { t, lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !box.current) return;
    let cancelled = false;
    Promise.all([loadGis(), makeNonce()]).then(([gis, nonce]) => {
      const el = box.current;
      if (cancelled || !el) return;
      gis.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        callback: (r) => { if (r.credential) cb.current(r.credential, nonce.raw); },
        nonce: nonce.hashed,
        ux_mode: "popup",
        auto_select: false,
        itp_support: true,
        use_fedcm_for_button: true,
      });
      el.replaceChildren();
      gis.renderButton(el, {
        type: "standard",
        theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
        // Google caps the button at 400 px.
        width: Math.min(400, Math.max(200, Math.round(el.getBoundingClientRect().width) || 400)),
        locale: lang,
      });
    }, () => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [lang]);

  if (!GOOGLE_CLIENT_ID || failed)
    return <button type="button" onClick={onRedirect} className="btn btn-outline min-h-12 w-full">{t("google")}</button>;
  return <div ref={box} aria-label={t("google")} className="flex min-h-12 w-full justify-center" />;
}
