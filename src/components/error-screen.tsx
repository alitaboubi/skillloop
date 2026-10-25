import { useEffect } from "react";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useI18nSafe } from "@/lib/i18n";

/**
 * Root error page. It can render outside the language provider (when the app shell itself fails),
 * so it uses useI18nSafe: the current language if available, else the saved one, else French.
 */
export function ErrorScreen({ error, reset }: ErrorComponentProps) {
  const { t, lang } = useI18nSafe();
  // Errors go to the browser console only (no third-party reporting).
  useEffect(() => { console.error(error); }, [error]);
  const router = useRouter();

  return (
    <div lang={lang === "ar" ? "ar-TN" : lang} dir={lang === "ar" ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("ep_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("ep_desc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => { router.invalidate(); reset(); }} className="btn btn-ink">{t("retry")}</button>
          <a href="/" className="btn btn-outline">{t("nf_home")}</a>
        </div>
      </div>
    </div>
  );
}
