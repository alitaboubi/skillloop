-- Rollback of 20261027120000_notify_requests.sql (deletes the stored emails — export them first if you need them).
begin;
drop trigger if exists notify_requests_limit on public.notify_requests;
drop function if exists private.notify_requests_limit();
drop table if exists public.notify_requests;
commit;
