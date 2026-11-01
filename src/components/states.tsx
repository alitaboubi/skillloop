import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, ImageIcon, Inbox, PenLine, Rocket, ShieldCheck, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CATEGORIES, type CategoryId } from "@/lib/data";
import { CATEGORY_ICONS, PointerField } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import { statusTone, timelineSteps } from "@/lib/request-timeline";
import { STATUS_KEY } from "@/lib/requests-db";
import { STEP_KEY, latestStep, type Progress } from "@/lib/request-progress";
import { proNoun } from "@/lib/pro-noun";
import { absoluteUrl, whatsappShareUrl } from "@/lib/share";
import { NOTIFY_ME_ENABLED } from "@/lib/notify-me";
import { NotifyMe } from "@/components/notify-me";

/**
 * Levels of proof (docs/product/design-upgrade.md §5): what the pro states (declared), what a client confirmed after a
 * real job (confirmed), what SkillLoop checked (verified). Shape + colour + word, never colour alone. Only "declared"
 * is used until verified completions exist.
 */
export type ProofLevel = "declared" | "confirmed" | "verified";
const PROOF_ICON = { declared: PenLine, confirmed: BadgeCheck, verified: ShieldCheck } as const;

export function TrustBadge({ level }: { level: ProofLevel }) {
  const { t } = useI18n();
  const Icon = PROOF_ICON[level];
  const help = t(`proof_${level}_help`);
  return (
    <span className={`trust-badge trust-${level}`} title={help}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {t(`proof_${level}`)}
      <span className="sr-only"> — {help}</span>
    </span>
  );
}

/**
 * First-visit empty state (no listings yet, or none matching): explains SkillLoop in one line and offers one next step
 * per kind of visitor — be notified (only when the notify table is live), invite a good pro, publish as a pro.
 */
export function FirstVisitEmpty({ query, category, city, title, lead }: { query?: string | undefined; category?: string | undefined; city?: string | undefined; title?: string; lead?: string }) {
  const { t, lang } = useI18n();
  const pro = proNoun(lang, category);
  // The share link needs the browser's origin: resolved after mount so the server HTML stays identical.
  const [invite, setInvite] = useState("");
  useEffect(() => { setInvite(whatsappShareUrl(t("fv_invite_text"), absoluteUrl("/professionals"))); }, [t]);
  return (
    <section className="panel p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="icon-well-clay size-12"><Rocket className="size-6" aria-hidden /></span>
        <div className="min-w-0">
          <h3 className="text-xl font-bold">{title ?? t("fv_title")}</h3>
          <p className="mt-1 max-w-2xl text-muted-foreground">{lead ?? t("fv_lead")}</p>
        </div>
      </div>
      <div className={`mt-6 grid gap-4 ${NOTIFY_ME_ENABLED ? "lg:grid-cols-[1.4fr_1fr_1fr]" : "sm:grid-cols-2"}`}>
        {NOTIFY_ME_ENABLED && (
          <div className="rounded-2xl border bg-surface-sunken p-5">
            <h4 className="font-bold">{t("fv_notify_t")}</h4>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">{t("fv_notify_d")}</p>
            <NotifyMe query={query} category={category} city={city} />
          </div>
        )}
        <div className="flex flex-col rounded-2xl border p-5">
          <h4 className="font-bold">{t("fv_invite_t", { pro })}</h4>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("fv_invite_d")}</p>
          <a href={invite || "/professionals"} target={invite ? "_blank" : undefined} rel="noopener noreferrer" className="btn btn-outline mt-4 self-start">{t("fv_invite_btn")}</a>
        </div>
        <div className="flex flex-col rounded-2xl border p-5">
          <h4 className="font-bold">{t("fv_publish_t", { pro })}</h4>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{t("fv_publish_d")}</p>
          <Link to="/offer" search={query?.trim() ? { title: query.trim() } : {}} className="btn btn-ink mt-4 self-start">{t("fv_publish_btn")}</Link>
        </div>
      </div>
    </section>
  );
}

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

export function RequestTimeline({ status, createdAt, progress }: { status: string; createdAt: string; progress?: (Progress & { remote?: boolean }) | undefined }) {
  const { t, lang } = useI18n();
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { dateStyle: "medium", timeStyle: "short" });
  const steps = timelineSteps(status, createdAt, progress);
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

/** Request status with a consistent tone everywhere (pending · accepted · declined/cancelled); an accepted request shows its latest recorded step. */
export function StatusBadge({ status, progress }: { status: string; progress?: Progress | undefined }) {
  const { t } = useI18n();
  const step = status === "accepted" && progress ? latestStep(progress) : null;
  return <span className={`badge ${statusTone(status)}`}>{t(step ? STEP_KEY[step] : STATUS_KEY[status as keyof typeof STATUS_KEY] ?? "st_pending")}</span>;
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
