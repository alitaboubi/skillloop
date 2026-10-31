import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PanelTop } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { limitMessage } from "@/lib/limits";
import { saveProfessionalDetails } from "@/lib/marketplace-writes";
import { BANNER_PRESETS, readBanner, writeBanner } from "@/lib/presets";
import { profileQuery } from "@/lib/profiles-db";
import { Avatar } from "./media-viewer";

/**
 * Picks the wide banner of the public profile (/pros/$id). Stored as an id in professional_details (no upload);
 * "Automatic" keeps the portfolio mosaic / brand background.
 */
export function BannerPicker({ userId, details }: { userId: string; details: unknown }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<string | null>(readBanner(details)?.id ?? null);
  const [busy, setBusy] = useState(false);
  const me = useQuery(profileQuery(userId)).data;
  const current = BANNER_PRESETS.find((b) => b.id === choice);

  return (
    <form id="banner" aria-labelledby="bn-t" className="scroll-mt-36 space-y-5 panel p-6 sm:p-8" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const fresh = await qc.fetchQuery({ ...profileQuery(userId), staleTime: 0 }).catch(() => null);
      const error = await saveProfessionalDetails(supabase, userId, writeBanner(fresh?.professional_details ?? details, choice));
      setBusy(false);
      if (error) { const lim = limitMessage(error); toast.error(lim ? t(lim.key, lim.vars) : t("err_generic")); return; }
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    }}>
      <div>
        <h2 id="bn-t" className="flex items-center gap-2 text-lg font-bold"><PanelTop className="size-5 text-clay-strong" aria-hidden />{t("bn_title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("bn_sub")}</p>
      </div>
      {/* Live preview: the banner as the public page shows it, with the pro's photo and name. */}
      <figure aria-label={t("bn_preview")} className="banner-preview">
        {current ? <img key={current.id} src={current.src} alt="" className="swap-in banner-img" /> : <span className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />}
        <span aria-hidden className="banner-fade" />
        <span className="absolute inset-x-4 bottom-3 flex items-center gap-3">
          <Avatar src={me?.avatar ?? undefined} name={me?.display_name ?? ""} />
          <span dir="auto" className="min-w-0 truncate text-lg font-extrabold text-navy-foreground">{me?.display_name}</span>
        </span>
      </figure>
      <fieldset disabled={busy}>
        <legend className="sr-only">{t("bn_title")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[null, ...BANNER_PRESETS].map((b, i) => (
            <label key={b?.id ?? "auto"} className={`cursor-pointer rounded-xl border p-1.5 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${choice === (b?.id ?? null) ? "border-lime font-semibold ring-2 ring-lime" : "hover:bg-muted"}`}>
              <input type="radio" name="profile-banner" className="sr-only" checked={choice === (b?.id ?? null)} onChange={() => setChoice(b?.id ?? null)} aria-label={b ? t("bn_option", { n: i }) : t("bn_auto")} />
              {b
                ? <img src={b.src} alt="" loading="lazy" className="aspect-[10/3] w-full rounded-lg object-cover" />
                : <span aria-hidden className="grid aspect-[10/3] w-full place-items-center rounded-lg bg-muted">{t("bn_auto")}</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={busy} aria-busy={busy} className="btn btn-lime">{busy ? t("loading") : t("save")}</button>
    </form>
  );
}
