-- Rollback of 20261103120000_payments.sql. Turn VITE_PAYMENTS off and redeploy FIRST.
-- Pro periods already granted by approved payments stay in public.subscriptions.
begin;
drop function if exists public.admin_decide_payment(uuid, boolean, text);
drop function if exists public.admin_payments(text);
drop function if exists public.cancel_my_payment(uuid);
drop function if exists public.declare_payment(text, text, text);
drop function if exists private.pro_price(text);
drop table if exists public.payments;
commit;
