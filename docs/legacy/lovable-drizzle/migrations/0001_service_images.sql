alter table public.services add column image_url text;
create policy "service images public read" on storage.objects for select using (bucket_id = 'service-images');
create policy "service images owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "service images owner delete" on storage.objects for delete to authenticated using (bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text);