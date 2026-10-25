# Offer-writing assistant — Groq integration (implemented server-side; NOT enabled)

**Status (2026-10-24):** Groq approved as provider (decision only). Code implemented and tested with mocks; **no live call
made, AI_ENABLED=false**, quota migration `20261024160000_ai_quota.sql` (revision 2) prepared but **not applied**. Live evaluation,
the migration, any paid usage and deployment each need your separate approval.

## How it works
Browser (`serverAdapter`, `src/lib/ai/offer-assist.ts`) → `POST /api/offer-assist` with the user's own Supabase token →
`src/lib/server/ai/offer-assist-handler.ts`: kill switch → sign-in (`getClaims`) → body ≤ 16 KB → strict input schema →
quota RPC `consume_ai_quota` (user's token; dev-only in-memory fallback until the migration exists; production answers
"unavailable" without it) → Groq (`src/lib/server/ai/groq.ts`, plain fetch, strict JSON schema, low hidden reasoning,
token cap, timeout) → output checks (`src/lib/ai/offer-prompt.ts`: JSON shape, non-empty, field limit never cut,
no contact details, every number must come from the user's text). Provider is one function (`TextProvider`), so another
provider can replace Groq without touching the route or the UI.

## Model
`openai/gpt-oss-20b` (Groq production model, strict structured output; `reasoning_effort: low`, `include_reasoning: false`).
Compare with `openai/gpt-oss-120b` in the live evaluation (Tunisian Arabic quality decides). A removed/unknown model
answers "unavailable" (logged as a code, never with user text). Check console.groq.com/docs/models before changing it.

## Limits
Your account (reported by Groq on 2026-10-25): **1,000 requests/day and 8,000 tokens/minute** for openai/gpt-oss-20b. No
daily token limit was reported, so none is assumed. These figures do **not** establish a daily call capacity.
**Provisional application limits** (in the database, `private.ai_settings`): 10 per user per rolling 24 h, 10 s cooldown,
120 per day for everyone, and **6 per minute for everyone** (burst control: at the ~520–720 tokens per call seen in
run 1, 6 calls stay under 8,000 tokens/minute; longer texts cost more). They are application limits, not a guarantee
that Groq's per-minute limits can't be hit — a Groq 429 is handled ("wait a moment") and the slot is given back.

## Quota trust boundary (revision 2 of the migration)
- Problem in revision 1: any signed-in user could call the quota function directly and record slots without an AI
  call (enough accounts could exhaust the global cap), and the caps came from the caller.
- Now: every call must carry the server's `AI_QUOTA_SECRET` (Worker secret); the database keeps only its SHA-256 hash.
  Wrong or missing secret ⇒ "forbidden", nothing recorded. Calls still use the user's own token (slot = auth.uid()),
  no service-role key. Limits are read from `private.ai_settings`, never from the request. The GraphQL endpoint hits the
  same function, so the same secret check applies.
- Burst: a global per-minute cap (6) besides the daily caps; all checks under per-user + global advisory locks.
- Refund: the route releases its slot only when Groq produced nothing (429 / unavailable); timeouts, server errors and
  rejected answers stay counted.
- Secret setup (after the migration is applied — separate approval): in a terminal
  `AI_QUOTA_SECRET=$(openssl rand -hex 32)` → `printf %s "$AI_QUOTA_SECRET" | sha256sum` (the hash may be shown) →
  SQL Editor: `update private.ai_settings set secret_sha256 = '<hash>';` → Worker secret `AI_QUOTA_SECRET` (and
  `export AI_QUOTA_SECRET` for local dev). The secret itself is never pasted into SQL, chat or files.

## Languages (2026-10-25)
Three separate things: the **input** language (whatever the provider types — French, English, Tunisian Derja in Arabic or
Latin letters), the **explanation** language (follows the brief, e.g. Derja), and the **requested text language** (chosen in
the assistant panel, default = interface language). A Derja brief with French requested gives French text and a Derja
explanation. Choosing a text language never changes the interface language or the saved `preferred_lang`.

## Proposed extension (NOT implemented): profile / bio writing help
Out of the current scope (title, description, deliverables of a service). If wanted: an assistant on the profile bio
field only, sending only the bio brief + current bio text (same redaction, checks and quotas), output language chosen the
same way (e.g. a French bio from a Derja brief). Needs your decision; no profile data is sent to Groq today.

## Data sent / privacy
Sent: field, mode, tone, language, the provider's brief, the field's current text, listing title, category and a
description excerpt (≤ 1500 chars) — after removing emails, links, @handles and phone numbers. Never sent: user id,
email, profile, contacts, messages, requests. The UI asks users not to type contact details.
Groq: inference data not retained by default; enable **Zero Data Retention** (console → Data Controls); processing in
the US (GCP) under standard contractual clauses; abuse-investigation logs up to 30 days only if ZDR is off.

Privacy-policy additions needed (your legal wording): optional writing help powered by Groq (US); what is sent and
what is removed; not stored by Groq (ZDR) and not stored by SkillLoop beyond a per-request counter; suggestions are
reviewed by the user before use and never published automatically; how to avoid it (simply don't use the button).

## Configuration
Local: Groq console → API Keys → create key; Data Controls → enable ZDR. Terminal: `read -rs GROQ_API_KEY; export GROQ_API_KEY`,
`export AI_ENABLED=true GROQ_MODEL=openai/gpt-oss-20b`, then `bun run dev` (dev uses in-memory limits until the migration).
Production (after deploy approval): Worker → Settings → Variables and Secrets → Secret `GROQ_API_KEY`; Text `AI_ENABLED=false`,
`GROQ_MODEL`, limits. Turn `AI_ENABLED=true` only after the quota migration is applied and verified.

## Live evaluation (prepared, not run)
`bun scripts/ai-eval.ts [model]` — 9 calls (fr / Tunisian Arabic / en × title, description improve incl. an injection
attempt, deliverables); report in `supabase/.temp/`. Free tier: no charge, ~10–15K tokens per run.

---
Previous design notes follow.

# Proposal: connect the offer writing help to an AI provider (NOT CONNECTED — for review)

Status: **design for your review**. No provider, key, account, dependency or spending is set up. Today
`resolveAdapter()` returns "unavailable" and nothing is sent anywhere.

## Scope of the first AI feature

"Help me write" in the `/offer` wizard for **title, description, deliverables** — the UI that already exists
(review → Use / Add / Replace; replace confirms; undo). Nothing is published or saved automatically.

**Sent to the provider:** field, mode (write/improve), tone, language, the provider's brief (≤ 500 chars), the field's
current text, the listing title and category. **Never sent:** messages, contacts, email, phone, ids, other users' data.
Anything more needs a separate product/privacy decision.

## Server design (no secrets in the browser)

`POST /api/offer-assist` (TanStack Start server route on the Worker):

1. **Auth** — `Authorization: Bearer <Supabase access token>`, verified server-side (base: the existing unused
   `src/integrations/supabase/auth-middleware.ts`). Anonymous → 401.
2. **Input** — zod schema from `OfferAssistanceInput`; brief/field limits as today; supported language only; body ≤ 8 KB.
3. **Quotas** (counted in the database so they hold across Worker instances; needs a small migration):
   - per user: e.g. **20 suggestions / day** and **1 per 5 s**;
   - **global cap**: e.g. **1,000 / day** → AI shows "unavailable today" for everyone;
   - kill switch: an env var (`AI_ENABLED=false`) or a row in the existing `ai_access_blocks` table;
   - the usage table is written with the service-role key **on the server only**.
4. **Call** — server-side key (Worker secret), a strict output shape (`text`, optional `explanation`), max output
   tokens per call, a timeout (~15 s), content rules from `CONTENT_RULES` (no invented prices, credentials, reviews).
5. **Result** — the existing typed states: `success` / `rate_limited` / `unavailable` / `failed`. The form always works without AI.
6. **Spending** — a monthly budget / alert **in the provider's console** plus the global daily cap. Worst-case cost is
   bounded by (global cap × max cost of one call) per day.
7. **Logs** — count and latency only; no prompt or user text stored by us.

## Providers to compare (prices and terms fetched fresh when you're ready to choose — not quoted from memory)

| Option | Strengths | Watch out for | Dependency |
|---|---|---|---|
| Anthropic — small Claude model | Good French/Arabic instruction following; API data not used for training by default | Paid per token | `@ai-sdk/anthropic` (new) or plain `fetch` (none) |
| OpenAI — small model | `@ai-sdk/openai` already installed | Paid per token; check data retention settings | none |
| Google Gemini Flash | Free tier | Free-tier data may be used to improve products → paid tier only for user content | new or plain `fetch` |
| Mistral — small model | EU company/hosting, strong French | Tunisian Arabic quality to check; paid | new or plain `fetch` |
| Cloudflare Workers AI | Same platform as hosting; daily free allowance | Open models weaker for Tunisian Arabic / polished copy | none (Worker binding) |

**Evaluation plan:** the same ~10 real briefs (French, Tunisian Arabic in Arabic script, English) on 2–3 options,
judged on: follows the facts (no inventions), language quality, length limits, latency, cost per suggestion.

## Decisions for you

1. Which 2–3 providers to evaluate (I then fetch current prices/terms and run nothing paid without approval).
2. Monthly spending cap and the quota numbers above.
3. Privacy policy wording naming the provider and what is sent.
4. Approval for: the usage-table migration, a provider account/key (set by you as a Worker secret), and any new dependency.
