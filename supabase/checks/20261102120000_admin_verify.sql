-- READ-ONLY checks right AFTER applying 20261102120000_admin.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'admins table exists' as check_name, to_regclass('private.admins') is not null as ok
  union all select 'admins table not reachable through the API',
    not has_table_privilege('authenticated', 'private.admins', 'select')
    and not has_table_privilege('anon', 'private.admins', 'select')
    and not has_table_privilege('authenticated', 'private.admins', 'insert')
  union all select 'am_i_admin + admin_overview for signed-in users only',
    has_function_privilege('authenticated', 'public.am_i_admin()', 'execute')
    and has_function_privilege('authenticated', 'public.admin_overview(integer)', 'execute')
    and not has_function_privilege('anon', 'public.am_i_admin()', 'execute')
    and not has_function_privilege('anon', 'public.admin_overview(integer)', 'execute')
  union all select 'is_admin not callable through the API',
    not has_function_privilege('authenticated', 'private.is_admin(uuid)', 'execute')
) v;
