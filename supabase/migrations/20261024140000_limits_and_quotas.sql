-- STATUS: NOT APPLIED — awaiting your review (2026-10-24). Run the read-only preflight first:
--   supabase/checks/20261024140000_limits_preflight.sql   (must return 0 rows)
-- Rollback: supabase/checks/20261024140000_limits_rollback.sql
-- Tests:    supabase/tests/database/limits.test.sql (dry run before applying: node scripts/db-test.mjs --pending <this file>)
--
-- What it does (approved 2026-10-24):
--   1. Size limits = the app's form limits, enforced for direct API calls too. Existing rows are CHECKED, never changed:
--      if any row breaks a rule, ADD CONSTRAINT fails and the whole migration rolls back.
--   2. Daily quotas per account, rolling 24 h: 20 new services, 30 new requests, 300 messages, 40 photo uploads.
--      Counted in a private ledger (deleting a service does not give the slot back), serialized per user and kind with an
--      advisory lock (two simultaneous requests can't both take the last slot). Only INSERTs count: edits, archive/restore,
--      publish-from-draft, status changes and deletes never do. Only the request's own opening message (written by the
--      request_initial_message trigger) is exempt from the message quota.
--   3. Photos must be inside the owner's own folder (service image, avatar, portfolio).
--   4. Users may UPDATE only the profile fields the app edits.
--   5. Signup copies at most 80 characters of the name into the profile (a longer Google/form name can't break signup).
begin;

-- ─────────────── 1. Size limits, categories, photo folders (validated against existing rows) ───────────────
alter table public.services
  add constraint services_title_len check (length(title) <= 120),
  add constraint services_description_len check (length(description) <= 4000),
  add constraint services_city_len check (length(city) <= 80),
  add constraint services_category_known check (category in ('tech', 'design', 'tutoring', 'home', 'care', 'healthcare',
    'engineering', 'automotive', 'business', 'events', 'personal', 'student', 'other')),
  add constraint services_details_size check (octet_length(details::text) <= 8192),
  add constraint services_image_own_folder check (image_url is null or image_url like owner_id::text || '/%');

alter table public.profiles
  add constraint profiles_display_name_len check (length(display_name) <= 80),
  add constraint profiles_title_len check (title is null or length(title) <= 80),
  add constraint profiles_bio_len check (bio is null or length(bio) <= 1000),
  add constraint profiles_city_len check (city is null or length(city) <= 80),
  add constraint profiles_area_len check (area is null or length(area) <= 80),
  add constraint profiles_details_size check (octet_length(professional_details::text) <= 8192),
  add constraint profiles_avatar_own_folder check (avatar_url is null or avatar_url like id::text || '/%');

alter table public.requests
  add constraint requests_details_size check (octet_length(details::text) <= 4096);

alter table public.portfolio_items
  add constraint portfolio_image_own_folder check (image_url like owner_id::text || '/%');

-- ─────────────── 5. Signup: never fail on a long name (existing profiles are not touched) ───────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ─────────────── 2. Daily quotas ───────────────
-- `private` is not exposed by the API (PostgREST serves `public` only). Signed-in users need USAGE + EXECUTE on
-- consume_daily_quota only because the storage upload policy calls it as them; it acts on auth.uid() alone.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.quota_events (
  user_id uuid not null,
  kind text not null check (kind in ('services', 'requests', 'messages', 'uploads')),
  created_at timestamptz not null default now()
);
create index quota_events_lookup on private.quota_events (user_id, kind, created_at);
revoke all on private.quota_events from public, anon, authenticated;

create or replace function private.daily_cap(p_kind text) returns int
language sql immutable set search_path = '' as $$
  select case p_kind when 'services' then 20 when 'requests' then 30 when 'messages' then 300 when 'uploads' then 40 end
$$;

-- Takes one slot for the CURRENT user, or returns false when the rolling 24 h cap is used up.
-- The advisory lock serializes concurrent calls for the same user + kind until their transactions end.
-- No auth.uid() (SQL editor, service role) = not a user action: no quota.
create or replace function private.consume_daily_quota(p_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  used int;
begin
  if uid is null then return true; end if;
  perform pg_advisory_xact_lock(hashtextextended('skillloop-quota:' || p_kind || ':' || uid::text, 0));
  select count(*) into used from private.quota_events
    where user_id = uid and kind = p_kind and created_at > now() - interval '24 hours';
  if used >= private.daily_cap(p_kind) then return false; end if;
  insert into private.quota_events (user_id, kind) values (uid, p_kind);
  delete from private.quota_events where user_id = uid and kind = p_kind and created_at < now() - interval '48 hours';
  return true;
end $$;
revoke all on function private.consume_daily_quota(text) from public, anon;
grant execute on function private.consume_daily_quota(text) to authenticated;

create or replace function private.enforce_daily_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Exempt ONLY a request's opening message, as written by public.first_request_message (request_initial_message
  -- trigger): inserted from inside a trigger, by the request's client, with exactly the request's text, as the first
  -- message of that request. The request itself was already counted. Any other message — including one inserted by
  -- some other trigger — uses the quota. (Nested IF: NEW.request_id only exists when the table is messages.)
  if TG_TABLE_NAME = 'messages' and pg_trigger_depth() > 1 then
    if exists (select 1 from public.requests r
               where r.id = new.request_id and r.client_id = new.sender_id and r.message = new.body)
       and not exists (select 1 from public.messages m where m.request_id = new.request_id) then
      return new;
    end if;
  end if;
  if not private.consume_daily_quota(TG_TABLE_NAME) then
    raise exception using errcode = 'P0001', message = 'daily_limit_reached:' || TG_TABLE_NAME;
  end if;
  return new;
end $$;
revoke all on function private.enforce_daily_quota() from public, anon, authenticated;

create trigger services_daily_quota before insert on public.services for each row execute function private.enforce_daily_quota();
create trigger requests_daily_quota before insert on public.requests for each row execute function private.enforce_daily_quota();
create trigger messages_daily_quota before insert on public.messages for each row execute function private.enforce_daily_quota();

-- Uploads: same folder rule as before + one upload slot. Over the cap the policy is false (the API answers with a
-- row-level-security error), so the app asks upload_quota_left() to tell "limit reached" apart from other failures.
drop policy if exists "service images owner upload" on storage.objects;
create policy "service images owner upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.consume_daily_quota('uploads'));

-- Read-only: photo uploads left for the signed-in user in the rolling 24 h window.
create or replace function public.upload_quota_left() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, private.daily_cap('uploads') - count(*)::int) from private.quota_events
  where user_id = auth.uid() and kind = 'uploads' and created_at > now() - interval '24 hours'
$$;
revoke all on function public.upload_quota_left() from public, anon;
grant execute on function public.upload_quota_left() to authenticated;

-- ─────────────── 4. Profile fields a user may update ───────────────
revoke update on public.profiles from authenticated;
grant update (display_name, title, bio, city, area, avatar_url, professional_details, preferred_lang) on public.profiles to authenticated;

commit;
