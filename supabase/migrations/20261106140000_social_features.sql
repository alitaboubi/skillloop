-- APPLIED 2026-11-06 (Ali: dry run + apply; live on skillloop.tn/admin). History below kept as written.
--   Needs (applied): 20261102120000_admin.sql, 20261106120000_notifications.sql.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261106140000_social_features.sql
--   Verify after applying: supabase/checks/20261106140000_social_features_verify.sql
--   Rollback: supabase/checks/20261106140000_social_features_rollback.sql
--   Then set VITE_SOCIAL_FEATURES=on (Cloudflare → Build variables; needs VITE_ADMIN=on and VITE_NOTIFICATIONS=on) and redeploy.
--
-- « Vu sur SkillLoop »: when SkillLoop posts a reel on Instagram / Facebook about real pros or clients, the people in it
-- are told in the app, and each one decides whether it shows on their public profile.
--   • social_posts: one row per reel/post (a short title + its Instagram and/or Facebook link). Written ONLY by operators
--     (private.admins) through the admin_social_* functions. A draft is invisible; publishing it alerts the people in it.
--   • social_post_people: who appears in a post (≤ 12). Each person's choice: pending (default) / shown / hidden. Nothing
--     appears on a public profile until that person picks « shown » themself — consent is recorded in the app (decided_at).
--   • Alerts: feature_you → each person in the post (once, at publication or when added later). feature_new → optionally
--     every other account, once per post and at most one announcement every 12 hours (no spam).
--   • Public read: public_social_features(user) returns only published posts the person chose to show, never the others
--     and never who else appears in them.
--   • Links are stored normalised (no tracking parameters) and checked by the database: instagram.com/reel|p|tv/<code>/ and
--     facebook.com/… or fb.watch/… only, https only.
--   • Account deletion (name emptied) removes the person from every post.
-- Notifications gain a feature_id column (cascade on post deletion) and private.notify an optional 6th argument.
begin;

create schema if not exists private;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 120),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://www\.instagram\.com/(reel|p|tv)/[A-Za-z0-9_-]{5,64}/$'),
  facebook_url text check (facebook_url is null or (length(facebook_url) <= 300
    and facebook_url ~ '^https://(www\.facebook\.com/[A-Za-z0-9._/?=&%-]+|fb\.watch/[A-Za-z0-9_-]+/?)$')),
  constraint social_posts_has_link check (instagram_url is not null or facebook_url is not null),
  published_at timestamptz,
  announced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_posts_published on public.social_posts (published_at desc) where published_at is not null;

create table if not exists public.social_post_people (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null default 'pending' check (choice in ('pending', 'shown', 'hidden')),
  decided_at timestamptz,
  notified_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists social_post_people_user on public.social_post_people (user_id);

-- No direct API access: everything goes through the functions below.
revoke all on public.social_posts, public.social_post_people from public, anon, authenticated;
grant all on public.social_posts, public.social_post_people to service_role;
alter table public.social_posts enable row level security;
alter table public.social_post_people enable row level security;

-- ── notifications: two kinds + a link to the post ──
alter table public.notifications add column if not exists feature_id uuid references public.social_posts(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'welcome', 'service_live', 'request_new', 'request_accepted', 'request_declined', 'request_cancelled',
  'job_scheduled', 'job_on_the_way', 'job_started', 'job_completed', 'review_new', 'review_reply',
  'support_new', 'support_reply', 'feature_you', 'feature_new'));

-- The one writer, now with an optional post. The 5-argument version is replaced (the trigger functions call it by
-- position, so they keep working unchanged).
drop function if exists private.notify(uuid, text, uuid, uuid, uuid);
create or replace function private.notify(p_user uuid, p_kind text, p_request uuid default null, p_service uuid default null,
  p_actor uuid default null, p_feature uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.display_name <> '') then return; end if;
  insert into public.notifications (user_id, kind, request_id, service_id, actor_id, feature_id)
    values (p_user, p_kind, p_request, p_service, p_actor, p_feature);
  delete from public.notifications n where n.user_id = p_user and (
    n.created_at < now() - interval '90 days'
    or n.id in (select x.id from public.notifications x where x.user_id = p_user order by x.created_at desc, x.id offset 100));
end $$;
revoke all on function private.notify(uuid, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- The bell's feed, now with the post's title and link for feature_* rows.
create or replace function public.my_notifications(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'unread', (select count(*) from public.notifications n where n.user_id = auth.uid() and n.read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', n.id, 'kind', n.kind, 'created_at', n.created_at, 'read_at', n.read_at,
          'request_id', n.request_id, 'service_id', n.service_id,
          'service_title', s.title, 'actor_name', a.display_name,
          'feature_id', n.feature_id, 'feature_title', f.title, 'feature_url', coalesce(f.instagram_url, f.facebook_url))
        order by n.created_at desc, n.id)
      from (select * from public.notifications x where x.user_id = auth.uid()
            order by x.created_at desc, x.id limit least(50, greatest(1, coalesce(p_limit, 30)))) n
      left join public.services s on s.id = n.service_id
      left join public.profiles a on a.id = n.actor_id
      left join public.social_posts f on f.id = n.feature_id and f.published_at is not null), '[]'::jsonb))
  where auth.uid() is not null
