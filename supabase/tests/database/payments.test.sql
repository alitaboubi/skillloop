-- Tests for 20261103120000_payments.sql (PREPARED, NOT APPLIED). Dry run (subscriptions + admin first if not applied):
--   node scripts/db-test.mjs --pending supabase/migrations/20261029120000_subscriptions.sql \
--     --pending supabase/migrations/20261102120000_admin.sql --pending supabase/migrations/20261103120000_payments.sql
-- requires: public.declare_payment(text, text, text)
begin;
select plan(22);

-- O = operator, A = pro in trial, B = free user (never published), C = another user.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Operator O"}'),
  ('22222222-2222-2222-2222-222222222222', 'a@test.local', '{"full_name":"Pro A"}'),
  ('33333333-3333-3333-3333-333333333333', 'b@test.local', '{"full_name":"User B"}'),
  ('44444444-4444-4444-4444-444444444444', 'c@test.local', '{"full_name":"User C"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at) values
  ('22222222-2222-2222-2222-222222222222', 'trial', now() - interval '20 days', now() + interval '10 days');

set local role anon;
select throws_ok($$ select public.declare_payment('month', 'd17', 'ABC123') $$, '42501', null, 'anon cannot declare a payment');
reset role;

-- A declares a monthly payment
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.declare_payment('week', 'd17', 'ABC123') $$, '22023', 'payment_invalid:period', 'unknown period refused');
select throws_ok($$ select public.declare_payment('month', 'cash', 'ABC123') $$, '22023', 'payment_invalid:method', 'unknown method refused');
select throws_ok($$ select public.declare_payment('month', 'd17', ' x ') $$, '22023', 'payment_invalid:reference', 'too short reference refused');
select lives_ok($$ select public.declare_payment('month', 'd17', '  D17-778899  ') $$, 'a pro declares a payment');
select is((select amount_tnd from public.payments), 10, 'the database sets the amount (10 TND / month)');
select is((select reference from public.payments), 'D17-778899', 'the reference is trimmed');
select throws_ok($$ select public.declare_payment('year', 'transfer', 'VIR-1') $$, 'P0001', 'payment_pending_exists', 'one pending declaration at a time');
select throws_ok($$ insert into public.payments (user_id, period, amount_tnd, method, reference) values ('22222222-2222-2222-2222-222222222222', 'year', 1, 'd17', 'FREE') $$,
  '42501', null, 'no direct insert');
select throws_ok($$ update public.payments set status = 'approved', period_end = now() + interval '1 year' $$, '42501', null, 'no self approval');
select throws_ok($$ select public.admin_payments('pending') $$, '42501', 'not_admin', 'a pro cannot list declarations');
select throws_ok($$ select public.admin_decide_payment((select id from public.payments limit 1), true) $$, '42501', 'not_admin', 'a pro cannot approve');

-- C cannot see A's declaration or cancel it
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select is((select count(*)::int from public.payments), 0, 'other users see no declarations');
reset role;
create temp table a_pay on commit drop as select id from public.payments where user_id = '22222222-2222-2222-2222-222222222222';
grant select on a_pay to authenticated;
set local role authenticated;
select throws_ok($$ select public.cancel_my_payment((select id from a_pay)) $$, 'P0001', 'payment_not_pending', 'nobody cancels someone else''s declaration');

-- Operator approves A: Pro extends from the end of the trial
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(jsonb_array_length(public.admin_payments('pending')), 1, 'the operator sees the pending declaration');
select ok(not (public.admin_payments('all')::text ~ '@test\.local'), 'no email in the operator list');
select lives_ok($$ select public.admin_decide_payment((select id from a_pay), true) $$, 'the operator approves');
select throws_ok($$ select public.admin_decide_payment((select id from a_pay), true) $$, 'P0001', 'payment_not_pending', 'a declaration is decided once');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((public.my_plan())->>'status', 'active', 'A is now active');
select ok(abs(extract(epoch from ((public.my_plan())->>'period_end')::timestamptz - (now() + interval '10 days' + interval '1 month'))) < 60,
  'the paid month starts after the remaining trial days');

-- B (never published) pays a year, then the operator refuses it with a note; B can then declare again and cancel.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select public.declare_payment('year', 'transfer', 'VIR-2026-001');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.admin_decide_payment((select id from public.payments where user_id = '33333333-3333-3333-3333-333333333333'), false, 'Virement introuvable');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select note from public.payments where status = 'refused'), 'Virement introuvable', 'the pro sees why it was refused');
select lives_ok($$ select public.cancel_my_payment(public.declare_payment('year', 'flouci', 'FL-42')) $$, 'a pro can declare again and cancel');
reset role;

select * from finish();
rollback;
