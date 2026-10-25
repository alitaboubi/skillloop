-- Tests for 20261024160000_ai_quota.sql (revision 3, NOT APPLIED). Dry run:
--   node scripts/db-test.mjs --pending supabase/migrations/20261024160000_ai_quota.sql
-- requires: public.consume_ai_quota(text)
-- The test secret is a fixed throwaway string used only inside this rolled-back transaction.
begin;
select plan(21);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local');

-- ── Before the secret is configured, nothing can be taken ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'forbidden', 'no secret configured yet: refused');

reset role;
update private.ai_settings set secret_sha256 = encode(extensions.digest(convert_to('test-secret', 'UTF8'), 'sha256'), 'hex'),
  user_daily = 3, global_daily = 100, global_per_minute = 60, cooldown_seconds = 10;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- ── Trust boundary: a signed-in user without the server secret records nothing ──
select is(public.consume_ai_quota('guess')->>'outcome', 'forbidden', 'a direct call with a wrong secret is refused');
select is(public.consume_ai_quota(null)->>'outcome', 'forbidden', 'a direct call without a secret is refused');
select throws_ok($$ select * from private.ai_settings $$, '42501', null, 'users cannot read the settings (or the hash)');
select throws_ok($$ select private.ai_secret_ok('x') $$, '42501', null, 'users cannot probe the secret check');

-- ── Server calls (right secret) ──
select is(public.consume_ai_quota('test-secret')->>'outcome', 'ok', 'first request with the server secret is allowed');
select is(public.consume_ai_quota('test-secret')->>'outcome', 'cooldown', 'a second one within the cooldown is refused');
select ok((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()) > 0, 'slots are taken under advisory locks');

reset role;
update private.quota_events set created_at = now() - interval '1 hour' where kind in ('ai', 'ai_released');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'ok', 'allowed again after the cooldown');
-- Release: the provider produced nothing → the slot is given back.
select ok(public.release_ai_quota('test-secret', now()), 'the server can give back the slot it just took');
select ok(not public.release_ai_quota('guess', now()), 'release needs the server secret too');
select is(public.consume_ai_quota('test-secret')->>'outcome', 'cooldown', 'a released slot still enforces the cooldown (no instant retry after a provider 429)');
reset role;
update private.quota_events set created_at = now() - interval '1 hour' where kind in ('ai', 'ai_released');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'ok', 'the released slot does not count toward the daily cap (2nd kept slot of 3)');
reset role;
update private.quota_events set created_at = now() - interval '1 hour' where kind in ('ai', 'ai_released');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'ok', '3rd slot of 3');
reset role;
update private.quota_events set created_at = now() - interval '1 hour' where kind in ('ai', 'ai_released');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'user_limit', 'the daily cap (3) is enforced from the database settings');

-- ── Another user; global caps (burst per minute, daily) ──
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select ok(not public.release_ai_quota('test-secret', now() - interval '1 hour'), 'a user cannot release someone else''s slot');
reset role;
update private.ai_settings set global_per_minute = 1;
insert into private.quota_events (user_id, kind) values ('11111111-1111-1111-1111-111111111111', 'ai_released');  -- one RELEASED attempt in the last minute
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'busy', 'global per-minute cap counts released attempts too (burst control during provider 429s)');
reset role;
update private.ai_settings set global_per_minute = 60, global_daily = 3;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is(public.consume_ai_quota('test-secret')->>'outcome', 'global_limit', 'global daily cap counts every user''s kept slots (3 used)');

reset role;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from private.quota_events where kind = 'ai'), 3, 'kept slots: 3 (A''s three allowed requests)');
select is((select count(*)::int from private.quota_events where kind = 'ai_released'), 2, 'released slots are kept as markers (2), not deleted');
select ok(not has_function_privilege('anon', 'public.consume_ai_quota(text)', 'execute'), 'visitors cannot call it');

select * from finish();
rollback;
