import { peekReturnTo, takeReturnTo } from "./return-to";
/** Homepage → offer form hand-off. Kept in sessionStorage so it survives sign-in / sign-up redirects. */
export const OFFER_DRAFT_KEY = "skillloop.offerDraft";
export type OfferDraft = { title: string; description: string };

/** Short editable title from the description (first sentence, ≤ max chars, word boundary). */
export function suggestTitle(v: string, max = 80): string {
  const one = v.trim().split(/[\n.!?؟]/)[0]!.trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 20 ? cut.slice(0, sp) : cut).trim();
}

/** The full text becomes the description only when it says more than the title. */
export function draftFromText(text: string): OfferDraft {
  const v = text.trim();
  const title = suggestTitle(v);
  return { title, description: v === title ? "" : v };
}

export function saveOfferDraft(d: OfferDraft) {
  try { sessionStorage.setItem(OFFER_DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}
export function readOfferDraft(): OfferDraft | null {
  try {
    const raw = sessionStorage.getItem(OFFER_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<OfferDraft>;
    return typeof d.title === "string" ? { title: d.title, description: typeof d.description === "string" ? d.description : "" } : null;
  } catch { return null; }
}
export function clearOfferDraft() {
  try { sessionStorage.removeItem(OFFER_DRAFT_KEY); } catch { /* ignore */ }
}
/** Default landing after authentication: the offer form while a homepage draft is pending, else the account home. */
export function basePostAuthPath(): "/offer" | "/dashboard" {
  return readOfferDraft() ? "/offer" : "/dashboard";
}
/** Where to land after authentication: a remembered page first (see return-to.ts), then the default. */
export function postAuthPath(): string {
  return peekReturnTo() ?? basePostAuthPath();
}
/** Like postAuthPath, but consumes the remembered page; `resumed` drives the "welcome back" line. */
export function takePostAuthTarget(): { path: string; resumed: boolean } {
  const back = takeReturnTo();
  return back ? { path: back, resumed: true } : { path: basePostAuthPath(), resumed: false };
}

/* ---------- Full wizard draft (create mode) ---------- */

export const WIZARD_DRAFT_KEY = "skillloop.offerWizard";
export const WIZARD_DRAFT_TTL = 24 * 60 * 60 * 1000;
type WizardDraft<F> = { owner: string; savedAt: number; step: number; form: F };

/** Keeps wizard input across reloads in this tab. Scoped to the signed-in account; the photo file is never stored. */
export function saveWizardDraft<F>(owner: string, form: F, step: number, now = Date.now()) {
  try { sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({ owner, savedAt: now, step, form } satisfies WizardDraft<F>)); } catch { /* storage unavailable */ }
}
/** Returns the draft only for the same account and within 24 h; anything else is discarded. */
export function readWizardDraft<F>(owner: string, now = Date.now()): { form: F; step: number } | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<WizardDraft<F>>;
    if (d.owner !== owner || typeof d.savedAt !== "number" || now - d.savedAt > WIZARD_DRAFT_TTL || !d.form || typeof d.form !== "object") {
      sessionStorage.removeItem(WIZARD_DRAFT_KEY);
      return null;
    }
    return { form: d.form, step: typeof d.step === "number" ? d.step : 0 };
  } catch { return null; }
}
export function clearWizardDraft() {
  try { sessionStorage.removeItem(WIZARD_DRAFT_KEY); } catch { /* ignore */ }
}
