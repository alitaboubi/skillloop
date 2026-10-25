import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LEGAL, LEGAL_UPDATED, hasPlaceholders, splitPlaceholders, type LegalKind } from "@/lib/legal";
import { PageIntro } from "@/components/page-sections";

/** Highlights [PLACEHOLDER: …] so a missing fact can never pass for real text. */
function Text({ text }: { text: string }) {
  return (
    <>
      {splitPlaceholders(text).map((p, i) =>
        p.placeholder ? <mark key={i} className="rounded bg-warning/40 px-1 font-semibold text-foreground">{p.text}</mark> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

/** Privacy policy / terms page: intro, last update, contents, sections (content in src/lib/legal.ts). */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, lang } = useI18n();
  const doc = LEGAL[kind][lang];
  const draft = hasPlaceholders(kind);
  const updated = new Intl.DateTimeFormat(lang === "ar" ? "ar-TN" : lang, { dateStyle: "long" }).format(new Date(`${LEGAL_UPDATED}T12:00:00Z`));
  const other: LegalKind = kind === "privacy" ? "terms" : "privacy";
  return (
    <>
      <PageIntro kicker={t("legal_kicker")} title={t(kind === "privacy" ? "privacy_title" : "terms_title")} sub={doc.intro} />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[14rem_minmax(0,1fr)] md:py-14">
        <aside className="md:sticky md:top-24 md:h-fit">
          <p className="text-sm text-muted-foreground">{t("legal_updated", { d: updated })}</p>
          <nav aria-label={t("legal_toc")} className="mt-4">
            <p className="eyebrow">{t("legal_toc")}</p>
            <ol className="mt-2 space-y-1 text-sm">
              {doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="inline-flex min-h-8 items-center text-muted-foreground hover:text-foreground">{s.h}</a></li>)}
            </ol>
          </nav>
          <Link to={other === "privacy" ? "/privacy" : "/terms"} className="link-sea mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm">
            <FileText className="size-4" aria-hidden />{t(other === "privacy" ? "privacy_title" : "terms_title")}
          </Link>
        </aside>
        <article className="min-w-0">
          {draft && <p role="note" className="mb-8 rounded-2xl border border-warning bg-warning/15 p-4 text-sm font-medium">{t("legal_draft")}</p>}
          <div className="space-y-10">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
                <h2 id={`${s.id}-h`} className="text-xl font-bold"><span className="me-2 tabular-nums text-sea">{i + 1}.</span>{s.h}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-foreground/90">
                  {s.body.map((b, j) =>
                    Array.isArray(b)
                      ? <ul key={j} className="list-disc space-y-1.5 ps-5 marker:text-clay">{b.map((x, k) => <li key={k}><Text text={x} /></li>)}</ul>
                      : <p key={j}><Text text={b} /></p>,
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}
