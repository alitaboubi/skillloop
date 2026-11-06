-- READ-ONLY checks right AFTER applying 20261106130000_support.sql. Expected: passed 5 | total 5 | failing none.
-- Stops with a clear message when the migration is not applied yet (the checks below need its objects).
do $$ begin
  if to_regclass('public.support_messages') is null then
    raise exception 'Migration not applied yet: run supabase/migrations/20261106130000_support.sql first, then this check.';
  end if;
end $$;
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'support tables with RLS' as check_name,
    (select bool_and(relrowsecurity) from pg_class where oid in ('public.support_threads'::regclass, 'public.support_messages'::regclass)) as ok
  union all select 'users insert only body + page, never the team flag',
    has_column_privilege('authenticated', 'public.support_messages', 'body', 'insert')
    and not has_column_privilege('authenticated', 'public.support_messages', 'from_team', 'insert')
    and not has_column_privilege('authenticated', 'public.support_messages', 'user_id', 'insert')
    and not has_table_privilege('authenticated', 'public.support_messages', 'update')
    and not has_table_privilege('authenticated', 'public.support_threads', 'update')
  union all select 'nothing for visitors',
    not has_table_privilege('anon', 'public.support_messages', 'select')
    and not has_table_privilege('anon', 'public.support_threads', 'select')
    and not has_function_privilege('anon', 'public.support_mark_read()', 'execute')
    and not has_function_privilege('anon', 'public.admin_support_inbox(text)', 'execute')
  union all select 'operator functions for signed-in users (the database refuses non-admins)',
    has_function_privilege('authenticated', 'public.admin_support_inbox(text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_support_thread(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_support_reply(uuid, text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_support_set_status(uuid, text)', 'execute')
  union all select 'triggers + realtime',
    (select count(*) from pg_trigger where not tgisinternal and tgname in
      ('support_messages_guard', 'support_messages_after', 'profiles_support_forget')) = 3
    and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_messages')
) v;
