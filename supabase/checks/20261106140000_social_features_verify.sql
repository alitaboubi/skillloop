-- READ-ONLY checks right AFTER applying 20261106140000_social_features.sql. Expected: passed 6 | total 6 | failing none.
-- Stops with a clear message when the migration is not applied yet (the checks below need its objects).
do $$ begin
  if to_regclass('public.social_posts') is null then
    raise exception 'Migration not applied yet: run supabase/migrations/20261106140000_social_features.sql first, then this check.';
  end if;
end $$;
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'social tables with RLS and no direct API access' as check_name,
    (select bool_and(relrowsecurity) from pg_class where oid in ('public.social_posts'::regclass, 'public.social_post_people'::regclass))
    and not has_table_privilege('authenticated', 'public.social_posts', 'select')
    and not has_table_privilege('authenticated', 'public.social_post_people', 'select')
    and not has_table_privilege('anon', 'public.social_posts', 'select') as ok
  union all select 'operator functions for signed-in users only (the database refuses non-admins)',
    has_function_privilege('authenticated', 'public.admin_social_posts()', 'execute')
    and has_function_privilege('authenticated', 'public.admin_social_people_search(text)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_social_post_save(uuid, text, text, text, uuid[])', 'execute')
    and has_function_privilege('authenticated', 'public.admin_social_post_publish(uuid, boolean)', 'execute')
    and has_function_privilege('authenticated', 'public.admin_social_post_delete(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.admin_social_posts()', 'execute')
  union all select 'the person''s own functions',
    has_function_privilege('authenticated', 'public.my_social_features()', 'execute')
    and has_function_privilege('authenticated', 'public.set_social_feature_choice(uuid, boolean)', 'execute')
    and not has_function_privilege('anon', 'public.set_social_feature_choice(uuid, boolean)', 'execute')
  union all select 'public profile read for everyone',
    has_function_privilege('anon', 'public.public_social_features(uuid)', 'execute')
  union all select 'notifications: feature kinds + feature_id + 6-argument notify',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'feature_id')
    and pg_get_constraintdef((select oid from pg_constraint where conname = 'notifications_kind_check')) ~ 'feature_new'
    and to_regprocedure('private.notify(uuid, text, uuid, uuid, uuid, uuid)') is not null
    and to_regprocedure('private.notify(uuid, text, uuid, uuid, uuid)') is null
  union all select 'account deletion trigger',
    exists (select 1 from pg_trigger where not tgisinternal and tgname = 'profiles_social_forget')
) v;
