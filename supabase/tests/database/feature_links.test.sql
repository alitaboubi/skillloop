-- Tests for 20261107120000_feature_links.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261107120000_feature_links.sql
-- requires: public.social_posts
begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'o@test.local', '{"full_name":"Operator O"}'),
  ('44444444-4444-4444-4444-444444444444', 'x@test.local', '{"full_name":"Someone X"}');
insert into private.admins (user_id) values ('11111111-1111-1111-1111-111111111111');
delete from public.notifications where user_id = '44444444-4444-4444-4444-444444444444';
-- No announcement may have gone out in the last 12 h on the real project for this test to publish one.
update public.social_posts set announced_at = now() - interval '13 hours' where announced_at > now() - interval '12 hours';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select set_config('t.post', public.admin_social_post_save(null, 'Vidéo test', 'https://www.instagram.com/reel/ABCDE12345/',
  'https://www.facebook.com/reel/1234567890', '{}')->>'id', true);
select public.admin_social_post_publish(current_setting('t.post')::uuid, true);

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select is(public.my_notifications()->'items'->0->>'kind', 'feature_new', 'X has the announcement');
select is(public.my_notifications()->'items'->0->>'feature_instagram_url', 'https://www.instagram.com/reel/ABCDE12345/', 'with the Instagram link');
select is(public.my_notifications()->'items'->0->>'feature_facebook_url', 'https://www.facebook.com/reel/1234567890', 'and the Facebook link');
select isnt(public.my_notifications()->'items'->0->>'feature_published_at', null, 'and the date');
select is(public.my_notifications()->'items'->0->>'feature_url', 'https://www.instagram.com/reel/ABCDE12345/', 'feature_url kept for older apps');
reset role;

select * from finish();
rollback;
