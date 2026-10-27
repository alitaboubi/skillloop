-- Rollback of 20261028120000_portfolio_before_after.sql. Turn VITE_BEFORE_AFTER off and redeploy FIRST.
-- Drops the before-photo links (the files stay in storage under the owner's folder; remove them from the dashboard if needed).
begin;
drop policy if exists "service images public read" on storage.objects;
create policy "service images public read" on storage.objects for select using (
  bucket_id = 'service-images' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.services s where s.image_url = name and s.status = 'published' and not s.archived)
    or exists (select 1 from public.profiles p where p.avatar_url = name)
    or exists (select 1 from public.portfolio_items p where p.image_url = name)));
drop trigger if exists portfolio_before_after on public.portfolio_items;
drop function if exists private.portfolio_before_after();
alter table public.portfolio_items
  drop constraint if exists portfolio_before_own_folder,
  drop constraint if exists portfolio_before_needs_consent,
  drop constraint if exists portfolio_before_differs,
  drop column if exists before_consent_at,
  drop column if exists before_image_url;
commit;
