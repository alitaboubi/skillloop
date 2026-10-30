import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Film, Lock, Palette, Printer, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useIsPro } from "@/lib/plan";
import { PRO_TOOLS_ENABLED, STATS_DAYS, myStatsQuery, type StatKind } from "@/lib/pro-tools";
import { CARD_SIZE_MM, buildCardSvg, qrLink, type CardVariant } from "@/lib/pro-card";
import { CARNET_THEMES, THEME_KEYS, readTheme, writeTheme, type CarnetTheme } from "@/lib/carnet";
import { MOTION_MAX_SECONDS } from "@/lib/motion";
import { limitMessage } from "@/lib/limits";
import { saveProfessionalDetails } from "@/lib/marketplace-writes";
import { profileQuery } from "@/lib/profiles-db";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";

/** Locked state of a Pro tool: what it does, and the way to /pricing. Never fake data. */
export function ProLock({ text, compact = false }: { text: TKey; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-sea/40 bg-sea-soft/50 ${compact ? "p-3" : "p-4"}`}>
      <p className="flex min-w-0 max-w-prose items-start gap-2 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-sea" aria-hidden />
        <span><span className="font-semibold">{t("pro_lock_t")}</span> · {t(text)}</span>
      </p>
      <Link to="/pricing" className="btn btn-outline min-h-10 shrink-0"><Sparkles className="size-4" aria-hidden />{t("pro_lock_cta")}</Link>
    </div>
  );
}

function ToolPanel({ id, icon: Icon, title, sub, children }: { id: string; icon: typeof QrCode; title: TKey; sub?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="panel scroll-mt-24 p-6">
      <h2 id={`${id}-t`} className="flex items-center gap-2 text-lg font-bold"><Icon className="size-5 text-clay-strong" aria-hidden />{t(title)}</h2>
      {sub && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ---------- Statistics ---------- */

const TILES: { k: StatKind; label: TKey }[] = [
  { k: "profile_view", label: "st_profile" },
  { k: "service_view", label: "st_service" },
  { k: "qr_scan", label: "st_qr" },
  { k: "contact_click", label: "st_contacts" },
  { k: "share", label: "st_shares" },
  { k: "request", label: "st_requests" },
];

export function StatsPanel({ userId, pro }: { userId: string; pro: boolean }) {
  const { t, lang } = useI18n();
  const q = useQuery({ ...myStatsQuery(userId), enabled: PRO_TOOLS_ENABLED && pro });
  const locale = lang === "ar" ? "ar-TN" : lang;
  const fmtDay = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const num = (n: number) => new Intl.NumberFormat(locale).format(n);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <ToolPanel id="stats" icon={Sparkles} title="st_title" sub={t("st_sub", { n: STATS_DAYS })}>
      {!pro ? <ProLock text="pro_lock_stats" /> : q.isLoading ? <ListSkeleton rows={2} /> : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} /> : (() => {
        const s = q.data;
        const max = Math.max(1, ...s.series.map((p) => p.views));
        const total = s.series.reduce((a, p) => a + p.views, 0);
        const peak = s.series.reduce((b, p) => (p.views > b.views ? p : b), s.series[0]!);
        return (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TILES.map(({ k, label }) => (
                <div key={k} className="rounded-2xl border bg-card p-4">
                  <dt className="text-sm text-muted-foreground">{t(label)}</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">{num(s.totals[k])}</dd>
                </div>
              ))}
            </dl>
            {s.empty ? (
              <EmptyState title={t("st_empty_t")} sub={t("st_empty_d")} />
            ) : (
              <figure>
                <figcaption className="flex items-baseline justify-between gap-3 text-sm font-semibold">
                  {t("st_chart_t")}
                  <span aria-live="polite" className="font-normal tabular-nums text-muted-foreground">
                    {hover !== null ? `${fmtDay(s.series[hover]!.day)} · ${num(s.series[hover]!.views)}` : ""}
                  </span>
                </figcaption>
                {/* One series (no legend): bars in the info colour, 2 px gaps, rounded data end on the baseline. */}
                <div role="img" aria-label={t("st_chart_sr", { n: s.days, total: num(total), max: num(peak.views), d: fmtDay(peak.day) })}
                  className="relative mt-3 flex h-32 items-end gap-[2px] border-b border-border" onMouseLeave={() => setHover(null)}>
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
                  {s.series.map((p, i) => (
                    <span key={p.day} aria-hidden onMouseEnter={() => setHover(i)} className="flex h-full min-w-0 flex-1 items-end">
                      <span className={`w-full rounded-t-[4px] transition-opacity ${hover === null || hover === i ? "bg-sea" : "bg-sea opacity-40"}`}
                        style={{ height: p.views ? `${Math.max(4, (p.views / max) * 100)}%` : "0" }} />
                    </span>
                  ))}
                </div>
                <div aria-hidden className="mt-1.5 flex justify-between text-sm text-muted-foreground"><span>{fmtDay(s.series[0]!.day)}</span><span>{fmtDay(s.series.at(-1)!.day)}</span></div>
                <table className="sr-only">
                  <caption>{t("st_chart_t")}</caption>
                  <tbody>{s.series.map((p) => <tr key={p.day}><th scope="row">{fmtDay(p.day)}</th><td>{p.views}</td></tr>)}</tbody>
                </table>
              </figure>
            )}
            <p className="text-sm text-muted-foreground">{t("st_note")}</p>
          </div>
        );
      })()}
    </ToolPanel>
  );
}

/* ---------- Card & QR ---------- */

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Renders the SVG to a PNG at print resolution (≈ 600 dpi). */
async function svgToPng(svg: string, variant: CardVariant): Promise<Blob> {
  const { w, h } = CARD_SIZE_MM[variant];
  const px = (mm: number) => Math.round((mm / 25.4) * 600);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = px(w);
  canvas.height = px(h);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}

/** Prints the card alone at its real size, from a hidden frame (the page itself is not printed). */
function printSvg(svg: string, variant: CardVariant) {
  const { w, h } = CARD_SIZE_MM[variant];
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0";
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>SkillLoop</title><style>@page{size:auto;margin:12mm}body{margin:0}svg{width:${w}mm;height:${h}mm;display:block}</style></head><body>${svg}</body></html>`);
  doc.close();
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 60_000);
}

