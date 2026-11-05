-- PREPARED 2026-11-05 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Depends on: 20261101120000_request_progress.sql (requests.completed_at). Apply that one first.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261101120000_request_progress.sql \
--                                     --pending supabase/migrations/20261105120000_reviews.sql
--   Verify after applying: supabase/checks/20261105120000_reviews_verify.sql
--   Rollback: supabase/checks/20261105120000_reviews_rollback.sql
--   Then set the public build variable VITE_REVIEWS=on (Cloudflare → Build variables) and redeploy.
--
-- Avis clients: a client who really worked with a pro can rate that work, once per request.
--   • Who: only the CLIENT of the request. Pros never buy, write or remove reviews.
--   • When: the request was ACCEPTED, and the job is over — the pro marked it « Terminée » (completed_at), or, if not:
--     one day after the agreed appointment (scheduled_for), or 7 days after acceptance when no appointment was set
--     (so a pro can't block a review by never marking the job done).
--   • Request times the rule relies on are the database's: requests.created_at is now stamped on insert (it was
--     caller-supplied), and the new requests.accepted_at is stamped when the pro accepts (existing accepted requests:
--     their created_at, the best known value).
--   • What: 1–5 stars + an optional comment (≤ 1000 chars). A low rating (1–2) needs a comment (≥ 20 chars), so the
--     pro and other clients can understand it.
--   • Editing: the client can change the rating/comment for 14 days, and only until the pro replies.
--   • Pro's side: one public reply (≤ 1000 chars, written once), and a one-time report to the operator. A report hides
--     nothing by itself; only the operator (SQL editor / service role) can hide a review (hidden_at).
--   • Every time is stamped by the database; ids, parties and service come from the request, never from the caller.
--   • Public reading only through two functions: a provider's summary (count + average) and their visible reviews, with
--     the author shown as first name + initial. Clients' ids, the report and hidden reviews are never public.
--   • No structured data (JSON-LD ratings) — by the SEO rule.
--   • Max 10 new reviews per client per 24 h.
--   • Account deletion (when 20261025120000_account_deletion.sql is applied): a deleted account's reviews, written or
--     received, are removed.
begin;

-- ── Request times the database owns ──
alter table public.requests add column if not exists accepted_at timestamptz;
update public.requests set accepted_at = created_at where status = 'accepted' and accepted_at is null;

create or replace function private.stamp_request_times() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.accepted_at := null;
    return new;
  end if;
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.accepted_at := now();
  else
    new.accepted_at := old.accepted_at;
  end if;
  return new;
end $$;
revoke all on function private.stamp_request_times() from public, anon, authenticated;
drop trigger if exists requests_stamp_times on public.requests;
create trigger requests_stamp_times before insert or update on public.requests
  for each row execute function private.stamp_request_times();

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  reply text check (reply is null or length(reply) between 1 and 1000),
  replied_at timestamptz,
  reported_at timestamptz,
  report_reason text check (report_reason is null or length(report_reason) between 5 and 500),
  hidden_at timestamptz,
  constraint reviews_low_rating_explained check (rating > 2 or length(coalesce(btrim(comment), '')) >= 20),
  constraint reviews_reply_stamped check ((reply is null) = (replied_at is null)),
  constraint reviews_report_stamped check ((report_reason is null) = (reported_at is null))
);
create index if not exists reviews_provider_visible on public.reviews (provider_id, created_at desc) where hidden_at is null;
create index if not exists reviews_client on public.reviews (client_id, created_at desc);

revoke all on public.reviews from anon, authenticated;
grant select, insert, update on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
drop policy if exists "reviews parties read" on public.reviews;
drop policy if exists "reviews client insert" on public.reviews;
drop policy if exists "reviews parties update" on public.reviews;
-- The two parties read their own rows (incl. a hidden one, so nobody wonders where it went). The public uses the functions.
create policy "reviews parties read" on public.reviews for select to authenticated using (auth.uid() in (client_id, provider_id));
-- Checked after the guard filled the row from the request.
create policy "reviews client insert" on public.reviews for insert to authenticated with check (auth.uid() = client_id);
create policy "reviews parties update" on public.reviews for update to authenticated using (auth.uid() in (client_id, provider_id));
-- No delete policy: reviews leave only with the request/account (cascade) or by the operator.

