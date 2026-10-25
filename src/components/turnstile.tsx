import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { TURNSTILE_SITE_KEY, loadTurnstile } from "@/lib/turnstile";

export type TurnstileHandle = { reset: () => void };

/** Turnstile widget; renders nothing when no site key is configured (feature off). */
export const Turnstile = forwardRef<TurnstileHandle, { action: "login" | "signup" | "reset"; onToken: (token: string | null) => void }>(
  function Turnstile({ action, onToken }, ref) {
    const { t, lang } = useI18n();
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const api = useRef<Awaited<ReturnType<typeof loadTurnstile>> | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const tokenCb = useRef(onToken);
    tokenCb.current = onToken;

    useImperativeHandle(ref, () => ({
      reset: () => { if (widget.current && api.current) api.current.reset(widget.current); tokenCb.current(null); },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY || !box.current) return;
      let cancelled = false;
      setFailed(false);
      loadTurnstile().then((loaded) => {
        if (cancelled || !box.current) return;
        api.current = loaded;
        widget.current = loaded.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "auto",
          language: lang,
          callback: (tok: string) => tokenCb.current(tok),
          "expired-callback": () => tokenCb.current(null),
          "error-callback": () => { tokenCb.current(null); setFailed(true); },
        });
      }, () => { if (!cancelled) setFailed(true); });
      return () => {
        cancelled = true;
        if (widget.current && api.current) api.current.remove(widget.current);
        widget.current = null;
      };
    }, [action, lang, attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    if (!TURNSTILE_SITE_KEY) return null;
    return (
      <div>
        <div ref={box} className="flex min-h-[65px] justify-center" />
        {failed && (
          <p role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-sm text-destructive">
            {t("captcha_unavailable")}
            <button type="button" onClick={retry} className="font-semibold underline underline-offset-4">{t("retry")}</button>
          </p>
        )}
      </div>
    );
  },
);
