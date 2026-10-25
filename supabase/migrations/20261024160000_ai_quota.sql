-- STATUS: NOT APPLIED — prepared for review (revision 3, 2026-10-25). NOT approved.
-- Durable limits for the offer-writing assistant (POST /api/offer-assist), shared by every Cloudflare Worker instance.
-- Rollback: supabase/checks/20261024160000_ai_quota_rollback.sql · Verify: supabase/checks/20261024160000_ai_quota_verify.sql
-- Tests: supabase/tests/database/ai_quota.test.sql (dry run: node scripts/db-test.mjs --pending <this file>)
--
-- Trust boundary (revision 3):
--   * Only the server route can take or release a slot: every call must carry the server's AI_QUOTA_SECRET (a Worker
--     secret). The database stores only its SHA-256 hash (set by you after applying; never in this file). Without the
--     right secret nothing is recorded, so a signed-in user calling the function directly (REST or GraphQL) can't use
--     up anyone's allowance. No service-role key is involved: the route calls with the user's own token, so the slot
--     belongs to auth.uid().
--   * Limits live in the database (private.ai_settings), not in the request: per-user cooldown, per-user daily cap,
--     global daily cap and a global per-minute cap (burst control below Groq's per-minute token limit).
--   * A slot is released only when the provider produced nothing (rate-limited or unavailable); timeouts, server errors
--     and rejected answers stay counted (tokens may have been used). Releasing needs the same server secret, and it only
--     MARKS the slot ('ai_released'): it no longer counts toward the daily caps, but still counts for the per-user
--     cooldown and the global per-minute cap — so repeated provider 429s can't turn into unlimited rapid retries.
--   * Per-user and global advisory locks: concurrent requests can't exceed any cap.
begin;

create extension if not exists pgcrypto with schema extensions;

alter table private.quota_events drop constraint if exists quota_events_kind_check;
alter table private.quota_events add constraint quota_events_kind_check
  check (kind in ('services', 'requests', 'messages', 'uploads', 'ai', 'ai_released'));
create index if not exists quota_events_kind_time on private.quota_events (kind, created_at);

-- One row of settings. Provisional values (2026-10-25); change them with an UPDATE in the SQL Editor.
create table private.ai_settings (
  id boolean primary key default true check (id),
  secret_sha256 text check (secret_sha256 is null or secret_sha256 ~ '^[0-9a-f]{64}$'),
  user_daily int not null default 10 check (user_daily between 1 and 50),
  global_daily int not null default 120 check (global_daily between 1 and 2000),
  global_per_minute int not null default 6 check (global_per_minute between 1 and 60),
  cooldown_seconds int not null default 10 check (cooldown_seconds between 3 and 600)
);
insert into private.ai_settings (id) values (true);
revoke all on private.ai_settings from public, anon, authenticated;

create or replace function private.ai_secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.secret_sha256 is not null
        and s.secret_sha256 = encode(extensions.digest(convert_to(coalesce(p_secret, ''), 'UTF8'), 'sha256'), 'hex')
     from private.ai_settings s),
    false)
$$;
revoke all on function private.ai_secret_ok(text) from public, anon, authenticated;

-- Returns {"outcome": ok | cooldown | user_limit | global_limit | busy | forbidden | unauthenticated, "slot": timestamp|null}.
create or replace function public.consume_ai_quota(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cfg private.ai_settings;
  last_at timestamptz;
  used int;
  total_day int;
  total_minute int;
begin
  if uid is null then return jsonb_build_object('outcome', 'unauthenticated', 'slot', null); end if;
  if not private.ai_secret_ok(p_secret) then return jsonb_build_object('outcome', 'forbidden', 'slot', null); end if;
  select * into cfg from private.ai_settings;
  perform pg_advisory_xact_lock(hashtextextended('skillloop-quota:ai:' || uid::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('skillloop-quota:ai:global', 0));
  -- Cooldown counts released slots too; the daily cap counts only kept ones.
  select max(created_at), count(*) filter (where kind = 'ai') into last_at, used from private.quota_events
    where user_id = uid and kind in ('ai', 'ai_released') and created_at > now() - interval '24 hours';
  if last_at is not null and last_at > now() - make_interval(secs => cfg.cooldown_seconds) then
    return jsonb_build_object('outcome', 'cooldown', 'slot', null);
  end if;
  if used >= cfg.user_daily then return jsonb_build_object('outcome', 'user_limit', 'slot', null); end if;
  -- Global daily cap: kept slots; per-minute burst cap: every attempt, released or not.
  select count(*) filter (where kind = 'ai'), count(*) filter (where created_at > now() - interval '1 minute') into total_day, total_minute
    from private.quota_events where kind in ('ai', 'ai_released') and created_at > now() - interval '24 hours';
  if total_day >= cfg.global_daily then return jsonb_build_object('outcome', 'global_limit', 'slot', null); end if;
  if total_minute >= cfg.global_per_minute then return jsonb_build_object('outcome', 'busy', 'slot', null); end if;
  insert into private.quota_events (user_id, kind) values (uid, 'ai');
  delete from private.quota_events where user_id = uid and kind in ('ai', 'ai_released') and created_at < now() - interval '48 hours';
  return jsonb_build_object('outcome', 'ok', 'slot', now());
end $$;
revoke all on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;

-- Gives back the caller's own slot taken at p_slot (server secret required; used when the provider produced nothing).
-- The slot is marked, not deleted: it stops counting toward the daily caps but keeps counting for cooldown and burst.
create or replace function public.release_ai_quota(p_secret text, p_slot timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null or p_slot is null or not private.ai_secret_ok(p_secret) then return false; end if;
  update private.quota_events set kind = 'ai_released' where user_id = uid and kind = 'ai' and created_at = p_slot;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.release_ai_quota(text, timestamptz) from public, anon;
grant execute on function public.release_ai_quota(text, timestamptz) to authenticated;

commit;