create or replace function private.guard_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  recent int;
begin
  -- Operator (SQL editor / service role, no signed-in user): moderation is allowed as is.
  if auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    select q.client_id, q.provider_id, q.service_id, q.status, q.accepted_at, q.scheduled_for, q.completed_at into r
      from public.requests q where q.id = new.request_id;
    if not found or r.client_id is distinct from auth.uid() then
      raise exception 'review_not_allowed: only the client of this request' using errcode = 'P0001';
    end if;
    if r.status <> 'accepted' then
      raise exception 'review_not_allowed: request was not accepted' using errcode = 'P0001';
    end if;
    if r.completed_at is null
       and coalesce(r.scheduled_for + interval '1 day', r.accepted_at + interval '7 days', 'infinity'::timestamptz) > now() then
      raise exception 'review_not_allowed: job not finished yet' using errcode = 'P0001';
    end if;
    select count(*) into recent from public.reviews where client_id = auth.uid() and created_at > now() - interval '24 hours';
    if recent >= 10 then
      raise exception 'review_limit: too many reviews today' using errcode = 'P0001';
    end if;
    -- Parties and service come from the request; times and moderation fields from the database.
    new.client_id := r.client_id;
    new.provider_id := r.provider_id;
    new.service_id := r.service_id;
    new.comment := nullif(btrim(new.comment), '');
    new.created_at := now();
    new.updated_at := null;
    new.reply := null; new.replied_at := null;
    new.reported_at := null; new.report_reason := null;
    new.hidden_at := null;
    return new;
  end if;

  -- UPDATE
  if new.id <> old.id or new.request_id <> old.request_id or new.service_id <> old.service_id
     or new.client_id <> old.client_id or new.provider_id <> old.provider_id or new.created_at <> old.created_at
     or new.hidden_at is distinct from old.hidden_at then
    raise exception 'review_not_allowed: fixed fields' using errcode = 'P0001';
  end if;

  if auth.uid() = old.client_id then
    if new.reply is distinct from old.reply or new.replied_at is distinct from old.replied_at
       or new.reported_at is distinct from old.reported_at or new.report_reason is distinct from old.report_reason then
      raise exception 'review_not_allowed: only the pro replies or reports' using errcode = 'P0001';
    end if;
    if new.rating = old.rating and new.comment is not distinct from old.comment then
      new.updated_at := old.updated_at; -- the edit time is the database's, never the caller's
      return new;
    end if;
    if old.reply is not null then
      raise exception 'review_not_allowed: the pro already replied' using errcode = 'P0001';
    end if;
    if old.created_at < now() - interval '14 days' then
      raise exception 'review_not_allowed: edit window closed' using errcode = 'P0001';
    end if;
    new.comment := nullif(btrim(new.comment), '');
    new.updated_at := now();
    return new;
  end if;

  if auth.uid() = old.provider_id then
    if new.rating <> old.rating or new.comment is distinct from old.comment or new.updated_at is distinct from old.updated_at then
      raise exception 'review_not_allowed: a pro cannot change a review' using errcode = 'P0001';
    end if;
    if new.reply is distinct from old.reply then
      if old.reply is not null then raise exception 'review_not_allowed: reply already written' using errcode = 'P0001'; end if;
      new.reply := nullif(btrim(new.reply), '');
      new.replied_at := case when new.reply is null then null else now() end;
    elsif new.replied_at is distinct from old.replied_at then
      raise exception 'review_not_allowed: fixed fields' using errcode = 'P0001';
    end if;
    if new.report_reason is distinct from old.report_reason then
      if old.report_reason is not null then raise exception 'review_not_allowed: already reported' using errcode = 'P0001'; end if;
      new.report_reason := nullif(btrim(new.report_reason), '');
      new.reported_at := case when new.report_reason is null then null else now() end;
    elsif new.reported_at is distinct from old.reported_at then
      raise exception 'review_not_allowed: fixed fields' using errcode = 'P0001';
    end if;
    return new;
  end if;

  raise exception 'review_not_allowed' using errcode = 'P0001';
