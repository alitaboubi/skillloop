-- Tests for 20261029120000_subscriptions.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261029120000_subscriptions.sql
-- requires: public.subscriptions
begin;
select plan(16);

-- A = new pro, B = another user, C = a pro whose trial has ended.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Pro A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"User B"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"full_name":"Pro C"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((public.my_plan())->>'status', 'free', 'before any publication the plan is free');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('11111111-1111-1111-1111-111111111111', 'Brouillon', 'Un service encore en brouillon.', 'home', 'quote', 'Sousse', 'draft') $$,
  'a draft does not start anything');
select is((public.my_plan())->>'status', 'free', 'a draft keeps the plan free');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city)
  values ('11111111-1111-1111-1111-111111111111', 'Plomberie', 'Réparation de fuites et installations.', 'home', 'quote', 'Sousse') $$,
  'first publication');
select is((public.my_plan())->>'status', 'trial', 'the first publication starts the free month');
select ok(((public.my_plan())->>'founder')::boolean, 'an early pro is a founder');
select ok(abs(extract(epoch from ((public.my_plan())->>'trial_ends_at')::timestamptz - (now() + interval '30 days'))) < 60, 'the trial lasts 30 days');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city)
  select '11111111-1111-1111-1111-111111111111', 'Service ' || i, 'Description du service numéro ' || i || '.', 'home', 'quote', 'Sousse'
  from generate_series(1, 3) i $$, 'during the trial more than 2 services can be published');
select throws_ok($$ update public.subscriptions set status = 'active' $$, '42501', null, 'users cannot change their subscription');
select is((select count(*)::int from public.subscriptions), 1, 'a user sees only their own subscription');

-- B: free user limits
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.subscriptions (user_id, status, trial_ends_at) values ('22222222-2222-2222-2222-222222222222', 'trial', now() + interval '1 year') $$,
  '42501', null, 'users cannot give themselves a trial');
reset role;

-- C: trial already ended (set by the operator), 2 services published → a 3rd is refused, editing is fine.
insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at) values
  ('33333333-3333-3333-3333-333333333333', 'trial', now() - interval '40 days', now() - interval '10 days');
insert into public.services (id, owner_id, title, description, category, price_model, city) values
  ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Cours de maths', 'Cours particuliers niveau lycée.', 'tutoring', 'quote', 'Tunis'),
  ('cccccccc-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Cours de physique', 'Cours particuliers niveau lycée.', 'tutoring', 'quote', 'Tunis');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((public.my_plan())->>'status', 'ended', 'an expired trial reads as ended');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price_model, city)
  values ('33333333-3333-3333-3333-333333333333', 'Cours de chimie', 'Cours particuliers niveau lycée.', 'tutoring', 'quote', 'Tunis') $$,
  'P0001', 'plan_limit_reached:services', 'after the trial, a 3rd published service is refused');
select lives_ok($$ update public.services set title = 'Cours de maths (lycée)' where id = 'cccccccc-0000-0000-0000-000000000001' $$,
  'existing published services stay editable');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('33333333-3333-3333-3333-333333333333', 'Cours de chimie', 'Cours particuliers niveau lycée.', 'tutoring', 'quote', 'Tunis', 'draft') $$,
  'drafts are never limited');
reset role;

select is(public.founders_left(), 100 - (select count(*)::int from public.subscriptions where founder), 'founder places left = 100 minus founders');

select * from finish();
rollback;
