import { Link, useNavigate } from "@tanstack/react-router";
import { forwardRef, useId, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, Rocket, Search, LayoutGrid } from "lucide-react";
import { BrandBackdrop, CATEGORY_ICONS } from "@/components/brand";
import { CATEGORIES, type CategoryId } from "@/lib/data";
import { useI18n, type TKey } from "@/lib/i18n";
import { draftFromText, saveOfferDraft } from "@/lib/offer-draft";

export type Intent = "find" | "offer";
export type HomeHeroHandle = { prefill: (intent: Intent, text: string) => void };

export { suggestTitle } from "@/lib/offer-draft";

const COPY: Record<Intent, { q: TKey; ph: TKey; help: TKey; cta: TKey; ex: TKey[] }> = {
  find: { q: "hh_find_q", ph: "hh_find_ph", help: "hh_find_help", cta: "hh_find_cta", ex: ["hh_find_ex1", "hh_find_ex2", "hh_find_ex3"] },
  offer: { q: "hh_offer_q", ph: "hh_offer_ph", help: "hh_offer_help", cta: "hh_offer_cta", ex: ["hh_offer_ex1", "hh_offer_ex2", "hh_offer_ex3"] },
};

/** Direct category entry points shown beside the headline (desktop) — proves breadth beyond digital work. */
const JUMP: CategoryId[] = ["home", "tutoring", "tech", "automotive", "events", "business"];

export const HomeHero = forwardRef<HomeHeroHandle>(function HomeHero(_props, ref) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent>("find");
  // Separate draft per intent so switching never clears what was typed.
  const [drafts, setDrafts] = useState<Record<Intent, string>>({ find: "", offer: "" });
  const text = drafts[intent];
  const setText = (v: string) => setDrafts((d) => ({ ...d, [intent]: v }));
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({
    prefill: (i, v) => {
      setIntent(i);
      setDrafts((d) => ({ ...d, [i]: v }));
      setError(false);
      area.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      setTimeout(() => area.current?.focus({ preventScroll: true }), 50);
    },
  }));
  const [error, setError] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const c = COPY[intent];

  const choose = (i: Intent) => { setIntent(i); setError(false); };
  const onTabKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next: Intent = e.key === "Home" ? "find" : e.key === "End" ? "offer" : intent === "find" ? "offer" : "find";
    choose(next);
    tabs.current[next === "find" ? 0 : 1]?.focus();
  };

  const submit = () => {
    const v = text.trim();
    if (!v) { setError(true); return; }
    if (intent === "find") navigate({ to: "/explore", search: { q: v.slice(0, 120) } });
    else {
      const d = draftFromText(v);
      saveOfferDraft(d);
      navigate({ to: "/offer", search: { title: d.title } });
    }
  };

  const intents: { k: Intent; icon: typeof Search; label: TKey }[] = [
    { k: "find", icon: Search, label: "hh_find" },
    { k: "offer", icon: Rocket, label: "hh_offer" },
  ];

  const d = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

  return (
    <section className="bg-ink-hero relative overflow-hidden" aria-labelledby={`${id}-h`}>
      <BrandBackdrop variant="hero" intent={intent} />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-20">
        <div className="text-center lg:text-start">
          <p className="enter hero-badge inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 bg-ink/50 px-3 py-1 text-xs font-semibold text-ink-muted">
            <span className="badge-dot size-1.5 rounded-full bg-lime" aria-hidden />{t("hh_eyebrow")}
          </p>
          <h1 id={`${id}-h`} className="enter display-title mt-5 text-4xl sm:text-5xl xl:text-6xl" style={d(60)}>
            {t("hh_title_1")}{" "}
            {/* Signature: the highlight sits on a hand-drawn lime route (drawn once; static without motion). */}
            <span className="relative inline-block text-lime">
              {t("hh_title_hl")}
              <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-2 h-3 w-full rtl:-scale-x-100">
                <path d="M2 9 C 40 2, 70 13, 104 7 S 168 3, 198 8" pathLength={1} fill="none" strokeWidth="3" strokeLinecap="round" className="loop-draw stroke-lime/80" />
              </svg>
            </span>
          </h1>
          <p className="enter mx-auto mt-5 max-w-xl text-lg text-ink-muted lg:mx-0" style={d(120)}>{t("hh_sub")}</p>
          <nav aria-labelledby={`${id}-jump`} className="enter mt-8 hidden lg:block" style={d(180)}>
            <p id={`${id}-jump`} className="text-sm font-semibold text-ink-muted">{t("hh_jump")}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {JUMP.map((cid) => {
                const cat = CATEGORIES.find((c) => c.id === cid);
                const Icon = CATEGORY_ICONS[cid];
                return cat ? (
                  <li key={cid}>
                    <Link to="/explore" search={{ category: cid }} className="chip-dark"><Icon className="size-4 text-lime" aria-hidden />{t(cat.key)}</Link>
                  </li>
                ) : null;
              })}
            </ul>
          </nav>
        </div>

        <div className="enter-lift mx-auto w-full max-w-xl lg:max-w-none" style={d(40)}>
          <div role="tablist" aria-label={t("hh_intent")} onKeyDown={onTabKey} data-intent={intent} className="intent-switch">
            <span className="intent-indicator" aria-hidden />
            {intents.map((it, i) => {
              const on = intent === it.k;
              return (
                <button
                  key={it.k}
                  ref={(el) => { tabs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${it.k}`}
                  aria-selected={on}
                  aria-controls={`${id}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => choose(it.k)}
                  className="intent-tab text-sm sm:text-base"
                >
                  <it.icon className="size-4 shrink-0" aria-hidden />{t(it.label)}
                </button>
              );
            })}
          </div>

          <form
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${intent}`}
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mt-3 rounded-3xl bg-card p-4 text-start text-card-foreground shadow-raised ring-1 ring-ink-foreground/10 sm:p-6"
          >
            {/* Only the intent-specific copy is re-keyed (short cross-fade); the textarea is never remounted. */}
            <label key={`q-${intent}`} htmlFor={`${id}-text`} className="swap-in block text-base font-bold">{t(c.q)}</label>
            <textarea
              ref={area}
              id={`${id}-text`}
              dir="auto"
              rows={3}
              maxLength={300}
              value={text}
              onChange={(e) => { setText(e.target.value); if (error) setError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
              placeholder={t(c.ph)}
              aria-invalid={error}
              aria-describedby={`${id}-help${error ? ` ${id}-err` : ""}`}
              className="field mt-2 min-h-24 resize-y py-3"
            />
            <p key={`h-${intent}`} id={`${id}-help`} className="swap-in mt-2 text-sm text-muted-foreground">{t(c.help)}</p>
            {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-semibold text-destructive">{t("hh_need_text")}</p>}

            <p className="mt-4 text-sm font-semibold" id={`${id}-ex`}>{t("hh_examples")}</p>
            <ul key={`ex-${intent}`} aria-labelledby={`${id}-ex`} className="swap-in mt-2 flex flex-wrap gap-2">
              {c.ex.map((k) => (
                <li key={k}>
                  <button type="button" className="chip whitespace-normal text-start" aria-pressed={text === t(k)} onClick={() => { setText(t(k)); setError(false); area.current?.focus({ preventScroll: true }); }}>{t(k)}</button>
                </li>
              ))}
            </ul>

            <button type="submit" className="btn btn-lime mt-5 w-full">
              {t(c.cta)}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </button>
            <div className="mt-3 text-center">
              <Link to="/explore" className="link-sea inline-flex min-h-11 items-center gap-1.5 text-sm">
                <LayoutGrid className="size-4" aria-hidden />{t("hh_browse")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
});
