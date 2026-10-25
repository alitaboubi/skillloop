import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, Inbox, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CATEGORIES, type CategoryId } from "@/lib/data";
import { CATEGORY_ICONS, PointerField } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import { statusTone, timelineSteps } from "@/lib/request-timeline";
import { STATUS_KEY } from "@/lib/requests-db";

export function EmptyState({ icon: Icon = Inbox, title, sub, action }: { icon?: typeof Inbox; title: string; sub?: string | undefined; action?: ReactNode }) {
  return (
    <div className="empty-state relative overflow-hidden">
      <PointerField tone="light" />
      <span className="icon-well-clay relative size-14"><Icon className="size-7" aria-hidden /></span>
      <h3 className="relative mt-1 font-bold">{title}</h3>
      {sub && <p className="relative max-w-md text-sm text-muted-foreground">{sub}</p>}
      {action && <div className="relative mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="empty-state">
      <AlertTriangle className="size-9 text-destructive" aria-hidden />
      <h3 className="font-bold">{t("load_error")}</h3>
      {onRetry && <button type="button" onClick={onRetry} className="btn btn-outline mt-3">{t("retry")}</button>}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("loading")} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-block h-20 w-full rounded-2xl" />)}
    </div>
  );
}

export function RequestTimeline({ status, createdAt }: { status: string; createdAt: string }) {
  const { t, lang } = useI18n();
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { dateStyle: "medium", timeStyle: "short" });
  const steps = timelineSteps(status, createdAt);
  return (
    <ol aria-label={t("tl_title")} className="relative space-y-4 ps-6">
      <span className="absolute inset-y-1.5 start-[0.4375rem] w-px bg-border" aria-hidden />
      {steps.map((s) => {
        const dot =
          s.state === "upcoming" ? "border-2 border-border bg-card"
          : s.tone === "positive" ? "bg-success"
          : s.tone === "negative" ? "bg-destructive"
          : s.state === "current" ? "bg-lime ring-4 ring-lime/30"
          : "bg-sea";
        return (
          <li key={s.key} className="relative" aria-current={s.state === "current" ? "step" : undefined}>
            <span className={`absolute -start-6 top-1 size-3.5 rounded-full ${dot}`} aria-hidden />
            <p className={`text-sm font-semibold ${s.state === "upcoming" ? "text-muted-foreground" : ""}`}>
              {t(s.key)}
              {s.state === "current" && <span className="sr-only"> — {t("tl_current")}</span>}
            </p>
            {s.at && <time dateTime={s.at} className="text-xs text-muted-foreground">{fmt.format(new Date(s.at))}</time>}
          </li>
        );
      })}
    </ol>
  );
}

/** Request status with a consistent tone everywhere (pending · accepted · declined/cancelled). */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <span className={`badge ${statusTone(status)}`}>{t(STATUS_KEY[status as keyof typeof STATUS_KEY] ?? "st_pending")}</span>;
}

/**
 * What a strong listing contains, drawn as an outlined sketch. Clearly labelled as an example:
 * annotations only — never a provider name, price or text that could pass for a real service.
 */
export function ListingSketch() {
  const { t } = useI18n();
  const note = "text-xs font-semibold text-clay-strong";
  return (
    <figure className="mx-auto w-full max-w-xs rounded-2xl border-2 border-dashed border-clay/50 p-3">
      <figcaption className="mb-3"><span className="tag tag-sea">{t("sketch_label")}</span></figcaption>
      <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center">
        <span className="flex flex-col items-center gap-1.5"><ImageIcon className="size-6 text-muted-foreground" aria-hidden /><span className={note}>{t("sketch_photo")}</span></span>
      </div>
      <ul className="mt-3 space-y-2.5">
        <li><span aria-hidden className="block h-3 w-4/5 rounded-full bg-muted" /><span className={`mt-1 block ${note}`}>{t("sketch_title")}</span></li>
        <li className="flex items-center gap-2"><Tag className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /><span className={note}>{t("sketch_price")}</span></li>
        <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /><span className={note}>{t("sketch_included")}</span></li>
      </ul>
    </figure>
  );
}

/** Three real category entry points for a client who hasn't asked for anything yet (a fixed choice, no popularity claim). */
const START: CategoryId[] = ["home", "tutoring", "tech"];
export function StartShortcuts() {
  const { t } = useI18n();
  return (
    <nav aria-labelledby="start-with" className="mt-4">
      <p id="start-with" className="text-sm font-semibold text-muted-foreground">{t("start_with")}</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {START.map((id) => {
          const cat = CATEGORIES.find((c) => c.id === id);
          const Icon = CATEGORY_ICONS[id];
          return cat ? <li key={id}><Link to="/explore" search={{ category: id }} className="chip"><Icon className="size-4 text-clay-strong" aria-hidden />{t(cat.key)}</Link></li> : null;
        })}
      </ul>
    </nav>
  );
}