$$;
revoke all on function public.my_notifications(int) from public, anon;
grant execute on function public.my_notifications(int) to authenticated;

-- ── internal helpers ──
-- Alerts the people of a published post who were not alerted yet.
create or replace function private.social_notify_people(p_post uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  if not exists (select 1 from public.social_posts s where s.id = p_post and s.published_at is not null) then return 0; end if;
  for r in select sp.user_id from public.social_post_people sp where sp.post_id = p_post and sp.notified_at is null loop
    perform private.notify(r.user_id, 'feature_you', null, null, null, p_post);
    update public.social_post_people sp set notified_at = now() where sp.post_id = p_post and sp.user_id = r.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function private.social_notify_people(uuid) from public, anon, authenticated;

-- One post as JSON for operators (people with live name, city, photo path, pro or not, and their choice).
create or replace function private.social_post_json(p_post uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'title', s.title, 'instagram_url', s.instagram_url, 'facebook_url', s.facebook_url,
    'published_at', s.published_at, 'announced_at', s.announced_at, 'created_at', s.created_at,
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.display_name, 'city', p.city, 'avatar_url', p.avatar_url,
          'pro', exists (select 1 from public.services v where v.owner_id = p.id and v.status = 'published' and not v.archived),
          'choice', sp.choice, 'notified', sp.notified_at is not null)
        order by sp.added_at, p.id)
      from public.social_post_people sp join public.profiles p on p.id = sp.user_id
      where sp.post_id = s.id and p.display_name <> ''), '[]'::jsonb))
  from public.social_posts s where s.id = p_post
$$;
revoke all on function private.social_post_json(uuid) from public, anon, authenticated;

-- ── operators ──
-- Every post, newest first (≤ 100).
create or replace function public.admin_social_posts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(private.social_post_json(x.id) order by x.created_at desc, x.id)
    from (select s.id, s.created_at from public.social_posts s order by s.created_at desc, s.id limit 100) x), '[]'::jsonb);
end $$;
revoke all on function public.admin_social_posts() from public, anon;
grant execute on function public.admin_social_posts() to authenticated;

-- Find accounts to tag by name (≥ 2 characters, ≤ 12 results). Name, city and photo only — never the email address.
create or replace function public.admin_social_people_search(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := btrim(coalesce(p_q, ''));
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if length(q) < 2 then return '[]'::jsonb; end if;
  q := '%' || replace(replace(replace(left(q, 60), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.display_name, 'city', x.city, 'avatar_url', x.avatar_url, 'pro', x.pro)
      order by x.pro desc, x.display_name)
    from (select p.id, p.display_name, p.city, p.avatar_url,
            exists (select 1 from public.services v where v.owner_id = p.id and v.status = 'published' and not v.archived) as pro
          from public.profiles p
          where p.display_name <> '' and p.display_name ilike q
          order by p.display_name limit 12) x), '[]'::jsonb);
end $$;
revoke all on function public.admin_social_people_search(text) from public, anon;
grant execute on function public.admin_social_people_search(text) to authenticated;

