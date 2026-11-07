-- READ-ONLY checks right AFTER applying 20261107130000_admin_console.sql. Expected: passed 3 | total 3 | failing none.
do $$ begin
  if to_regprocedure('public.admin_users(text, text, text, int, int)') is null then
    raise exception 'Migration not applied yet: run supabase/migrations/20261107130000_admin_console.sql first, then this check.';
  end if;
end $$;
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'operator functions for signed-in users only (the database refuses non-admins)' as check_name,
    has_function_privilege('authenticated', 'public.admin_users(text, text, text, int, int)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_user(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_todo()', 'execute')
    and has_function_privilege('authenticated', 'public.admin_log(int)', 'execute')
    and not has_function_privilege('anon', 'public.admin_users(text, text, text, int, int)', 'execute')
    and not has_function_privilege('anon', 'public.admin_log(int)', 'execute') as ok
  union all select 'log table unreachable through the API',
    not has_table_privilege('authenticated', 'private.admin_log', 'select')
    and not has_table_privilege('anon', 'private.admin_log', 'select')
  union all select 'log writer private',
    not has_function_privilege('authenticated', 'private.admin_note(text, uuid, jsonb)', 'execute')
) v;
