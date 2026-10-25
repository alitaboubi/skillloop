-- READ-ONLY preflight for 20261025120000_account_deletion.sql. Must return 0 rows.
-- Any row = something else references auth.users and would block or cascade on deletion — stop and report it.
select 'role cannot delete auth.users' as problem
where not has_table_privilege(current_user, 'auth.users', 'DELETE')
union all
select format('foreign key %s on %s.%s → auth.users (on delete %s)', c.conname, n.nspname, t.relname, c.confdeltype)
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
  and n.nspname not in ('auth')
  and not (n.nspname = 'public' and t.relname = 'profiles');
