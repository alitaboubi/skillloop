-- ROLLBACK for 20261024140000_limits_and_quotas.sql — restores the exact previous rules. Data in services, profiles,
-- requests, messages, portfolio and storage is not touched; only the quota ledger (counts of recent actions) is dropped.
-- The app keeps working either way (it treats a missing upload_quota_left() as "no limit info").
begin;

drop trigger if exists services_daily_quota on public.services;
drop trigger if exists requests_daily_quota on public.requests;
drop trigger if exists messages_daily_quota on public.messages;

drop policy if exists "service images owner upload" on storage.objects;
create policy "service images owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop function if exists public.upload_quota_left();
drop function if exists private.enforce_daily_quota();
drop function if exists private.consume_daily_quota(text);
drop function if exists private.daily_cap(text);
drop table if exists private.quota_events;
drop schema if exists private;  -- fails (and rolls everything back) if something else lives there: then tell me

alter table public.services
  drop constraint if exists services_title_len, drop constraint if exists services_description_len,
  drop constraint if exists services_city_len, drop constraint if exists services_category_known,
  drop constraint if exists services_details_size, drop constraint if exists services_image_own_folder;
alter table public.profiles
  drop constraint if exists profiles_display_name_len, drop constraint if exists profiles_title_len,
  drop constraint if exists profiles_bio_len, drop constraint if exists profiles_city_len,
  drop constraint if exists profiles_area_len, drop constraint if exists profiles_details_size,
  drop constraint if exists profiles_avatar_own_folder;
alter table public.requests drop constraint if exists requests_details_size;
alter table public.portfolio_items drop constraint if exists portfolio_image_own_folder;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke update on public.profiles from authenticated;
grant update on public.profiles to authenticated;

commit;
