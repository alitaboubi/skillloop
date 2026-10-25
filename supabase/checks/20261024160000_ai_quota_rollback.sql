-- ROLLBACK for 20261024160000_ai_quota.sql (revision 3). Afterwards the AI route answers "unavailable" in production.
-- Removes only AI items: the two functions, the settings row/table, and the 'ai'/'ai_released' quota entries (so the original check
-- constraint can be restored). pgcrypto is left installed (Supabase enables it by default; other features may use it).
begin;
drop function if exists public.release_ai_quota(text, timestamptz);
drop function if exists public.consume_ai_quota(text);
drop function if exists private.ai_secret_ok(text);
drop table if exists private.ai_settings;
delete from private.quota_events where kind in ('ai', 'ai_released');
drop index if exists private.quota_events_kind_time;
alter table private.quota_events drop constraint if exists quota_events_kind_check;
alter table private.quota_events add constraint quota_events_kind_check
  check (kind in ('services', 'requests', 'messages', 'uploads'));
commit;
