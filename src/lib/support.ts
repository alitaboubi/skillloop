import type { TKey } from "@/lib/i18n";

/**
 * Help & support (the round button on every page). Three layers, each honest about what exists:
 *   1. Quick answers (always): short, true answers + a link to the right page.
 *   2. Chat with the team (VITE_SUPPORT=on, after migration 20261106130000_support.sql — PREPARED, not applied — and the
 *      admin migration, so someone can answer from /admin): one conversation per signed-in user.
 *   3. Direct contact (always): the contact address from the legal pages and SkillLoop's WhatsApp (SUPPORT_WHATSAPP_DEFAULT,
 *      or VITE_SUPPORT_WHATSAPP).
 * While the chat is off, nothing reads or writes the support tables.
 */
export const SUPPORT_CHAT_ENABLED = import.meta.env["VITE_SUPPORT"] === "on";
export const SUPPORT_EMAIL = "contact@skillloop.tn";
export const SUPPORT_MAX = 2000;
export const OPEN_SUPPORT_EVENT = "skillloop:support-open";

/** "+216 22 123 456", "22123456", "0021622123456" → "21622123456"; anything else → null (WhatsApp hidden). */
export function normalizeWhatsApp(raw: string | undefined | null): string | null {
  const digits = (raw ?? "").replace(/[\s().-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 8) return `216${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}
/** SkillLoop's public WhatsApp (help panel « Nous contacter », video sheet). VITE_SUPPORT_WHATSAPP can replace it. */
export const SUPPORT_WHATSAPP_DEFAULT = "+21621774202";
export const SUPPORT_WHATSAPP = normalizeWhatsApp((import.meta.env["VITE_SUPPORT_WHATSAPP"] as string | undefined) || SUPPORT_WHATSAPP_DEFAULT);
/** "21621774202" → "+216 21 774 202" (shown next to the button). */
export const formatWhatsApp = (n: string) => (/^216\d{8}$/.test(n) ? `+216 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`);

export const whatsappUrl = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
export const mailtoUrl = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

/** Validation mirrored from the database check (trimmed 1–2000 characters). */
export function checkBody(body: string): "empty" | "too_long" | null {
  const b = body.trim();
  if (!b) return "empty";
  return b.length > SUPPORT_MAX ? "too_long" : null;
}

/** The page the user writes from, as an internal path only (no query string or hash: they may hold personal data). */
export function pagePath(pathname: string): string | null {
  const p = pathname.split(/[?#]/)[0] ?? "";
  return p.startsWith("/") ? p.slice(0, 200) : null;
}

/** Database errors → message keys (rate limit, signed out, anything else). */
export function supportErrorKey(err: unknown): TKey {
  const m = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  if (m.includes("support_limit")) return "sup_err_limit";
  if (m.includes("not_signed_in") || m.includes("JWT")) return "sup_err_signin";
  return "sup_err_send";
}

export type SupportMessage = { id: string; fromTeam: boolean; body: string; createdAt: string; pending?: boolean };

/** Team replies newer than the user's read marker. */
export function unreadFromTeam(messages: SupportMessage[], userReadAt: string | null): number {
  const since = userReadAt ? Date.parse(userReadAt) : -Infinity;
  return messages.filter((m) => m.fromTeam && Date.parse(m.createdAt) > since).length;
}

/**
 * Pages with their own bar at the bottom of a phone screen (composer, request bar, wizard footer): the floating button
 * would cover it, so on phones it hides there (help stays in the menu). Desktop always shows it.
 */
export function launcherHiddenOnPhone(pathname: string): boolean {
  return /^\/(messages|offer|checkout|services\/[^/]+)\/?$/.test(pathname);
}

export type HelpTopic = { id: string; q: TKey; a: TKey; cta?: { label: TKey; to: string; search?: Record<string, string> } };

/** Quick answers. Every claim here is true today; keep it that way when the product changes. */
export const HELP_TOPICS: HelpTopic[] = [
  { id: "request", q: "sup_q_request", a: "sup_a_request", cta: { label: "sup_cta_explore", to: "/explore" } },
  { id: "publish", q: "sup_q_publish", a: "sup_a_publish", cta: { label: "sup_cta_publish", to: "/offer" } },
  { id: "no_reply", q: "sup_q_no_reply", a: "sup_a_no_reply", cta: { label: "sup_cta_messages", to: "/messages" } },
  { id: "free", q: "sup_q_free", a: "sup_a_free" },
  { id: "account", q: "sup_q_account", a: "sup_a_account", cta: { label: "sup_cta_password", to: "/forgot-password" } },
  { id: "safety", q: "sup_q_safety", a: "sup_a_safety" },
];

/** A message written for the user to send (they can still change it). `id` makes each opening a new draft. */
export type SupportDraft = { id: number; text: string };
export type SupportOpen = { topic: "chat" | null; draft: SupportDraft | null };

/** Opens the support panel from anywhere (account menu, footer, a notification), optionally with a ready message. */
export function openSupport(topic?: "chat", draft?: string) {
  const detail: SupportOpen = { topic: topic ?? null, draft: draft ? { id: Date.now(), text: draft.slice(0, SUPPORT_MAX) } : null };
  window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT, { detail }));
}
