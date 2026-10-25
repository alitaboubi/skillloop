import type { ProviderResult, TextProvider } from "./provider";

/** Groq's OpenAI-compatible chat endpoint, called with plain fetch (no SDK dependency). */
export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Error codes meaning "this model/key can't serve requests" rather than a one-off failure. */
const UNAVAILABLE_CODES = /model_(not_found|decommissioned)|model_not_active|invalid_api_key|permission/i;

async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { code?: unknown; type?: unknown } };
    const code = body?.error?.code ?? body?.error?.type;
    return typeof code === "string" ? code.slice(0, 60) : "";
  } catch {
    return "";
  }
}

/** Account limits reported by Groq on each response (header values only; never the key or content). */
export type GroqRateLimits = { limitRequests?: string | undefined; remainingRequests?: string | undefined; limitTokens?: string | undefined; remainingTokens?: string | undefined };

/**
 * Groq provider. The API key is read by the caller from the server environment and only ever placed in the
 * Authorization header; it is never logged or returned. gpt-oss models: low reasoning, reasoning not returned,
 * strict JSON-schema output.
 */
export function groqProvider(opts: { apiKey: string; model: string; fetchImpl?: typeof fetch; onRateLimits?: (l: GroqRateLimits) => void }): TextProvider {
  const doFetch = opts.fetchImpl ?? fetch;
  return async (req): Promise<ProviderResult> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), req.timeoutMs);
    try {
      const res = await doFetch(GROQ_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: opts.model,
          messages: req.messages,
          temperature: 0.4,
          max_completion_tokens: req.maxTokens,
          ...(opts.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
          response_format: { type: "json_schema", json_schema: { name: "offer_field_suggestion", strict: true, schema: req.schema } },
        }),
        signal: ctrl.signal,
      });
      if (opts.onRateLimits) {
        const h = (n: string) => res.headers.get(n) ?? undefined;
        opts.onRateLimits({ limitRequests: h("x-ratelimit-limit-requests"), remainingRequests: h("x-ratelimit-remaining-requests"),
          limitTokens: h("x-ratelimit-limit-tokens"), remainingTokens: h("x-ratelimit-remaining-tokens") });
      }
      if (res.status === 429) return { ok: false, reason: "rate_limited", detail: "http_429" };
      if (!res.ok) {
        const code = await errorCode(res);
        const unavailable = [401, 403, 404].includes(res.status) || UNAVAILABLE_CODES.test(code);
        return { ok: false, reason: unavailable ? "unavailable" : "failed", detail: `http_${res.status}${code ? `:${code}` : ""}` };
      }
      const body = (await res.json().catch(() => null)) as { choices?: { message?: { content?: unknown } }[]; usage?: { total_tokens?: unknown } } | null;
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== "string") return { ok: false, reason: "failed", detail: "malformed_response" };
      const tokens = typeof body?.usage?.total_tokens === "number" ? body.usage.total_tokens : undefined;
      return tokens === undefined ? { ok: true, content } : { ok: true, content, tokens };
    } catch (e) {
      return { ok: false, reason: "failed", detail: ctrl.signal.aborted ? "timeout" : e instanceof Error ? e.name.slice(0, 40) : "network" };
    } finally {
      clearTimeout(timer);
    }
  };
}
