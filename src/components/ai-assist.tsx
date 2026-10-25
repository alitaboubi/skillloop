import { useEffect, useId, useRef, useState } from "react";
import { Info, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { LANGS, useI18n, type Lang, type TKey } from "@/lib/i18n";
import {
  BRIEF_MAX, BRIEF_MIN, FIELD_LIMITS, applySuggestion, briefProblem, createCooldown, generateOfferAssistance,
  type ApplyHow, type AssistField, type AssistMode, type AssistTone, type OfferAssistAdapter, type OfferAssistanceInput,
} from "@/lib/ai/offer-assist";

const TONES: { v: AssistTone; key: TKey }[] = [
  { v: "clear", key: "ai_tone_clear" }, { v: "professional", key: "ai_tone_professional" },
  { v: "friendly", key: "ai_tone_friendly" }, { v: "detailed", key: "ai_tone_detailed" },
];
const PANEL_TITLE: Record<AssistField, TKey> = { title: "ai_title_title", description: "ai_title_description", deliverables: "ai_title_deliverables" };

type Status = "idle" | "loading" | "unavailable" | "error" | "rate_limited" | "success";

/**
 * Optional, reviewable writing help for one wizard field. Nothing reaches the field until the provider
 * presses Use / Add / Replace (replace asks first), and every change can be undone from the toast.
 */
export function AiAssist({ field, value, onApply, context, adapter, cooldownMs = 4000 }: {
  field: AssistField;
  value: string;
  onApply: (next: string) => void;
  context: OfferAssistanceInput["context"];
  /** Tests inject an adapter; production resolves it inside generateOfferAssistance. */
  adapter?: OfferAssistAdapter;
  cooldownMs?: number;
}) {
  const { t, lang } = useI18n();
  const id = useId();
  const max = FIELD_LIMITS[field];
  const joiner = field === "deliverables" ? "\n" : "\n\n";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssistMode>("write");
  const [brief, setBrief] = useState("");
  const [dailyLimit, setDailyLimit] = useState(false);
  const [tone, setTone] = useState<AssistTone>("clear");
  // Language of the generated text: starts as the interface language; choosing another one here changes nothing else.
  const [outLang, setOutLang] = useState<Lang>(lang);
  const [status, setStatus] = useState<Status>("idle");
  const [suggestion, setSuggestion] = useState("");
  const [demo, setDemo] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [briefErr, setBriefErr] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [blocked, setBlocked] = useState<"" | "too_long">("");
  const trigger = useRef<HTMLButtonElement>(null);
  const briefRef = useRef<HTMLTextAreaElement>(null);
  const cooldown = useRef(createCooldown(cooldownMs));
  const request = useRef(0);

  const hasText = !!value.trim();
  const titleNeedsDesc = field === "title" && (context.description ?? "").trim().length < 20;
  // Titles are proposed from the description; other fields can improve what's there or start from a brief.
  const effectiveMode: AssistMode = field === "title" ? "write" : hasText ? mode : "write";

  const returnFocus = useRef(false);
  useEffect(() => {
    if (open) briefRef.current?.focus();
    else if (returnFocus.current) { returnFocus.current = false; trigger.current?.focus(); }
  }, [open]);
  useEffect(() => () => { request.current++; }, []);

  const close = () => {
    request.current++; // ignore any answer still in flight
    returnFocus.current = true;
    setOpen(false);
    setConfirming(false);
  };

  const generate = async () => {
    setConfirming(false);
    setBlocked("");
    if (field === "title" && titleNeedsDesc) return;
    if (briefProblem(field, effectiveMode, brief) === "short") { setBriefErr(true); briefRef.current?.focus(); return; }
    if (!cooldown.current.tryStart()) { setDailyLimit(false); setStatus("rate_limited"); return; }
    const mine = ++request.current;
    setStatus("loading");
    const r = await generateOfferAssistance({ field, mode: effectiveMode, current: value, brief, lang: outLang, tone, context }, adapter);
    if (mine !== request.current) return;
    if (r.status === "success") {
      setSuggestion(r.text);
      setDemo(!!r.demo);
      setExplanation(r.explanation ?? "");
      setStatus("success");
    } else if (r.status === "unavailable") setStatus("unavailable");
    else if (r.reason === "rate_limited") {
      // A daily allowance (the user's or everyone's) is not a "wait a few seconds".
      setDailyLimit(r.limit === "user_limit" || r.limit === "global_limit");
      setStatus("rate_limited");
    } else setStatus("error");
  };

  const apply = (how: ApplyHow, confirmed = false) => {
    const r = applySuggestion(value, suggestion, how, max, joiner, confirmed);
    if (!r.ok) {
      if (r.reason === "needs_confirm") setConfirming(true);
      if (r.reason === "too_long") setBlocked("too_long");
      return;
    }
    const previous = value;
    onApply(r.value);
    toast.success(t("ai_applied"), { action: { label: t("ai_undo"), onClick: () => onApply(previous) } });
    setSuggestion("");
    setStatus("idle");
    close();
  };

  if (!open)
    return (
      <button ref={trigger} type="button" onClick={() => { setMode(hasText ? "improve" : "write"); setBriefErr(false); setOpen(true); }} aria-expanded={false} aria-controls={`${id}-panel`}
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sea/30 bg-sea-soft px-3 text-xs font-semibold text-sea transition-colors hover:border-sea/60">
        <Sparkles className="size-3.5" aria-hidden />{t("ai_btn")}
      </button>
    );

  const over = suggestion.trim().length > max;
  return (
    <section id={`${id}-panel`} aria-labelledby={`${id}-h`} onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); close(); }
        // The panel sits inside the wizard form: Enter on a radio must not submit the step.
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
      className="swap-in mt-3 rounded-2xl border border-sea/30 bg-sea-soft/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 id={`${id}-h`} className="flex items-center gap-2 text-sm font-bold text-sea"><Sparkles className="size-4" aria-hidden />{t(PANEL_TITLE[field])}</h3>
        <button type="button" onClick={close} aria-label={t("ai_close")} className="-me-1 -mt-1 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {field === "title" && titleNeedsDesc ? (
        <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t("ai_needs_desc")}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {field !== "title" && hasText && (
            <fieldset>
              <legend className="text-xs font-semibold text-muted-foreground">{t("ai_mode_label")}</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(["improve", "write"] as const).map((m) => (
                  <label key={m} className={`chip cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${mode === m ? "border-lime bg-lime text-lime-foreground" : ""}`}>
                    <input type="radio" name={`${id}-mode`} className="sr-only" checked={mode === m} onChange={() => { setMode(m); setBriefErr(false); }} />
                    {t(m === "improve" ? "ai_mode_improve" : "ai_mode_write")}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            {field === "title" && <p className="mb-2 text-xs text-muted-foreground">{t("ai_title_from_desc")}</p>}
            <label htmlFor={`${id}-brief`} className="block text-sm font-semibold">
              {t(field === "title" ? "ai_brief_label_title" : effectiveMode === "improve" ? "ai_brief_label_improve" : "ai_brief_label")}
              {(field === "title" || effectiveMode === "improve") && <span className="font-normal text-muted-foreground"> ({t("optional")})</span>}
            </label>
            <textarea ref={briefRef} id={`${id}-brief`} dir="auto" rows={3} maxLength={BRIEF_MAX} value={brief}
              onChange={(e) => { setBrief(e.target.value); if (briefErr) setBriefErr(false); }}
              placeholder={t(effectiveMode === "improve" ? "ai_brief_ph_improve" : "ai_brief_ph")}
              aria-invalid={briefErr} aria-describedby={`${id}-brief-help${briefErr ? ` ${id}-brief-err` : ""}`}
              className="field mt-1.5 bg-card py-2.5" />
            <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
              <span id={`${id}-brief-help`}>{t("ai_brief_help")} {t("ai_privacy_hint")}</span>
              <span aria-hidden className="shrink-0 tabular-nums">{t("char_count", { n: brief.length, max: BRIEF_MAX })}</span>
            </div>
            {briefErr && <p id={`${id}-brief-err`} className="mt-1 text-sm font-medium text-destructive">{t("ai_brief_short", { n: BRIEF_MIN })}</p>}
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground">{t("ai_out_lang")}</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <label key={l.code} className={`chip cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${outLang === l.code ? "border-lime bg-lime text-lime-foreground" : ""}`}>
                  <input type="radio" name={`${id}-outlang`} className="sr-only" checked={outLang === l.code} onChange={() => setOutLang(l.code)} />
                  <span lang={l.code} dir="auto">{l.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {field !== "title" && (
            <fieldset>
              <legend className="text-xs font-semibold text-muted-foreground">{t("ai_tone")}</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TONES.map((x) => (
                  <label key={x.v} className={`chip cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${tone === x.v ? "border-lime bg-lime text-lime-foreground" : ""}`}>
                    <input type="radio" name={`${id}-tone`} className="sr-only" checked={tone === x.v} onChange={() => setTone(x.v)} />
                    {t(x.key)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button type="button" onClick={generate} disabled={status === "loading"} aria-busy={status === "loading"} className="btn btn-ink min-h-10">
            {status === "loading" ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {status === "success" ? t("ai_suggest_again") : t("ai_suggest")}
          </button>

          {/* Preview / result area — announced politely, never written into the form by itself. */}
          <div aria-live="polite" className="rounded-xl border border-dashed border-sea/30 bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sea"><Sparkles className="size-3.5" aria-hidden />{t("ai_preview_label")}</p>
            {status === "idle" && <p className="mt-1 text-sm text-muted-foreground">{t("ai_preview_idle")}</p>}
            {status === "loading" && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />{t("ai_loading")}</p>}
            {status === "unavailable" && (
              <div role="status" className="mt-1 text-sm">
                <p className="font-semibold">{t("ai_unavailable_t")}</p>
                <p className="mt-0.5 text-muted-foreground">{t("ai_unavailable_d")}</p>
              </div>
            )}
            {status === "error" && <p role="alert" className="mt-1 text-sm text-destructive">{t("ai_error")}</p>}
            {status === "rate_limited" && <p role="status" className="mt-1 text-sm text-muted-foreground">{t(dailyLimit ? "ai_limit_daily" : "ai_rate_limited")}</p>}
            {status === "success" && (
              <div className="mt-2 space-y-2">
                {demo && <span className="tag tag-sea">{t("ai_demo_badge")}</span>}
                <label htmlFor={`${id}-suggestion`} className="sr-only">{t("ai_preview_label")}</label>
                <textarea id={`${id}-suggestion`} dir="auto" rows={field === "title" ? 2 : 6} value={suggestion}
                  onChange={(e) => { setSuggestion(e.target.value); setBlocked(""); setConfirming(false); }}
                  aria-describedby={`${id}-sugg-help${over || blocked ? ` ${id}-sugg-err` : ""}`} aria-invalid={over || !!blocked}
                  className="field py-2.5" />
                <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span id={`${id}-sugg-help`} dir="auto">{explanation || t("ai_edit_hint")}</span>
                  <span aria-hidden className="shrink-0 tabular-nums">{t("char_count", { n: suggestion.trim().length, max })}</span>
                </div>
                {(over || blocked) && (
                  <p id={`${id}-sugg-err`} className="text-sm font-medium text-destructive">
                    {t("ai_over_limit", { n: over ? suggestion.trim().length : value.trimEnd().length + joiner.length + suggestion.trim().length, max })}
                  </p>
                )}

                {confirming ? (
                  <div role="group" aria-label={t("ai_replace")} className="space-y-2 rounded-xl border bg-surface-sunken p-3">
                    <p className="text-sm font-semibold">{t("ai_replace_confirm")}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" autoFocus onClick={() => setConfirming(false)} className="btn btn-outline min-h-10">{t("cancel")}</button>
                      <button type="button" onClick={() => apply("replace", true)} className="btn btn-ink min-h-10">{t("ai_replace_yes")}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {!hasText ? (
                      <button type="button" disabled={over} onClick={() => apply("use")} className="btn btn-lime min-h-10">{t("ai_use")}</button>
                    ) : (
                      <>
                        {field !== "title" && <button type="button" disabled={over} onClick={() => apply("append")} className="btn btn-lime min-h-10">{t("ai_append")}</button>}
                        <button type="button" disabled={over} onClick={() => apply("replace")} className="btn btn-outline min-h-10">{t("ai_replace")}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
