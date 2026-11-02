-- Rollback of 20261102120000_admin.sql. Turn VITE_ADMIN off and redeploy FIRST.
begin;
drop function if exists public.admin_overview(int);
drop function if exists public.am_i_admin();
drop function if exists private.is_admin(uuid);
drop table if exists private.admins;
commit;
