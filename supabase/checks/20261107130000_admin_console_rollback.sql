-- Rollback of 20261107130000_admin_console.sql. Roll back 20261107140000_admin_subscriptions.sql first if applied.
-- Deletes the operator log.
begin;
drop function if exists public.admin_todo();
drop function if exists public.admin_user(uuid);
drop function if exists public.admin_users(text, text, text, int, int);
drop function if exists public.admin_log(int);
drop function if exists private.admin_note(text, uuid, jsonb);
drop table if exists private.admin_log;
commit;
