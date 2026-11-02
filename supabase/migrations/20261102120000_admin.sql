-- PREPARED 2026-11-02 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261102120000_admin.sql
--   Verify after applying: supabase/checks/20261102120000_admin_verify.sql
--   Rollback: supabase/checks/20261102120000_admin_rollback.sql
--   Then make yourself admin in the SQL editor (your user id: Authentication → Users):
--     insert into private.admins (user_id) values ('<your-user-id>');
--   and set the public build variable VITE_ADMIN=on (Cloudflare → Build variables) and redeploy.
--
-- Operator space (/admin): platform figures in one read-only call. No service-role key and no server secret.
--   • private.admins: who is an operator. Not reachable through the API; rows are added in the SQL editor only.
--   • public.am_i_admin(): the signed-in user's own flag (the app shows the /admin link only when true).
--   • public.admin_overview(p_days): aggregate counts only — no names, emails, messages or request text ever leave
--     the database. Refused (42501) for anyone not in private.admins.
--   • Tables from migrations that may not be applied yet (subscriptions, notify_requests) are read only when they exist.
begin;

create schema if not exists private;

create table if not exists private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;

create or replace function private.is_admin(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from private.admins a where a.user_id = p_user)
$$;
revoke all on function private.is_admin(uuid) from public, anon, authenticated;

create or replace function public.am_i_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin(auth.uid())
$$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

create or replace function public.admin_overview(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  days int := least(90, greatest(7, coalesce(p_days, 30)));
  since date := (now() at time zone 'utc')::date - (days - 1);
  since_ts timestamptz := since::timestamp at time zone 'utc';
  result jsonb;
  extra jsonb := '{}'::jsonb;
  sub jsonb;
  notify int;
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'days', days,
    'since', since,
    'generated_at', now(),
    'users', (select jsonb_build_object(
        'total', count(*) filter (where display_name <> ''),
        'new', count(*) filter (where display_name <> '' and created_at >= since_ts),
        'deleted', count(*) filter (where display_name = ''))
      from public.profiles),
    'pros', (select jsonb_build_object(
        'total', count(distinct owner_id),
        'new', (select count(*) from (
          select owner_id from public.services where status = 'published' group by owner_id having min(created_at) >= since_ts) f))
      from public.services where status = 'published' and not archived),
    'services', (select jsonb_build_object(
        'published', count(*) filter (where status = 'published' and not archived),
        'draft', count(*) filter (where status = 'draft' and not archived),
        'archived', count(*) filter (where archived),
        'new', count(*) filter (where created_at >= since_ts))
      from public.services),
    'requests', (select jsonb_build_object(
        'total', count(*),
        'new', count(*) filter (where created_at >= since_ts),
        'pending', count(*) filter (where status = 'pending'),
        'accepted', count(*) filter (where status = 'accepted'),
        'declined', count(*) filter (where status = 'declined'),
        'cancelled', count(*) filter (where status = 'cancelled'))
      from public.requests),
    'messages', (select jsonb_build_object('total', count(*), 'new', count(*) filter (where created_at >= since_ts))
      from public.messages),
    'portfolio', (select count(*) from public.portfolio_items),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'count', n) order by n desc, category)
      from (select category, count(*) as n from public.services where status = 'published' and not archived
            group by category order by n desc, category limit 8) c), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('city', city, 'count', n) order by n desc, city)
      from (select initcap(trim(city)) as city, count(*) as n from public.services
            where status = 'published' and not archived and trim(city) <> ''
            group by 1 order by n desc, 1 limit 6) c), '[]'::jsonb),
    'series', (select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'users', (select count(*) from public.profiles p where display_name <> '' and (p.created_at at time zone 'utc')::date = d.day),
        'services', (select count(*) from public.services s where (s.created_at at time zone 'utc')::date = d.day),
        'requests', (select count(*) from public.requests r where (r.created_at at time zone 'utc')::date = d.day)) order by d.day)
      from (select generate_series(since, since + (days - 1), interval '1 day')::date as day) d)
  ) into result;

  if to_regclass('public.subscriptions') is not null then
    execute $q$ select jsonb_build_object(
        'trial', count(*) filter (where status = 'trial' and trial_ends_at > now()),
        'active', count(*) filter (where status = 'active' and period_end > now()),
        'ended', count(*) filter (where not ((status = 'trial' and trial_ends_at > now()) or (status = 'active' and period_end > now()))),
        'founders', count(*) filter (where founder))
      from public.subscriptions $q$ into sub;
    extra := extra || jsonb_build_object('plans', sub);
  end if;
  if to_regclass('public.notify_requests') is not null then
    execute 'select count(*)::int from public.notify_requests where created_at >= $1' into notify using since_ts;
    extra := extra || jsonb_build_object('notify', notify);
  end if;

  return result || extra;
end
$$;
revoke all on function public.admin_overview(int) from public, anon;
grant execute on function public.admin_overview(int) to authenticated;

commit;
