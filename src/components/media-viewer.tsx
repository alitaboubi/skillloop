import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** `video` (Pro "portfolio en mouvement"): played in the lightbox, `src` is its poster frame. */
export type MediaItem = { src: string; alt: string; caption?: string | null | undefined; description?: string | null | undefined; video?: string | undefined };

/** Image with a stable frame, skeleton while loading and a clear error state. */
export function FramedImage({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => setState("loading"), [src]);
  return (
    <span className={`media-frame ${className}`}>
      {state === "loading" && <span className="skeleton-block absolute inset-0 rounded-none" aria-hidden />}
      {state === "error" ? (
        <span className="media-empty"><ImageOff className="size-7" aria-hidden /><span className="text-sm">{t("sd_photo_error")}</span></span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={`media-img ${state === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}

/** Accessible lightbox: Esc / close button, arrow keys between items, focus returns to the trigger (Radix). */
export function MediaViewer({ items, index, onIndex, open, onOpenChange }: { items: MediaItem[]; index: number; onIndex: (i: number) => void; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useI18n();
  const item = items[index];
  const many = items.length > 1;
  const rtl = lang === "ar";
  const go = (d: number) => onIndex((index + d + items.length) % items.length);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) opener.current = document.activeElement as HTMLElement | null; }, [open]);
  if (!item) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="viewer-overlay" />
        <DialogPrimitive.Content
          className="viewer-content"
          onCloseAutoFocus={(e) => { if (opener.current?.isConnected) { e.preventDefault(); opener.current.focus(); } }}
          onKeyDown={(e) => {
            if (!many) return;
            if (e.key === "ArrowRight") go(rtl ? -1 : 1);
            if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <DialogPrimitive.Title dir="auto" className="min-w-0 truncate text-sm font-semibold">
              {item.caption || item.alt}
            </DialogPrimitive.Title>
            <div className="flex shrink-0 items-center gap-2">
              {many && <span className="text-xs text-navy-muted" aria-live="polite">{t("sd_count", { i: index + 1, n: items.length })}</span>}
              <DialogPrimitive.Close className="viewer-btn" aria-label={t("sd_close_viewer")}><X className="size-5" aria-hidden /></DialogPrimitive.Close>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-16">
            {item.video ? (
              // Opened by the visitor, so it may start playing — except under reduced motion. Controls always shown.
              <video key={item.video} src={item.video} poster={item.src} controls playsInline aria-label={item.alt} className="viewer-img"
                autoPlay={typeof window !== "undefined" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches} />
            ) : (
              <img key={item.src} src={item.src} alt={item.alt} className="viewer-img" />
            )}
            {many && (
              <>
                <button type="button" onClick={() => go(-1)} className="viewer-btn absolute start-2 top-1/2 -translate-y-1/2" aria-label={t("sd_prev")}><ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden /></button>
                <button type="button" onClick={() => go(1)} className="viewer-btn absolute end-2 top-1/2 -translate-y-1/2" aria-label={t("sd_next")}><ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden /></button>
              </>
            )}
          </div>
          {item.description ? (
            <DialogPrimitive.Description dir="auto" className="mx-auto max-w-2xl px-4 pb-5 text-center text-sm text-navy-muted">{item.description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{item.alt}</DialogPrimitive.Description>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Small "enlarge" hint shown on clickable media. */
export function EnlargeHint() {
  return <span className="media-hint" aria-hidden><Maximize2 className="size-4" /></span>;
}

/**
 * Public profile photo: framed portrait (card mat + clay ring) that opens the lightbox when there is a photo.
 * Without a photo it is the initial-letter fallback in the same frame (not clickable).
 */
export function ProfilePhoto({ src, name }: { src?: string | undefined; name: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  if (!src)
    return <span className="profile-photo" aria-hidden><span className="grid size-full place-items-center rounded-full bg-clay-soft text-4xl font-bold text-clay-strong">{initial}</span></span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="profile-photo profile-photo-btn" aria-label={t("pp_open_photo", { n: name })}>
        <img src={src} alt="" width={128} height={128} className="size-full rounded-full object-cover" />
        <span className="profile-photo-hint" aria-hidden><Maximize2 className="size-3.5" /></span>
      </button>
      <MediaViewer items={[{ src, alt: t("pp_photo_alt", { n: name }), caption: name }]} index={0} onIndex={() => {}} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Profile photo or an intentional initial-letter fallback. */
export function Avatar({ src, name, size = "md" }: { src?: string | undefined; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "size-24 text-3xl" : size === "sm" ? "size-10 text-sm" : "size-14 text-lg";
  return src
    ? <img src={src} alt="" width={96} height={96} className={`${cls} avatar-ring shrink-0 rounded-full object-cover`} />
    : <span className={`${cls} avatar-ring grid shrink-0 place-items-center rounded-full bg-clay-soft font-bold text-clay-strong`} aria-hidden>{(name.trim()[0] ?? "?").toUpperCase()}</span>;
}
