/**
 * Production wiring for the offer assistant: Groq provider, Supabase token check, Supabase quota RPCs.
 * The quota functions (migration 20261024160000_ai_quota.sql) are called with the user's OWN token plus the server-only
 * AI_QUOTA_SECRET (Worker secret); without that secret the database records nothing, so users can't call them usefully.
 * Limits live in the database (private.ai_settings). Until the migration is applied: development falls back to
 * in-memory limits (per server instance, best effort, using the AI_* env values); production answers "unavailable".
 */
import { publicSupabase } from "@/integrations/supabase/client";
import { createRateLimiter } from "@/lib/rate-limit.server";
import { serverEnv } from "@/lib/server/env";
import { groqProvider } from "./groq";
import type { AssistDeps, QuotaCaps, QuotaOutcome, QuotaResult } from "./offer-assist-handler";

const DAY_MS = 24 * 60 * 60 * 1000;
const devLimiters = new Map<string, ReturnType<typeof createRateLimiter>>();
const limiter = (key: string, limit: number, windowMs: number) => {
  const k = `${key}:${limit}:${windowMs}`;
  if (!devLimiters.has(k)) devLimiters.set(k, createRateLimiter({ limit, windowMs }));
  return devLimiters.get(k)!;
};

function devQuota(userId: string, caps: QuotaCaps): QuotaOutcome {
  if (!limiter("cooldown", 1, caps.cooldownSeconds * 1000)(userId).ok) return "cooldown";
  if (!limiter("user", caps.userDaily, DAY_MS)(userId).ok) return "user_limit";
  if (!limiter("global", caps.globalDaily, DAY_MS)("all").ok) return "global_limit";
  return "ok";
}

function supabaseRest() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || serverEnv("SUPABASE_URL");
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || serverEnv("SUPABASE_PUBLISHABLE_KEY");
  return url && key ? { url, key } : null;
}

const OUTCOMES = new Set<QuotaOutcome>(["ok", "cooldown", "user_limit", "global_limit", "busy"]);

async function rpcQuota(token: string): Promise<QuotaResult | "missing"> {
  const rest = supabaseRest();
  const secret = serverEnv("AI_QUOTA_SECRET");
  if (!rest) return { outcome: "unavailable" };
  const res = await fetch(`${rest.url}/rest/v1/rpc/consume_ai_quota`, {
    method: "POST",
    headers: { apikey: rest.key, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ p_secret: secret ?? "" }),
  });
  if (res.status === 404) return "missing"; // function not created yet (migration not applied)
  if (!res.ok || !secret) return { outcome: "unavailable" };
  const out = (await res.json().catch(() => null)) as { outcome?: unknown; slot?: unknown } | null;
  // "forbidden" (wrong/missing secret) and anything unexpected → unavailable, never "ok".
  const outcome = typeof out?.outcome === "string" && OUTCOMES.has(out.outcome as QuotaOutcome) ? (out.outcome as QuotaOutcome) : "unavailable";
  return typeof out?.slot === "string" ? { outcome, slot: out.slot } : { outcome };
}

async function rpcRelease(token: string, slot: string): Promise<void> {
  const rest = supabaseRest();
  const secret = serverEnv("AI_QUOTA_SECRET");
  if (!rest || !secret) return;
  await fetch(`${rest.url}/rest/v1/rpc/release_ai_quota`, {
    method: "POST",
    headers: { apikey: rest.key, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ p_secret: secret, p_slot: slot }),
  });
}

export function defaultDeps(): AssistDeps {
  return {
    env: serverEnv,
    verifyUser: async (token) => {
      const { data, error } = await publicSupabase.auth.getClaims(token);
      const sub = !error ? data?.claims?.sub : undefined;
      return typeof sub === "string" && sub ? sub : null;
    },
    consumeQuota: async (token, userId, caps) => {
      const r = await rpcQuota(token);
      if (r !== "missing") return r;
      return { outcome: import.meta.env.DEV ? devQuota(userId, caps) : "unavailable" };
    },
    releaseQuota: async (token, _userId, slot) => rpcRelease(token, slot),
    makeProvider: ({ apiKey, model }) => groqProvider({ apiKey, model }),
    log: (e) => console.info(JSON.stringify(e)),
  };
}
