-- Tests for 20261106140000_social_features.sql (APPLIED 2026-11-06). Dry run before it was applied:
--   node scripts/db-test.mjs --pending supabase/migrations/20261106140000_social_features.sql
-- requires: public.social_posts
begin;
select plan(41);

-- O = operator, P = pro in the reel, C = client in the reel, X = someone else. Names are unique ("Qxq…") because the
-- search runs against the real project's accounts too (everything is rolled back).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Operator O"}'),
  ('22222222-2222-2222-2222-222222222222', 'p@test.local', '{"full_name":"Qxqpro Featured"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"full_name":"Qxqclient Featured"}'),
  ('44444444-4444-4444-4444-444444444444', 'x@test.local', '{"full_name":"Someone X"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
delete from public.notifications where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
-- The project has real posts now: a real announcement in the last 12 h would block this test's own (rolled back anyway).
update public.social_posts set announced_at = now() - interval '13 hours' where announced_at > now() - interval '12 hours';

-- Nobody reaches the tables directly.
set local role anon;
select throws_ok($$ select * from public.social_posts $$, '42501', null, 'visitors cannot read posts directly');
select throws_ok($$ select public.admin_social_posts() $$, '42501', null, 'visitors cannot call operator functions');
select is(public.public_social_features('22222222-2222-2222-2222-222222222222'), '[]'::jsonb, 'visitors read public features (none yet)');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select throws_ok($$ select * from public.social_post_people $$, '42501', null, 'users cannot read the people table directly');
select throws_ok($$ insert into public.social_posts (title, instagram_url) values ('Faux', 'https://www.instagram.com/reel/ABCDE12345/') $$,
  '42501', null, 'users cannot write posts');
select throws_ok($$ select public.admin_social_people_search('Qxq') $$, '42501', 'not_admin', 'users cannot search people');
select throws_ok($$ select public.admin_social_post_save(null, 'Faux', 'https://www.instagram.com/reel/ABCDE12345/', null, '{}') $$,
  '42501', 'not_admin', 'users cannot create posts');

-- O searches and creates a draft with P and C.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(jsonb_array_length(public.admin_social_people_search('qxq ')), 2, 'search by name (case-insensitive, trimmed)');
select is(public.admin_social_people_search('q'), '[]'::jsonb, 'search needs 2 characters');
select is(public.admin_social_people_search('%%'), '[]'::jsonb, 'wildcards are literal');
select ok(not (public.admin_social_people_search('Qxq')::text ~ '@test\.local'), 'never the email address');
select throws_ok($$ select public.admin_social_post_save(null, 'Mauvais lien', 'https://evil.example/reel/ABCDE12345/', null, '{}') $$,
  '23514', null, 'only real Instagram links');
select throws_ok($$ select public.admin_social_post_save(null, 'Sans lien', null, '  ', '{}') $$, '23514', null, 'a post needs a link');
select throws_ok($$ select public.admin_social_post_save(null, 'Inconnu', 'https://www.instagram.com/reel/ABCDE12345/', null,
  array['99999999-9999-9999-9999-999999999999']::uuid[]) $$, 'P0002', 'unknown_person', 'only existing accounts can be tagged');

select set_config('t.post', public.admin_social_post_save(null, '  Plombier à Sfax  ', 'https://www.instagram.com/reel/ABCDE12345/',
  'https://www.facebook.com/reel/1234567890',
  array['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333']::uuid[])->>'id', true);
select is(jsonb_array_length(public.admin_social_posts()->0->'people'), 2, 'two people in the draft');
reset role;
select is((select title from public.social_posts where id = current_setting('t.post')::uuid), 'Plombier à Sfax', 'the title is trimmed');
select is((select count(*)::int from public.notifications where kind = 'feature_you' and feature_id = current_setting('t.post')::uuid), 0, 'a draft alerts nobody');

-- Draft: invisible to the people in it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(public.my_social_features(), '[]'::jsonb, 'a draft is invisible to the person');
select throws_ok($$ select public.set_social_feature_choice(current_setting('t.post')::uuid, true) $$, 'P0002', 'not_found',
  'nobody can show a draft');

-- O publishes with an announcement.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.admin_social_post_publish(current_setting('t.post')::uuid, true)->>'people', '2', 'publishing alerts the two people');
reset role;
select is((select count(*)::int from public.notifications where kind = 'feature_you' and feature_id = current_setting('t.post')::uuid), 2, 'one feature_you each');
select is((select count(*)::int from public.notifications where kind = 'feature_new' and user_id = '44444444-4444-4444-4444-444444444444'), 1,
  'everyone else gets the announcement');
