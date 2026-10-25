-- PREPARED 2026-10-25 — NOT APPLIED. Needs your approval (like the earlier migrations: preflight → dry run → apply → verify).
--   Preflight (read-only, must return 0 rows): supabase/checks/20261025120000_account_deletion_preflight.sql
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261025120000_account_deletion.sql
--   Verify after applying: supabase/checks/20261025120000_account_deletion_verify.sql
--   Rollback: supabase/checks/20261025120000_account_deletion_rollback.sql
--
-- Self-service account deletion without a service-role key (free tier, no server secret):
-- public.delete_my_account() runs as the signed-in user and
--   DELETES   the sign-in account (auth.users row → its sessions/identities go with it), the email address with it,
--             portfolio items, contacts, services that never received a request, quota counters;
--   CLOSES    the user's pending requests (as client → cancelled, as provider → declined), like the app buttons would;
--   ANONYMISES the profile (name emptied → shown as "Compte supprimé", photo/bio/title/city/details cleared) and the
--             services that DID receive requests (archived, description/photo/details cleared; title kept so the other
--             person's conversation still says what it was about);
--   RETAINS   requests and messages (the other person's record of the conversation), linked to the anonymous profile.
-- Photos: the app deletes the user's own Storage folder BEFORE calling this (SQL must not delete Storage files).
--
-- Why the profiles → auth.users foreign key goes: it is ON DELETE CASCADE, so deleting a sign-in account would delete
-- the profile, which cascades into the OTHER person's requests and messages (requests.client_id/provider_id →
-- profiles ON DELETE CASCADE) — or fails on the request-history guard. The anonymous profile row must outlive the
-- sign-in account. Profiles are still only ever created by handle_new_user (insert policy: auth.uid() = id).
begin;

do $$
begin
  if not has_table_privilege(current_user, 'auth.users', 'DELETE') then
    raise exception 'current role cannot delete from auth.users — stop; account deletion needs another approach';
  end if;
end $$;

do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.profiles'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass;
  if c is not null then execute format('alter table public.profiles drop constraint %I', c); end if;
end $$;

-- Record of when an account was deleted (not granted to API roles; the app recognises a deleted account by its empty name).
alter table public.profiles add column if not exists deleted_at timestamptz;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('skillloop_delete_account'), hashtext(uid::text));

  -- Open requests are closed the same way the app's buttons do it (the status guard still checks who may do what).
  update public.requests set status = 'cancelled' where client_id = uid and status = 'pending';
  update public.requests set status = 'declined' where provider_id = uid and status = 'pending';

  delete from public.portfolio_items where owner_id = uid;
  delete from public.profile_contacts where owner_id = uid;
  delete from public.services s where s.owner_id = uid
    and not exists (select 1 from public.requests r where r.service_id = s.id);
  update public.services
    set archived = true, description = '', image_url = null, details = '{}'::jsonb
    where owner_id = uid;

  update public.profiles
    set display_name = '', title = null, bio = null, city = null, area = null, avatar_url = null,
        facebook = null, instagram = null, website = null, phone = null,
        professional_details = '{}'::jsonb, deleted_at = now()
    where id = uid;

  delete from private.quota_events where user_id = uid;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
