-- Rollback of 20261029120000_subscriptions.sql. Turn VITE_PRO_PLAN off and redeploy FIRST.
-- Deletes the trial/founder records (export public.subscriptions first if you need them).
begin;
drop trigger if exists services_start_trial on public.services;
drop trigger if exists services_plan_limit on public.services;
drop trigger if exists portfolio_plan_limit on public.portfolio_items;
drop function if exists public.my_plan();
drop function if exists public.founders_left();
drop function if exists private.enforce_plan_limits();
drop function if exists private.start_trial_on_publish();
drop function if exists private.is_pro(uuid);
drop function if exists private.plan_cap(text, boolean);
drop function if exists private.trial_days();
drop function if exists private.founders_cap();
drop table if exists public.subscriptions;
commit;
