import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clapperboard, ExternalLink, Facebook, Instagram, Megaphone, MessageCircle, MessageCircleHeart, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n, type TKey } from "@/lib/i18n";
import type { FeatureSheet } from "@/lib/notifications";
import { SUPPORT_WHATSAPP, openSupport, whatsappUrl } from "@/lib/support";
import { OPEN_FEATURE_EVENT, platformsOf, type Platform } from "@/lib/social-features";

/*
 * The video sheet the bell opens for « Nouvelle vidéo » / « Vous êtes à l'affiche »: watch on Instagram or Facebook, then
 * « je veux ma vidéo » (support chat, message ready) or « choisir pour mon profil ». Kept apart from social-features.tsx
 * (admin + dashboard UI) because it is mounted in the root of every page.
 */

const PLATFORM: Record<Platform, { icon: LucideIcon; label: TKey }> = {
  instagram: { icon: Instagram, label: "c_instagram" },
  facebook: { icon: Facebook, label: "c_facebook" },
};

function useDate() {
  const { lang } = useI18n();
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { day: "numeric", month: "long", year: "numeric" });
  return (iso: string) => fmt.format(new Date(iso));
}

/** One big choice: icon, label, a short line, the « leaves the site » mark for external links. */
function Option({ icon: Icon, label, sub, href, onClick, tone }: {
  icon: LucideIcon; label: string; sub: string; href?: string; onClick?: () => void; tone: "sea" | "clay";
}) {
  const inner = (
    <>
      <span aria-hidden className={`${tone === "sea" ? "icon-well-sea" : "icon-well-clay"} size-11`}><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block font-bold">{label}</span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
      </span>
      {href ? <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <ArrowRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:border-sea hover:bg-sea-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea";
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>{inner}</a>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function FeatureSheetBody({ sheet, close, onWant }: { sheet: FeatureSheet; close: () => void; onWant: (draft: string) => void }) {
  const { t } = useI18n();
  const date = useDate();
  const platforms = platformsOf({ instagramUrl: sheet.instagramUrl, facebookUrl: sheet.facebookUrl });
  const draft = t("sf_sheet_draft", { title: sheet.title });
  return (
    <>
      <div className="relative overflow-hidden rounded-t-[inherit] bg-ink-hero px-5 pb-5 pt-10 text-ink-foreground sm:px-6">
        <div className="flex items-end gap-4">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-2xl bg-lime text-lime-foreground">
            {sheet.mode === "you" ? <Clapperboard className="size-7" /> : <Megaphone className="size-7" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-lime">{t(sheet.mode === "you" ? "nt_feature_you_t" : "nt_feature_new_t")}</p>
            <DialogTitle asChild><h2 dir="auto" className="mt-0.5 text-xl font-bold leading-tight">{sheet.title}</h2></DialogTitle>
            {sheet.publishedAt && <p className="mt-1 text-sm text-navy-muted"><time dateTime={sheet.publishedAt}>{t("sf_published_on", { d: date(sheet.publishedAt) })}</time></p>}
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <section aria-labelledby="fs-watch" className="space-y-2.5">
          <h3 id="fs-watch" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("sf_sheet_watch")}</h3>
          <DialogDescription className="sr-only">{t("sf_sheet_watch")}</DialogDescription>
          {platforms.map((p) => (
            <Option key={p} tone="sea" icon={PLATFORM[p].icon} label={t("sf_watch_on", { p: t(PLATFORM[p].label) })}
              sub={t(p === "instagram" ? "sf_sheet_ig_sub" : "sf_sheet_fb_sub")} href={(p === "instagram" ? sheet.instagramUrl : sheet.facebookUrl)!} />
          ))}
        </section>
        {sheet.mode === "you" ? (
          <section aria-labelledby="fs-you" className="space-y-2.5">
            <h3 id="fs-you" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("sf_sheet_you_t")}</h3>
            <Link to="/dashboard" hash="features" onClick={close}
              className="btn btn-lime w-full">{t("sf_sheet_manage")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
          </section>
        ) : (
          <section aria-labelledby="fs-want" className="space-y-2.5 rounded-2xl bg-clay-soft p-4">
            <h3 id="fs-want" className="font-bold text-clay-strong">{t("sf_sheet_want_t")}</h3>
            <p className="text-sm">{t("sf_sheet_want_d")}</p>
            <button type="button" onClick={() => onWant(draft)} className="btn btn-lime w-full"><MessageCircleHeart className="size-4" aria-hidden />{t("sf_sheet_want_cta")}</button>
            {SUPPORT_WHATSAPP && (
              <a href={whatsappUrl(SUPPORT_WHATSAPP, draft)} target="_blank" rel="noopener noreferrer" onClick={close}
                className="btn btn-outline w-full bg-card"><MessageCircle className="size-4" aria-hidden />{t("sf_sheet_want_wa")}</a>
            )}
          </section>
        )}
      </div>
    </>
  );
}

/**
 * The video sheet, mounted ONCE in the root (it must outlive the bell's popover, which closes as it opens). Opened with
 * openFeatureSheet(): watch on Instagram / Facebook, then « je veux ma vidéo » (support chat, message ready) for an
 * announcement, or « choisir pour mon profil » for the people in the video.
 */
export function FeatureSheetHost() {
  const [sheet, setSheet] = useState<FeatureSheet | null>(null);
  const [open, setOpen] = useState(false);
  // « Je veux ma vidéo »: the support panel (another Radix dialog) may only open once this one has fully closed. Opened
  // earlier, this dialog's focus return (after its exit animation) lands outside the panel, which then dismisses itself.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<FeatureSheet>).detail;
      if (!d || (!d.instagramUrl && !d.facebookUrl)) return;
      setSheet(d);
      // Next frame: the bell's popover finishes closing first (two Radix layers switching in one frame can lock the page).
      requestAnimationFrame(() => setOpen(true));
    };
    window.addEventListener(OPEN_FEATURE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEATURE_EVENT, onOpen);
  }, []);
  if (!sheet) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] max-w-none gap-0 overflow-y-auto rounded-3xl p-0 [&>button]:text-ink-foreground"
        onCloseAutoFocus={(e) => {
          const draft = pending.current;
          if (draft === null) return;
          pending.current = null;
          e.preventDefault(); // the support panel takes the focus instead
          openSupport("chat", draft);
        }}>
        <FeatureSheetBody sheet={sheet} close={() => setOpen(false)} onWant={(d) => { pending.current = d; setOpen(false); }} />
      </DialogContent>
    </Dialog>
  );
}
