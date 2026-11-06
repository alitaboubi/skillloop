-- APPLIED AND VERIFIED 2026-11-06 (your run: dry run passed, verify 5/5). History below kept as written.
--   Needs (applied first): 20261102120000_admin.sql (who answers) and 20261106120000_notifications.sql (the alerts).
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261102120000_admin.sql \
--              --pending supabase/migrations/20261106120000_notifications.sql --pending supabase/migrations/20261106130000_support.sql
--     (drop the --pending of a migration that is already applied)
--   Verify after applying: supabase/checks/20261106130000_support_verify.sql
--   Rollback: supabase/checks/20261106130000_support_rollback.sql
--   Then set VITE_SUPPORT=on (needs VITE_ADMIN=on to answer from /admin) and redeploy.
--
-- Support chat: every signed-in user has ONE conversation with the SkillLoop team (the support button on every page).
--   • support_messages: the user writes their own (text ≤ 2000 + the page they were on); the team writes only through
--     admin_support_reply(). Times and authors are set by the database. 8 messages per 10 min, 40 per 24 h per user.
--   • support_threads: one row per user (open / closed, read markers), kept by the database. A user message reopens it.
--   • Alerts: a user message notifies every operator (support_new); a team reply notifies the user (support_reply);
--     at most one unread alert of each per conversation, so a burst of messages is one bell entry.
--   • Operators (private.admins) read the inbox and answer with the admin_support_* functions — the user's name and
--     the message text are shown to them, never the email address. Everyone else is refused (42501).
--   • Account deletion (name emptied) removes the conversation.
begin;

create schema if not exists private;

create table if not exists public.support_threads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  user_read_at timestamptz,
  team_read_at timestamptz
);
create index if not exists support_threads_status_time on public.support_threads (status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  from_team boolean not null default false,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  page text check (page is null or (length(page) <= 200 and page ~ '^/')),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_user_time on public.support_messages (user_id, created_at);

revoke all on public.support_threads from public, anon, authenticated;
revoke all on public.support_messages from public, anon, authenticated;
grant select (user_id, status, last_message_at, user_read_at) on public.support_threads to authenticated;
grant select (id, user_id, from_team, body, created_at) on public.support_messages to authenticated;
grant insert (body, page) on public.support_messages to authenticated;
grant all on public.support_threads, public.support_messages to service_role;
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
drop policy if exists "support threads own read" on public.support_threads;
drop policy if exists "support messages own read" on public.support_messages;
drop policy if exists "support messages own insert" on public.support_messages;
create policy "support threads own read" on public.support_threads for select to authenticated using (auth.uid() = user_id);
create policy "support messages own read" on public.support_messages for select to authenticated using (auth.uid() = user_id);
create policy "support messages own insert" on public.support_messages for insert to authenticated
  with check (auth.uid() = user_id and not from_team);

-- Before insert: a user's own message gets its owner, author and time from the session; rate limits.
-- Team rows only come from admin_support_reply (API roles cannot set from_team).
create or replace function private.support_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  if new.from_team then
    if not private.is_admin(new.author_id) then raise exception 'not_admin' using errcode = '42501'; end if;
    return new;
  end if;
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  new.user_id := auth.uid();
  new.author_id := auth.uid();
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.display_name <> '') then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('skillloop_support:' || new.user_id::text));
  if (select count(*) from public.support_messages m where m.user_id = new.user_id and not m.from_team
        and m.created_at > now() - interval '10 minutes') >= 8
     or (select count(*) from public.support_messages m where m.user_id = new.user_id and not m.from_team
        and m.created_at > now() - interval '24 hours') >= 40 then
    raise exception 'support_limit: too many messages, try again later' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.support_guard() from public, anon, authenticated;
drop trigger if exists support_messages_guard on public.support_messages;
create trigger support_messages_guard before insert on public.support_messages for each row execute function private.support_guard();

-- After insert: keep the thread row, alert the other side (one unread alert per conversation and side).
create or replace function private.support_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  insert into public.support_threads as t (user_id, status, last_message_at, user_read_at, team_read_at)
    values (new.user_id, 'open', new.created_at,
            case when new.from_team then null else new.created_at end,
            case when new.from_team then new.created_at else null end)
  on conflict (user_id) do update set
    last_message_at = excluded.last_message_at,
    status = case when new.from_team then t.status else 'open' end,
    user_read_at = case when new.from_team then t.user_read_at else excluded.last_message_at end,
    team_read_at = case when new.from_team then excluded.last_message_at else t.team_read_at end;
  if new.from_team then
    if not exists (select 1 from public.notifications n where n.user_id = new.user_id and n.kind = 'support_reply' and n.read_at is null) then
      perform private.notify(new.user_id, 'support_reply', null, null, new.author_id);
    end if;
  else
    for a in select ad.user_id from private.admins ad where ad.user_id <> new.user_id loop
      if not exists (select 1 from public.notifications n where n.user_id = a and n.kind = 'support_new'
                     and n.actor_id = new.user_id and n.read_at is null) then
        perform private.notify(a, 'support_new', null, null, new.user_id);
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke all on function private.support_after() from public, anon, authenticated;
drop trigger if exists support_messages_after on public.support_messages;
create trigger support_messages_after after insert on public.support_messages for each row execute function private.support_after();

