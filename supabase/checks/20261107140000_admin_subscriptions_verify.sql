-- READ-ONLY checks right AFTER applying 20261107140000_admin_subscriptions.sql. Expected: passed 2 | total 2 | failing none.
do $$ begin
  if to_regprocedure('public.admin_grant_pro(uuid, int, text)') is null then
    raise exception 'Migration not applied yet: run supabase/migrations/20261107140000_admin_subscriptions.sql first, then this check.';
  end if;
end $$;
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'operator functions for signed-in users only (the database refuses non-admins)' as check_name,
    has_function_privilege('authenticated', 'public.admin_subscriptions(text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_grant_pro(uuid, int, text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_end_pro(uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.admin_grant_pro(uuid, int, text)', 'execute') as ok
  union all select 'still no direct writes to subscriptions',
    not has_table_privilege('authenticated', 'public.subscriptions', 'insert')
    and not has_table_privilege('authenticated', 'public.subscriptions', 'update')
) v;
