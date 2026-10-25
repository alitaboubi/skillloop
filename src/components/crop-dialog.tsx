import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { centred, clampPos, coverScale, outputSize, sourceRect, zoomAround, ZOOM_MAX, ZOOM_MIN, type Pos, type Size } from "@/lib/crop";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

/**
 * Lets the user frame a picked photo before upload: drag (mouse/touch) or arrow keys to move, slider or +/− to zoom.
 * The result is a new JPEG cut to the frame (aspect of where the photo is shown), never upscaled. No library.
 */
export function CropDialog({ file, aspect, round = false, onCancel, onDone }: {
  file: File; aspect: number; round?: boolean; onCancel: () => void; onDone: (cropped: File) => void;
}) {
  const { t } = useI18n();
  const helpId = useId();
  const [src, setSrc] = useState<string>();
  const [img, setImg] = useState<Size | null>(null);
  const [frame, setFrame] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const measure = useCallback((el: HTMLDivElement | null) => {
    if (el) setFrame({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  // Start centred, just covering the frame.
  useEffect(() => {
    if (!img || !frame) return;
    setZoom(ZOOM_MIN);
    setPos(centred(img, frame, coverScale(img, frame)));
  }, [img, frame]);

  const scale = img && frame ? coverScale(img, frame) * zoom : 1;
  const move = (p: Pos) => { if (img && frame) setPos(clampPos(p, img, frame, scale)); };
  const changeZoom = (z: number) => {
    if (!img || !frame) return;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    const nextScale = coverScale(img, frame) * next;
    setPos(clampPos(zoomAround(pos, frame, scale, nextScale), img, frame, nextScale));
    setZoom(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) move({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, Pos> = { ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
    const m = moves[e.key];
    if (m) { e.preventDefault(); move({ x: pos.x + m.x, y: pos.y + m.y }); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); changeZoom(zoom + 0.1); }
    else if (e.key === "-") { e.preventDefault(); changeZoom(zoom - 0.1); }
  };

  async function apply() {
    const el = imgRef.current;
    if (!el || !img || !frame) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = sourceRect(pos, frame, scale);
      const out = outputSize(r.sw, aspect, round ? 800 : 1600);
      const canvas = document.createElement("canvas");
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black, in JPEG
      ctx.fillRect(0, 0, out.w, out.h);
      ctx.drawImage(el, r.sx, r.sy, r.sw, r.sh, 0, 0, out.w, out.h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("encode failed");
      onDone(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("crop_title")}</DialogTitle>
          <DialogDescription id={helpId}>{t("crop_help")}</DialogDescription>
        </DialogHeader>
        <div
          ref={measure} dir="ltr" tabIndex={0} role="group" aria-label={t("crop_area")} aria-describedby={helpId}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          onKeyDown={onKeyDown}
          className={`relative w-full cursor-grab touch-none select-none overflow-hidden bg-muted outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing ${round ? "mx-auto aspect-square max-w-72 rounded-full" : "rounded-xl"}`}
          style={round ? undefined : { aspectRatio: String(aspect) }}
        >
          {src && (
            <img
              ref={imgRef} src={src} alt="" draggable={false}
              onLoad={(e) => setImg({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setFailed(true)}
              className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
              style={img ? { width: img.w * scale, height: img.h * scale, transform: `translate(${pos.x}px, ${pos.y}px)` } : { opacity: 0 }}
            />
          )}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className="sr-only">{t("crop_zoom")}</span>
          <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={zoom} disabled={!img} onChange={(e) => changeZoom(Number(e.target.value))} className="w-full accent-sea" />
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </label>
        {failed && <p role="alert" className="text-sm text-destructive">{t("crop_failed")}</p>}
        <DialogFooter className="gap-2">
          <button type="button" className="btn btn-outline" onClick={onCancel}>{t("cancel")}</button>
          <button type="button" className="btn btn-lime" aria-busy={busy} disabled={!img || busy} onClick={apply}>{busy ? t("loading") : t("crop_apply")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
