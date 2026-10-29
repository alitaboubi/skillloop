-- READ-ONLY checks right AFTER applying 20261029120000_subscriptions.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'subscriptions table with RLS on' as check_name,
    (select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass) as ok
  union all select 'users can read but never write subscriptions',
    has_table_privilege('authenticated', 'public.subscriptions', 'select')
    and not has_table_privilege('authenticated', 'public.subscriptions', 'insert')
    and not has_table_privilege('authenticated', 'public.subscriptions', 'update')
    and not has_table_privilege('anon', 'public.subscriptions', 'select')
  union all select 'trial + limit triggers present',
    (select count(*) = 3 from pg_trigger where tgname in ('services_start_trial', 'services_plan_limit', 'portfolio_plan_limit'))
  union all select 'my_plan for users only, founders_left public',
    has_function_privilege('authenticated', 'public.my_plan()', 'execute') and not has_function_privilege('anon', 'public.my_plan()', 'execute')
    and has_function_privilege('anon', 'public.founders_left()', 'execute')
) v;
