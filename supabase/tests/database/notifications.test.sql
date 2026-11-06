-- Tests for 20261106120000_notifications.sql (PREPARED, NOT APPLIED; needs request_progress + reviews applied). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261106120000_notifications.sql
-- requires: public.my_notifications(integer)
begin;
select plan(24);

-- P = pro, C = client, X = stranger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'p@test.local', '{"full_name":"Pro P"}'),
  ('22222222-2222-2222-2222-222222222222', 'c@test.local', '{"full_name":"Client C"}'),
  ('33333333-3333-3333-3333-333333333333', 'x@test.local', '{"full_name":"Stranger X"}');

create or replace function pg_temp.kinds(p uuid) returns text language sql as $$
  select coalesce(string_agg(kind, ',' order by kind), '') from public.notifications where user_id = p $$;

select is(pg_temp.kinds('11111111-1111-1111-1111-111111111111'), 'welcome', 'a new account gets a welcome');

-- P publishes a draft, then publishes it; edits and re-publishes do not notify again.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.services (id, owner_id, title, description, category, price_model, price, city, status)
  values ('aaaaaaaa-0000-0000-0000-0000000000b1', '11111111-1111-1111-1111-111111111111', 'Plomberie express', 'Fuites, chauffe-eau, robinets : intervention rapide.', 'home', 'fixed', 40, 'Sousse', 'draft');
select is(pg_temp.kinds('11111111-1111-1111-1111-111111111111'), 'welcome', 'a draft is not announced');
update public.services set status = 'published' where id = 'aaaaaaaa-0000-0000-0000-0000000000b1';
select is(pg_temp.kinds('11111111-1111-1111-1111-111111111111'), 'service_live,welcome', 'the first publication is announced to its pro');
update public.services set status = 'draft' where id = 'aaaaaaaa-0000-0000-0000-0000000000b1';
update public.services set status = 'published' where id = 'aaaaaaaa-0000-0000-0000-0000000000b1';
select is((select count(*)::int from public.notifications where kind = 'service_live'), 1, 'publishing again does not repeat it');

-- C sends two requests.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.requests (id, service_id, client_id, provider_id, message) values
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, une fuite sous l’évier.'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', 'aaaaaaaa-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bonjour, le chauffe-eau ne chauffe plus.');
select is((select count(*)::int from public.notifications where kind = 'request_new' and user_id = '11111111-1111-1111-1111-111111111111'), 0,
  'the client cannot read the pro''s notifications');
select is((select count(*)::int from public.messages where request_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'), 1, 'a chat message is not a notification');
update public.requests set status = 'cancelled' where id = 'bbbbbbbb-0000-0000-0000-0000000000b2';

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where kind = 'request_new'), 2, 'the pro is told about each new request');
select is((select actor_id from public.notifications where kind = 'request_new' limit 1), '22222222-2222-2222-2222-222222222222'::uuid, '…with the client as actor');
select is((select count(*)::int from public.notifications where kind = 'request_cancelled'), 1, 'the pro is told when the client cancels');

-- P accepts, sets the appointment, then records the suivi.
update public.requests set status = 'accepted' where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
update public.requests set scheduled_for = now() + interval '1 day' where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
update public.requests set on_the_way_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
update public.requests set started_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
update public.requests set completed_at = now() where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(pg_temp.kinds('22222222-2222-2222-2222-222222222222'),
  'job_completed,job_on_the_way,job_scheduled,job_started,request_accepted,welcome',
  'the client follows acceptance, appointment and each suivi step');
select is((public.my_notifications(30)->>'unread')::int, 6, 'my_notifications counts the unread ones');
select is(public.my_notifications(30)->'items'->0->>'actor_name', 'Pro P', 'items carry the live name of who acted');
select ok((select bool_and(i->>'service_title' = 'Plomberie express') from jsonb_array_elements(public.my_notifications(30)->'items') i
  where i->>'kind' like 'job_%'), 'items carry the service title');
select is(jsonb_array_length(public.my_notifications(2)->'items'), 2, 'the limit is respected');

-- C reviews; P replies.
insert into public.reviews (request_id, rating, comment) values ('bbbbbbbb-0000-0000-0000-0000000000b1', 5, 'Rapide et propre.');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where kind = 'review_new'), 1, 'the pro is told about a new review');
update public.reviews set reply = 'Merci beaucoup !' where request_id = 'bbbbbbbb-0000-0000-0000-0000000000b1';
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where kind = 'review_reply'), 1, 'the client is told about the reply');

-- Marking read.
select is(public.mark_notifications_read(array[(select id from public.notifications where kind = 'welcome')]), 1, 'one notification can be marked read');
select is(public.mark_notifications_read(null), 6, 'everything else is marked read at once');
select is((public.my_notifications(30)->>'unread')::int, 0, 'nothing unread left');

-- Nobody writes or changes notifications through the API.
select throws_ok($$ insert into public.notifications (user_id, kind) values ('22222222-2222-2222-2222-222222222222', 'welcome') $$, '42501', null, 'no insert through the API');
select throws_ok($$ update public.notifications set read_at = null $$, '42501', null, 'no direct update through the API');
select throws_ok($$ select private.notify('22222222-2222-2222-2222-222222222222', 'welcome') $$, '42501', null, 'the writer is not callable');
reset role;
set local role anon;
select throws_ok($$ select public.my_notifications(30) $$, '42501', null, 'visitors have no notifications');
reset role;

-- Account deletion (name emptied) forgets that user's notifications.
update public.profiles set display_name = '' where id = '22222222-2222-2222-2222-222222222222';
select is(pg_temp.kinds('22222222-2222-2222-2222-222222222222'), '', 'a deleted account keeps no notifications');

select * from finish();
rollback;
