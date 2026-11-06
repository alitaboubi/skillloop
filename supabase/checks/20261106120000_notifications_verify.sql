-- READ-ONLY checks right AFTER applying 20261106120000_notifications.sql. Expected: passed 5 | total 5 | failing none.
-- Stops with a clear message when the migration is not applied yet (the checks below need its objects).
do $$ begin
  if to_regclass('public.notifications') is null then
    raise exception 'Migration not applied yet: run supabase/migrations/20261106120000_notifications.sql first, then this check.';
  end if;
end $$;
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'notifications table with RLS' as check_name,
    to_regclass('public.notifications') is not null
    and (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass) as ok
  union all select 'read-only for signed-in users, nothing for visitors',
    has_table_privilege('authenticated', 'public.notifications', 'select')
    and not has_table_privilege('authenticated', 'public.notifications', 'insert')
    and not has_table_privilege('authenticated', 'public.notifications', 'update')
    and not has_table_privilege('authenticated', 'public.notifications', 'delete')
    and not has_table_privilege('anon', 'public.notifications', 'select')
  union all select 'my_notifications + mark_notifications_read for signed-in users only',
    has_function_privilege('authenticated', 'public.my_notifications(integer)', 'execute')
    and has_function_privilege('authenticated', 'public.mark_notifications_read(uuid[])', 'execute')
    and not has_function_privilege('anon', 'public.my_notifications(integer)', 'execute')
    and not has_function_privilege('anon', 'public.mark_notifications_read(uuid[])', 'execute')
  union all select 'writer not callable through the API',
    not has_function_privilege('authenticated', 'private.notify(uuid, text, uuid, uuid, uuid)', 'execute')
  union all select 'five triggers + realtime',
    (select count(*) from pg_trigger where not tgisinternal and tgname in
      ('profiles_notify_welcome', 'services_notify_live', 'requests_notify', 'reviews_notify', 'profiles_notifications_forget')) = 5
    and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications')
) v;
