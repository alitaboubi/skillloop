-- READ-ONLY checks right AFTER applying 20261024150000_upload_quota_trigger.sql. Expected: passed 5 | total 5 | failing none.
-- (Check 3 of 20261024140000_limits_verify.sql — "policy takes an upload slot" — is EXPECTED to be false after this fix.)
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'upload trigger on storage.objects' as check_name,
    exists (select 1 from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'skillloop_upload_quota' and not tgisinternal and tgenabled = 'O') as ok
  union all select 'trigger function: lock, cap, uploader id',
    (select prosrc like '%pg_advisory_xact_lock%' and prosrc like '%daily_cap(''uploads'')%' and prosrc like '%new.owner_id%'
     from pg_proc where oid = 'private.enforce_upload_quota()'::regprocedure)
  union all select 'upload policy = folder rule only (no slot taken there)',
    (select with_check like '%foldername%' and with_check not like '%consume_daily_quota%' from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname = 'service images owner upload')
  union all select 'trigger function not callable by API roles',
    not has_function_privilege('anon', 'private.enforce_upload_quota()', 'execute')
    and not has_function_privilege('authenticated', 'private.enforce_upload_quota()', 'execute')
  union all select 'no function was created in the storage schema',
    not exists (select 1 from pg_proc where pronamespace = 'storage'::regnamespace and proname = 'enforce_upload_quota')
) v;
