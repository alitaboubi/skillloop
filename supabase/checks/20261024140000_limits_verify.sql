-- READ-ONLY checks to run right AFTER applying 20261024140000_limits_and_quotas.sql (SQL Editor). Changes nothing.
-- Every row (10) should say ok = true.
select 'size/folder/category checks present (15)' as check_name,
  (select count(*) from pg_constraint where conname in (
    'services_title_len', 'services_description_len', 'services_city_len', 'services_category_known', 'services_details_size',
    'services_image_own_folder', 'profiles_display_name_len', 'profiles_title_len', 'profiles_bio_len', 'profiles_city_len',
    'profiles_area_len', 'profiles_details_size', 'profiles_avatar_own_folder', 'requests_details_size', 'portfolio_image_own_folder')
    and convalidated) = 15 as ok
union all select 'quota triggers on services, requests, messages (3)',
  (select count(*) from pg_trigger where not tgisinternal and tgname in ('services_daily_quota', 'requests_daily_quota', 'messages_daily_quota')) = 3
-- Check 3 is SUPERSEDED by 20261024150000_upload_quota_trigger.sql: once that fix is applied, the upload slot is taken by
-- the skillloop_upload_quota trigger and the policy is back to the folder rule only. The check accepts both states.
union all select 'upload policy folder rule + slot (policy before 20261024150000, trigger after = superseded)',
  (select with_check like '%foldername%' and (
     case when exists (select 1 from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'skillloop_upload_quota')
          then with_check not like '%consume_daily_quota%'
          else with_check like '%consume_daily_quota%' end)
   from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'service images owner upload')
union all select 'message exemption limited to the request''s opening message',
  (select prosrc like '%r.client_id = new.sender_id and r.message = new.body%' and prosrc like '%not exists (select 1 from public.messages m%'
   from pg_proc where oid = 'private.enforce_daily_quota()'::regprocedure)
union all select 'signup trigger truncates names to 80',
  (select prosrc like '%left(%80)%' from pg_proc where oid = 'public.handle_new_user()'::regprocedure)
union all select 'profiles: name is editable',
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
union all select 'profiles: deprecated phone column is NOT editable',
  not has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE')
union all select 'quota log hidden from API roles',
  not exists (select 1 from information_schema.role_table_grants where table_schema = 'private' and grantee in ('anon', 'authenticated'))
union all select 'visitors cannot call quota functions',
  not has_function_privilege('anon', 'private.consume_daily_quota(text)', 'execute') and not has_function_privilege('anon', 'public.upload_quota_left()', 'execute')
union all select 'signed-in users can read their upload count',
  has_function_privilege('authenticated', 'public.upload_quota_left()', 'execute');

-- ── Mandatory real-upload check (the SQL tests cannot exercise Supabase's Storage service) ──
-- private.quota_events only exists once the migration is applied, so the BASELINE is taken AFTER applying it, after
-- the 10 checks above and after `node scripts/db-test.mjs` (its tests are rolled back and leave no quota events),
-- immediately before ONE photo upload through the app as the account below (Ali). Run the same query again right after
-- the upload, with no other upload on that account in between. Expected: uploads_logged +1 and files_in_folder +1 — exactly.
-- 0 extra quota events = Storage writes the row without the user's policy (the quota would not apply to real uploads);
-- 2 = the policy is evaluated twice per upload. Either way: stop and roll back.
-- select
--   (select count(*) from private.quota_events where user_id = '3c6aec91-5322-4836-8559-3f8ec368b260' and kind = 'uploads') as uploads_logged,
--   (select count(*) from storage.objects where bucket_id = 'service-images' and name like '3c6aec91-5322-4836-8559-3f8ec368b260/%') as files_in_folder,
--   now() as checked_at;
