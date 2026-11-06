import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { VITRINE_SRC } from "@/lib/social";
import vitrinePoster from "@/assets/home/vitrine-poster.webp";

/**
 * The « La vitrine » ad (marketing/reel-ep7, 16:9 cut) at the top of the home showcase. It behaves like a web ad: muted,
 * looping, and it only downloads and plays while it is on screen. Under reduced motion or Save-Data it never starts by
 * itself (poster + play button). Sound and play/pause stay in the visitor's hands.
 */
export function ShowcaseAd() {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [auto, setAuto] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const userPaused = useRef(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    setAuto(!reduce && !saveData);
  }, []);

  useEffect(() => {
    const el = box.current,
      v = video.current;
    if (!el || !v || !auto) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !userPaused.current) {
          v.preload = "auto";
          v.play().catch(() => {});
        } else if (!e?.isIntersecting) v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto]);

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      setStopped(false);
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      setStopped(true);
      v.pause();
    }
  }

  return (
    <div ref={box} className="sd-rise relative mx-auto mt-8 max-w-5xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-ink shadow-raised ring-1 ring-navy-foreground/10">
        <video
          ref={video}
          src={VITRINE_SRC}
          poster={vitrinePoster}
          width={1280}
          height={720}
          muted={muted}
          loop
          playsInline
          preload="none"
          aria-label={t("sc_ad_label")}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={toggle}
          className="block aspect-video w-full cursor-pointer object-cover"
        />
        {!playing && (!auto || stopped) && (
          <button
            type="button"
            onClick={toggle}
            aria-label={t("sc_ad_play")}
            className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-lime text-lime-foreground shadow-raised"
          >
            <Play className="size-6 fill-current rtl:-scale-x-100" aria-hidden />
          </button>
        )}
        <div dir="ltr" className="absolute bottom-3 end-3 flex gap-2">
          {playing && (
            <button
              type="button"
              onClick={toggle}
              aria-label={t("sc_ad_pause")}
              className="btn btn-ghost-dark size-10 rounded-full bg-ink/60 p-0 backdrop-blur"
            >
              <Pause className="size-4" aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-pressed={!muted}
            aria-label={t(muted ? "sc_ad_sound_on" : "sc_ad_sound_off")}
            onClick={() => {
              setMuted((m) => !m);
              if (video.current?.paused) toggle();
            }}
            className="btn btn-ghost-dark size-10 rounded-full bg-ink/60 p-0 backdrop-blur"
          >
            {muted ? (
              <VolumeX className="size-4" aria-hidden />
            ) : (
              <Volume2 className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
