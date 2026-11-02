-- Tests for 20261102120000_admin.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261102120000_admin.sql
-- requires: public.admin_overview(integer)
begin;
select plan(12);

-- O = operator, U = ordinary user (owns one published service and receives one request from O).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Operator O"}'),
  ('22222222-2222-2222-2222-222222222222', 'u@test.local', '{"full_name":"User U"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

create temp table before_counts on commit drop as
  select (select count(*) from public.services where status = 'published' and not archived)::int as published,
         (select count(*) from public.requests where status = 'pending')::int as pending;
grant select on before_counts to authenticated;

insert into public.services (id, owner_id, title, description, category, price_model, city) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Plomberie', 'Réparation de fuites et installations.', 'home', 'quote', 'sousse');
insert into public.requests (service_id, client_id, provider_id, message) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Bonjour, une fuite sous l’évier.');

-- Anonymous visitors
set local role anon;
select throws_ok($$ select public.admin_overview(30) $$, '42501', null, 'anon cannot call admin_overview');
select throws_ok($$ select public.am_i_admin() $$, '42501', null, 'anon cannot call am_i_admin');
reset role;

-- Ordinary user
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(public.am_i_admin(), false, 'an ordinary user is not admin');
select throws_ok($$ select public.admin_overview(30) $$, '42501', 'not_admin', 'an ordinary user is refused the figures');
select throws_ok($$ select * from private.admins $$, '42501', null, 'the admins list is not readable');
select throws_ok($$ insert into private.admins (user_id) values ('22222222-2222-2222-2222-222222222222') $$, '42501', null, 'nobody makes themselves admin');
select throws_ok($$ select private.is_admin('11111111-1111-1111-1111-111111111111') $$, '42501', null, 'is_admin is not callable');

-- Operator
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.am_i_admin(), true, 'the operator is admin');
select is((public.admin_overview(30)->'services'->>'published')::int, (select published from before_counts) + 1, 'published services are counted');
select is((public.admin_overview(30)->'requests'->>'pending')::int, (select pending from before_counts) + 1, 'pending requests are counted');
select is(jsonb_array_length(public.admin_overview(1000)->'series'), 90, 'the period is capped at 90 days');
select ok(not (public.admin_overview(30)::text ~ '(o|u)@test\.local|fuite'), 'no email or message text leaves the database');
reset role;

select * from finish();
rollback;
