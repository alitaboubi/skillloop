-- STATUS: NOT APPLIED — proposal for review (2026-10-24). NOT approved. Fix-forward for the upload quota of
-- 20261024140000_limits_and_quotas.sql, which did not count real uploads (verified: files +1, quota log +0).
-- Proposal & evidence: docs/proposals/upload-quota-fix.md · Rollback: supabase/checks/20261024150000_upload_quota_rollback.sql
-- Tests: supabase/tests/database/upload_quota.test.sql (dry run: node scripts/db-test.mjs --pending <this file>)
--
-- Why: Supabase Storage checks the upload policy as the caller inside a rolled-back probe, then writes the file row as a
-- superuser (src/storage/uploader.ts: testPermission … asSuperUser().withTransaction … upsertObject). A slot taken inside
-- the policy is therefore always rolled back. Row triggers DO fire on the final write, and Supabase explicitly allows
-- "database triggers" on storage.objects (changelog, April 2025); the function lives in our own `private` schema
-- (creating functions in `storage` is not allowed).
--
-- What: one BEFORE INSERT trigger on storage.objects for the service-images bucket. It takes a per-user lock, refuses the
-- 41st upload in a rolling 24 h window ('daily_limit_reached:uploads') and records the slot in the same transaction as the
-- file row. It also fires in Storage's probe BEFORE the file is transferred, so an over-limit upload is refused early.
-- The upload policy goes back to the folder rule only (it no longer takes a slot, so nothing is counted twice).
-- Existing files and rows are not touched.
begin;

create or replace function private.enforce_upload_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  used int;
begin
  if new.bucket_id is distinct from 'service-images' then return new; end if;
  -- The uploader: the owner Storage records from the verified JWT; else the SQL caller; neither = administrator upload.
  if new.owner_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    uid := new.owner_id::uuid;
  else
    uid := auth.uid();
  end if;
  if uid is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('skillloop-quota:uploads:' || uid::text, 0));
  select count(*) into used from private.quota_events
    where user_id = uid and kind = 'uploads' and created_at > now() - interval '24 hours';
  if used >= private.daily_cap('uploads') then
    raise exception using errcode = 'P0001', message = 'daily_limit_reached:uploads';
  end if;
  insert into private.quota_events (user_id, kind) values (uid, 'uploads');
  return new;
end $$;
revoke all on function private.enforce_upload_quota() from public, anon, authenticated;

create trigger skillloop_upload_quota before insert on storage.objects
  for each row execute function private.enforce_upload_quota();

-- The policy keeps only the folder rule (as before 20261024140000); the trigger does the counting.
drop policy if exists "service images owner upload" on storage.objects;
create policy "service images owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
