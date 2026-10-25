-- Tests for 20261024140000_limits_and_quotas.sql (NOT APPLIED yet). Before applying, run them as a dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261024140000_limits_and_quotas.sql
-- (the migration is executed inside each test transaction and rolled back with everything else).
-- Without --pending and before the migration is applied, this file is skipped by the runner.
-- requires: private.quota_events
begin;
select plan(50);

-- A = provider, B = client, C = another user, L/G = long names (signup form / Google metadata).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Provider A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"Client B"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'l@test.local', jsonb_build_object('full_name', repeat('Ab', 60))),
  ('55555555-5555-5555-5555-555555555555', 'g@test.local', jsonb_build_object('name', repeat('G', 100)));

-- ── Signup ──
select is((select display_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'), repeat('Ab', 40),
  'signup with a 120-character name succeeds and keeps the first 80 characters');
select is((select length(display_name) from public.profiles where id = '55555555-5555-5555-5555-555555555555'), 80,
  'Google-style "name" metadata is truncated the same way');
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Provider A',
  'a normal name is copied unchanged');

-- ── Provider A: services quota (20 / 24 h) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ insert into public.services (id, owner_id, title, description, category, price_model, price, city)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Plomberie à domicile', 'Réparation de fuites et petites installations.', 'home', 'hourly', 40, 'Sousse') $$,
  'service 1 of 20');
select lives_ok($$ do $d$ begin for i in 2..20 loop
  insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('11111111-1111-1111-1111-111111111111', 'Brouillon ' || i, 'x', 'home', 'fixed', 'Sousse', 'draft');
end loop; end $d$ $$, 'services 2–20 (drafts count as new services)');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('11111111-1111-1111-1111-111111111111', 'Brouillon 21', 'x', 'home', 'fixed', 'Sousse', 'draft') $$,
  'P0001', 'daily_limit_reached:services', 'the 21st new service in 24 h is refused');
select ok((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()) > 0,
  'quota slots are taken under a per-user advisory lock (concurrent inserts are serialized)');
select lives_ok($$ update public.services set title = 'Plomberie et sanitaire' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'editing a service does not count');
select lives_ok($$ do $d$ begin
  update public.services set archived = true where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  update public.services set archived = false where id = 'aaaaaaaa-0000-0000-0000-000000000001';
end $d$ $$, 'archive and restore do not count');
select lives_ok($$ update public.services set title = 'Cours complet', description = 'Une description assez longue pour publier.', price = 10, status = 'published'
  where id = (select id from public.services where owner_id = '11111111-1111-1111-1111-111111111111' and title = 'Brouillon 2') $$, 'publishing a draft does not count');
select lives_ok($$ delete from public.services where owner_id = '11111111-1111-1111-1111-111111111111' and title = 'Brouillon 3' $$, 'owner can delete a draft');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('11111111-1111-1111-1111-111111111111', 'Brouillon 22', 'x', 'home', 'fixed', 'Sousse', 'draft') $$,
  'P0001', 'daily_limit_reached:services', 'deleting a service does not give the slot back');

-- ── Size limits, categories, photo folders ──
select throws_ok($$ update public.services set title = repeat('t', 121) where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'service title: 121 characters refused');
select lives_ok($$ update public.services set title = repeat('t', 120) where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'service title: 120 characters accepted');
select throws_ok($$ update public.services set category = 'unknown' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'unknown category refused');
select throws_ok($$ update public.services set details = jsonb_build_object('x', repeat('d', 9000)) where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'service details over 8 KB refused');
select throws_ok($$ update public.services set image_url = '33333333-3333-3333-3333-333333333333/x.jpg' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'a service cannot point at another user''s photo');
select lives_ok($$ update public.services set image_url = '11111111-1111-1111-1111-111111111111/x.jpg' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'a service can use a photo from its owner''s folder');
select throws_ok($$ update public.profiles set avatar_url = '33333333-3333-3333-3333-333333333333/avatar/x.jpg' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'an avatar cannot point at another user''s photo');
select lives_ok($$ update public.profiles set avatar_url = '11111111-1111-1111-1111-111111111111/avatar/x.jpg', display_name = repeat('n', 80), bio = repeat('b', 1000)
  where id = '11111111-1111-1111-1111-111111111111' $$, 'profile edit at the limits (80-char name, 1000-char bio, own avatar) works');
