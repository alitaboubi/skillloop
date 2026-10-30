-- Rollback of 20261030120000_pro_tools.sql. Turn VITE_PRO_TOOLS off and redeploy FIRST.
-- Deletes the statistics counters and the video links (video FILES stay in storage: list them with
--   select name from storage.objects where bucket_id = 'service-images' and name like '%/motion/%'
-- and remove them from the Storage UI if wanted). Stored carnet_theme choices stay in professional_details (harmless).
begin;
drop trigger if exists portfolio_motion_guard on public.portfolio_items;
drop trigger if exists skillloop_motion_upload on storage.objects;
drop trigger if exists profiles_carnet_theme_guard on public.profiles;
drop trigger if exists profiles_page_stats_forget on public.profiles;
drop function if exists private.portfolio_motion_guard();
drop function if exists private.enforce_motion_upload();
drop function if exists private.carnet_theme_guard();
drop function if exists private.page_stats_forget();
drop function if exists public.has_pro(uuid);
drop function if exists public.record_page_event(text, uuid);
drop function if exists public.my_page_stats(int);
drop function if exists private.stats_daily_cap();
drop function if exists private.stats_today();
drop table if exists private.page_stats;
drop policy if exists "service images public read" on storage.objects;
create policy "service images public read" on storage.objects for select using (
  bucket_id = 'service-images' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.services s where s.image_url = name and s.status = 'published' and not s.archived)
    or exists (select 1 from public.profiles p where p.avatar_url = name)
    or exists (select 1 from public.portfolio_items p where p.image_url = name or p.before_image_url = name)));
alter table public.portfolio_items drop constraint if exists portfolio_video_own_folder, drop constraint if exists portfolio_video_shape;
alter table public.portfolio_items drop column if exists video_url;
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'service-images';
commit;
