import { useEffect, useState } from "react";
import { Crop, ImagePlus, LayoutGrid, X } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { imageProblem, IMAGE_TYPES } from "@/lib/services-db";
import type { PresetGroup } from "@/lib/presets";
import { CropDialog } from "./crop-dialog";
import { PresetGallery } from "./preset-gallery";
import { Button } from "./ui/button";

/**
 * Pick → frame (CropDialog) → preview. The framed JPEG is what gets uploaded; the original is kept so the user can
 * reframe. `aspect` matches where the photo is shown (cards 4:3; round avatars 1:1).
 * With `presets`, a second button opens ready-made images (service covers, avatars); the chosen one is used as is.
 */
export type PhotoPresets = { groups: PresetGroup[]; size: { w: number; h: number }; pick: TKey; title: TKey; description: TKey };
export function PhotoPicker({ image, onPick, round = false, alt = "f_image", aspect = round ? 1 : 4 / 3, presets }: { image?: string | null; onPick: (file: File | null) => void; round?: boolean; alt?: TKey; aspect?: number; presets?: PhotoPresets }) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const [gallery, setGallery] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<TKey | null>(null);
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div>
    {(preview || image) && <div className={`relative mb-3 overflow-hidden bg-muted ${round ? "avatar-ring m-1 size-28 rounded-full" : "aspect-[4/3] max-w-sm rounded-lg"}`}>
      <img src={preview ?? image ?? ""} alt={t(alt)} className="size-full object-cover" />
      <Button type="button" size="icon" variant="secondary" className="absolute end-2 top-2" aria-label={t("f_image_remove")} onClick={() => { setFile(null); setOriginal(null); setError(null); onPick(null); }}><X /></Button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted">
        <ImagePlus className="size-4" aria-hidden />{t("f_image_pick")}
        <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={e => {
          const next = e.target.files?.[0]; if (!next) return;
          const problem = imageProblem(next); setError(problem); if (!problem) setCropping(next);
          e.target.value = "";
        }} />
      </label>
      {presets && (
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted" onClick={() => setGallery(true)}>
          <LayoutGrid className="size-4" aria-hidden />{t(presets.pick)}
        </button>
      )}
      {original && file && (
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted" onClick={() => setCropping(original)}>
          <Crop className="size-4" aria-hidden />{t("crop_reframe")}
        </button>
      )}
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{t("f_image_help")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    {gallery && presets && (
      <PresetGallery groups={presets.groups} size={presets.size} round={round} title={presets.title} description={presets.description}
        onCancel={() => setGallery(false)}
        onDone={(picked) => { setError(null); setOriginal(null); setFile(picked); onPick(picked); setGallery(false); }} />
    )}
    {cropping && (
      <CropDialog file={cropping} aspect={aspect} round={round}
        onCancel={() => setCropping(null)}
        onDone={(framed) => {
          const problem = imageProblem(framed); setError(problem);
          if (!problem) { setOriginal(cropping); setFile(framed); onPick(framed); }
          setCropping(null);
        }} />
    )}
  </div>;
}
