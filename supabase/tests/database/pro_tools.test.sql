-- Tests for 20261030120000_pro_tools.sql (PREPARED, NOT APPLIED). Needs 20261028 + 20261029 too. Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261028120000_portfolio_before_after.sql \
--     --pending supabase/migrations/20261029120000_subscriptions.sql --pending supabase/migrations/20261030120000_pro_tools.sql
-- requires: public.my_page_stats(integer)
begin;
select plan(20);

-- P = pro in trial, F = free pro (trial ended), V = a visitor account.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'p@test.local', '{"full_name":"Pro P"}'),
  ('22222222-2222-2222-2222-222222222222', 'f@test.local', '{"full_name":"Free F"}'),
  ('33333333-3333-3333-3333-333333333333', 'v@test.local', '{"full_name":"Visitor V"}');
insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at) values
  ('11111111-1111-1111-1111-111111111111', 'trial', now(), now() + interval '30 days'),
  ('22222222-2222-2222-2222-222222222222', 'trial', now() - interval '40 days', now() - interval '10 days');
insert into public.services (id, owner_id, title, description, category, price_model, city) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Montage vidéo', 'Montage de vos vidéos courtes.', 'design', 'quote', 'Sousse');

-- Motion portfolio
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ insert into public.portfolio_items (owner_id, title, image_url, video_url) values
  ('11111111-1111-1111-1111-111111111111', 'Clip', '11111111-1111-1111-1111-111111111111/portfolio/a.jpg',
   '11111111-1111-1111-1111-111111111111/motion/0a0a0a0a-0000-0000-0000-000000000001.mp4') $$, 'a Pro adds a video');
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url, video_url) values
  ('11111111-1111-1111-1111-111111111111', 'Clip 2', '11111111-1111-1111-1111-111111111111/portfolio/b.jpg',
   '22222222-2222-2222-2222-222222222222/motion/0a0a0a0a-0000-0000-0000-000000000002.mp4') $$, '23514', null, 'a video must be in the own motion folder');
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url, video_url) values
  ('11111111-1111-1111-1111-111111111111', 'Clip 3', '11111111-1111-1111-1111-111111111111/portfolio/c.jpg',
   '11111111-1111-1111-1111-111111111111/motion/0a0a0a0a-0000-0000-0000-000000000003.exe') $$, '23514', null, 'only mp4/webm/mov videos');
select lives_ok($$ update public.profiles set professional_details = professional_details || '{"carnet_theme":"sea"}' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a Pro picks a carnet theme');
select ok(public.has_pro('11111111-1111-1111-1111-111111111111'), 'has_pro is true during the trial');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url, video_url) values
  ('22222222-2222-2222-2222-222222222222', 'Clip', '22222222-2222-2222-2222-222222222222/portfolio/a.jpg',
   '22222222-2222-2222-2222-222222222222/motion/0a0a0a0a-0000-0000-0000-000000000004.mp4') $$, 'P0001', 'plan_required:motion', 'free accounts cannot add videos');
select lives_ok($$ insert into public.portfolio_items (owner_id, title, image_url) values
  ('22222222-2222-2222-2222-222222222222', 'Photo', '22222222-2222-2222-2222-222222222222/portfolio/a.jpg') $$, 'free accounts still add photos');
select throws_ok($$ update public.profiles set professional_details = professional_details || '{"carnet_theme":"clay"}' where id = '22222222-2222-2222-2222-222222222222' $$,
  'P0001', 'plan_required:themes', 'free accounts cannot pick a theme');
select lives_ok($$ update public.profiles set professional_details = professional_details || '{"accepting":true}' where id = '22222222-2222-2222-2222-222222222222' $$,
  'free accounts still save their other details');
select ok(not public.has_pro('22222222-2222-2222-2222-222222222222'), 'has_pro is false after the trial');
select throws_ok($$ select public.my_page_stats(30) $$, 'P0001', 'plan_required:stats', 'statistics are Pro only');
reset role;

-- An ended Pro keeps the video and theme already published (only new ones are refused).
update public.subscriptions set trial_ends_at = now() - interval '1 day' where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$ update public.portfolio_items set title = 'Clip (2026)' where title = 'Clip' $$, 'an existing video item stays editable');
select is((select count(*)::int from public.portfolio_items where video_url is not null), 1, 'the video stays published');
reset role;
update public.subscriptions set trial_ends_at = now() + interval '30 days' where user_id = '11111111-1111-1111-1111-111111111111';

-- Statistics: visitors count, the pro's own visits don't, unknown targets are ignored, tables are not readable.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select lives_ok($$ select public.record_page_event('profile_view', '11111111-1111-1111-1111-111111111111');
  select public.record_page_event('profile_view', '11111111-1111-1111-1111-111111111111');
  select public.record_page_event('qr_scan', '11111111-1111-1111-1111-111111111111');
  select public.record_page_event('service_view', 'aaaaaaaa-0000-0000-0000-000000000001');
  select public.record_page_event('service_view', '99999999-9999-9999-9999-999999999999');
  select public.record_page_event('bogus', '11111111-1111-1111-1111-111111111111') $$, 'anyone can record events');
select throws_ok($$ select * from private.page_stats $$, '42501', null, 'visitors cannot read counters');
select throws_ok($$ select public.my_page_stats(30) $$, '42501', null, 'anon cannot read statistics');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.record_page_event('profile_view', '11111111-1111-1111-1111-111111111111');
select is((select sum((r->>'count')::int)::int from jsonb_array_elements((public.my_page_stats(30))->'rows') r where r->>'kind' = 'profile_view'), 2,
  'two visitor views; the pro''s own view is not counted');
select is((select sum((r->>'count')::int)::int from jsonb_array_elements((public.my_page_stats(30))->'rows') r where r->>'kind' = 'qr_scan'), 1, 'QR scans counted');
select is((select sum((r->>'count')::int)::int from jsonb_array_elements((public.my_page_stats(30))->'rows') r where r->>'kind' = 'service_view'), 1,
  'service views counted; unknown services ignored');
reset role;

select * from finish();
rollback;