select throws_ok($$ update public.profiles set display_name = repeat('n', 81) where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'profile name: 81 characters refused');
select throws_ok($$ update public.profiles set bio = repeat('b', 1001) where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'profile bio: 1001 characters refused');
select throws_ok($$ update public.profiles set phone = '+21600000000' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'deprecated profile columns can no longer be written');
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url)
  values ('11111111-1111-1111-1111-111111111111', 'Projet', '33333333-3333-3333-3333-333333333333/portfolio/x.jpg') $$,
  '23514', null, 'a portfolio item cannot point at another user''s photo');
select lives_ok($$ insert into public.portfolio_items (owner_id, title, image_url)
  values ('11111111-1111-1111-1111-111111111111', 'Projet', '11111111-1111-1111-1111-111111111111/portfolio/x.jpg') $$,
  'a portfolio item can use its owner''s photo');

-- ── Photo uploads (40 / 24 h) ──
select is((select count(*)::int from generate_series(1, 40) where private.consume_daily_quota('uploads')), 40,
  'uploads 1–40 are allowed');
select is(public.upload_quota_left(), 0, 'upload_quota_left() reports 0 after 40 uploads');
-- Refused by the upload policy (20261024140000) or, once 20261024150000 is applied, by the upload trigger.
select throws_matching($$ insert into storage.objects (bucket_id, name) values ('service-images', '11111111-1111-1111-1111-111111111111/up/41.jpg') $$,
  '(row-level security|daily_limit_reached:uploads)', 'the 41st upload is refused');
select throws_ok($$ select * from private.quota_events $$, '42501', null, 'users cannot read or edit the quota ledger');

-- ── Another user is not affected ──
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is(public.upload_quota_left(), 40, 'another user still has 40 uploads');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('service-images', '33333333-3333-3333-3333-333333333333/c.jpg') $$,
  'another user can upload into their own folder');
select is(public.upload_quota_left(), 39, 'a real upload takes exactly one slot');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('service-images', '11111111-1111-1111-1111-111111111111/from-c.jpg') $$,
  '42501', null, 'a user cannot upload into someone else''s folder');
select is(public.upload_quota_left(), 39, 'a refused upload takes no slot');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, price, city)
  values ('33333333-3333-3333-3333-333333333333', 'Cours de guitare', 'Cours pour débutants, à domicile ou en ligne.', 'tutoring', 'hourly', 25, 'Tunis') $$,
  'another user can still create a service');

-- ── Client B: requests quota (30 / 24 h) and messages quota (300 / 24 h) ──
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.requests (service_id, client_id, provider_id, message, details)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, une demande.', jsonb_build_object('x', repeat('d', 5000))) $$,
  '23514', null, 'request details over 4 KB refused');
select lives_ok($$ do $d$ begin for i in 1..30 loop
  insert into public.requests (service_id, client_id, provider_id, message)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, demande numéro ' || i);
end loop; end $d$ $$, 'requests 1–30 are allowed (a refused request above took no slot)');
select throws_ok($$ insert into public.requests (service_id, client_id, provider_id, message)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, demande 31') $$,
  'P0001', 'daily_limit_reached:requests', 'the 31st new request in 24 h is refused');
select is((select count(*)::int from public.messages m join public.requests r on r.id = m.request_id where r.client_id = '22222222-2222-2222-2222-222222222222'), 30,
  'each request still gets exactly one opening message');
