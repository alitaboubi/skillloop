alter table public.profiles
  add column avatar_url text,
  add column area text,
  add column facebook text,
  add column instagram text,
  add column website text,
  add column phone text;

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 2 and 120),
  description text check (description is null or length(description) <= 1000),
  image_url text not null,
  created_at timestamptz not null default now()
);
grant select on public.portfolio_items to anon, authenticated;
grant insert, update, delete on public.portfolio_items to authenticated;
grant all on public.portfolio_items to service_role;
alter table public.portfolio_items enable row level security;
create policy "portfolio public read" on public.portfolio_items for select using (true);
create policy "portfolio owner insert" on public.portfolio_items for insert to authenticated with check (auth.uid() = owner_id);
create policy "portfolio owner update" on public.portfolio_items for update to authenticated using (auth.uid() = owner_id);
create policy "portfolio owner delete" on public.portfolio_items for delete to authenticated using (auth.uid() = owner_id);