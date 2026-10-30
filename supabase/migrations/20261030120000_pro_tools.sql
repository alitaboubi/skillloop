-- PREPARED 2026-10-30 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
-- Requires, applied first and in order: 20261028120000_portfolio_before_after.sql, 20261029120000_subscriptions.sql.
--   Dry run (all three, rolled back):
--     node scripts/db-test.mjs --pending supabase/migrations/20261028120000_portfolio_before_after.sql \
--       --pending supabase/migrations/20261029120000_subscriptions.sql --pending supabase/migrations/20261030120000_pro_tools.sql
--   Verify after applying: supabase/checks/20261030120000_pro_tools_verify.sql
--   Rollback: supabase/checks/20261030120000_pro_tools_rollback.sql
--   Then set the public build variable VITE_PRO_TOOLS=on (Cloudflare → Build variables) and redeploy.
--
-- SkillLoop Pro, phase 2 (docs/product/pro-plan-strategy.md) — the "Bientôt" features of the pricing page:
--   • Portfolio en mouvement: a portfolio item may carry a short video (portfolio_items.video_url, ≤ 8 MB; the app
--     limits it to 15 s and uploads a poster frame as the item's normal image). Uploading or attaching a NEW video needs
--     Pro; videos already published stay when Pro ends (same rule as plan limits: only new actions are refused).
--   • Thèmes de carnet: professional_details.carnet_theme; choosing a theme needs Pro, and the public page applies it only
--     while the pro has Pro (public.has_pro). The stored choice is kept, so it comes back on renewal.
--   • Statistiques: daily counters per pro in private.page_stats (no visitor data at all: no IP, no user id, no
--     referrer). Anyone may add +1 through public.record_page_event (the pro's own visits are ignored, each counter is
--     capped per day). Only the pro reads their counters, and only while they have Pro (public.my_page_stats). Counting
--     happens for every pro, so a pro who upgrades sees their history.
--   • Carte & QR: built in the browser, no database part (its scans are counted as 'qr_scan').
--   • Admin/SQL-editor writes (no auth.uid()) never hit the Pro checks.
begin;

do $$ begin
  if to_regprocedure('private.is_pro(uuid)') is null then
    raise exception 'apply 20261029120000_subscriptions.sql first';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name = 'before_image_url') then
    raise exception 'apply 20261028120000_portfolio_before_after.sql first';
  end if;
end $$;

-- ───────────────────────────── Portfolio en mouvement ─────────────────────────────
alter table public.portfolio_items add column if not exists video_url text;
alter table public.portfolio_items
  drop constraint if exists portfolio_video_own_folder,
  drop constraint if exists portfolio_video_shape;
alter table public.portfolio_items
  add constraint portfolio_video_own_folder check (video_url is null or video_url like owner_id::text || '/motion/%'),
  add constraint portfolio_video_shape check (video_url is null or video_url ~ '^[0-9a-f-]{36}/motion/[0-9a-f-]{36}\.(mp4|webm|mov)$');

create or replace function private.portfolio_motion_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.video_url is null then return new; end if;
  if tg_op = 'UPDATE' and new.video_url is not distinct from old.video_url then return new; end if;
  if not private.is_pro(new.owner_id) then
    raise exception using errcode = 'P0001', message = 'plan_required:motion';
  end if;
  return new;
end $$;
revoke all on function private.portfolio_motion_guard() from public, anon, authenticated;
drop trigger if exists portfolio_motion_guard on public.portfolio_items;
create trigger portfolio_motion_guard before insert or update of video_url on public.portfolio_items
  for each row execute function private.portfolio_motion_guard();

-- Video files: only Pro accounts may upload them, and only into their own "motion" folder.
create or replace function private.enforce_motion_upload() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  if new.bucket_id is distinct from 'service-images' then return new; end if;
  if not (new.name ~* '\.(mp4|webm|mov)$' or coalesce(new.metadata->>'mimetype', '') like 'video/%') then return new; end if;
  -- Same uploader resolution as private.enforce_upload_quota (20261024150000).
  if new.owner_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    uid := new.owner_id::uuid;
  else
    uid := auth.uid();
  end if;
  if uid is null then return new; end if;  -- administrator upload
  if (storage.foldername(new.name))[2] is distinct from 'motion' or not private.is_pro(uid) then
    raise exception using errcode = 'P0001', message = 'plan_required:motion';
  end if;
  return new;
end $$;
revoke all on function private.enforce_motion_upload() from public, anon, authenticated;
drop trigger if exists skillloop_motion_upload on storage.objects;
create trigger skillloop_motion_upload before insert on storage.objects
  for each row execute function private.enforce_motion_upload();

