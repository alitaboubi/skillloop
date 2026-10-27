-- PREPARED 2026-10-27 — NOT APPLIED. Needs your approval (preflight → dry run → apply → verify), like the earlier ones.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261028120000_portfolio_before_after.sql
--   Verify after applying: supabase/checks/20261028120000_portfolio_before_after_verify.sql
--   Rollback: supabase/checks/20261028120000_portfolio_before_after_rollback.sql
--   Then set the public build variable VITE_BEFORE_AFTER=on (Cloudflare → Build variables) and redeploy.
--
-- Before/after pairs (Phase 2, carnet): a portfolio item may carry a "before" photo next to its main ("after") photo.
-- Publishing one requires the pro's consent statement ("the client allowed it; no faces, address, plate or personal
-- document"): the app sends before_consent_at, and the database stamps the real time itself whenever the before
-- photo changes (it can't be backdated). No consent → no before photo. Same owner-folder rule as the main photo.
-- Existing rows are untouched (both columns start empty).
begin;

alter table public.portfolio_items
  add column if not exists before_image_url text,
  add column if not exists before_consent_at timestamptz;

alter table public.portfolio_items
  drop constraint if exists portfolio_before_own_folder,
  drop constraint if exists portfolio_before_needs_consent,
  drop constraint if exists portfolio_before_differs;
alter table public.portfolio_items
  add constraint portfolio_before_own_folder check (before_image_url is null or before_image_url like owner_id::text || '/%'),
  add constraint portfolio_before_needs_consent check (before_image_url is null or before_consent_at is not null),
  add constraint portfolio_before_differs check (before_image_url is null or before_image_url <> image_url);

create or replace function private.portfolio_before_after() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.before_image_url is null then
    new.before_consent_at := null;
  elsif tg_op = 'INSERT' or new.before_image_url is distinct from old.before_image_url then
    if new.before_consent_at is null then
      raise exception 'before_consent_required: consent is needed to publish a before photo' using errcode = '23514';
    end if;
    new.before_consent_at := now();
  else
    new.before_consent_at := old.before_consent_at;
  end if;
  return new;
end $$;
revoke all on function private.portfolio_before_after() from public, anon, authenticated;

drop trigger if exists portfolio_before_after on public.portfolio_items;
create trigger portfolio_before_after before insert or update on public.portfolio_items
  for each row execute function private.portfolio_before_after();

-- Storage read rule (from the baseline) + before photos of portfolio items.
drop policy if exists "service images public read" on storage.objects;
create policy "service images public read" on storage.objects for select using (
  bucket_id = 'service-images' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.services s where s.image_url = name and s.status = 'published' and not s.archived)
    or exists (select 1 from public.profiles p where p.avatar_url = name)
    or exists (select 1 from public.portfolio_items p where p.image_url = name or p.before_image_url = name)));

commit;
