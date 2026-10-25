-- Test for 20261024130000_protect_request_history.sql (applied 2026-10-24). Rolled back like the other tests.

begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

select is((select confdeltype::text from pg_constraint
           where conrelid = 'public.requests'::regclass and confrelid = 'public.services'::regclass and contype = 'f'),
          'r', 'requests → services is ON DELETE RESTRICT');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.services (id, owner_id, title, description, category, price_model, price, city) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Plomberie à domicile', 'Réparation de fuites et petites installations.', 'home', 'hourly', 40, 'Sousse'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Service jamais demandé', 'Ce service n’a reçu aucune demande.', 'home', 'fixed', 30, 'Sousse');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.requests (id, service_id, client_id, provider_id, message)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, fuite sous l’évier.');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ delete from public.services where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23503', null, 'a service with requests cannot be deleted');
select is((select count(*)::int from public.requests where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 1, 'its request is still there');
select is((select count(*)::int from public.messages where request_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 1, 'its conversation is still there');
select lives_ok($$ update public.services set archived = true where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'archiving still works');
select lives_ok($$ delete from public.services where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$, 'a never-requested service can still be deleted by its owner');

reset role;
select * from finish();
rollback;
