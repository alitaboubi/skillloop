import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

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
