import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { useI18n, type TKey } from "@/lib/i18n";
import { presetFile, type Preset, type PresetGroup } from "@/lib/presets";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

/**
 * Grid of ready-made images (service covers by category, or avatars). Picking one turns it into a JPEG File of `size`
 * and hands it back like a picked photo. The first group is the service's own category; the rest follow under one heading.
 */
export function PresetGallery({ groups, size, round = false, title, description, onCancel, onDone }: {
  groups: PresetGroup[]; size: { w: number; h: number }; round?: boolean; title: TKey; description: TKey;
  onCancel: () => void; onDone: (file: File) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const catKey = (id?: string) => CATEGORIES.find((c) => c.id === id)?.key;

  async function pick(p: Preset) {
    setBusy(p.id); setFailed(false);
    try { onDone(await presetFile(p, size)); } catch { setFailed(true); } finally { setBusy(null); }
  }
  const option = (p: Preset, label: string) => (
    <button key={p.id} type="button" disabled={!!busy} aria-label={label} onClick={() => pick(p)}
      className={`group relative overflow-hidden bg-muted outline-none ring-offset-2 transition-transform focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:hover:scale-[1.02] ${round ? "aspect-square rounded-full" : "aspect-[4/3] rounded-lg"}`}>
      <img src={p.src} alt="" loading="lazy" className="size-full object-cover" />
      {busy === p.id && <span className="absolute inset-0 grid place-items-center bg-background/60"><Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden /></span>}
    </button>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription>{t(description)}</DialogDescription>
        </DialogHeader>
        <div aria-busy={!!busy} className="space-y-5">
          {groups.map((g, gi) => {
            const key = catKey(g.category);
            return (
              <section key={g.category ?? gi} aria-label={key ? t(key) : undefined}>
                {gi === 1 && <p className="mb-4 border-t pt-4 text-sm font-semibold text-muted-foreground">{t("preset_other_domains")}</p>}
                {key && <h3 className="mb-2 text-sm font-semibold">{t(key)}</h3>}
                <div className={`grid gap-3 ${round ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3"}`}>
                  {g.items.map((p, i) => option(p, key ? t("preset_cover_n", { c: t(key), n: i + 1 }) : t("preset_avatar_n", { n: i + 1 })))}
                </div>
              </section>
            );
          })}
        </div>
        {failed && <p role="alert" className="text-sm text-destructive">{t("preset_failed")}</p>}
        <DialogFooter>
          <button type="button" className="btn btn-outline" onClick={onCancel}>{t("cancel")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
