-- APPLIED 2026-10-24 via Supabase SQL Editor; verified: FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT.
--
-- Problem: requests.service_id → services ON DELETE CASCADE, and messages.request_id → requests ON DELETE CASCADE.
-- Owners may DELETE their services (policy "services owner delete"), so one DELETE on a service silently erases
-- every request for it and every message in those conversations — including the customers' side.
--
-- Fix: make the service → requests link RESTRICT. A service that has ever received a request can no longer be
-- deleted (by anyone, including dashboard/admin mistakes); it can only be archived, which is what the app does.
-- Services that never received a request (e.g. abandoned drafts) can still be deleted by their owner.
-- No rows are changed or deleted; existing data is only re-validated against the new constraint.
begin;

do $$
declare c text;
begin
  -- Find the real constraint name instead of assuming it.
  select conname into c from pg_constraint
  where conrelid = 'public.requests'::regclass and contype = 'f' and confrelid = 'public.services'::regclass;
  if c is null then raise exception 'requests → services foreign key not found'; end if;
  execute format('alter table public.requests drop constraint %I', c);
end $$;

alter table public.requests
  add constraint requests_service_id_fkey
  foreign key (service_id) references public.services(id) on delete restrict;

commit;

-- Rollback (restores the previous behaviour, also without touching data):
--   alter table public.requests drop constraint requests_service_id_fkey;
--   alter table public.requests add constraint requests_service_id_fkey
--     foreign key (service_id) references public.services(id) on delete cascade;
