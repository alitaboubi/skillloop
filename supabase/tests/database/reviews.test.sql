-- Tests for 20261105120000_reviews.sql (PREPARED, NOT APPLIED; needs 20261101120000_request_progress.sql). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261101120000_request_progress.sql \
--                            --pending supabase/migrations/20261105120000_reviews.sql
-- requires: private.guard_review()
begin;
select plan(34);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Provider A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"Amira Ben Salah"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"full_name":"Other C"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.services (id, owner_id, title, description, category, price_model, price, city)
  values ('aaaaaaaa-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Cours de maths', 'Collège et lycée, à domicile ou en ligne.', 'tutoring', 'hourly', 25, 'Sfax');

-- Client B opens four requests (r1 main flow, r2 time stamps, r3 seven-day rule, r4 appointment rule).
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.requests (id, service_id, client_id, provider_id, message, created_at) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, deux séances par semaine ?', '2000-01-01'),
  ('bbbbbbbb-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, une séance de révision ?', default),
  ('bbbbbbbb-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, préparation au bac ?', default);
select ok((select created_at > now() - interval '1 minute' from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000a1'),
  'a request''s creation time is stamped by the database (no backdating)');
select is((select accepted_at from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000a1'), null, 'a new request has no acceptance time');

select throws_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 5) $$,
  'P0001', 'review_not_allowed: request was not accepted', 'no review while the request is pending');

-- Pro A accepts r1, r3, r4.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.requests set status = 'accepted' where id in ('bbbbbbbb-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000a3', 'bbbbbbbb-0000-0000-0000-0000000000a4');
select ok((select accepted_at > now() - interval '1 minute' from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000a1'),
  'acceptance time is stamped by the database');
select lives_ok($$ update public.requests set accepted_at = '2000-01-01' where id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$, 'an update may name accepted_at…');
select ok((select accepted_at > now() - interval '1 minute' from public.requests where id = 'bbbbbbbb-0000-0000-0000-0000000000a1'),
  '…but the acceptance time cannot be rewritten');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 5) $$,
  'P0001', 'review_not_allowed: job not finished yet', 'no review right after acceptance');

-- Pro A marks r1 done.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.requests set completed_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000a1';
select throws_ok($$ insert into public.reviews (request_id, rating, comment) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 5, 'Je me note moi-même.') $$,
  'P0001', 'review_not_allowed: only the client of this request', 'the pro cannot review their own work');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select throws_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 1) $$,
  'P0001', 'review_not_allowed: only the client of this request', 'someone else cannot review that request');

-- ── Client B reviews r1 ──
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.reviews (request_id, rating, comment) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 2, 'Bof.') $$,
  '23514', null, 'a low rating needs an explanation (20+ characters)');
select lives_ok($$ insert into public.reviews (request_id, service_id, client_id, provider_id, rating, comment, created_at, reply, hidden_at)
  values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333', 5, '  Très clair et patient.  ', '2000-01-01', 'Merci !', now()) $$,
  'the client reviews the finished job');
select is((select provider_id from public.reviews where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'the reviewed pro comes from the request, not from the caller');
select ok((select created_at > now() - interval '1 minute' and reply is null and hidden_at is null and comment = 'Très clair et patient.'
           from public.reviews where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'),
  'time, reply and moderation fields are the database''s; the comment is trimmed');
select throws_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a1', 4) $$,
  '23505', null, 'one review per request');

select lives_ok($$ update public.reviews set rating = 4 where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$, 'the client can adjust the rating');
select isnt((select updated_at from public.reviews where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'), null, 'the edit is stamped');
select throws_ok($$ update public.reviews set reply = 'Je réponds à ma place.' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  'P0001', 'review_not_allowed: only the pro replies or reports', 'the client cannot write the pro''s reply');
select throws_ok($$ delete from public.reviews where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'reviews cannot be deleted through the API');

-- ── Pro A ──
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ update public.reviews set rating = 5 where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  'P0001', 'review_not_allowed: a pro cannot change a review', 'the pro cannot change the rating');
select throws_ok($$ update public.reviews set hidden_at = now() where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  'P0001', 'review_not_allowed: fixed fields', 'the pro cannot hide a review');
select lives_ok($$ update public.reviews set reply = 'Merci Amira, bonne continuation !' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$, 'the pro replies');
select isnt((select replied_at from public.reviews where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'), null, 'the reply is stamped');
select throws_ok($$ update public.reviews set reply = 'Autre réponse.' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  'P0001', 'review_not_allowed: reply already written', 'the reply is written once');
select lives_ok($$ update public.reviews set report_reason = 'Test de signalement.' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$, 'the pro can report a review once');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ update public.reviews set rating = 1, comment = 'Je change d''avis après la réponse du pro.' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1' $$,
  'P0001', 'review_not_allowed: the pro already replied', 'no edit after the pro replied');

-- ── Public reading ──
set local role anon;
select throws_ok($$ select * from public.reviews $$, '42501', null, 'visitors cannot read the table');
select is((select review_count from public.provider_review_summary('11111111-1111-1111-1111-111111111111')), 1, 'summary: count');
select is((select rating_avg from public.provider_review_summary('11111111-1111-1111-1111-111111111111')), 4.0, 'summary: average');
select is((select author from public.provider_reviews('11111111-1111-1111-1111-111111111111')), 'Amira S.', 'author = first name + initial only');
select is((select review_count from public.review_summaries(array['11111111-1111-1111-1111-111111111111'::uuid])), 1, 'batch summary for cards');

-- ── Operator hides it (SQL editor: no signed-in user) ──
reset role;
select set_config('request.jwt.claims', '', true);
update public.reviews set hidden_at = now() where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a1';
set local role anon;
select is((select review_count from public.provider_review_summary('11111111-1111-1111-1111-111111111111')), 0, 'a hidden review leaves the public summary');

-- ── Time rules ──
reset role;
alter table public.requests disable trigger requests_stamp_times;
update public.requests set accepted_at = now() - interval '8 days' where id in ('bbbbbbbb-0000-0000-0000-0000000000a3', 'bbbbbbbb-0000-0000-0000-0000000000a4');
alter table public.requests enable trigger requests_stamp_times;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.requests set scheduled_for = now() + interval '3 days' where id = 'bbbbbbbb-0000-0000-0000-0000000000a4';
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a3', 5) $$,
  'accepted 7+ days ago without "done": the client can review (a pro cannot block it)');
select throws_ok($$ insert into public.reviews (request_id, rating) values ('bbbbbbbb-0000-0000-0000-0000000000a4', 5) $$,
  'P0001', 'review_not_allowed: job not finished yet', 'an upcoming appointment comes first');

reset role;
alter table public.reviews disable trigger reviews_guard;
update public.reviews set created_at = now() - interval '15 days' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a3';
alter table public.reviews enable trigger reviews_guard;
set local role authenticated;
select throws_ok($$ update public.reviews set rating = 3 where request_id = 'bbbbbbbb-0000-0000-0000-0000000000a3' $$,
  'P0001', 'review_not_allowed: edit window closed', 'edits close after 14 days');
reset role;

select * from finish();
rollback;
