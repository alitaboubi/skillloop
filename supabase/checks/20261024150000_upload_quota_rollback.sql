-- ROLLBACK for 20261024150000_upload_quota_trigger.sql → back to the state after 20261024140000 (upload slot taken in
-- the policy, which real uploads bypass). Touches no file and no file row; quota log entries already recorded stay.
begin;
drop trigger if exists skillloop_upload_quota on storage.objects;
drop function if exists private.enforce_upload_quota();
drop policy if exists "service images owner upload" on storage.objects;
create policy "service images owner upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.consume_daily_quota('uploads'));
commit;
