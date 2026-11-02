-- READ-ONLY checks right AFTER applying 20261103120000_payments.sql. Expected: passed 5 | total 5 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'payments table exists with RLS' as check_name,
    (select relrowsecurity from pg_class where oid = to_regclass('public.payments')) as ok
  union all select 'payments readable, never writable through the API',
    has_table_privilege('authenticated', 'public.payments', 'select')
    and not has_table_privilege('authenticated', 'public.payments', 'insert')
    and not has_table_privilege('authenticated', 'public.payments', 'update')
    and not has_table_privilege('anon', 'public.payments', 'select')
  union all select 'one pending declaration per pro',
    to_regclass('public.payments_one_pending') is not null
  union all select 'pro RPCs for signed-in users only',
    has_function_privilege('authenticated', 'public.declare_payment(text,text,text)', 'execute')
    and has_function_privilege('authenticated', 'public.cancel_my_payment(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.declare_payment(text,text,text)', 'execute')
  union all select 'operator RPCs exist, not for anon',
    has_function_privilege('authenticated', 'public.admin_payments(text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_decide_payment(uuid,boolean,text)', 'execute')
    and not has_function_privilege('anon', 'public.admin_decide_payment(uuid,boolean,text)', 'execute')
) v;
