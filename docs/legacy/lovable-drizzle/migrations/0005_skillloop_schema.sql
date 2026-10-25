create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', title text, bio text, city text,
  preferred_lang text not null default 'fr', created_at timestamptz not null default now(),
  avatar_url text, area text, facebook text, instagram text, website text, phone text,
  professional_details jsonb not null default '{}'::jsonb
);
grant select(id,display_name,title,bio,city,area,avatar_url,professional_details,created_at,preferred_lang) on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text not null, category text not null,
  price_model text not null default 'fixed' check (price_model in ('fixed','from','hourly','quote')),
  price numeric, city text not null, remote boolean not null default false,
  status text not null default 'published' check (status in ('published','draft')),
  created_at timestamptz not null default now(),
  image_url text, details jsonb not null default '{}'::jsonb, archived boolean not null default false
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
drop policy if exists "services public read" on public.services;
drop policy if exists "services owner read" on public.services;
drop policy if exists "services owner insert" on public.services;
drop policy if exists "services owner update" on public.services;
drop policy if exists "services owner delete" on public.services;
create policy "services public read" on public.services for select using (status = 'published' and not archived);
create policy "services owner read" on public.services for select to authenticated using (auth.uid() = owner_id);
create policy "services owner insert" on public.services for insert to authenticated with check (auth.uid() = owner_id);
create policy "services owner update" on public.services for update to authenticated using (auth.uid() = owner_id);
create policy "services owner delete" on public.services for delete to authenticated using (auth.uid() = owner_id);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
grant select, insert, update on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;
drop policy if exists "requests parties read" on public.requests;
drop policy if exists "requests client insert" on public.requests;
drop policy if exists "requests parties update" on public.requests;
create policy "requests parties read" on public.requests for select to authenticated using (auth.uid() in (client_id, provider_id));
create policy "requests client insert" on public.requests for insert to authenticated with check(auth.uid() = client_id and client_id <> provider_id and status = 'pending' and length(message) between 10 and 4000 and exists(select 1 from public.services s where s.id = service_id and s.owner_id = provider_id and s.status = 'published' and not s.archived));
create policy "requests parties update" on public.requests for update to authenticated using (auth.uid() in (client_id, provider_id));

create or replace function public.guard_request_status() returns trigger language plpgsql set search_path = public as $$
begin
 if new.id <> old.id or new.created_at <> old.created_at or new.client_id <> old.client_id or new.provider_id <> old.provider_id or new.service_id <> old.service_id or new.message <> old.message or new.details <> old.details then raise exception 'immutable fields'; end if;
 if new.status <> old.status then
  if auth.uid() = old.provider_id and new.status in ('accepted','declined') and old.status = 'pending' then return new; end if;
  if auth.uid() = old.client_id and new.status = 'cancelled' and old.status = 'pending' then return new; end if;
  raise exception 'status change not allowed';
 end if;
 return new;
end $$;
drop trigger if exists requests_guard on public.requests;
create trigger requests_guard before update on public.requests for each row execute function public.guard_request_status();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
drop policy if exists "messages parties read" on public.messages;
drop policy if exists "messages parties insert" on public.messages;
create policy "messages parties read" on public.messages for select to authenticated using (
  exists (select 1 from public.requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));
create policy "messages parties insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.requests r where r.id = request_id and auth.uid() in (r.client_id, r.provider_id)));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

