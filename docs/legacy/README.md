# Legacy (Lovable) migrations — archive only

`lovable-drizzle/` holds the Drizzle migrations 0000–0005 that described the schema in the Lovable-owned project.
They are kept for history. The source of truth is now `supabase/migrations/` (baseline applied to the
`skillloop` project on 2026-10-24, verified by `supabase/tests/database/skillloop_rls.test.sql`).
Do not run these against the new project.