select is((select count(*)::int from public.notifications where kind = 'feature_new' and user_id in
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')), 0, 'the people in it do not get it twice');
set local role authenticated;
select is(public.admin_social_post_publish(current_setting('t.post')::uuid, true)->>'people', '0', 'publishing again alerts nobody again');
reset role;
select is((select count(*)::int from public.notifications where kind = 'feature_new' and user_id = '44444444-4444-4444-4444-444444444444'), 1,
  'the announcement is sent once per post');
set local role authenticated;
select set_config('t.post2', public.admin_social_post_save(null, 'Deuxième', 'https://www.instagram.com/p/XYZ12345/', null, '{}')->>'id', true);
select throws_ok($$ select public.admin_social_post_publish(current_setting('t.post2')::uuid, true) $$, 'P0001', 'announce_too_soon',
  'one announcement per 12 hours');

-- P sees it, in the bell too, and nothing is public until P chooses.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is(public.my_social_features()->0->>'choice', 'pending', 'P sees the post, choice pending');
select is(public.my_notifications()->'items'->0->>'feature_url', 'https://www.instagram.com/reel/ABCDE12345/', 'the bell links to the reel');
select is(public.public_social_features('22222222-2222-2222-2222-222222222222'), '[]'::jsonb, 'nothing public before consent');
select lives_ok($$ select public.set_social_feature_choice(current_setting('t.post')::uuid, true) $$, 'P chooses to show it');
select is((select count(*)::int from public.notifications where kind = 'feature_you' and read_at is null), 0, 'choosing clears the alert');
select is(jsonb_array_length(public.public_social_features('22222222-2222-2222-2222-222222222222')), 1, 'now on P''s public profile');
select ok(not (public.public_social_features('22222222-2222-2222-2222-222222222222')::text ~ '33333333'), 'never who else is in it');

-- C hides it; X cannot change anyone's choice.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select lives_ok($$ select public.set_social_feature_choice(current_setting('t.post')::uuid, false) $$, 'C chooses to hide it');
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select throws_ok($$ select public.set_social_feature_choice(current_setting('t.post')::uuid, true) $$, 'P0002', 'not_found',
  'someone not in the post cannot choose');
select is(public.public_social_features('33333333-3333-3333-3333-333333333333'), '[]'::jsonb, 'hidden stays off C''s profile');

-- O removes C: C's entry and alert go. Account deletion removes P. Deleting the post removes the announcement.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(jsonb_array_length(public.admin_social_post_save(current_setting('t.post')::uuid, 'Plombier à Sfax',
  'https://www.instagram.com/reel/ABCDE12345/', null, array['22222222-2222-2222-2222-222222222222']::uuid[])->'people'), 1,
  'O removes C from the post');
reset role;
select is((select count(*)::int from public.notifications where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'feature_you'), 0,
  'C''s alert about it is gone');
update public.profiles set display_name = '' where id = '22222222-2222-2222-2222-222222222222';
select is(public.public_social_features('22222222-2222-2222-2222-222222222222'), '[]'::jsonb, 'a deleted account shows nothing');
set local role authenticated;
select lives_ok($$ select public.admin_social_post_delete(current_setting('t.post')::uuid) $$, 'O deletes the post');
reset role;
select is((select count(*)::int from public.notifications where kind = 'feature_new' and user_id = '44444444-4444-4444-4444-444444444444'), 0,
  'deleting the post removes its announcement');

select * from finish();
rollback;
