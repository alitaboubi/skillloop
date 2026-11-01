-- PREPARED 2026-11-01 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261101120000_request_progress.sql
--   Verify after applying: supabase/checks/20261101120000_request_progress_verify.sql
--   Rollback: supabase/checks/20261101120000_request_progress_rollback.sql
--   Then set the public build variable VITE_REQUEST_PROGRESS=on (Cloudflare → Build variables) and redeploy.
--
-- Suivi d'intervention: once a request is ACCEPTED, the pro can record what really happens, and the client sees it.
--   • scheduled_for — the appointment the two agreed on in the conversation (set/changed by the pro until the job is done).
--   • on_the_way_at → started_at → completed_at — "En route", "Intervention commencée", "Terminée".
-- Only the pro of that request writes these, only while it is accepted. Each step is stamped by the database (now(), no
-- backdating), can't be undone or rewritten, and can't go backwards (no "en route" after "commencée"). Steps may be
-- skipped (a remote lesson has no "en route"). The request status itself and its rules are unchanged.
-- No location is stored: "en route" is the pro's own statement, not GPS tracking.
-- requests is added to the realtime publication so an open conversation updates live (RLS: only its two parties).
begin;

alter table public.requests
  add column if not exists scheduled_for timestamptz,
  add column if not exists on_the_way_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create or replace function private.guard_request_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.scheduled_for is not distinct from old.scheduled_for and new.on_the_way_at is not distinct from old.on_the_way_at
     and new.started_at is not distinct from old.started_at and new.completed_at is not distinct from old.completed_at then
    return new;
  end if;
  if auth.uid() is distinct from old.provider_id then
    raise exception 'progress_not_allowed: only the pro of this request' using errcode = 'P0001';
  end if;
  if old.status <> 'accepted' or new.status <> 'accepted' then
    raise exception 'progress_not_allowed: request is not accepted' using errcode = 'P0001';
  end if;
  if old.completed_at is not null then
    raise exception 'progress_not_allowed: already completed' using errcode = 'P0001';
  end if;
  -- Steps are written once, never cleared or rewritten.
  if (old.on_the_way_at is not null and new.on_the_way_at is distinct from old.on_the_way_at)
     or (old.started_at is not null and new.started_at is distinct from old.started_at) then
    raise exception 'progress_not_allowed: steps are final' using errcode = 'P0001';
  end if;
  -- No going backwards.
  if old.on_the_way_at is null and new.on_the_way_at is not null and old.started_at is not null then
    raise exception 'progress_not_allowed: already started' using errcode = 'P0001';
  end if;
  -- Stamped by the database.
  if old.on_the_way_at is null and new.on_the_way_at is not null then new.on_the_way_at := now(); end if;
  if old.started_at is null and new.started_at is not null then new.started_at := now(); end if;
  if new.completed_at is not null then new.completed_at := now(); end if;
  if new.scheduled_for is distinct from old.scheduled_for and new.scheduled_for is not null
     and (new.scheduled_for < now() - interval '1 hour' or new.scheduled_for > now() + interval '1 year') then
    raise exception 'progress_invalid: appointment must be upcoming' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.guard_request_progress() from public, anon, authenticated;

drop trigger if exists requests_progress_guard on public.requests;
create trigger requests_progress_guard before update on public.requests
  for each row execute function private.guard_request_progress();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests') then
    alter publication supabase_realtime add table public.requests;
  end if;
end $$;

commit;
