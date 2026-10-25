/**
 * Offer-writing assistance: typed request/response, the adapter seam, and the pure rules the UI relies on.
 *
 * The browser calls the server route POST /api/offer-assist (src/routes/api/offer-assist.ts) with the user's Supabase
 * access token; the route (src/lib/server/ai/) checks the kill switch, sign-in, input, quotas, calls the provider
 * (Groq, replaceable) with a server-only key, and validates the answer. The browser never sees the key or the model.
 * The UI handles success, unavailable, rate_limited (cooldown vs daily limit) and failed.
 */
import type { Lang } from "@/lib/i18n";
import { LIMITS } from "@/lib/offer-wizard";

export type AssistField = "title" | "description" | "deliverables";
export type AssistMode = "write" | "improve";
export type AssistTone = "clear" | "professional" | "friendly" | "detailed";

/** Only what the model needs: the field, the provider's own words and minimal listing context. No ids, emails or tokens. */
export type OfferAssistanceInput = {
  field: AssistField;
  mode: AssistMode;
  current: string;
  brief: string;
  lang: Lang;
  tone: AssistTone;
  context: { title?: string; category?: string; description?: string };
};

/** Why a request was rate-limited: a short wait (own cooldown, everyone's per-minute cap, provider), or a daily allowance. */
export type AssistLimit = "cooldown" | "busy" | "user_limit" | "global_limit" | "provider";

export type OfferAssistanceResult =
  | { status: "success"; text: string; explanation?: string; demo?: boolean }
  | { status: "unavailable" }
  | { status: "error"; reason: "rate_limited"; limit?: AssistLimit }
  | { status: "error"; reason: "invalid_input" | "failed" };

export type OfferAssistAdapter = (input: OfferAssistanceInput) => Promise<OfferAssistanceResult>;

export const FIELD_LIMITS: Record<AssistField, number> = { title: LIMITS.title, description: LIMITS.description, deliverables: LIMITS.deliverables };
export const BRIEF_MIN = 10;
export const BRIEF_MAX = 500;

/** Rules the future server prompt must enforce (kept here so UI copy and prompt stay aligned). */
export const CONTENT_RULES = [
  "Write only from facts the provider gave; never invent prices, deadlines, availability, credentials, certifications, reviews or guarantees.",
  "Answer in the requested language (fr, en, or Tunisian Arabic in Arabic script).",
  "Stay within the field's character limit; deliverables are one item per line.",
] as const;

/** Temporary adapter: the AI is not connected yet. Returns immediately — no simulated delay, no invented text. */
export const notConnectedAdapter: OfferAssistAdapter = async () => ({ status: "unavailable" });

/**
 * Development-only demo so reviewers can exercise insert/replace/edit. It does NOT generate anything:
 * it hands back the provider's own words (lightly reshaped) and the UI labels it "Demo · not AI".
 */
export const demoAdapter: OfferAssistAdapter = async (i) => {
  const source = (i.mode === "improve" ? i.current : i.brief || i.context.description || "").trim();
  const text = i.field === "deliverables"
    ? source.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean).join("\n")
    : i.field === "title" ? source.split(/[.!?\n]/)[0]!.trim().slice(0, FIELD_LIMITS.title) : source;
  return { status: "success", text, demo: true };
};

const LIMITS_SET = new Set<AssistLimit>(["cooldown", "busy", "user_limit", "global_limit", "provider"]);

/** Maps the server route's answer to the UI's result; anything unexpected is a plain failure. */
export function parseServerResult(status: number, body: unknown): OfferAssistanceResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (status === 200 && b["status"] === "success" && typeof b["text"] === "string" && b["text"].trim()) {
    return typeof b["explanation"] === "string" && b["explanation"] ? { status: "success", text: b["text"], explanation: b["explanation"] } : { status: "success", text: b["text"] };
  }
  if (status === 429) {
    const limit = b["limit"];
    return typeof limit === "string" && LIMITS_SET.has(limit as AssistLimit) ? { status: "error", reason: "rate_limited", limit: limit as AssistLimit } : { status: "error", reason: "rate_limited" };
  }
  if (status === 503 || status === 401) return { status: "unavailable" };
  if (status === 400 || status === 413) return { status: "error", reason: "invalid_input" };
  return { status: "error", reason: "failed" };
}

/** Real adapter: the server route, authenticated with the signed-in user's own access token. */
export const serverAdapter: OfferAssistAdapter = async (input) => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { status: "unavailable" };
  const res = await fetch("/api/offer-assist", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseServerResult(res.status, await res.json().catch(() => null));
};

export function resolveAdapter(): OfferAssistAdapter {
  if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ai_demo")) return demoAdapter;
  return serverAdapter;
}

/** Brief rules: writing needs a real description; improving and titles can work without one. */
export function briefProblem(field: AssistField, mode: AssistMode, brief: string): "short" | "long" | null {
  const b = brief.trim();
  if (b.length > BRIEF_MAX) return "long";
  if (field !== "title" && mode === "write" && b.length < BRIEF_MIN) return "short";
  return null;
}

/** Single entry point for the UI. Validates, calls the adapter, and normalises every failure. */
export async function generateOfferAssistance(input: OfferAssistanceInput, adapter: OfferAssistAdapter = resolveAdapter()): Promise<OfferAssistanceResult> {
  if (briefProblem(input.field, input.mode, input.brief)) return { status: "error", reason: "invalid_input" };
  if (input.mode === "improve" && !input.current.trim()) return { status: "error", reason: "invalid_input" };
  try {
    const r = await adapter(input);
    if (r.status === "success") {
      const text = r.text.trim();
      return text ? { ...r, text } : { status: "error", reason: "failed" };
    }
    return r;
  } catch {
    return { status: "error", reason: "failed" };
  }
}

export type ApplyHow = "use" | "append" | "replace";
export type ApplyResult = { ok: true; value: string } | { ok: false; reason: "empty" | "needs_confirm" | "too_long"; length?: number };

/**
 * Turns a reviewed suggestion into the new field value. Existing text is never replaced without `confirmed`;
 * the result must fit the field — nothing is silently cut.
 */
export function applySuggestion(current: string, suggestion: string, how: ApplyHow, max: number, joiner = "\n\n", confirmed = false): ApplyResult {
  const s = suggestion.trim();
  if (!s) return { ok: false, reason: "empty" };
  const hasText = !!current.trim();
  if (hasText && how !== "append" && !confirmed) return { ok: false, reason: "needs_confirm" };
  const value = how === "append" && hasText ? `${current.trimEnd()}${joiner}${s}` : s;
  if (value.length > max) return { ok: false, reason: "too_long", length: value.length };
  return { ok: true, value };
}

/** Client-side cooldown between requests (the server will enforce its own limits too). */
export function createCooldown(ms: number) {
  let last = -Infinity;
  return {
    tryStart(now = Date.now()) { if (now - last < ms) return false; last = now; return true; },
    remaining(now = Date.now()) { return Math.max(0, ms - (now - last)); },
  };
}
