-- READ-ONLY: which parts of 20261024140000_limits_and_quotas.sql exist right now. Changes nothing.
-- Use it if the migration run reported an error, to confirm the transaction rolled back and nothing remains.
-- Fully rolled back (nothing applied): 0 | 0 | false | false | false | false
-- Fully applied:                      15 | 3 | true  | true  | true  | true
select
  (select count(*) from pg_constraint where conname in (
    'services_title_len', 'services_description_len', 'services_city_len', 'services_category_known', 'services_details_size',
    'services_image_own_folder', 'profiles_display_name_len', 'profiles_title_len', 'profiles_bio_len', 'profiles_city_len',
    'profiles_area_len', 'profiles_details_size', 'profiles_avatar_own_folder', 'requests_details_size', 'portfolio_image_own_folder')) as limit_checks,
  (select count(*) from pg_trigger where not tgisinternal and tgname in ('services_daily_quota', 'requests_daily_quota', 'messages_daily_quota')) as quota_triggers,
  to_regclass('private.quota_events') is not null as quota_log_exists,
  (select prosrc like '%left(%80)%' from pg_proc where oid = 'public.handle_new_user()'::regprocedure) as signup_truncates,
  coalesce((select with_check like '%consume_daily_quota%' from pg_policies
            where schemaname = 'storage' and tablename = 'objects' and policyname = 'service images owner upload'), false) as upload_policy_counts,
  not has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE') as profile_grants_narrowed;
