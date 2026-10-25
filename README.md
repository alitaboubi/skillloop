# SkillLoop

Tunisian marketplace for local and remote services (French, English, Tunisian Arabic). TanStack Start + React,
backed by your own Supabase project (`skillloop`, Paris).

## Run locally

Needs [bun](https://bun.sh) (the lockfile is `bun.lock`).

```sh
bun install
cp .env.example .env   # fill in your Supabase project's URL, publishable key and project ID
bun run dev            # http://localhost:8080
```

Checks: `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`.

## Database

- Schema: `supabase/migrations/` (source of truth; apply in order).
- Access-rule tests: `node scripts/db-test.mjs` — asks for the Session pooler connection string (hidden, never saved)
  and runs `supabase/tests/database/*.test.sql` in a rolled-back transaction.
- Setup and migration notes: `docs/supabase-migration-runbook.md`. Old Lovable-era migrations are archived in `docs/legacy/`.

## Secrets

Only public values go in `.env` (`VITE_*` publishable key, Turnstile site key). The database password,
service-role key, Google client secret and Turnstile secret live only in the Supabase / Google / Cloudflare dashboards.
