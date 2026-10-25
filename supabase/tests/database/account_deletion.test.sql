-- Tests for 20261025120000_account_deletion.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261025120000_account_deletion.sql
-- requires: public.delete_my_account()
-- A = provider who deletes their account; B = client who keeps their history, then deletes too; C = another provider.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'del-a@test.local'),
  ('b2222222-2222-2222-2222-222222222222', 'del-b@test.local'),
  ('c3333333-3333-3333-3333-333333333333', 'del-c@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.profiles set bio = 'Plombier à Sousse', title = 'Plombier', city = 'Sousse', avatar_url = 'a1111111-1111-1111-1111-111111111111/avatar.jpg'
  where id = 'a1111111-1111-1111-1111-111111111111';
insert into public.services (id, owner_id, title, description, category, price_model, price, city, image_url) values
  ('d0000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Plomberie à domicile', 'Réparation de fuites et petites installations.', 'home', 'hourly', 40, 'Sousse', 'a1111111-1111-1111-1111-111111111111/s1.jpg'),
  ('d0000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Service jamais demandé', 'Ce service n’a reçu aucune demande.', 'home', 'fixed', 30, 'Sousse', null);
insert into public.portfolio_items (owner_id, title, image_url) values ('a1111111-1111-1111-1111-111111111111', 'Salle de bain', 'a1111111-1111-1111-1111-111111111111/p1.jpg');
insert into public.profile_contacts (owner_id, kind, value, is_public) values ('a1111111-1111-1111-1111-111111111111', 'phone', '+21620000000', true);

select set_config('request.jwt.claims', '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
insert into public.services (id, owner_id, title, description, category, price_model, price, city) values
  ('d0000000-0000-0000-0000-000000000003', 'c3333333-3333-3333-3333-333333333333', 'Cours de maths', 'Soutien scolaire pour le lycée, à domicile.', 'tutoring', 'hourly', 25, 'Sousse');

select set_config('request.jwt.claims', '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.requests (id, service_id, client_id, provider_id, message) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Bonjour, fuite sous l’évier.'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'Bonjour, cours pour mon fils.');

-- Signed out: refused.
select set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'signed out: refused');

-- A deletes their account.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ select public.delete_my_account() $$, 'A can delete their own account');
reset role;

select is((select count(*)::int from auth.users where id = 'a1111111-1111-1111-1111-111111111111'), 0, 'sign-in account (and email) deleted');
select is((select display_name from public.profiles where id = 'a1111111-1111-1111-1111-111111111111'), '', 'profile kept, name emptied');
select ok((select bio is null and title is null and city is null and avatar_url is null and professional_details = '{}'::jsonb and deleted_at is not null
           from public.profiles where id = 'a1111111-1111-1111-1111-111111111111'), 'profile details cleared, deletion time recorded');
select is((select count(*)::int from public.portfolio_items where owner_id = 'a1111111-1111-1111-1111-111111111111'), 0, 'portfolio deleted');
select is((select count(*)::int from public.profile_contacts where owner_id = 'a1111111-1111-1111-1111-111111111111'), 0, 'contacts deleted');
select is((select count(*)::int from public.services where id = 'd0000000-0000-0000-0000-000000000002'), 0, 'never-requested service deleted');
select ok((select archived and description = '' and image_url is null and title = 'Plomberie à domicile'
           from public.services where id = 'd0000000-0000-0000-0000-000000000001'), 'requested service archived and cleared, title kept');
select is((select status from public.requests where id = 'e0000000-0000-0000-0000-000000000001'), 'declined', 'pending request to A closed as declined');
select is((select count(*)::int from public.messages where request_id = 'e0000000-0000-0000-0000-000000000001'), 1, 'conversation kept for the client');
select is((select count(*)::int from private.quota_events where user_id = 'a1111111-1111-1111-1111-111111111111'), 0, 'quota counters deleted');

-- B still sees their history with A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.requests where id = 'e0000000-0000-0000-0000-000000000001'), 1, 'client still reads the request');

-- B deletes too: their pending request to C is cancelled; C keeps it.
select lives_ok($$ select public.delete_my_account() $$, 'B can delete their own account');
reset role;
select is((select status from public.requests where id = 'e0000000-0000-0000-0000-000000000002'), 'cancelled', 'B''s pending request cancelled');
select is((select count(*)::int from public.services where owner_id = 'c3333333-3333-3333-3333-333333333333' and not archived), 1, 'other users untouched');

select * from finish();
rollback;
