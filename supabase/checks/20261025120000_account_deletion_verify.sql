-- READ-ONLY checks right AFTER applying 20261025120000_account_deletion.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'profiles no longer cascade from auth.users' as check_name,
    not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass) as ok
  union all select 'deleted_at column exists, not readable by API roles',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'deleted_at')
    and not has_column_privilege('anon', 'public.profiles', 'deleted_at', 'select')
  union all select 'delete_my_account: signed-in users only',
    has_function_privilege('authenticated', 'public.delete_my_account()', 'execute')
    and not has_function_privilege('anon', 'public.delete_my_account()', 'execute')
  union all select 'delete_my_account is security definer with empty search_path',
    (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = 'public.delete_my_account()'::regprocedure)
) v;
