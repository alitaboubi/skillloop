/**
 * POST /api/offer-assist — server side of the offer-writing assistant (route: src/routes/api/offer-assist.ts).
 * Order: kill switch → sign-in → body size → input → quota → provider → output checks. Every failure maps to the
 * client's existing states (unavailable / rate_limited / invalid_input / failed); creating a service never depends on it.
 * Logs carry outcome, field, language, latency and token count only — never text, keys or user ids.
 */
import { z } from "zod";
import { BRIEF_MAX, FIELD_LIMITS, briefProblem, type OfferAssistanceInput } from "@/lib/ai/offer-assist";
import { DEFAULT_MAX_TOKENS, OUTPUT_SCHEMA, buildMessages, validateOutput } from "@/lib/ai/offer-prompt";
import { intSetting } from "@/lib/server/env";
import type { TextProvider } from "./provider";

export const MAX_BODY_BYTES = 16 * 1024;

export type QuotaOutcome = "ok" | "cooldown" | "user_limit" | "global_limit" | "busy" | "unavailable";
export type QuotaResult = { outcome: QuotaOutcome; slot?: string };
export type QuotaCaps = { userDaily: number; globalDaily: number; cooldownSeconds: number };

export type AssistDeps = {
  env: (name: string) => string | undefined;
  /** User id for a valid Supabase access token, else null. */
  verifyUser: (token: string) => Promise<string | null>;
  /** Takes one AI slot for this user (called with the user's own token), or says why not. `slot` identifies it. */
  consumeQuota: (token: string, userId: string, caps: QuotaCaps) => Promise<QuotaResult>;
  /** Gives the slot back — only when the provider produced nothing (rate-limited or unavailable). */
  releaseQuota?: (token: string, userId: string, slot: string) => Promise<void>;
  makeProvider: (cfg: { apiKey: string; model: string }) => TextProvider;
  log?: (event: Record<string, string | number>) => void;
  now?: () => number;
};

const ctx = z.object({ title: z.string().max(FIELD_LIMITS.title).optional(), category: z.string().max(40).optional(), description: z.string().max(FIELD_LIMITS.description).optional() }).strict();
const inputSchema = z.object({
  field: z.enum(["title", "description", "deliverables"]),
  mode: z.enum(["write", "improve"]),
  current: z.string().max(FIELD_LIMITS.description),
  brief: z.string().max(BRIEF_MAX),
  lang: z.enum(["fr", "en", "ar"]),
  tone: z.enum(["clear", "professional", "friendly", "detailed"]),
  context: ctx,
}).strict();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function aiSettings(env: AssistDeps["env"]) {
  return {
    enabled: env("AI_ENABLED") === "true",
    apiKey: env("GROQ_API_KEY"),
    model: env("GROQ_MODEL"),
    caps: {
      userDaily: intSetting(env("AI_USER_DAILY"), 10, 1, 50),
      globalDaily: intSetting(env("AI_GLOBAL_DAILY"), 120, 1, 2000),
      cooldownSeconds: intSetting(env("AI_USER_COOLDOWN_SECONDS"), 10, 3, 600),
    },
    timeoutMs: intSetting(env("AI_TIMEOUT_MS"), 15000, 3000, 30000),
  };
}

export async function handleOfferAssist(request: Request, deps: AssistDeps): Promise<Response> {
  const started = (deps.now ?? Date.now)();
  const log = (outcome: string, extra: Record<string, string | number> = {}) =>
    deps.log?.({ event: "offer_assist", outcome, ms: (deps.now ?? Date.now)() - started, ...extra });

  if (request.method !== "POST") return json(405, { status: "error", reason: "invalid_input" });
  const s = aiSettings(deps.env);
  if (!s.enabled || !s.apiKey || !s.model) { log("disabled"); return json(503, { status: "unavailable" }); }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const userId = token.split(".").length === 3 ? await deps.verifyUser(token).catch(() => null) : null;
  if (!userId) { log("unauthenticated"); return json(401, { status: "unavailable" }); }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) { log("too_large"); return json(413, { status: "error", reason: "invalid_input" }); }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) { log("too_large"); return json(413, { status: "error", reason: "invalid_input" }); }

  let input: OfferAssistanceInput;
  try {
    input = inputSchema.parse(JSON.parse(raw)) as OfferAssistanceInput;
  } catch {
    log("invalid_input");
    return json(400, { status: "error", reason: "invalid_input" });
  }
  if (input.current.length > FIELD_LIMITS[input.field] || briefProblem(input.field, input.mode, input.brief) || (input.mode === "improve" && !input.current.trim())) {
    log("invalid_input", { field: input.field });
    return json(400, { status: "error", reason: "invalid_input" });
  }

  const quota = await deps.consumeQuota(token, userId, s.caps).catch((): QuotaResult => ({ outcome: "unavailable" }));
  if (quota.outcome === "unavailable") { log("quota_unavailable"); return json(503, { status: "unavailable" }); }
  if (quota.outcome !== "ok") { log(quota.outcome, { field: input.field }); return json(429, { status: "error", reason: "rate_limited", limit: quota.outcome }); }

  const provider = deps.makeProvider({ apiKey: s.apiKey, model: s.model });
  const result = await provider({
    messages: buildMessages(input),
    maxTokens: intSetting(deps.env(`AI_MAX_TOKENS_${input.field.toUpperCase()}`), DEFAULT_MAX_TOKENS[input.field], 64, 4000),
    schema: OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    timeoutMs: s.timeoutMs,
  });
  if (!result.ok) {
    log(`provider_${result.reason}`, { field: input.field, lang: input.lang, detail: result.detail });
    // The user got nothing back: give the daily slot back (it still counts for cooldown and the per-minute cap).
    // That covers 429 / unavailable and a model answer Groq itself rejected (json_validate_failed). Timeouts and
    // server errors stay counted.
    const nothingUsable = result.reason !== "failed" || result.detail.includes("json_validate_failed");
    if (nothingUsable && quota.slot) await deps.releaseQuota?.(token, userId, quota.slot).catch(() => undefined);
    if (result.reason === "rate_limited") return json(429, { status: "error", reason: "rate_limited", limit: "provider" });
    if (result.reason === "unavailable") return json(503, { status: "unavailable" });
    return json(502, { status: "error", reason: "failed" });
  }
  const out = validateOutput(result.content, input);
  if (!out.ok) {
    log(`rejected_${out.why}`, { field: input.field, lang: input.lang, ...(result.tokens ? { tokens: result.tokens } : {}) });
    return json(502, { status: "error", reason: "failed" });
  }
  log("success", { field: input.field, lang: input.lang, ...(result.tokens ? { tokens: result.tokens } : {}) });
  return json(200, { status: "success", text: out.text, ...(out.explanation ? { explanation: out.explanation } : {}) });
}
