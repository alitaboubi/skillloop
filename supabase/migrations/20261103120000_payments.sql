-- PREPARED 2026-11-03 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Requires 20261029120000_subscriptions.sql and 20261102120000_admin.sql applied first.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261103120000_payments.sql
--   Verify after applying: supabase/checks/20261103120000_payments_verify.sql
--   Rollback: supabase/checks/20261103120000_payments_rollback.sql
--   Then set the public build variables VITE_PAYMENTS=on and the payee details (VITE_PAY_D17, VITE_PAY_RIB,
--   VITE_PAY_FLOUCI, VITE_PAY_NAME — any left empty hides that method) and redeploy.
--   Do not turn VITE_PAYMENTS on before the auto-entrepreneur card and the accountant's answer on VAT.
--
-- SkillLoop Pro, phase 3a: manual payments (docs/product/pro-plan-strategy.md). No card data, no gateway.
--   • A pro pays outside SkillLoop (D17, bank transfer, Flouci), then declares it here with the transfer reference.
--     The amount is set by the database (10 TND / month, 100 TND / year), never by the client.
--   • One pending declaration per pro; at most 5 declarations per 24 h. The pro can cancel a pending one.
--   • An operator (private.admins) lists declarations and approves or refuses each one. Approval extends Pro:
--     from the later of now / current end (trial or paid period) by one month or one year. Nothing else can activate Pro.
--   • public.payments: a pro reads only their own rows; nobody writes through the API (RPCs only).
--   • The operator list shows the pro's public display name, the amount, method and reference — no email, no messages.
--   • provider / provider_ref are kept for a payment gateway later (Konnect): 'manual' for now.
begin;

create schema if not exists private;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null check (period in ('month', 'year')),
  amount_tnd int not null check (amount_tnd > 0),
  method text not null check (method in ('d17', 'transfer', 'flouci')),
  reference text not null check (char_length(reference) between 3 and 60),
  provider text not null default 'manual' check (provider in ('manual')),
  provider_ref text check (char_length(provider_ref) <= 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'refused', 'cancelled')),
  note text check (char_length(note) <= 300),
  period_end timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  check (status <> 'approved' or period_end is not null)
);
create unique index if not exists payments_one_pending on public.payments (user_id) where status = 'pending';
create index if not exists payments_status_created on public.payments (status, created_at);
alter table public.payments enable row level security;
revoke all on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
drop policy if exists "payment owner read" on public.payments;
create policy "payment owner read" on public.payments for select to authenticated using (auth.uid() = user_id);

-- Prices (keep in sync with PRO_PRICE_TND in src/lib/plan.ts).
create or replace function private.pro_price(p_period text) returns int
language sql immutable set search_path = '' as $$
  select case p_period when 'month' then 10 when 'year' then 100 end
$$;

-- The pro declares a payment made outside SkillLoop.
create or replace function public.declare_payment(p_period text, p_method text, p_reference text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ref text := btrim(coalesce(p_reference, ''));
  id uuid;
begin
  if me is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_period not in ('month', 'year') then raise exception 'payment_invalid:period' using errcode = '22023'; end if;
  if p_method not in ('d17', 'transfer', 'flouci') then raise exception 'payment_invalid:method' using errcode = '22023'; end if;
  if char_length(ref) not between 3 and 60 then raise exception 'payment_invalid:reference' using errcode = '22023'; end if;
  if exists (select 1 from public.payments where user_id = me and status = 'pending') then
    raise exception 'payment_pending_exists' using errcode = 'P0001';
  end if;
  if (select count(*) from public.payments where user_id = me and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate_limited:payments' using errcode = 'P0001';
  end if;
  insert into public.payments (user_id, period, amount_tnd, method, reference)
  values (me, p_period, private.pro_price(p_period), p_method, ref)
  returning payments.id into id;
  return id;
end $$;
revoke all on function public.declare_payment(text, text, text) from public, anon;
grant execute on function public.declare_payment(text, text, text) to authenticated;

create or replace function public.cancel_my_payment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set status = 'cancelled', decided_at = now()
  where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'payment_not_pending' using errcode = 'P0001'; end if;
end $$;
revoke all on function public.cancel_my_payment(uuid) from public, anon;
grant execute on function public.cancel_my_payment(uuid) to authenticated;

-- Operator: declarations, newest first (pending first). Public display name only.
create or replace function public.admin_payments(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'user_id', p.user_id, 'name', pr.display_name, 'period', p.period, 'amount_tnd', p.amount_tnd,
      'method', p.method, 'reference', p.reference, 'status', p.status, 'note', p.note, 'period_end', p.period_end,
      'created_at', p.created_at, 'decided_at', p.decided_at,
      'founder', coalesce(s.founder, false)) order by p.created_at desc)
    from (select * from public.payments
          where p_status is null or p_status = 'all' or status = p_status
          order by created_at desc limit 200) p
    join public.profiles pr on pr.id = p.user_id
    left join public.subscriptions s on s.user_id = p.user_id), '[]'::jsonb);
end $$;
revoke all on function public.admin_payments(text) from public, anon;
grant execute on function public.admin_payments(text) to authenticated;

-- Operator: approve (extends Pro) or refuse (with a note the pro sees).
create or replace function public.admin_decide_payment(p_id uuid, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  pay public.payments;
  sub public.subscriptions;
  base timestamptz;
  new_end timestamptz;
  founders int;
begin
  if not private.is_admin(me) then raise exception 'not_admin' using errcode = '42501'; end if;
  select * into pay from public.payments where id = p_id for update;
  if not found or pay.status <> 'pending' then raise exception 'payment_not_pending' using errcode = 'P0001'; end if;

  if not p_approve then
    update public.payments set status = 'refused', note = nullif(left(btrim(coalesce(p_note, '')), 300), ''),
      decided_at = now(), decided_by = me where id = p_id;
    return jsonb_build_object('status', 'refused');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('skillloop-founders', 0));
  select * into sub from public.subscriptions where user_id = pay.user_id for update;
  base := greatest(now(),
    case when sub.status = 'trial' then sub.trial_ends_at when sub.status = 'active' then sub.period_end end);
  new_end := coalesce(base, now()) + case pay.period when 'year' then interval '1 year' else interval '1 month' end;

  if sub.user_id is null then
    select count(*) into founders from public.subscriptions where founder;
    insert into public.subscriptions (user_id, status, period_end, founder)
    values (pay.user_id, 'active', new_end, founders < private.founders_cap());
  else
    update public.subscriptions set status = 'active', period_end = new_end, updated_at = now() where user_id = pay.user_id;
  end if;

  update public.payments set status = 'approved', period_end = new_end,
    note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), decided_at = now(), decided_by = me where id = p_id;
  return jsonb_build_object('status', 'approved', 'period_end', new_end);
end $$;
revoke all on function public.admin_decide_payment(uuid, boolean, text) from public, anon;
grant execute on function public.admin_decide_payment(uuid, boolean, text) to authenticated;

commit;
