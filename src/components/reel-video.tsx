import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Facebook, Instagram, Play, type LucideIcon } from "lucide-react";
import { PointerField } from "@/components/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { REEL_SECONDS, REEL_SRC, SOCIAL_LINKS, type SocialKind } from "@/lib/social";
import reelPoster from "@/assets/home/reel-poster.webp";

const SOCIAL_ICON: Record<SocialKind, LucideIcon> = { instagram: Instagram, facebook: Facebook };
const SOCIAL_LABEL = { instagram: "c_instagram", facebook: "c_facebook" } as const;

/**
 * The presentation reel in a phone frame. Never plays by itself on a page (poster + controls, nothing downloaded
 * before a tap); `autoPlay` only after the visitor asked for it (the header dialog), and not under reduced motion.
 */
export function ReelPlayer({ autoPlay = false, className = "" }: { autoPlay?: boolean; className?: string }) {
  const { t } = useI18n();
  const play = autoPlay && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div className={`reel-phone ${className}`}>
      <video
        src={REEL_SRC}
        poster={reelPoster}
        width={720}
        height={1280}
        controls
        playsInline
        preload={play ? "auto" : "none"}
        autoPlay={play}
        aria-label={t("reel_video_label")}
        className="reel-video"
      />
    </div>
  );
}

/** The reel dialog. Owned by a component that stays mounted while it is open (see ReelButton `onOpen`). */
export function ReelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-auto max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto p-4 pt-12 sm:p-5 sm:pt-12">
        <DialogTitle className="text-base">{t("reel_title", { n: REEL_SECONDS })}</DialogTitle>
        <DialogDescription className="sr-only">{t("reel_sub")}</DialogDescription>
        {open && <ReelPlayer autoPlay className="reel-phone-dialog" />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Header entry ("Vidéo"): opens the reel in a dialog from any page. With `onOpen`, the caller owns the dialog
 * (ReelDialog): the mobile menu unmounts this button when it closes, and a dialog unmounted while opening leaves the
 * page locked (scroll lock + pointer-events: none on body), so nothing — not even the logo — could be tapped.
 */
export function ReelButton({ mobile = false, onOpen }: { mobile?: boolean; onOpen?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => (onOpen ? onOpen() : setOpen(true))}
        className={mobile ? "flex items-center gap-2 py-3 text-base text-navy-foreground" : "search-trigger"}
        title={t("reel_open")}
      >
        <span className={mobile ? "grid size-7 place-items-center rounded-full bg-lime text-lime-foreground" : "grid size-6 place-items-center rounded-full bg-lime text-lime-foreground"}>
          <Play className="size-3 fill-current rtl:-scale-x-100" aria-hidden />
        </span>
        {mobile && <span>{t("reel_nav")}</span>}
        <span className="sr-only">{mobile ? " — " : ""}{t("reel_open")}</span>
      </button>
      {!onOpen && <ReelDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

/** SkillLoop's Instagram + Facebook. `tone="dark"` on ink surfaces (footer, menu, video band). */
export function SocialLinks({ tone = "dark", withHandle = false }: { tone?: "dark" | "light"; withHandle?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {SOCIAL_LINKS.map((s) => {
        const Icon = SOCIAL_ICON[s.kind];
        return (
          <li key={s.kind}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={withHandle ? undefined : `${t(SOCIAL_LABEL[s.kind])} — SkillLoop`}
              className={`social-link ${tone === "dark" ? "social-link-dark" : "social-link-light"} ${withHandle ? "px-3.5" : "size-11 justify-center"}`}
            >
              <Icon className="size-[18px]" aria-hidden />
              {withHandle && <span dir="ltr" className="text-sm font-semibold">{s.handle}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Home: the reel next to the 4 moments it shows, on the ink band, with the way to follow SkillLoop. */
export function HomeReel() {
  const { t } = useI18n();
  const steps = ["reel_step_1", "reel_step_2", "reel_step_3", "reel_step_4"] as const;
  return (
    <section id="video" aria-labelledby="reel-h" className="relative scroll-mt-20 overflow-hidden bg-ink-hero">
      <PointerField />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <div className="min-w-0">
          <p className="eyebrow">{t("reel_kicker")}</p>
          <h2 id="reel-h" className="display-title mt-2 text-3xl text-ink-foreground md:text-5xl">{t("reel_h", { n: REEL_SECONDS })}</h2>
          <p className="mt-4 max-w-xl text-lg text-navy-muted">{t("reel_sub")}</p>
          <ol className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {steps.map((k, i) => (
              <li key={k} className="sd-rise flex items-center gap-3 rounded-2xl border border-navy-foreground/10 bg-navy-foreground/5 p-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-lime-foreground">{i + 1}</span>
                <span className="font-semibold text-ink-foreground">{t(k)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/explore" className="btn btn-lime">{t("explore_services")}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></Link>
          </div>
          <div className="mt-8 border-t border-navy-foreground/10 pt-6">
            <p className="text-sm font-bold text-ink-foreground">{t("reel_follow")}</p>
            <div className="mt-3"><SocialLinks withHandle /></div>
          </div>
        </div>
        <div className="sd-rise mx-auto w-full max-w-[18rem] lg:mx-0">
          <ReelPlayer />
        </div>
      </div>
    </section>
  );
}
