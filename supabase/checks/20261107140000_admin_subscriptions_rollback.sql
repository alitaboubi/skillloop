-- Rollback of 20261107140000_admin_subscriptions.sql. Pro periods already given stay as they are.
begin;
drop function if exists public.admin_end_pro(uuid, text);
drop function if exists public.admin_grant_pro(uuid, int, text);
drop function if exists public.admin_subscriptions(text);
drop function if exists private.pro_until(public.subscriptions);
commit;