-- Create (p_id null) or edit a post and set who is in it (≤ 12 accounts). People removed lose their entry and their
-- alert about it; people added to an already published post are alerted at once. Returns the post as JSON.
create or replace function public.admin_social_post_save(p_id uuid, p_title text, p_instagram text, p_facebook text, p_people uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid := p_id; people uuid[] := coalesce(p_people, '{}');
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if cardinality(people) > 12 then raise exception 'too_many_people' using errcode = '22023'; end if;
  if exists (select 1 from unnest(people) u(id) where not exists (
      select 1 from public.profiles p where p.id = u.id and p.display_name <> '')) then
    raise exception 'unknown_person' using errcode = 'P0002';
  end if;
  if pid is null then
    insert into public.social_posts (title, instagram_url, facebook_url, created_by)
      values (btrim(p_title), nullif(btrim(p_instagram), ''), nullif(btrim(p_facebook), ''), auth.uid())
      returning id into pid;
  else
    update public.social_posts s set title = btrim(p_title), instagram_url = nullif(btrim(p_instagram), ''),
        facebook_url = nullif(btrim(p_facebook), ''), updated_at = now()
      where s.id = pid;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  end if;
  delete from public.notifications n where n.feature_id = pid and n.kind = 'feature_you' and not (n.user_id = any (people));
  delete from public.social_post_people sp where sp.post_id = pid and not (sp.user_id = any (people));
  insert into public.social_post_people (post_id, user_id)
    select pid, u.id from (select distinct unnest(people) as id) u
    on conflict (post_id, user_id) do nothing;
  perform private.social_notify_people(pid);
  return private.social_post_json(pid);
end $$;
revoke all on function public.admin_social_post_save(uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.admin_social_post_save(uuid, text, text, text, uuid[]) to authenticated;

-- Publish: the people in it are alerted (once). With p_announce, every other account gets « nouvelle vidéo » — once per
-- post, and not within 12 hours of the previous announcement (announce_too_soon). Returns {people, everyone}.
create or replace function public.admin_social_post_publish(p_id uuid, p_announce boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.social_posts; tagged int; everyone int := 0; r record;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('skillloop_social_publish'));
  select * into s from public.social_posts x where x.id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if s.published_at is null then
    update public.social_posts x set published_at = now(), updated_at = now() where x.id = p_id;
  end if;
  tagged := private.social_notify_people(p_id);
  if coalesce(p_announce, false) and s.announced_at is null then
    if exists (select 1 from public.social_posts x where x.announced_at > now() - interval '12 hours') then
      raise exception 'announce_too_soon' using errcode = 'P0001';
    end if;
    for r in select p.id from public.profiles p
             where p.display_name <> ''
               and not exists (select 1 from public.social_post_people sp where sp.post_id = p_id and sp.user_id = p.id) loop
      perform private.notify(r.id, 'feature_new', null, null, null, p_id);
      everyone := everyone + 1;
    end loop;
    update public.social_posts x set announced_at = now() where x.id = p_id;
  end if;
  return jsonb_build_object('people', tagged, 'everyone', everyone);
end $$;
revoke all on function public.admin_social_post_publish(uuid, boolean) from public, anon;
grant execute on function public.admin_social_post_publish(uuid, boolean) to authenticated;

-- Delete a post: it leaves every profile, and its alerts disappear (cascade).
create or replace function public.admin_social_post_delete(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  delete from public.social_posts s where s.id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.admin_social_post_delete(uuid) from public, anon;
grant execute on function public.admin_social_post_delete(uuid) to authenticated;

-- ── the person in the post ──
-- My published posts (newest first) with my choice.
create or replace function public.my_social_features() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'instagram_url', s.instagram_url, 'facebook_url', s.facebook_url,
        'published_at', s.published_at, 'choice', sp.choice)
      order by s.published_at desc, s.id)
    from public.social_post_people sp join public.social_posts s on s.id = sp.post_id
    where sp.user_id = auth.uid() and s.published_at is not null), '[]'::jsonb)
  where auth.uid() is not null
$$;
revoke all on function public.my_social_features() from public, anon;
grant execute on function public.my_social_features() to authenticated;

-- Show (true) or hide (false) one of my posts on my public profile. Only my own entry; the post must be published.
create or replace function public.set_social_feature_choice(p_post uuid, p_show boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_show is null then raise exception 'bad_choice' using errcode = '22023'; end if;
  update public.social_post_people sp set choice = case when p_show then 'shown' else 'hidden' end, decided_at = now()
    where sp.post_id = p_post and sp.user_id = auth.uid()
      and exists (select 1 from public.social_posts s where s.id = sp.post_id and s.published_at is not null);
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.notifications n set read_at = now()
    where n.user_id = auth.uid() and n.feature_id = p_post and n.read_at is null;
end $$;
revoke all on function public.set_social_feature_choice(uuid, boolean) from public, anon;
grant execute on function public.set_social_feature_choice(uuid, boolean) to authenticated;

-- ── public profile ──
-- The published posts this person chose to show (≤ 12, newest first). Never who else is in them.
create or replace function public.public_social_features(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', x.id, 'title', x.title, 'instagram_url', x.instagram_url, 'facebook_url', x.facebook_url, 'published_at', x.published_at)
      order by x.published_at desc, x.id)
    from (select s.* from public.social_post_people sp
          join public.social_posts s on s.id = sp.post_id
          join public.profiles p on p.id = sp.user_id
          where sp.user_id = p_user and sp.choice = 'shown' and s.published_at is not null and p.display_name <> ''
          order by s.published_at desc, s.id limit 12) x), '[]'::jsonb)
$$;
revoke all on function public.public_social_features(uuid) from public;
grant execute on function public.public_social_features(uuid) to anon, authenticated;

-- ── account deletion (name emptied) removes the person from every post ──
create or replace function private.social_forget() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name = '' and old.display_name <> '' then
    delete from public.social_post_people sp where sp.user_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.social_forget() from public, anon, authenticated;
drop trigger if exists profiles_social_forget on public.profiles;
create trigger profiles_social_forget after update of display_name on public.profiles
  for each row execute function private.social_forget();

commit;
