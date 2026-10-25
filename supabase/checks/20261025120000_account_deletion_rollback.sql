-- Rollback of 20261025120000_account_deletion.sql. Deleted accounts cannot be restored (that is the point).
-- The foreign key comes back NOT VALID so anonymous profiles of already-deleted accounts don't block it; new rows are checked.
begin;
drop function if exists public.delete_my_account();
alter table public.profiles drop column if exists deleted_at;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade not valid;
commit;
