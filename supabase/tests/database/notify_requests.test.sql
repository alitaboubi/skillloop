-- Tests for 20261027120000_notify_requests.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261027120000_notify_requests.sql
-- requires: public.notify_requests
begin;
select plan(7);

set local role anon;
select lives_ok($$ insert into public.notify_requests (email, query, city, lang) values ('Visitor@Test.local ', 'plombier', 'Sousse', 'fr') $$, 'a visitor can leave an email');
select throws_ok($$ insert into public.notify_requests (email) values ('not-an-email') $$, '23514', null, 'invalid email refused');
select throws_ok($$ select * from public.notify_requests $$, '42501', null, 'visitors cannot read the list');
select lives_ok($$ insert into public.notify_requests (email) values ('visitor@test.local'), ('visitor@test.local'), ('visitor@test.local'), ('visitor@test.local') $$, 'up to 5 per email per day');
select throws_ok($$ insert into public.notify_requests (email) values ('visitor@test.local') $$, 'P0001', null, 'the 6th within 24 h is refused');
reset role;

select is((select count(*)::int from public.notify_requests where email = 'visitor@test.local'), 5, 'emails stored trimmed and lower-cased');
set local role authenticated;
select throws_ok($$ delete from public.notify_requests $$, '42501', null, 'signed-in users cannot delete');
reset role;

select * from finish();
rollback;
