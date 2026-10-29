-- PREPARED 2026-10-29 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261029120000_subscriptions.sql
--   Verify after applying: supabase/checks/20261029120000_subscriptions_verify.sql
--   Rollback: supabase/checks/20261029120000_subscriptions_rollback.sql
--   Then set the public build variable VITE_PRO_PLAN=on (Cloudflare → Build variables) and redeploy.
--
-- SkillLoop Pro, phase 1 (docs/product/pro-plan-strategy.md). No payment here.
--   • A pro's free month of Pro starts automatically when they publish their FIRST service (not at sign-up).
--     The first 100 pros to start a trial are "founders" (a fact, kept for life; price lock handled at billing time).
--   • Plan limits, enforced for direct API calls too, only on NEW actions (nothing existing is changed or hidden):
--       published services: free 2 · Pro unlimited      portfolio items: free 6 · Pro 30
--     When a trial ends, published services and portfolio items stay as they are; only new ones beyond the free limit
--     are refused ("plan_limit_reached:<kind>").
--   • public.subscriptions: a user reads only their own row; nobody writes through the API — rows are created by the
--     trial trigger and changed by the operator (SQL editor) until payments exist.
--   • Admin/SQL-editor writes (no auth.uid()) never hit the plan limits.
--   • Pros who ALREADY have a published service when this is applied start their free month at apply time.
begin;

create schema if not exists private;

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'pro' check (plan in ('pro')),
  status text not null check (status in ('trial', 'active', 'expired', 'cancelled')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  period_end timestamptz,
  founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'trial' or trial_ends_at is not null),
  check (status <> 'active' or period_end is not null)
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
drop policy if exists "subscription owner read" on public.subscriptions;
create policy "subscription owner read" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

-- Settings (keep in sync with src/lib/plan.ts).
create or replace function private.plan_cap(p_kind text, p_pro boolean) returns int
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'services' then case when p_pro then null else 2 end   -- null = unlimited
    when 'portfolio' then case when p_pro then 30 else 6 end
  end
$$;
create or replace function private.trial_days() returns int language sql immutable set search_path = '' as $$ select 30 $$;
create or replace function private.founders_cap() returns int language sql immutable set search_path = '' as $$ select 100 $$;

create or replace function private.is_pro(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and (
    (s.status = 'trial' and s.trial_ends_at > now()) or (s.status = 'active' and s.period_end > now())))
$$;
revoke all on function private.is_pro(uuid) from public, anon, authenticated;

-- Free month on the first publication.
create or replace function private.start_trial_on_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  founders int;
begin
  if new.status <> 'published' or new.archived then return new; end if;
  if exists (select 1 from public.subscriptions where user_id = new.owner_id) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('skillloop-founders', 0));
  select count(*) into founders from public.subscriptions where founder;
  insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at, founder)
  values (new.owner_id, 'trial', now(), now() + make_interval(days => private.trial_days()), founders < private.founders_cap())
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function private.start_trial_on_publish() from public, anon, authenticated;
drop trigger if exists services_start_trial on public.services;
create trigger services_start_trial after insert or update of status, archived on public.services
  for each row execute function private.start_trial_on_publish();

-- Plan limits on new actions only.
create or replace function private.enforce_plan_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cap int;
  used int;
begin
  if auth.uid() is null then return new; end if;  -- operator / service role
  if TG_TABLE_NAME = 'services' then
    -- only when a service becomes published (new, or from draft/archive)
    if new.status <> 'published' or new.archived then return new; end if;
    if TG_OP = 'UPDATE' and old.status = 'published' and not old.archived then return new; end if;
    cap := private.plan_cap('services', private.is_pro(new.owner_id));
    if cap is null then return new; end if;
    select count(*) into used from public.services
      where owner_id = new.owner_id and status = 'published' and not archived and id <> new.id;
    if used >= cap then raise exception using errcode = 'P0001', message = 'plan_limit_reached:services'; end if;
  else
    cap := private.plan_cap('portfolio', private.is_pro(new.owner_id));
    select count(*) into used from public.portfolio_items where owner_id = new.owner_id;
    if used >= cap then raise exception using errcode = 'P0001', message = 'plan_limit_reached:portfolio'; end if;
  end if;
  return new;
end $$;
revoke all on function private.enforce_plan_limits() from public, anon, authenticated;
drop trigger if exists services_plan_limit on public.services;
create trigger services_plan_limit before insert or update of status, archived on public.services
  for each row execute function private.enforce_plan_limits();
drop trigger if exists portfolio_plan_limit on public.portfolio_items;
create trigger portfolio_plan_limit before insert on public.portfolio_items
  for each row execute function private.enforce_plan_limits();

-- One-time backfill: pros who already have a published service start their free month now (founders, oldest first).
insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at, founder)
select owner_id, 'trial', now(), now() + make_interval(days => private.trial_days()), true
from (select owner_id, min(created_at) as first_at from public.services
      where status = 'published' and not archived group by owner_id order by first_at limit 100) first_pros
on conflict (user_id) do nothing;

-- What the signed-in user's plan is right now (read-only).
create or replace function public.my_plan() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'status', case
      when s.user_id is null then 'free'
      when s.status = 'trial' and s.trial_ends_at > now() then 'trial'
      when s.status = 'active' and s.period_end > now() then 'active'
      else 'ended' end,
    'trial_ends_at', s.trial_ends_at,
    'period_end', s.period_end,
    'founder', coalesce(s.founder, false))
  from (select auth.uid() as uid) me left join public.subscriptions s on s.user_id = me.uid
  where me.uid is not null
$$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- How many founder places are left (public: shown on the pricing page).
create or replace function public.founders_left() returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, private.founders_cap() - (select count(*)::int from public.subscriptions where founder))
$$;
revoke all on function public.founders_left() from public;
grant execute on function public.founders_left() to anon, authenticated;

commit;