export function CardStudio({ userId, pro }: { userId: string; pro: boolean }) {
  const { t, lang } = useI18n();
  const prof = useQuery(profileQuery(userId));
  const [variant, setVariant] = useState<CardVariant>("card");
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(qrLink(userId)), [userId]); // the origin is known only in the browser
  const p = prof.data;
  const svg = useMemo(() => (p && url ? buildCardSvg({
    name: p.display_name, title: p.title, place: [p.area, p.city].filter(Boolean).join(", "), url,
    scanLabel: t("qc_scan"), stickerTitle: t("qc_sticker_title"), rtl: lang === "ar",
  }, variant) : ""), [p, url, variant, t, lang]);
  const file = `skillloop-${variant}`;

  return (
    <ToolPanel id="card" icon={QrCode} title="qc_title" sub={t("qc_sub")}>
      {prof.isLoading ? <ListSkeleton rows={1} /> : prof.isError ? <ErrorState onRetry={() => prof.refetch()} /> : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <div role="group" aria-label={t("qc_format")} className="mb-4 flex flex-wrap gap-2">
              {(["card", "sticker"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={variant === v} onClick={() => setVariant(v)} className="chip">{t(v === "card" ? "qc_card" : "qc_sticker")}</button>
              ))}
            </div>
            <div className={`rounded-2xl bg-surface-sunken p-4 sm:p-6 ${variant === "sticker" ? "max-w-sm" : ""}`}>
              {svg && <img key={variant} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={t("qc_preview_alt", { n: p?.display_name ?? "" })} className="swap-in mx-auto w-full drop-shadow-md" />}
            </div>
          </div>
          <div className="space-y-3">
            {pro ? (
              <>
                <button type="button" disabled={!svg} className="btn btn-lime w-full" onClick={async () => {
                  try { downloadBlob(await svgToPng(svg, variant), `${file}.png`); } catch { toast.error(t("qc_err")); }
                }}><Download className="size-4" aria-hidden />{t("qc_png")}</button>
                <button type="button" disabled={!svg} className="btn btn-outline w-full" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${file}.svg`)}>
                  <Download className="size-4" aria-hidden />{t("qc_svg")}
                </button>
                <button type="button" disabled={!svg} className="btn btn-outline w-full" onClick={() => printSvg(svg, variant)}><Printer className="size-4" aria-hidden />{t("qc_print")}</button>
              </>
            ) : <ProLock text="pro_lock_card" compact />}
            <p className="text-sm text-muted-foreground">{t("qc_help")}</p>
          </div>
        </div>
      )}
    </ToolPanel>
  );
}

/* ---------- Carnet theme ---------- */

/** Theme choice in profile settings (/profile?tab=settings#theme). Free accounts see the swatches, disabled. */
export function ThemePicker({ userId, details }: { userId: string; details: unknown }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const pro = useIsPro(userId);
  const saved = readTheme(details);
  const [choice, setChoice] = useState<CarnetTheme | null>(saved);
  const [busy, setBusy] = useState(false);
  const options: (CarnetTheme | null)[] = [null, ...CARNET_THEMES];
  const locked = pro === false;

  return (
    <form id="theme" aria-labelledby="ct-t" className="max-w-2xl scroll-mt-24 space-y-5 panel p-6" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const fresh = await qc.fetchQuery({ ...profileQuery(userId), staleTime: 0 }).catch(() => null);
      const error = await saveProfessionalDetails(supabase, userId, writeTheme(fresh?.professional_details ?? details, choice));
      setBusy(false);
      if (error) { const lim = limitMessage(error); toast.error(lim ? t(lim.key, lim.vars) : t("err_generic")); return; }
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["has-pro", userId] });
    }}>
      <div>
        <h2 id="ct-t" className="flex items-center gap-2 text-lg font-bold"><Palette className="size-5 text-clay-strong" aria-hidden />{t("ct_title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("ct_sub")}</p>
      </div>
      {locked && saved && <p role="note" className="rounded-xl bg-surface-sunken px-3 py-2 text-sm">{t("ct_paused")}</p>}
      <fieldset disabled={locked || busy}>
        <legend className="sr-only">{t("ct_title")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {options.map((o) => (
            <label key={o ?? "default"} className={`group cursor-pointer rounded-2xl border p-2 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${choice === o ? "border-lime font-semibold ring-2 ring-lime" : "hover:bg-muted"}`}>
              <input type="radio" name="carnet-theme" className="sr-only" checked={choice === o} onChange={() => setChoice(o)} />
              <span aria-hidden className={`ct-swatch ${o ? `ctheme ctheme-${o}` : ""}`}><span className="ct-swatch-dot" /></span>
              <span className="mt-2 block">{t(o ? THEME_KEYS[o] : "ct_default")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {locked ? <ProLock text="pro_lock_themes" compact /> : (
        <button disabled={busy || pro === undefined || choice === saved} aria-busy={busy} className="btn btn-lime">{busy ? t("loading") : t("save")}</button>
      )}
    </form>
  );
}

/* ---------- Dashboard section ---------- */

/** /dashboard?mode=provider&section=pro — statistics, card & QR, and shortcuts to the other Pro tools. */
export function ProToolsSection({ userId }: { userId: string }) {
  const { t } = useI18n();
  const pro = useIsPro(userId);
  if (pro === undefined) return <ListSkeleton rows={2} />;
  return (
    <div className="space-y-6">
      {PRO_TOOLS_ENABLED && <StatsPanel userId={userId} pro={pro} />}
      <CardStudio userId={userId} pro={pro} />
      {PRO_TOOLS_ENABLED && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel flex flex-col p-5">
            <h2 className="flex items-center gap-2 font-bold"><Palette className="size-5 text-clay-strong" aria-hidden />{t("pt_theme_t")}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("pt_theme_d")}</p>
            <Link to="/profile" search={{ tab: "settings" }} hash="theme" className="btn btn-outline mt-4 min-h-10 self-start">{t("pt_theme_cta")}</Link>
          </div>
          <div className="panel flex flex-col p-5">
            <h2 className="flex items-center gap-2 font-bold"><Film className="size-5 text-clay-strong" aria-hidden />{t("pt_motion_t")}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("pt_motion_d", { s: MOTION_MAX_SECONDS })}</p>
            <Link to="/profile" search={{ tab: "settings" }} hash="portfolio" className="btn btn-outline mt-4 min-h-10 self-start">{t("pt_motion_cta")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
