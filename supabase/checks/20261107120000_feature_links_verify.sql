-- READ-ONLY check right AFTER applying 20261107120000_feature_links.sql. Expected: passed 2 | total 2 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'my_notifications returns both links' as check_name,
    pg_get_functiondef('public.my_notifications(int)'::regprocedure) ~ 'feature_facebook_url' as ok
  union all select 'signed-in users only',
    has_function_privilege('authenticated', 'public.my_notifications(int)', 'execute')
    and not has_function_privilege('anon', 'public.my_notifications(int)', 'execute')
) v;
