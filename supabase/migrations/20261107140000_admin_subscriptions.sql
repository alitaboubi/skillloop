-- PREPARED 2026-11-07 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Needs (applied): 20261029120000_subscriptions.sql (SkillLoop Pro) and 20261107130000_admin_console.sql (the log).
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261107140000_admin_subscriptions.sql
--     (add --pending for the two above if they are not applied yet, in date order)
--   Verify after applying: supabase/checks/20261107140000_admin_subscriptions_verify.sql
--   Rollback: supabase/checks/20261107140000_admin_subscriptions_rollback.sql
--   No flag: /admin → « Abonnements » uses these functions when they exist.
--
-- Pro access by hand (operators only; everyone else 42501). Until payments exist this replaces the SQL editor.
--   • admin_subscriptions(status): every Pro row with live name, city, photo path, status, founder, and the date Pro
--     ends (trial end or paid period end); status = all | active (Pro now) | trial | ended.
--   • admin_grant_pro(user, days 1–730, note): Pro from the later of now / the current end, for that many days
--     (status « active »). A new row is a founder while founder places remain, like an approved payment.
--   • admin_end_pro(user, note): Pro stops now (status « cancelled »); published services and portfolio stay, only new
--     ones beyond the free limits are refused (the plan rules of 20261029120000).
--   • Every change is written to private.admin_log (who, whom, days / note, new end date).
begin;

create or replace function private.pro_until(s public.subscriptions) returns timestamptz
language sql immutable set search_path = '' as $$
  select case when s.status = 'trial' then s.trial_ends_at when s.status = 'active' then s.period_end end
$$;
revoke all on function private.pro_until(public.subscriptions) from public, anon, authenticated;

create or replace function public.admin_subscriptions(p_status text default 'all') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if coalesce(p_status, 'all') not in ('all', 'active', 'trial', 'ended') then raise exception 'bad_filter' using errcode = '22023'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'name', x.display_name, 'city', x.city, 'avatar_url', x.avatar_url,
        'status', x.status, 'founder', x.founder, 'until', x.until, 'pro', x.pro, 'trial_started_at', x.trial_started_at,
        'updated_at', x.updated_at)
      order by x.pro desc, x.until desc nulls last, x.display_name)
    from (select s.*, p.display_name, p.city, p.avatar_url, private.pro_until(s) as until,
            coalesce(private.pro_until(s) > now(), false) as pro
          from public.subscriptions s join public.profiles p on p.id = s.user_id
          where p.display_name <> '') x
    where coalesce(p_status, 'all') = 'all'
       or (p_status = 'active' and x.pro)
       or (p_status = 'trial' and x.pro and x.status = 'trial')
       or (p_status = 'ended' and not x.pro)
    limit 500), '[]'::jsonb);
end $$;
revoke all on function public.admin_subscriptions(text) from public, anon;
grant execute on function public.admin_subscriptions(text) to authenticated;

create or replace function public.admin_grant_pro(p_user uuid, p_days int, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  new_end timestamptz;
  founders int;
  note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_days is null or p_days < 1 or p_days > 730 then raise exception 'bad_days' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.display_name <> '') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('skillloop-founders', 0));
  select * into sub from public.subscriptions s where s.user_id = p_user for update;
  new_end := greatest(now(), coalesce(private.pro_until(sub), now())) + make_interval(days => p_days);
  if sub.user_id is null then
    select count(*) into founders from public.subscriptions where founder;
    insert into public.subscriptions (user_id, status, period_end, founder)
      values (p_user, 'active', new_end, founders < private.founders_cap());
  else
    update public.subscriptions s set status = 'active', period_end = new_end, updated_at = now() where s.user_id = p_user;
  end if;
  perform private.admin_note('pro_granted', p_user, jsonb_build_object('days', p_days, 'until', new_end, 'note', note));
  return jsonb_build_object('until', new_end);
end $$;
revoke all on function public.admin_grant_pro(uuid, int, text) from public, anon;
grant execute on function public.admin_grant_pro(uuid, int, text) to authenticated;

create or replace function public.admin_end_pro(p_user uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  update public.subscriptions s set status = 'cancelled', updated_at = now(),
      trial_ends_at = case when s.trial_ends_at > now() then now() else s.trial_ends_at end,
      period_end = case when s.period_end > now() then now() else s.period_end end
    where s.user_id = p_user and coalesce(private.pro_until(s) > now(), false);
  if not found then raise exception 'not_pro' using errcode = 'P0001'; end if;
  perform private.admin_note('pro_ended', p_user, jsonb_build_object('note', note));
end $$;
revoke all on function public.admin_end_pro(uuid, text) from public, anon;
grant execute on function public.admin_end_pro(uuid, text) to authenticated;

commit;
