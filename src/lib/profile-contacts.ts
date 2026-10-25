/** Public contact rules shared by the editor (validation) and the public profile (safe links only). */
export const CONTACT_KINDS = ["phone", "whatsapp", "website", "facebook", "instagram", "linkedin"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** Social links must point at the platform they are labelled as, so a "Instagram" row can't lead elsewhere. */
const HOSTS: Partial<Record<ContactKind, string[]>> = {
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  linkedin: ["linkedin.com"],
};

const isPhoneKind = (k: string) => k === "phone" || k === "whatsapp";

export type ContactCheck = { value: string; error?: undefined } | { value?: undefined; error: "err_contact_phone" | "err_link" | "err_link_host" };

/** Normalises what the provider typed; empty input means "no contact" and is valid. */
export function normalizeContact(kind: ContactKind, raw: string): ContactCheck {
  const v = raw.trim();
  if (!v) return { value: "" };
  if (isPhoneKind(kind)) {
    const tidy = v.replace(/\s+/g, " ");
    const digits = tidy.replace(/\D/g, "");
    return /^\+?[\d\s-]+$/.test(tidy) && digits.length >= 8 && digits.length <= 15 && tidy.length <= 20 ? { value: tidy } : { error: "err_contact_phone" };
  }
  const withScheme = /^https?:\/\//i.test(v) ? v.replace(/^http:\/\//i, "https://") : `https://${v}`;
  let url: URL;
  try { url = new URL(withScheme); } catch { return { error: "err_link" }; }
  if (url.protocol !== "https:" || !url.hostname.includes(".") || withScheme.length > 500) return { error: "err_link" };
  const hosts = HOSTS[kind];
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  if (hosts && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) return { error: "err_link_host" };
  return { value: url.href };
}

/** Only well-formed values are ever rendered publicly (covers older rows saved before validation existed). */
export function isPublicContactValid(kind: string, value: string): boolean {
  if (!(CONTACT_KINDS as readonly string[]).includes(kind)) return false;
  const v = value.trim();
  return !!normalizeContact(kind as ContactKind, v).value && (isPhoneKind(kind) || v.startsWith("https://"));
}

/** Link target for a public contact. WhatsApp uses wa.me; 8-digit local numbers get Tunisia's +216. */
export function contactHref(kind: string, value: string): string {
  const digits = value.replace(/\D/g, "");
  if (kind === "phone") return `tel:${value.trim().startsWith("+") ? "+" : ""}${digits}`;
  if (kind === "whatsapp") return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
  return value.trim();
}

/** Short display text: numbers as typed, links without the scheme and www. */
export function contactLabel(kind: string, value: string): string {
  return isPhoneKind(kind) ? value.trim() : value.trim().replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export type ContactRow = { id: string; kind: string; value: string; is_public: boolean };
export type ContactDraft = { value: string; isPublic: boolean };
export type ContactOp =
  | { op: "insert"; kind: ContactKind; value: string; is_public: boolean }
  | { op: "update"; id: string; value: string; is_public: boolean }
  | { op: "delete"; id: string };

/** Minimal writes to turn the saved rows into the drafts (one row per kind, enforced by unique(owner_id, kind)). */
export function contactOps(saved: ContactRow[], drafts: Record<ContactKind, ContactDraft>): ContactOp[] {
  const ops: ContactOp[] = [];
  for (const kind of CONTACT_KINDS) {
    const row = saved.find((r) => r.kind === kind);
    const d = drafts[kind];
    if (!d.value) { if (row) ops.push({ op: "delete", id: row.id }); continue; }
    if (!row) ops.push({ op: "insert", kind, value: d.value, is_public: d.isPublic });
    else if (row.value !== d.value || row.is_public !== d.isPublic) ops.push({ op: "update", id: row.id, value: d.value, is_public: d.isPublic });
  }
  return ops;
}
