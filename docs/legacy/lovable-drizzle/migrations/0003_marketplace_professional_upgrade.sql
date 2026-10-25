alter table public.profiles add column professional_details jsonb not null default '{}'::jsonb;
alter table public.services add column details jsonb not null default '{}'::jsonb, add column archived boolean not null default false;
alter table public.requests add column details jsonb not null default '{}'::jsonb;
create table public.profile_contacts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('facebook','instagram','linkedin','website','whatsapp','phone')),
 value text not null check (length(value) <= 500), is_public boolean not null default false, unique(owner_id, kind)
);
grant select on public.profile_contacts to anon, authenticated;
grant insert, update, delete on public.profile_contacts to authenticated;
grant all on public.profile_contacts to service_role;
alter table public.profile_contacts enable row level security;
create policy "visible contact read" on public.profile_contacts for select using (is_public or owner_id = auth.uid());
create policy "contact own insert" on public.profile_contacts for insert to authenticated with check(owner_id = auth.uid());
create policy "contact own update" on public.profile_contacts for update to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());
create policy "contact own delete" on public.profile_contacts for delete to authenticated using(owner_id = auth.uid());
create table public.ai_access_blocks (scope text primary key, status integer not null, reason text not null, created_at timestamptz not null default now());
grant all on public.ai_access_blocks to service_role;
alter table public.ai_access_blocks enable row level security;
alter policy "services public read" on public.services using(status = 'published' and not archived);
alter policy "requests client insert" on public.requests with check(auth.uid() = client_id and client_id <> provider_id and status = 'pending' and length(message) between 10 and 4000 and exists(select 1 from public.services s where s.id = service_id and s.owner_id = provider_id and s.status = 'published' and not s.archived));
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
create trigger service_publication_guard before insert or update on public.services for each row execute function public.guard_service_publication();
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
create index services_owner_status_idx on public.services(owner_id,status);
create index requests_provider_status_idx on public.requests(provider_id,status);
create index portfolio_owner_idx on public.portfolio_items(owner_id);
