import { useEffect, useId, useRef, useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, type TKey } from "@/lib/i18n";
import { absoluteUrl, whatsappShareUrl } from "@/lib/share";

/**
 * Copy link · Share (only where the browser supports it) · WhatsApp. `full` also shows the public link itself,
 * which is the fallback when copying is not allowed.
 */
export function ShareKit({ path, title, text, full = false, label, onShare }: { path: string; title: string; text: TKey; full?: boolean; label?: TKey; onShare?: () => void }) {
  const { t } = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  // Resolved after mount: the server doesn't know the origin, and navigator.share is browser-only.
  useEffect(() => {
    setUrl(absoluteUrl(path));
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [path]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share_copied"));
      onShare?.();
    } catch {
      input.current?.select();
      toast.error(t("share_copy_failed"));
    }
  };
  const share = async () => {
    try { await navigator.share({ title, text: t(text), url }); onShare?.(); } catch { /* dismissed by the user */ }
  };

  return (
    <div className="space-y-3">
      {full && (
        <div>
          <label htmlFor={`${id}-url`} className="text-xs font-semibold text-muted-foreground">{t("share_link_label")}</label>
          <input ref={input} id={`${id}-url`} readOnly dir="ltr" value={url} onFocus={(e) => e.currentTarget.select()} className="field mt-1 text-start text-sm" />
        </div>
      )}
      <div role="group" aria-label={t(label ?? "share_native")} className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} disabled={!url} className="btn btn-outline min-h-10"><Copy className="size-4" aria-hidden />{t("share_copy")}</button>
        {canShare && <button type="button" onClick={share} className="btn btn-outline min-h-10"><Share2 className="size-4" aria-hidden />{t("share_native")}</button>}
        {url && (
          <a href={whatsappShareUrl(t(text), url)} target="_blank" rel="noopener noreferrer" onClick={onShare} className="btn btn-outline min-h-10">
            <MessageCircle className="size-4" aria-hidden />{t("share_whatsapp")}
          </a>
        )}
      </div>
    </div>
  );
}
