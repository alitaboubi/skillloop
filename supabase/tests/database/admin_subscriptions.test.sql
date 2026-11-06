-- Tests for 20261107140000_admin_subscriptions.sql (PREPARED, NOT APPLIED; needs subscriptions + admin_console). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261107140000_admin_subscriptions.sql
-- requires: public.admin_grant_pro(uuid, int, text)
begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Qxqoperator"}'),
  ('22222222-2222-2222-2222-222222222222', 'p@test.local', '{"full_name":"Qxqpro Plombier"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.admin_grant_pro('22222222-2222-2222-2222-222222222222', 365) $$, '42501', 'not_admin', 'a pro cannot give themself Pro');
select throws_ok($$ select public.admin_subscriptions() $$, '42501', 'not_admin', 'users cannot list subscriptions');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$ select public.admin_grant_pro('22222222-2222-2222-2222-222222222222', 0) $$, '22023', 'bad_days', 'at least one day');
select throws_ok($$ select public.admin_grant_pro('22222222-2222-2222-2222-222222222222', 731) $$, '22023', 'bad_days', 'at most two years');
select throws_ok($$ select public.admin_end_pro('22222222-2222-2222-2222-222222222222') $$, 'P0001', 'not_pro', 'cannot end Pro that is not running');
-- (« x between a and b » would call the function twice: keep each result first.)
select set_config('t.until1', public.admin_grant_pro('22222222-2222-2222-2222-222222222222', 30, 'Membre fondateur — merci !')->>'until', true);
select ok(current_setting('t.until1')::timestamptz between now() + interval '29 days' and now() + interval '31 days', 'O gives 30 days of Pro');
select set_config('t.until2', public.admin_grant_pro('22222222-2222-2222-2222-222222222222', 30)->>'until', true);
select ok(current_setting('t.until2')::timestamptz between now() + interval '59 days' and now() + interval '61 days', 'a second grant adds to the current end');
select ok(exists (select 1 from jsonb_array_elements(public.admin_subscriptions('active')) e
  where e->>'user_id' = '22222222-2222-2222-2222-222222222222' and e->>'name' = 'Qxqpro Plombier'), 'listed as Pro now');
select is(public.admin_log()->0->>'action', 'pro_granted', 'the grant is in the log');
select is(public.admin_log()->1->'detail'->>'note', 'Membre fondateur — merci !', '…with its note');
select lives_ok($$ select public.admin_end_pro('22222222-2222-2222-2222-222222222222', 'Test') $$, 'O ends Pro');
select ok(exists (select 1 from jsonb_array_elements(public.admin_subscriptions('ended')) e
  where e->>'user_id' = '22222222-2222-2222-2222-222222222222' and e->>'status' = 'cancelled'), 'listed as ended');
select is(public.admin_log()->0->>'action', 'pro_ended', 'the end is in the log');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(public.my_plan()->>'status', 'ended', 'the pro sees Pro has ended');
reset role;

select * from finish();
rollback;
