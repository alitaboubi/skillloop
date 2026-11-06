-- Tests for 20261107130000_admin_console.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261107130000_admin_console.sql
-- requires: public.admin_users(text, text, text, int, int)
begin;
select plan(20);

-- O = operator, P = pro (one published service), C = client. Names are unique ("Qxq…"): the real accounts are there too.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Qxqoperator"}'),
  ('22222222-2222-2222-2222-222222222222', 'p@test.local', '{"full_name":"Qxqpro Plombier"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"full_name":"Qxqclient Amira"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
update public.profiles set city = 'Sfax' where id = '22222222-2222-2222-2222-222222222222';
insert into public.services (owner_id, title, description, category, city, status, price_model, price)
  values ('22222222-2222-2222-2222-222222222222', 'Plomberie', 'Fuites et installations.', 'home', 'Sfax', 'published', 'fixed', 50);

-- Everyone else is refused.
set local role anon;
select throws_ok($$ select public.admin_users() $$, '42501', null, 'visitors cannot list accounts');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select throws_ok($$ select public.admin_users() $$, '42501', 'not_admin', 'users cannot list accounts');
select throws_ok($$ select public.admin_user('22222222-2222-2222-2222-222222222222') $$, '42501', 'not_admin', 'users cannot read an account');
select throws_ok($$ select public.admin_todo() $$, '42501', 'not_admin', 'users cannot read the to-dos');
select throws_ok($$ select public.admin_log() $$, '42501', 'not_admin', 'users cannot read the log');
select throws_ok($$ select * from private.admin_log $$, '42501', null, 'nobody reads the log table directly');
-- C writes to support (for the to-dos).
insert into public.support_messages (body) values ('Je veux ma vidéo !');

-- O reads.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((public.admin_users('qxq')->>'total')::int, 3, 'search by name');
select is((public.admin_users('qxq', 'pro')->'items'->0->>'name'), 'Qxqpro Plombier', 'the pro filter');
select is((public.admin_users('qxq', 'pro')->'items'->0->>'services')::int, 1, 'with the published services');
select is((public.admin_users('qxq', 'client')->>'total')::int, 2, 'the client filter (no published service)');
select is((public.admin_users('sfax', 'pro')->>'total')::int >= 1, true, 'search by city');
select is(public.admin_users('qxq', 'all', 'name')->'items'->0->>'name', 'Qxqclient Amira', 'sorted by name');
select is((public.admin_users('qxq', 'all', 'new', 1, 1)->'items'->>0) is not null, true, 'pages');
select is(public.admin_users('qxqclient')->'items'->0->>'support', 'open', 'shows the support conversation state');
select ok(not (public.admin_users('qxq')::text ~ '@test\.local'), 'never the email address');
select throws_ok($$ select public.admin_users(null, 'everyone') $$, '22023', 'bad_filter', 'unknown filters are refused');
select is(jsonb_array_length(public.admin_user('22222222-2222-2222-2222-222222222222')->'services'), 1, 'one account in detail');
select throws_ok($$ select public.admin_user('99999999-9999-9999-9999-999999999999') $$, 'P0002', 'not_found', 'unknown account');
select ok((public.admin_todo()->>'support_unread')::int >= 1, 'the to-dos count the unread support conversation');
select ok(public.admin_todo() ? 'requests_waiting', 'and the requests waiting');
reset role;

select * from finish();
rollback;
