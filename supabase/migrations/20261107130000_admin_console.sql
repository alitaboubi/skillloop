-- PREPARED 2026-11-07 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Needs (applied): 20261102120000_admin.sql, 20261106130000_support.sql, 20261106140000_social_features.sql.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261107130000_admin_console.sql
--   Verify after applying: supabase/checks/20261107130000_admin_console_verify.sql
--   Rollback: supabase/checks/20261107130000_admin_console_rollback.sql
--   No flag: the /admin console reads these functions when they exist (before: the « Utilisateurs » and « À faire »
--   blocks say the migration is missing).
--
-- Operator console (/admin): people and to-dos, for operators only (private.admins; everyone else 42501).
--   • admin_users(q, role, sort, limit, offset): accounts with live name, city, photo path, join date, pro or not,
--     published services, requests, support conversation state. Never the email address, never message text.
--   • admin_user(id): one account in detail (its services with status, request counts by status, support state,
--     SkillLoop posts it appears in).
--   • admin_todo(): what needs the operator today (unread support conversations, open ones, people still to choose in
--     published posts, requests waiting > 48 h, new accounts in 24 h; pending payments and trials ending within 7 days
--     only when those tables exist).
--   • private.admin_log + admin_log(limit): who did what (written by operator functions, e.g. Pro access changes in
--     20261107140000_admin_subscriptions.sql). Readable by operators only; kept 365 days.
begin;

create schema if not exists private;

-- ── audit log ──
create table if not exists private.admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z_]{3,40}$'),
  target uuid references public.profiles(id) on delete set null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_log_at on private.admin_log (at desc);
revoke all on private.admin_log from public, anon, authenticated;

create or replace function private.admin_note(p_action text, p_target uuid, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.admin_log (actor, action, target, detail) values (auth.uid(), p_action, p_target, coalesce(p_detail, '{}'::jsonb));
  delete from private.admin_log l where l.at < now() - interval '365 days';
end $$;
revoke all on function private.admin_note(text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.admin_log(p_limit int default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'at', l.at, 'action', l.action, 'detail', l.detail,
        'actor_name', a.display_name, 'target_id', l.target, 'target_name', t.display_name) order by l.at desc, l.id desc)
    from (select * from private.admin_log x order by x.at desc, x.id desc limit least(200, greatest(1, coalesce(p_limit, 50)))) l
    left join public.profiles a on a.id = l.actor
    left join public.profiles t on t.id = l.target), '[]'::jsonb);
end $$;
revoke all on function public.admin_log(int) from public, anon;
grant execute on function public.admin_log(int) to authenticated;