select lives_ok($$ do $d$ declare rid uuid := (select id from public.requests where message = 'Bonjour, demande numéro 1'); begin
  for i in 1..300 loop insert into public.messages (request_id, sender_id, body) values (rid, '22222222-2222-2222-2222-222222222222', 'Message ' || i); end loop;
end $d$ $$, 'messages 1–300 are allowed (opening messages did not use the quota)');
select throws_ok($$ insert into public.messages (request_id, sender_id, body)
  values ((select id from public.requests where message = 'Bonjour, demande numéro 1'), '22222222-2222-2222-2222-222222222222', 'Message 301') $$,
  'P0001', 'daily_limit_reached:messages', 'the 301st message in 24 h is refused');

-- Any OTHER trigger that inserts a message is not exempt (only the request's opening message is).
reset role;
create function public.test_nested_message() returns trigger language plpgsql as $f$ begin
  insert into public.messages (request_id, sender_id, body)
  values ((select id from public.requests where message = 'Bonjour, demande numéro 1'), new.owner_id, 'nested message');
  return new;
end $f$;
create trigger test_nested_message after insert on public.portfolio_items for each row execute function public.test_nested_message();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url)
  values ('22222222-2222-2222-2222-222222222222', 'Projet B', '22222222-2222-2222-2222-222222222222/portfolio/x.jpg') $$,
  'P0001', 'daily_limit_reached:messages', 'a message inserted by any other trigger still uses the quota');
reset role;
drop trigger test_nested_message on public.portfolio_items;
drop function public.test_nested_message();
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ insert into public.messages (request_id, sender_id, body)
  values ((select id from public.requests where message = 'Bonjour, demande numéro 1'), '11111111-1111-1111-1111-111111111111', 'Réponse du prestataire') $$,
  'the other person in the conversation can still reply');
select lives_ok($$ update public.requests set status = 'accepted' where message = 'Bonjour, demande numéro 1' $$, 'status changes do not count');

-- ── Window and privileges (as the database owner) ──
reset role;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from private.quota_events where user_id = '22222222-2222-2222-2222-222222222222' and kind = 'messages'), 300,
  'ledger: 300 chat messages for B, opening messages not counted');
-- G: 20 slots exactly 24 h old and 5 older are outside the rolling window.
-- Typed literals: in a UNION, untyped literals resolve to text, which can't go into the uuid column.
insert into private.quota_events (user_id, kind, created_at)
  select '55555555-5555-5555-5555-555555555555'::uuid, 'services'::text, now() - interval '24 hours' from generate_series(1, 20)
  union all select '55555555-5555-5555-5555-555555555555'::uuid, 'services'::text, now() - interval '25 hours' from generate_series(1, 5);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('55555555-5555-5555-5555-555555555555', 'Brouillon G', 'x', 'other', 'fixed', 'Tunis', 'draft') $$,
  'actions 24 h old or older no longer count (rolling window)');
reset role;
select set_config('request.jwt.claims', '', true);
insert into private.quota_events (user_id, kind, created_at)
  select '55555555-5555-5555-5555-555555555555'::uuid, 'services'::text, now() - interval '23 hours 59 minutes' from generate_series(1, 19);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
select throws_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('55555555-5555-5555-5555-555555555555', 'Brouillon G2', 'x', 'other', 'fixed', 'Tunis', 'draft') $$,
  'P0001', 'daily_limit_reached:services', 'actions within the last 24 h still count');

reset role;
select set_config('request.jwt.claims', '', true);
select ok(not has_function_privilege('anon', 'private.consume_daily_quota(text)', 'execute')
  and not has_function_privilege('anon', 'public.upload_quota_left()', 'execute'), 'visitors cannot call quota functions');
select ok(not exists (select 1 from information_schema.role_table_grants where table_schema = 'private' and grantee in ('anon', 'authenticated')),
  'no API role has any privilege on the quota ledger');
select lives_ok($$ insert into public.services (owner_id, title, description, category, price_model, city, status)
  values ('11111111-1111-1111-1111-111111111111', 'Ajout admin', 'x', 'home', 'fixed', 'Sousse', 'draft') $$,
  'database-owner / service-role writes (no signed-in user) are not counted');

select * from finish();
rollback;