-- ── the user's side ──
-- Marks the team's replies as read (also clears the unread support_reply alert).
create or replace function public.support_mark_read() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  update public.support_threads t set user_read_at = now() where t.user_id = auth.uid();
  update public.notifications n set read_at = now()
    where n.user_id = auth.uid() and n.kind = 'support_reply' and n.read_at is null;
end $$;
revoke all on function public.support_mark_read() from public, anon;
grant execute on function public.support_mark_read() to authenticated;

-- ── the operators' side ──
-- Conversations, newest activity first: name (never the email), status, last message preview, unread count.
create or replace function public.admin_support_inbox(p_status text default 'open') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'user_id', t.user_id, 'name', p.display_name, 'status', t.status, 'last_message_at', t.last_message_at,
        'last_body', left(l.body, 140), 'last_from_team', l.from_team,
        'unread', (select count(*) from public.support_messages m where m.user_id = t.user_id and not m.from_team
                   and (t.team_read_at is null or m.created_at > t.team_read_at)))
      order by t.last_message_at desc)
    from public.support_threads t
    join public.profiles p on p.id = t.user_id
    left join lateral (select m.body, m.from_team from public.support_messages m where m.user_id = t.user_id
                       order by m.created_at desc, m.id desc limit 1) l on true
    where (p_status is null or p_status = 'all' or t.status = p_status)
    limit 200), '[]'::jsonb);
end $$;
revoke all on function public.admin_support_inbox(text) from public, anon;
grant execute on function public.admin_support_inbox(text) to authenticated;

-- One conversation (≤ 200 newest messages, oldest first) + who it is; marks it read for the team.
create or replace function public.admin_support_thread(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  select jsonb_build_object(
    'user', jsonb_build_object('id', p.id, 'name', p.display_name, 'city', p.city, 'since', p.created_at,
      'services', (select count(*) from public.services s where s.owner_id = p.id and s.status = 'published' and not s.archived),
      'requests', (select count(*) from public.requests r where p.id in (r.client_id, r.provider_id))),
    'status', coalesce(t.status, 'open'),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'from_team', m.from_team, 'body', m.body, 'page', m.page, 'created_at', m.created_at)
        order by m.created_at, m.id)
      from (select * from public.support_messages x where x.user_id = p.id order by x.created_at desc, x.id desc limit 200) m), '[]'::jsonb))
  into result
  from public.profiles p left join public.support_threads t on t.user_id = p.id
  where p.id = p_user;
  if result is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  update public.support_threads t set team_read_at = now() where t.user_id = p_user;
  update public.notifications n set read_at = now()
    where n.user_id = auth.uid() and n.kind = 'support_new' and n.actor_id = p_user and n.read_at is null;
  return result;
end $$;
revoke all on function public.admin_support_thread(uuid) from public, anon;
grant execute on function public.admin_support_thread(uuid) to authenticated;

-- The team answers (as « L'équipe SkillLoop »; the operator's id is kept, not shown to the user).
create or replace function public.admin_support_reply(p_user uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.display_name <> '') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.support_messages (user_id, from_team, author_id, body) values (p_user, true, auth.uid(), p_body)
    returning id into new_id;
  return new_id;
end $$;
revoke all on function public.admin_support_reply(uuid, text) from public, anon;
grant execute on function public.admin_support_reply(uuid, text) to authenticated;

create or replace function public.admin_support_set_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('open', 'closed') then raise exception 'bad_status' using errcode = '22023'; end if;
  update public.support_threads t set status = p_status where t.user_id = p_user;
end $$;
revoke all on function public.admin_support_set_status(uuid, text) from public, anon;
grant execute on function public.admin_support_set_status(uuid, text) to authenticated;

-- ── account deletion (name emptied) removes the conversation ──
create or replace function private.support_forget() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name = '' and old.display_name <> '' then
    delete from public.support_messages m where m.user_id = new.id;
    delete from public.support_threads t where t.user_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.support_forget() from public, anon, authenticated;
drop trigger if exists profiles_support_forget on public.profiles;
create trigger profiles_support_forget after update of display_name on public.profiles
  for each row execute function private.support_forget();

-- Team replies arrive live in the user's open panel (RLS: own conversation only).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages') then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;

commit;
