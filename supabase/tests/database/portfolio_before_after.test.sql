-- Tests for 20261028120000_portfolio_before_after.sql (PREPARED, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261028120000_portfolio_before_after.sql
-- requires: private.portfolio_before_after()
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Pro A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"full_name":"Pro B"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok($$ insert into public.portfolio_items (id, owner_id, title, image_url)
  values ('aaaaaaaa-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Salle de bain', '11111111-1111-1111-1111-111111111111/portfolio/after.jpg') $$,
  'an item without a before photo still works as before');
select throws_ok($$ update public.portfolio_items set before_image_url = '11111111-1111-1111-1111-111111111111/portfolio/before.jpg'
  where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$, '23514', null, 'a before photo without consent is refused');
select lives_ok($$ update public.portfolio_items set before_image_url = '11111111-1111-1111-1111-111111111111/portfolio/before.jpg',
  before_consent_at = '2000-01-01' where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$, 'a before photo with consent is saved');
select ok((select before_consent_at > now() - interval '1 minute' from public.portfolio_items where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  'consent time is stamped by the database (no backdating)');
select lives_ok($$ update public.portfolio_items set title = 'Salle de bain rénovée', before_consent_at = null
  where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$, 'editing other fields keeps the recorded consent');
select isnt((select before_consent_at from public.portfolio_items where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), null,
  'consent is not erased by a later edit');
select throws_ok($$ insert into public.portfolio_items (owner_id, title, image_url, before_image_url, before_consent_at)
  values ('11111111-1111-1111-1111-111111111111', 'Cuisine', '11111111-1111-1111-1111-111111111111/portfolio/a2.jpg',
          '22222222-2222-2222-2222-222222222222/portfolio/b2.jpg', now()) $$, '23514', null, 'a before photo from someone else''s folder is refused');
select lives_ok($$ update public.portfolio_items set before_image_url = null where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$,
  'the before photo can be removed');
select is((select before_consent_at from public.portfolio_items where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), null,
  'removing the before photo clears its consent');
reset role;

select * from finish();
rollback;
