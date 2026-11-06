-- Tests for 20261106130000_support.sql (PREPARED, NOT APPLIED; needs admin + notifications). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261102120000_admin.sql \
--     --pending supabase/migrations/20261106120000_notifications.sql --pending supabase/migrations/20261106130000_support.sql
-- requires: public.admin_support_inbox(text)
begin;
select plan(25);

-- O = operator, U = user, V = another user.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Operator O"}'),
  ('22222222-2222-2222-2222-222222222222', 'u@test.local', '{"full_name":"User U"}'),
  ('33333333-3333-3333-3333-333333333333', 'v@test.local', '{"full_name":"User V"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

-- Visitors cannot write.
set local role anon;
select throws_ok($$ insert into public.support_messages (body) values ('Bonjour') $$, '42501', null, 'visitors cannot write to support');
reset role;

-- U writes twice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok($$ insert into public.support_messages (body, page) values ('  Bonjour, je n''arrive pas à publier.  ', '/offer') $$, 'a user writes to the team');
select is((select body from public.support_messages limit 1), 'Bonjour, je n''arrive pas à publier.', 'the text is trimmed');
select throws_ok($$ insert into public.support_messages (body, user_id) values ('Usurpation', '33333333-3333-3333-3333-333333333333') $$, '42501', null, 'nobody writes in someone else''s conversation');
select throws_ok($$ insert into public.support_messages (body, from_team) values ('Faux message équipe', true) $$, '42501', null, 'a user cannot write as the team');
select throws_ok($$ insert into public.support_messages (body, page) values ('Lien', 'https://evil.example') $$, '23514', null, 'the page is an internal path');
select throws_ok($$ insert into public.support_messages (body) values ('   ') $$, '23514', null, 'an empty message is refused');
insert into public.support_messages (body) values ('C''est urgent, merci.');
select is((select status from public.support_threads), 'open', 'the conversation is open');

-- V sees nothing of U's conversation; nobody calls the operator functions.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from public.support_messages), 0, 'another user cannot read the conversation');
select throws_ok($$ select public.admin_support_inbox('open') $$, '42501', 'not_admin', 'a user cannot read the inbox');
select throws_ok($$ select public.admin_support_reply('22222222-2222-2222-2222-222222222222', 'Salut') $$, '42501', 'not_admin', 'a user cannot answer as the team');

-- O is alerted once (not once per message) and reads the inbox.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where kind = 'support_new'), 1, 'the operator gets one alert for the burst');
select is((public.admin_support_inbox('open')->0->>'unread')::int, 2, 'the inbox counts unread messages');
select is(public.admin_support_inbox('open')->0->>'name', 'User U', 'the inbox shows the user''s name');
select ok(not (public.admin_support_inbox('all')::text ~ 'u@test\.local'), 'never the email address');
select is(jsonb_array_length(public.admin_support_thread('22222222-2222-2222-2222-222222222222')->'messages'), 2, 'the operator reads the conversation');
select is((public.admin_support_inbox('open')->0->>'unread')::int, 0, 'opening it marks it read for the team');
select is((select count(*)::int from public.notifications where kind = 'support_new' and read_at is null), 0, '…and clears the operator''s alert');
select isnt(public.admin_support_reply('22222222-2222-2222-2222-222222222222', 'Bonjour ! Pouvez-vous nous dire le message affiché ?'), null, 'the team answers');
select lives_ok($$ select public.admin_support_set_status('22222222-2222-2222-2222-222222222222', 'closed') $$, 'the operator closes it');

-- U sees the answer (as the team, without the operator's id), is alerted, reads it; writing again reopens.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.support_messages where from_team), 1, 'the user sees the team''s answer');
select is((select count(*)::int from public.notifications where kind = 'support_reply' and read_at is null), 1, 'the user is alerted');
select public.support_mark_read();
select is((select count(*)::int from public.notifications where kind = 'support_reply' and read_at is null), 0, 'reading clears the alert');
insert into public.support_messages (body) values ('Voilà le message : « Prix invalide ».');
select is((select status from public.support_threads), 'open', 'a new message reopens the conversation');
reset role;

-- Account deletion forgets the conversation.
update public.profiles set display_name = '' where id = '22222222-2222-2222-2222-222222222222';
select is((select count(*)::int from public.support_messages where user_id = '22222222-2222-2222-2222-222222222222'), 0, 'a deleted account keeps no support messages');

select * from finish();
rollback;
