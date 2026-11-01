-- READ-ONLY checks right AFTER applying 20261101120000_request_progress.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'requests progress columns present' as check_name,
    (select count(*) = 4 from information_schema.columns where table_schema = 'public' and table_name = 'requests'
       and column_name in ('scheduled_for', 'on_the_way_at', 'started_at', 'completed_at')) as ok
  union all select 'progress guard trigger present',
    exists (select 1 from pg_trigger where tgname = 'requests_progress_guard' and tgrelid = 'public.requests'::regclass)
  union all select 'guard not callable by API roles',
    not has_function_privilege('authenticated', 'private.guard_request_progress()', 'execute')
  union all select 'requests in realtime publication',
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests')
) v;
