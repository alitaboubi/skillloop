-- Rollback of 20261101120000_request_progress.sql. Turn VITE_REQUEST_PROGRESS off and redeploy FIRST.
-- Deletes the recorded appointments and progress steps (requests and messages themselves are untouched).
begin;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests') then
    alter publication supabase_realtime drop table public.requests;
  end if;
end $$;
drop trigger if exists requests_progress_guard on public.requests;
drop function if exists private.guard_request_progress();
alter table public.requests
  drop column if exists scheduled_for,
  drop column if exists on_the_way_at,
  drop column if exists started_at,
  drop column if exists completed_at;
commit;
