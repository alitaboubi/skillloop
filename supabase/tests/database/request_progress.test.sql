-- Tests for 20261101120000_request_progress.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261101120000_request_progress.sql
-- requires: private.guard_request_progress()
begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Provider A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"Client B"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.services (id, owner_id, title, description, category, price_model, price, city)
  values ('aaaaaaaa-0000-0000-0000-0000000000f1', '11111111-1111-1111-1111-111111111111', 'Plomberie à domicile', 'Réparation de fuites et petites installations.', 'home', 'hourly', 40, 'Tunis');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.requests (id, service_id, client_id, provider_id, message)
  values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, fuite sous l’évier.');

-- ── Provider A, request still pending ──
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ update public.requests set on_the_way_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'progress_not_allowed: request is not accepted', 'no progress before the request is accepted');
update public.requests set status = 'accepted' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1';
select throws_ok($$ update public.requests set scheduled_for = now() - interval '2 days' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'progress_invalid: appointment must be upcoming', 'an appointment in the past is refused');
select lives_ok($$ update public.requests set scheduled_for = now() + interval '1 day' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'the pro sets the appointment');
select lives_ok($$ update public.requests set scheduled_for = now() + interval '2 days' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'the pro can move the appointment');

-- ── Client B cannot write progress ──
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ update public.requests set completed_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'progress_not_allowed: only the pro of this request', 'the client cannot mark the job done');
select isnt((select scheduled_for from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000f1'), null, 'the client sees the appointment');

-- ── Provider A records the steps ──
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ update public.requests set on_the_way_at = '2000-01-01' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$, 'the pro marks "en route"');
select ok((select on_the_way_at > now() - interval '1 minute' from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000f1'),
  'the step time is stamped by the database (no backdating)');
select throws_ok($$ update public.requests set on_the_way_at = null where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'progress_not_allowed: steps are final', 'a step cannot be undone');
select lives_ok($$ update public.requests set started_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$, 'the pro marks "started"');
select lives_ok($$ update public.requests set completed_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$, 'the pro marks "done"');
select throws_ok($$ update public.requests set scheduled_for = now() + interval '3 days' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'progress_not_allowed: already completed', 'nothing changes after the job is done');
select throws_ok($$ update public.requests set status = 'declined' where id = 'bbbbbbbb-0000-0000-0000-0000000000f1' $$,
  'P0001', 'status change not allowed', 'the status rules are unchanged');
reset role;

select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests'),
  'requests changes reach the open conversation live');

select * from finish();
rollback;