-- Bucket: 8 MB (photos are re-encoded by the crop dialog and stay far below), + MP4 / WebM / QuickTime videos.
update storage.buckets
  set file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
  where id = 'service-images';

-- Storage read rule (20261028120000) + portfolio videos.
drop policy if exists "service images public read" on storage.objects;
create policy "service images public read" on storage.objects for select using (
  bucket_id = 'service-images' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.services s where s.image_url = name and s.status = 'published' and not s.archived)
    or exists (select 1 from public.profiles p where p.avatar_url = name)
    or exists (select 1 from public.portfolio_items p where p.image_url = name or p.before_image_url = name or p.video_url = name)));

-- ───────────────────────────── Thèmes de carnet ─────────────────────────────
create or replace function private.carnet_theme_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if new.professional_details->>'carnet_theme' is null then return new; end if;
  if new.professional_details->>'carnet_theme' is not distinct from old.professional_details->>'carnet_theme' then return new; end if;
  if not private.is_pro(new.id) then
    raise exception using errcode = 'P0001', message = 'plan_required:themes';
  end if;
  return new;
end $$;
revoke all on function private.carnet_theme_guard() from public, anon, authenticated;
drop trigger if exists profiles_carnet_theme_guard on public.profiles;
create trigger profiles_carnet_theme_guard before update of professional_details on public.profiles
  for each row execute function private.carnet_theme_guard();

-- Whether a profile currently has Pro (public: the profile page applies the pro's theme only then).
create or replace function public.has_pro(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.is_pro(p_user) $$;
revoke all on function public.has_pro(uuid) from public;
grant execute on function public.has_pro(uuid) to anon, authenticated;

-- ───────────────────────────── Statistiques ─────────────────────────────
create table if not exists private.page_stats (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('profile_view', 'service_view', 'qr_scan', 'contact_click', 'share')),
  count int not null default 0 check (count >= 0),
  primary key (owner_id, day, kind)
);
revoke all on private.page_stats from public, anon, authenticated;

create or replace function private.stats_daily_cap() returns int language sql immutable set search_path = '' as $$ select 5000 $$;
create or replace function private.stats_today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Tunis')::date
$$;

-- +1 on a pro's counter. Profile events target the profile id; service events a published service id. Unknown targets,
-- deleted accounts and the pro's own visits are silently ignored (nothing to learn from the answer).
create or replace function public.record_page_event(p_kind text, p_target uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if p_kind in ('profile_view', 'qr_scan', 'contact_click') then
    select id into owner from public.profiles where id = p_target and display_name <> '';
  elsif p_kind in ('service_view', 'share') then
    select s.owner_id into owner from public.services s join public.profiles p on p.id = s.owner_id
      where s.id = p_target and s.status = 'published' and not s.archived and p.display_name <> '';
  else
    return;
  end if;
  if owner is null or owner = auth.uid() then return; end if;
  insert into private.page_stats as ps (owner_id, day, kind, count) values (owner, private.stats_today(), p_kind, 1)
  on conflict (owner_id, day, kind) do update set count = ps.count + 1 where ps.count < private.stats_daily_cap();
end $$;
revoke all on function public.record_page_event(text, uuid) from public;
grant execute on function public.record_page_event(text, uuid) to anon, authenticated;

-- The signed-in pro's last p_days days (1–90), oldest first, with the requests they received. Pro only.
create or replace function public.my_page_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n int := least(90, greatest(1, coalesce(p_days, 30)));
  since date;
begin
  if uid is null then raise exception using errcode = '42501', message = 'not signed in'; end if;
  if not private.is_pro(uid) then raise exception using errcode = 'P0001', message = 'plan_required:stats'; end if;
  since := private.stats_today() - (n - 1);
  return jsonb_build_object('since', since, 'days', n, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'count', count) order by day, kind)
    from (
      select day, kind, count from private.page_stats where owner_id = uid and day >= since
      union all
      select (r.created_at at time zone 'Africa/Tunis')::date, 'request', count(*)::int from public.requests r
        where r.provider_id = uid and (r.created_at at time zone 'Africa/Tunis')::date >= since
        group by 1
    ) x), '[]'::jsonb));
end $$;
revoke all on function public.my_page_stats(int) from public, anon;
grant execute on function public.my_page_stats(int) to authenticated;

-- A deleted account (empty display_name, see 20261025120000) keeps no counters.
create or replace function private.page_stats_forget() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name = '' and old.display_name <> '' then delete from private.page_stats where owner_id = new.id; end if;
  return new;
end $$;
revoke all on function private.page_stats_forget() from public, anon, authenticated;
drop trigger if exists profiles_page_stats_forget on public.profiles;
create trigger profiles_page_stats_forget after update of display_name on public.profiles
  for each row execute function private.page_stats_forget();

commit;