end $$;
revoke all on function private.guard_review() from public, anon, authenticated;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews for each row execute function private.guard_review();

-- ── Public reading ──
-- "Amira B." — first name + initial of the last word; never the full name, id or contact.
create or replace function private.review_author(p_name text) returns text
language sql immutable set search_path = '' as $$
  select case
    when coalesce(btrim(p_name), '') = '' then null
    when position(' ' in btrim(p_name)) = 0 then btrim(p_name)
    else split_part(btrim(p_name), ' ', 1) || ' ' || upper(left(regexp_replace(btrim(p_name), '^.*\s', ''), 1)) || '.'
  end
$$;
revoke all on function private.review_author(text) from public, anon, authenticated;

-- Count + average of a pro's visible reviews (average rounded to 0.1; null when there are none).
create or replace function public.provider_review_summary(p_provider uuid)
returns table (review_count int, rating_avg numeric)
language sql stable security definer set search_path = '' as $$
  select count(*)::int, round(avg(v.rating)::numeric, 1)
  from public.reviews v where v.provider_id = p_provider and v.hidden_at is null
$$;

-- The same for up to 100 pros at once (Explore cards); pros without reviews are left out.
create or replace function public.review_summaries(p_providers uuid[])
returns table (provider_id uuid, review_count int, rating_avg numeric)
language sql stable security definer set search_path = '' as $$
  select v.provider_id, count(*)::int, round(avg(v.rating)::numeric, 1)
  from public.reviews v
  where v.hidden_at is null and v.provider_id = any (p_providers[1:100])
  group by v.provider_id
$$;

-- A pro's visible reviews, newest first (p_before = created_at of the last one shown, for "more").
create or replace function public.provider_reviews(p_provider uuid, p_limit int default 10, p_before timestamptz default null)
returns table (id uuid, service_id uuid, service_title text, rating smallint, comment text, created_at timestamptz,
               updated_at timestamptz, reply text, replied_at timestamptz, author text)
language sql stable security definer set search_path = '' as $$
  select v.id, v.service_id, s.title, v.rating, v.comment, v.created_at, v.updated_at, v.reply, v.replied_at,
         private.review_author(c.display_name)
  from public.reviews v
  join public.services s on s.id = v.service_id
  join public.profiles c on c.id = v.client_id
  where v.provider_id = p_provider and v.hidden_at is null and (p_before is null or v.created_at < p_before)
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

revoke all on function public.provider_review_summary(uuid) from public;
revoke all on function public.review_summaries(uuid[]) from public;
revoke all on function public.provider_reviews(uuid, int, timestamptz) from public;
grant execute on function public.provider_review_summary(uuid) to anon, authenticated;
grant execute on function public.review_summaries(uuid[]) to anon, authenticated;
grant execute on function public.provider_reviews(uuid, int, timestamptz) to anon, authenticated;

-- ── Account deletion (only if 20261025120000_account_deletion.sql is applied: profiles.deleted_at exists) ──
create or replace function private.reviews_on_account_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reviews where client_id = new.id or provider_id = new.id;
  return new;
end $$;
revoke all on function private.reviews_on_account_deleted() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'deleted_at') then
    drop trigger if exists profiles_reviews_on_delete on public.profiles;
    create trigger profiles_reviews_on_delete after update of deleted_at on public.profiles
      for each row when (old.deleted_at is null and new.deleted_at is not null)
      execute function private.reviews_on_account_deleted();
  end if;
end $$;

commit;
