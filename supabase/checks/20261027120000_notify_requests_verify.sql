-- READ-ONLY checks right AFTER applying 20261027120000_notify_requests.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'table exists with RLS on' as check_name,
    (select relrowsecurity from pg_class where oid = 'public.notify_requests'::regclass) as ok
  union all select 'visitors can insert but never read',
    has_table_privilege('anon', 'public.notify_requests', 'insert') and not has_table_privilege('anon', 'public.notify_requests', 'select')
    and not has_table_privilege('authenticated', 'public.notify_requests', 'select')
  union all select 'no update/delete for API roles',
    not has_table_privilege('anon', 'public.notify_requests', 'update') and not has_table_privilege('authenticated', 'public.notify_requests', 'delete')
  union all select 'rate-limit trigger present',
    exists (select 1 from pg_trigger where tgname = 'notify_requests_limit' and tgrelid = 'public.notify_requests'::regclass)
) v;