-- ── people ──
-- p_role: all | pro (≥ 1 published service) | client (none). p_sort: new (join date) | name. ≤ 50 per page.
create or replace function public.admin_users(p_q text default null, p_role text default 'all', p_sort text default 'new',
  p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  q text := btrim(coalesce(p_q, ''));
  lim int := least(50, greatest(1, coalesce(p_limit, 25)));
  off int := least(100000, greatest(0, coalesce(p_offset, 0)));
  result jsonb;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if coalesce(p_role, 'all') not in ('all', 'pro', 'client') or coalesce(p_sort, 'new') not in ('new', 'name') then
    raise exception 'bad_filter' using errcode = '22023';
  end if;
  q := case when q = '' then null else '%' || replace(replace(replace(left(q, 60), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  with base as (
    select p.id, p.display_name, p.city, p.avatar_url, p.created_at,
      (select count(*) from public.services s where s.owner_id = p.id and s.status = 'published' and not s.archived) as services,
      (select count(*) from public.requests r where p.id in (r.client_id, r.provider_id)) as requests,
      (select t.status from public.support_threads t where t.user_id = p.id) as support
    from public.profiles p
    where p.display_name <> '' and (q is null or p.display_name ilike q or coalesce(p.city, '') ilike q)
  ), filtered as (
    select * from base b
    where coalesce(p_role, 'all') = 'all' or (p_role = 'pro' and b.services > 0) or (p_role = 'client' and b.services = 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.display_name, 'city', x.city, 'avatar_url', x.avatar_url,
          'created_at', x.created_at, 'pro', x.services > 0, 'services', x.services, 'requests', x.requests, 'support', x.support)
        order by case when coalesce(p_sort, 'new') = 'name' then lower(x.display_name) end, x.created_at desc, x.id)
      from (select * from filtered f
            order by case when coalesce(p_sort, 'new') = 'name' then lower(f.display_name) end, f.created_at desc, f.id
            limit lim offset off) x), '[]'::jsonb))
  into result;
  return result;
end $$;
revoke all on function public.admin_users(text, text, text, int, int) from public, anon;
grant execute on function public.admin_users(text, text, text, int, int) to authenticated;

create or replace function public.admin_user(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'city', p.city, 'area', p.area, 'title', p.title, 'avatar_url', p.avatar_url,
    'created_at', p.created_at, 'lang', p.preferred_lang,
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'archived', s.archived,
        'city', s.city, 'created_at', s.created_at) order by s.created_at desc)
      from (select * from public.services x where x.owner_id = p.id order by x.created_at desc limit 50) s), '[]'::jsonb),
    'requests', jsonb_build_object(
      'as_client', (select count(*) from public.requests r where r.client_id = p.id),
      'as_pro', (select count(*) from public.requests r where r.provider_id = p.id),
      'pending', (select count(*) from public.requests r where r.provider_id = p.id and r.status = 'pending'),
      'accepted', (select count(*) from public.requests r where p.id in (r.client_id, r.provider_id) and r.status = 'accepted')),
    'portfolio', (select count(*) from public.portfolio_items i where i.owner_id = p.id),
    'support', (select jsonb_build_object('status', t.status, 'last_message_at', t.last_message_at) from public.support_threads t where t.user_id = p.id),
    'features', (select count(*) from public.social_post_people sp join public.social_posts s on s.id = sp.post_id
                 where sp.user_id = p.id and s.published_at is not null),
    'admin', private.is_admin(p.id))
  into result
  from public.profiles p where p.id = p_id and p.display_name <> '';
  if result is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  return result;
end $$;
revoke all on function public.admin_user(uuid) from public, anon;
grant execute on function public.admin_user(uuid) to authenticated;

-- ── today ──
create or replace function public.admin_todo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  payments int;
  trials int;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'support_unread', (select count(*) from public.support_threads t where exists (
        select 1 from public.support_messages m where m.user_id = t.user_id and not m.from_team
          and (t.team_read_at is null or m.created_at > t.team_read_at))),
    'support_open', (select count(*) from public.support_threads t where t.status = 'open'),
    'consent_pending', (select count(*) from public.social_post_people sp join public.social_posts s on s.id = sp.post_id
        where s.published_at is not null and sp.choice = 'pending'),
    'requests_waiting', (select count(*) from public.requests r where r.status = 'pending' and r.created_at < now() - interval '48 hours'),
    'new_users', (select count(*) from public.profiles p where p.display_name <> '' and p.created_at > now() - interval '24 hours'))
  into result;
  -- Tables from migrations that may not be applied yet are read only when they exist.
  if to_regclass('public.payments') is not null then
    execute 'select count(*) from public.payments where status = ''pending''' into payments;
    result := result || jsonb_build_object('payments_pending', payments);
  end if;
  if to_regclass('public.subscriptions') is not null then
    execute 'select count(*) from public.subscriptions where status = ''trial'' and trial_ends_at between now() and now() + interval ''7 days''' into trials;
    result := result || jsonb_build_object('trials_ending', trials);
  end if;
  return result;
end $$;
revoke all on function public.admin_todo() from public, anon;
grant execute on function public.admin_todo() to authenticated;

commit;
