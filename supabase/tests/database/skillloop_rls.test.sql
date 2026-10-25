-- Access-rule tests for the baseline schema. Run locally only: `bunx supabase test db` (Docker stack).
-- Everything runs in one transaction and is rolled back.
begin;
select plan(20);

-- Three local test users: A = provider, B = client, C = stranger. Profiles are created by the signup trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Provider A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"Client B"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{}');

select is((select count(*)::int from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')), 3, 'signup trigger creates one profile per user');
select is((select public from storage.buckets where id = 'service-images'), false, 'service-images bucket exists and is private');

-- ── Provider A ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok($$ insert into public.services (id, owner_id, title, description, category, price_model, price, city)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Plomberie à domicile', 'Réparation de fuites et petites installations.', 'home', 'hourly', 40, 'Sousse') $$,
  'owner can publish a complete service');
select lives_ok($$ insert into public.services (id, owner_id, title, description, category, price_model, price, city, status)
  values ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Brouillon', 'x', 'home', 'fixed', null, 'Sousse', 'draft') $$,
  'owner can save an incomplete draft');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price, city)
  values ('11111111-1111-1111-1111-111111111111', 'Court', 'trop court', 'home', 10, 'Tunis') $$,
  'P0001', 'Complete service details before publishing', 'publish guard rejects an incomplete service');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price, city)
  values ('11111111-1111-1111-1111-111111111111', 'Consultation santé', 'Consultation à domicile, sur rendez-vous.', 'healthcare', 50, 'Tunis') $$,
  'P0001', 'Regulated service acknowledgement required', 'healthcare needs the regulated acknowledgement');
select throws_ok($$ insert into public.services (owner_id, title, description, category, price, city)
  values ('22222222-2222-2222-2222-222222222222', 'Service volé', 'Quelqu’un d’autre ne peut pas publier pour moi.', 'home', 10, 'Tunis') $$,
  '42501', null, 'cannot create a service for another user');

-- ── Anonymous visitor ──
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
-- Only the test provider's rows: the project may already hold real published services.
select is((select count(*)::int from public.services where owner_id = '11111111-1111-1111-1111-111111111111'), 1, 'visitors see published services only (no drafts)');
select lives_ok($$ select id, display_name, avatar_url, professional_details from public.profiles $$, 'visitors can read public profile columns');
select throws_ok($$ select phone from public.profiles $$, '42501', null, 'visitors cannot read deprecated private columns');
select throws_ok($$ truncate public.services $$, '42501', null, 'visitors cannot truncate tables');
select throws_ok($$ select * from public.ai_access_blocks $$, '42501', null, 'ai_access_blocks is server-only');

-- ── Client B ──
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok($$ insert into public.requests (id, service_id, client_id, provider_id, message)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, fuite sous l’évier.') $$,
  'client can request a published service');
select is((select count(*)::int from public.messages where request_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 1, 'the request text becomes exactly one first message');
select throws_ok($$ update public.requests set status = 'accepted' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'P0001', 'status change not allowed', 'a client cannot accept their own request');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('service-images', '11111111-1111-1111-1111-111111111111/x.png') $$,
  '42501', null, 'cannot upload into another user''s folder');

-- ── Stranger C ──
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from public.requests) + (select count(*)::int from public.messages), 0, 'a third user sees no one else''s requests or messages');

-- ── Provider A answers ──
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ update public.requests set status = 'accepted' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$, 'provider can accept a pending request');
select throws_ok($$ update public.requests set status = 'declined' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'P0001', 'status change not allowed', 'a status change is final');

-- ── Provider stops accepting; client B tries again ──
update public.profiles set professional_details = '{"accepting": false}' where id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.requests (service_id, client_id, provider_id, message)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Encore une demande, svp.') $$,
  'P0001', 'Provider is not accepting requests', 'requests are refused while the provider is not accepting');

reset role;
select * from finish();
rollback;
