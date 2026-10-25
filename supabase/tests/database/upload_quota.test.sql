-- Tests for 20261024150000_upload_quota_trigger.sql (NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261024150000_upload_quota_trigger.sql
-- requires: private.enforce_upload_quota()
-- Storage's real flow is simulated: the FINAL write is an insert as service_role (bypasses RLS, like Storage's superuser
-- write) with owner_id = the uploader; the PROBE is an insert as the signed-in user. Quota counts are read as the owner.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local');

-- ── Final writes (service_role, owner_id = uploader) ──
set local role service_role;
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  select 'service-images', '11111111-1111-1111-1111-111111111111/f' || i || '.jpg', '11111111-1111-1111-1111-111111111111' from generate_series(1, 40) i $$,
  'uploads 1–40 written by Storage as a superuser are accepted');
reset role;
select is((select count(*)::int from private.quota_events where user_id = '11111111-1111-1111-1111-111111111111' and kind = 'uploads'), 40,
  'each of them is counted exactly once (the final write is where the slot is taken)');
set local role service_role;
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('service-images', '11111111-1111-1111-1111-111111111111/f41.jpg', '11111111-1111-1111-1111-111111111111') $$,
  'P0001', 'daily_limit_reached:uploads', 'the 41st upload in 24 h is refused at the final write');
select ok((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()) > 0,
  'upload slots are taken under a per-user advisory lock (concurrent uploads are serialized)');
reset role;
select is((select count(*)::int from storage.objects where name = '11111111-1111-1111-1111-111111111111/f41.jpg'), 0,
  'the refused upload left no file row');

-- ── Probe as the signed-in user (what Storage does before transferring the file) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('service-images', '11111111-1111-1111-1111-111111111111/probe.jpg', '11111111-1111-1111-1111-111111111111') $$,
  'P0001', 'daily_limit_reached:uploads', 'over the limit, the probe is refused BEFORE the file would be transferred');
select is(public.upload_quota_left(), 0, 'the app can tell the user the limit is reached');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('service-images', '11111111-1111-1111-1111-111111111111/x.jpg', '33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'the folder rule still applies (no upload into someone else''s folder)');
select is(public.upload_quota_left(), 40, 'a refused upload takes no slot, and another user is unaffected');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('service-images', '33333333-3333-3333-3333-333333333333/c.jpg', '33333333-3333-3333-3333-333333333333') $$,
  'a user under the limit can upload into their own folder');
select is(public.upload_quota_left(), 39, 'one upload = one slot (the policy no longer takes a second one)');

-- ── Failed write, administrator upload ──
reset role;
select set_config('request.jwt.claims', '', true);
set local role service_role;
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('service-images', '33333333-3333-3333-3333-333333333333/c.jpg', '33333333-3333-3333-3333-333333333333') $$,
  '23505', null, 'a failed write (same path again) is refused');
reset role;
select is((select count(*)::int from private.quota_events where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'uploads'), 1,
  'the failed write took no slot');
set local role service_role;
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('service-images', 'admin/manual.jpg') $$,
  'an administrator upload (no uploader id, no signed-in user) is not limited');
reset role;

select * from finish();
rollback;
