import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BrandBackdrop, PointerField } from "@/components/brand";

/** Page introduction in the homepage hero style (single h1 per page). */
export function PageIntro({ kicker, title, sub, children }: { kicker?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className="bg-hero relative overflow-hidden text-navy-foreground">
      <BrandBackdrop variant="intro" />
      <PointerField />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        {kicker && <p className="eyebrow text-clay!">{kicker}</p>}
        <h1 className="display-title mt-2 text-3xl md:text-[2.75rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-navy-muted">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({ title, sub, id }: { title: string; sub?: string; id?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="section-title">{title}</h2>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export type Step = { icon: LucideIcon; title: string; desc: string };

export function ProcessSteps({ steps, label }: { steps: Step[]; label?: string }) {
  return (
    <ol aria-label={label} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={i} className="step-card p-6">
          <span className="flex items-center gap-3">
            <span className="icon-well-clay size-11"><s.icon className="size-5" aria-hidden /></span>
            <span className="text-sm font-bold tabular-nums text-sea">0{i + 1}</span>
          </span>
          <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
          <p className="mt-1 text-muted-foreground">{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

export function BenefitItem({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <span className="icon-well-clay size-10"><Icon className="size-5" aria-hidden /></span>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    // Look inspired by VengeanceUI "FAQ Accordion" (start-edge accent, +/− icon); behaviour stays Radix's accessible accordion.
    <Accordion type="single" collapsible className="faq-list max-w-3xl">
      {items.map((it, i) => (
        <AccordionItem key={i} value={`f${i}`} className="faq-item">
          <AccordionTrigger className="faq-trigger text-start font-semibold">
            <span aria-hidden className="faq-sign" />
            <span className="min-w-0 flex-1">{it.q}</span>
          </AccordionTrigger>
          <AccordionContent className="faq-answer text-muted-foreground">{it.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function FinalCta({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="bg-hero relative overflow-hidden text-navy-foreground">
      <PointerField />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="display-title text-2xl md:text-3xl">{title}</h2>
          {sub && <p className="mt-1 max-w-xl text-navy-muted">{sub}</p>}
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  );
}