create table if not exists public.portfolio_items (
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
drop policy if exists "portfolio public read" on public.portfolio_items;
drop policy if exists "portfolio owner insert" on public.portfolio_items;
drop policy if exists "portfolio owner update" on public.portfolio_items;
drop policy if exists "portfolio owner delete" on public.portfolio_items;
create policy "portfolio public read" on public.portfolio_items for select using (true);
create policy "portfolio owner insert" on public.portfolio_items for insert to authenticated with check (auth.uid() = owner_id);
create policy "portfolio owner update" on public.portfolio_items for update to authenticated using (auth.uid() = owner_id);
create policy "portfolio owner delete" on public.portfolio_items for delete to authenticated using (auth.uid() = owner_id);

create table if not exists public.profile_contacts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('facebook','instagram','linkedin','website','whatsapp','phone')),
 value text not null check (length(value) <= 500), is_public boolean not null default false, unique(owner_id, kind)
);
grant select on public.profile_contacts to anon, authenticated;
grant insert, update, delete on public.profile_contacts to authenticated;
grant all on public.profile_contacts to service_role;
alter table public.profile_contacts enable row level security;
drop policy if exists "visible contact read" on public.profile_contacts;
drop policy if exists "contact own insert" on public.profile_contacts;
drop policy if exists "contact own update" on public.profile_contacts;
drop policy if exists "contact own delete" on public.profile_contacts;
create policy "visible contact read" on public.profile_contacts for select using (is_public or owner_id = auth.uid());
create policy "contact own insert" on public.profile_contacts for insert to authenticated with check(owner_id = auth.uid());
create policy "contact own update" on public.profile_contacts for update to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());
create policy "contact own delete" on public.profile_contacts for delete to authenticated using(owner_id = auth.uid());

create table if not exists public.ai_access_blocks (scope text primary key, status integer not null, reason text not null, created_at timestamptz not null default now());
grant all on public.ai_access_blocks to service_role;
alter table public.ai_access_blocks enable row level security;

create or replace function public.guard_service_publication() returns trigger language plpgsql set search_path = public as $$
begin
 if TG_OP = 'UPDATE' and new.owner_id <> old.owner_id then raise exception 'Service owner is immutable'; end if;
 if new.status = 'published' and not new.archived then
  if length(trim(new.title)) < 5 or length(trim(new.description)) < 20 or length(trim(new.city)) = 0 or length(trim(new.category)) = 0 then raise exception 'Complete service details before publishing'; end if;
  if new.price_model <> 'quote' and (new.price is null or new.price <= 0 or new.price::text in ('NaN','Infinity','-Infinity')) then raise exception 'Valid TND price required'; end if;
  if new.category = 'healthcare' and coalesce(new.details->>'regulated_ack','false') <> 'true' then raise exception 'Regulated service acknowledgement required'; end if;
 end if;
 return new;
end $$;
drop trigger if exists service_publication_guard on public.services;
create trigger service_publication_guard before insert or update on public.services for each row execute function public.guard_service_publication();

create or replace function public.first_request_message() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.messages(request_id,sender_id,body) values(new.id,new.client_id,new.message); return new; end $$;
drop trigger if exists request_initial_message on public.requests;
create trigger request_initial_message after insert on public.requests for each row execute function public.first_request_message();
create or replace function public.guard_profile_availability() returns trigger language plpgsql set search_path = public as $$ begin if exists(select 1 from public.profiles p where p.id=new.provider_id and p.professional_details->>'accepting'='false') then raise exception 'Provider is not accepting requests'; end if; return new; end $$;
drop trigger if exists request_availability_guard on public.requests;
create trigger request_availability_guard before insert on public.requests for each row execute function public.guard_profile_availability();

create index if not exists services_owner_status_idx on public.services(owner_id,status);
create index if not exists requests_provider_status_idx on public.requests(provider_id,status);
create index if not exists portfolio_owner_idx on public.portfolio_items(owner_id);

drop policy if exists "service images public read" on storage.objects;
drop policy if exists "service images owner upload" on storage.objects;
drop policy if exists "service images owner delete" on storage.objects;
create policy "service images public read" on storage.objects for select using(bucket_id = 'service-images' and ((storage.foldername(name))[1] = auth.uid()::text or exists(select 1 from public.services s where s.image_url = name and s.status='published' and not s.archived) or exists(select 1 from public.profiles p where p.avatar_url=name) or exists(select 1 from public.portfolio_items p where p.image_url=name)));
create policy "service images owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "service images owner delete" on storage.objects for delete to authenticated using (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);