create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  title text,
  bio text,
  city text,
  preferred_lang text not null default 'fr',
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  price_model text not null default 'fixed' check (price_model in ('fixed','from','hourly','quote')),
  price numeric,
  city text not null,
  remote boolean not null default false,
  status text not null default 'published' check (status in ('published','draft')),
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select using (status = 'published');
create policy "services owner read" on public.services for select to authenticated using (auth.uid() = owner_id);
create policy "services owner insert" on public.services for insert to authenticated with check (auth.uid() = owner_id);
create policy "services owner update" on public.services for update to authenticated using (auth.uid() = owner_id);
create policy "services owner delete" on public.services for delete to authenticated using (auth.uid() = owner_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;
create policy "requests parties read" on public.requests for select to authenticated using (auth.uid() in (client_id, provider_id));
create policy "requests client insert" on public.requests for insert to authenticated with check (
  auth.uid() = client_id and client_id <> provider_id
  and exists (select 1 from public.services s where s.id = service_id and s.owner_id = provider_id and s.status='published'));
create policy "requests parties update" on public.requests for update to authenticated using (auth.uid() in (client_id, provider_id));

create or replace function public.guard_request_status() returns trigger language plpgsql set search_path = public as $$
begin
  if new.client_id <> old.client_id or new.provider_id <> old.provider_id or new.service_id <> old.service_id or new.message <> old.message then
    raise exception 'immutable fields';
  end if;
  if new.status <> old.status then
    if auth.uid() = old.provider_id and new.status in ('accepted','declined') and old.status = 'pending' then return new; end if;
    if auth.uid() = old.client_id and new.status = 'cancelled' and old.status = 'pending' then return new; end if;
    raise exception 'status change not allowed';
  end if;
  return new;
end $$;
create trigger requests_guard before update on public.requests for each row execute function public.guard_request_status();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages parties read" on public.messages for select to authenticated using (
  exists (select 1 from public.requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));
create policy "messages parties insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));
alter publication supabase_realtime add table public.messages;