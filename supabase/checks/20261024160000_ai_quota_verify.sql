-- READ-ONLY checks right AFTER applying 20261024160000_ai_quota.sql (revision 3). Expected: passed 6 | total 6 | failing none.
-- ("secret hash set" turns true only after the separate secret step; until then the route answers "unavailable".)
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'quota log accepts kind ai' as check_name,
    (select pg_get_constraintdef(oid) like '%''ai''%' from pg_constraint where conname = 'quota_events_kind_check') as ok
  union all select 'settings row with provisional limits',
    (select user_daily = 10 and global_daily = 120 and global_per_minute = 6 and cooldown_seconds = 10 from private.ai_settings)
  union all select 'consume/release: signed-in users only (the secret decides the rest)',
    has_function_privilege('authenticated', 'public.consume_ai_quota(text)', 'execute')
    and not has_function_privilege('anon', 'public.consume_ai_quota(text)', 'execute')
    and not has_function_privilege('anon', 'public.release_ai_quota(text,timestamp with time zone)', 'execute')
  union all select 'secret check and settings not reachable by API roles',
    not has_function_privilege('authenticated', 'private.ai_secret_ok(text)', 'execute')
    and not exists (select 1 from information_schema.role_table_grants where table_schema = 'private' and grantee in ('anon', 'authenticated'))
  union all select 'no caps taken from the caller',
    (select pronargs = 1 from pg_proc where oid = 'public.consume_ai_quota(text)'::regprocedure)
  union all select 'pgcrypto available for the secret hash',
    exists (select 1 from pg_extension where extname = 'pgcrypto')
) v;

-- After the secret step (separate, see docs/proposals/ai-offer-assist.md):
-- select secret_sha256 is not null as secret_hash_set from private.ai_settings;
