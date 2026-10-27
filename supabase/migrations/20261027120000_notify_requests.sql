-- PREPARED 2026-10-27 — NOT APPLIED. Needs your approval (preflight → dry run → apply → verify), like the earlier ones.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261027120000_notify_requests.sql
--   Verify after applying: supabase/checks/20261027120000_notify_requests_verify.sql
--   Rollback: supabase/checks/20261027120000_notify_requests_rollback.sql
--
-- "Prévenez-moi": a visitor (signed in or not) leaves an email to hear when a matching pro/service is published.
-- Insert-only for visitors (no read, update or delete through the API); the operator reads it in the SQL editor.
-- Rate limits in the database: the same email at most 5 times per 24 h; at most 300 rows per hour overall.
-- Data minimal: email, what they looked for (≤120 chars), category, city, language. Nothing else (no IP).
begin;

create table if not exists public.notify_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'),
  query text check (query is null or length(query) <= 120),
  category text check (category is null or length(category) <= 40),
  city text check (city is null or length(city) <= 80),
  lang text not null default 'fr' check (lang in ('fr', 'en', 'ar')),
  created_at timestamptz not null default now()
);
create index if not exists notify_requests_email_time on public.notify_requests (email, created_at);

alter table public.notify_requests enable row level security;
revoke all on public.notify_requests from public, anon, authenticated;
grant insert (email, query, category, city, lang) on public.notify_requests to anon, authenticated;
drop policy if exists "notify insert" on public.notify_requests;
create policy "notify insert" on public.notify_requests for insert to anon, authenticated with check (true);

create or replace function private.notify_requests_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(trim(new.email));
  new.created_at := now();
  perform pg_advisory_xact_lock(hashtext('skillloop_notify'));
  if (select count(*) from public.notify_requests where email = new.email and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'notify_limit: too many requests for this email' using errcode = 'P0001';
  end if;
  if (select count(*) from public.notify_requests where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'notify_limit: please try again later' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.notify_requests_limit() from public, anon, authenticated;

drop trigger if exists notify_requests_limit on public.notify_requests;
create trigger notify_requests_limit before insert on public.notify_requests
  for each row execute function private.notify_requests_limit();

commit;
