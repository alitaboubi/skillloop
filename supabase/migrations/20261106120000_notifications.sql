-- APPLIED AND VERIFIED 2026-11-06 (your run: dry run passed, verify 5/5). History below kept as written.
--   Needs (applied): 20261101120000_request_progress.sql, 20261105120000_reviews.sql.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261106120000_notifications.sql
--   Verify after applying: supabase/checks/20261106120000_notifications_verify.sql
--   Rollback: supabase/checks/20261106120000_notifications_rollback.sql
--   Then set the public build variable VITE_NOTIFICATIONS=on (Cloudflare → Build variables) and redeploy.
--
-- In-app notifications (the bell in the header). Written ONLY by the database, from real events:
--   welcome            account created                         → the new user
--   service_live       a service is published for the first time → its pro
--   request_new        a client sends a request                → the pro
--   request_accepted   the pro accepts                         → the client
--   request_declined   the pro declines                        → the client
--   request_cancelled  the client cancels                      → the pro
--   job_scheduled      the pro sets / changes the appointment  → the client
--   job_on_the_way / job_started / job_completed (suivi)       → the client
--   review_new         a client leaves a review                → the pro
--   review_reply       the pro replies to a review             → the client
--   support_new / support_reply: reserved for 20261106130000_support.sql.
-- New chat messages are NOT notifications: they already have the unread badge on Messages (no double alert).
-- A row stores only ids and the kind — no text. The app writes the sentence in the reader's language, and names come
-- from the live profile (a deleted account shows as « Compte supprimé »). Users read and mark their own rows; nobody
-- writes them through the API. Each user keeps the newest 100, none older than 90 days. Accounts that already exist
-- get no welcome (nothing is back-filled).
begin;

create schema if not exists private;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'welcome', 'service_live', 'request_new', 'request_accepted', 'request_declined', 'request_cancelled',
    'job_scheduled', 'job_on_the_way', 'job_started', 'job_completed', 'review_new', 'review_reply',
    'support_new', 'support_reply')),
  request_id uuid references public.requests(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_time on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select to authenticated using (auth.uid() = user_id);

-- The one writer. Skips missing / deleted accounts and self-notifications; trims the user's history.
create or replace function private.notify(p_user uuid, p_kind text, p_request uuid default null, p_service uuid default null, p_actor uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.display_name <> '') then return; end if;
  insert into public.notifications (user_id, kind, request_id, service_id, actor_id) values (p_user, p_kind, p_request, p_service, p_actor);
  delete from public.notifications n where n.user_id = p_user and (
    n.created_at < now() - interval '90 days'
    or n.id in (select x.id from public.notifications x where x.user_id = p_user order by x.created_at desc, x.id offset 100));
end $$;
revoke all on function private.notify(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ── welcome ──
create or replace function private.notify_welcome() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.id, 'welcome');
  return new;
end $$;
revoke all on function private.notify_welcome() from public, anon, authenticated;
drop trigger if exists profiles_notify_welcome on public.profiles;
create trigger profiles_notify_welcome after insert on public.profiles for each row execute function private.notify_welcome();

-- ── service_live (first publication only) ──
create or replace function private.notify_service_live() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and not new.archived
     and (TG_OP = 'INSERT' or old.status <> 'published' or old.archived)
     and not exists (select 1 from public.notifications n where n.service_id = new.id and n.kind = 'service_live') then
    perform private.notify(new.owner_id, 'service_live', null, new.id);
  end if;
  return new;
end $$;
revoke all on function private.notify_service_live() from public, anon, authenticated;
drop trigger if exists services_notify_live on public.services;
create trigger services_notify_live after insert or update of status, archived on public.services
  for each row execute function private.notify_service_live();

-- ── requests: new, answered, cancelled, appointment and suivi ──
create or replace function private.notify_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    perform private.notify(new.provider_id, 'request_new', new.id, new.service_id, new.client_id);
    return new;
  end if;
  if new.status <> old.status then
    if new.status = 'accepted' then perform private.notify(new.client_id, 'request_accepted', new.id, new.service_id, new.provider_id);
    elsif new.status = 'declined' then perform private.notify(new.client_id, 'request_declined', new.id, new.service_id, new.provider_id);
    elsif new.status = 'cancelled' then perform private.notify(new.provider_id, 'request_cancelled', new.id, new.service_id, new.client_id);
    end if;
  end if;
  if new.scheduled_for is not null and new.scheduled_for is distinct from old.scheduled_for and new.completed_at is null then
    perform private.notify(new.client_id, 'job_scheduled', new.id, new.service_id, new.provider_id);
  end if;
  if new.on_the_way_at is not null and old.on_the_way_at is null then
    perform private.notify(new.client_id, 'job_on_the_way', new.id, new.service_id, new.provider_id);
  end if;
  if new.started_at is not null and old.started_at is null then
    perform private.notify(new.client_id, 'job_started', new.id, new.service_id, new.provider_id);
  end if;
  if new.completed_at is not null and old.completed_at is null then
    perform private.notify(new.client_id, 'job_completed', new.id, new.service_id, new.provider_id);
  end if;
  return new;
end $$;
revoke all on function private.notify_request() from public, anon, authenticated;
drop trigger if exists requests_notify on public.requests;
create trigger requests_notify after insert or update on public.requests for each row execute function private.notify_request();

-- ── reviews: new review → pro; reply → client ──
create or replace function private.notify_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    perform private.notify(new.provider_id, 'review_new', new.request_id, new.service_id, new.client_id);
  elsif new.reply is not null and old.reply is null then
    perform private.notify(new.client_id, 'review_reply', new.request_id, new.service_id, new.provider_id);
  end if;
  return new;
end $$;
revoke all on function private.notify_review() from public, anon, authenticated;
drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify after insert or update of reply on public.reviews for each row execute function private.notify_review();

-- ── reading ──
-- The newest notifications (≤ 50) with the live names they point to, plus the unread total.
create or replace function public.my_notifications(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'unread', (select count(*) from public.notifications n where n.user_id = auth.uid() and n.read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', n.id, 'kind', n.kind, 'created_at', n.created_at, 'read_at', n.read_at,
          'request_id', n.request_id, 'service_id', n.service_id,
          'service_title', s.title, 'actor_name', a.display_name)
        order by n.created_at desc, n.id)
      from (select * from public.notifications x where x.user_id = auth.uid()
            order by x.created_at desc, x.id limit least(50, greatest(1, coalesce(p_limit, 30)))) n
      left join public.services s on s.id = n.service_id
      left join public.profiles a on a.id = n.actor_id), '[]'::jsonb))
  where auth.uid() is not null
$$;
revoke all on function public.my_notifications(int) from public, anon;
grant execute on function public.my_notifications(int) to authenticated;

-- Marks the given ids (or everything, when null) as read. Returns how many changed.
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare changed int;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  update public.notifications n set read_at = now()
    where n.user_id = auth.uid() and n.read_at is null and (p_ids is null or n.id = any (p_ids[1:200]));
  get diagnostics changed = row_count;
  return changed;
end $$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ── account deletion (name emptied) removes that user's notifications ──
create or replace function private.notifications_forget() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name = '' and old.display_name <> '' then
    delete from public.notifications n where n.user_id = new.id;
  end if;
  return new;
end $$;
revoke all on function private.notifications_forget() from public, anon, authenticated;
drop trigger if exists profiles_notifications_forget on public.profiles;
create trigger profiles_notifications_forget after update of display_name on public.profiles
  for each row execute function private.notifications_forget();

-- Live bell (RLS: each user only receives their own rows).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
