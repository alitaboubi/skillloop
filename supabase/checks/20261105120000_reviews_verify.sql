-- READ-ONLY checks right AFTER applying 20261105120000_reviews.sql. Expected: passed 10 | total 10 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'reviews table present' as check_name, to_regclass('public.reviews') is not null as ok
  union all select 'reviews row level security on',
    (select relrowsecurity from pg_class where oid = 'public.reviews'::regclass)
  union all select 'visitors cannot read the table',
    not has_table_privilege('anon', 'public.reviews', 'select')
  union all select 'no delete through the API',
    not has_table_privilege('authenticated', 'public.reviews', 'delete')
  union all select 'review guard trigger present',
    exists (select 1 from pg_trigger where tgname = 'reviews_guard' and tgrelid = 'public.reviews'::regclass)
  union all select 'request time stamps trigger present',
    exists (select 1 from pg_trigger where tgname = 'requests_stamp_times' and tgrelid = 'public.requests'::regclass)
  union all select 'every accepted request has an acceptance time',
    not exists (select 1 from public.requests where status = 'accepted' and accepted_at is null)
  union all select 'guards not callable by API roles',
    not has_function_privilege('authenticated', 'private.guard_review()', 'execute')
    and not has_function_privilege('authenticated', 'private.stamp_request_times()', 'execute')
  union all select 'public reading functions callable by visitors',
    has_function_privilege('anon', 'public.provider_review_summary(uuid)', 'execute')
    and has_function_privilege('anon', 'public.provider_reviews(uuid, integer, timestamp with time zone)', 'execute')
    and has_function_privilege('anon', 'public.review_summaries(uuid[])', 'execute')
  union all select 'account deletion hook present when deleted_at exists',
    not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'deleted_at')
    or exists (select 1 from pg_trigger where tgname = 'profiles_reviews_on_delete' and tgrelid = 'public.profiles'::regclass)
) v;
