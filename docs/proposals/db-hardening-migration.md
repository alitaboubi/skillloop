# Proposal: database hardening migration (NOT APPLIED — for review)

> **Superseded by the final files (approved limits, 2026-10-24):** migration `supabase/migrations/20261024140000_limits_and_quotas.sql`,
> preflight `supabase/checks/20261024140000_limits_preflight.sql`, rollback `supabase/checks/20261024140000_limits_rollback.sql`,
> tests `supabase/tests/database/limits.test.sql`. Changes from this draft: quotas use a private ledger + per-user advisory
> lock (concurrency, deletes don't free slots), request opening messages don't count as chat messages, JSON size uses
> octet_length (not compressed size), signup name truncation, upload quota readable via `upload_quota_left()`.

Status: **draft for your review**. Nothing here has been run against any database. It is deliberately outside
`supabase/migrations/` so it can't be applied by accident. After you approve (and adjust the numbers), it becomes
`supabase/migrations/<timestamp>_hardening.sql` with pgTAP tests, and you apply it in the SQL Editor as before.

Covers the roadmap findings B1 (length/size limits), B2 (per-user daily caps), B5 (storage path ownership) and B6
(profile update grant). B4 (duplicate requests, messages after decline) stays a separate optional migration.

## What it changes

| Part | Rule | Why |
|---|---|---|
| 1. Length/size limits | Services: title ≤ 120, description ≤ 4000, city ≤ 80, category in the app's 13 ids, `details` ≤ 8 KB. Profiles: display name/title ≤ 80, bio ≤ 1000, city/area ≤ 80, `professional_details` ≤ 8 KB. Requests: `details` ≤ 4 KB. | Same limits as the forms (offer-wizard `LIMITS`, profile `maxLength`), now also enforced for direct API calls. |
| 2. Daily caps (per account, rolling 24 h) | ≤ 20 new services, ≤ 30 new requests, ≤ 300 messages, ≤ 40 photo uploads. | Stops spam and storage filling by one account or script. Generous for real use. **Numbers are suggestions — choose yours.** |
| 3. Photo path ownership | A service/portfolio `image_url` and a profile `avatar_url` must be inside the owner's own folder (`<owner id>/…`). | Prevents making someone else's private photo public by referencing it (B5). |
| 4. Profile update grant | `UPDATE` only on the editable columns; the deprecated contact columns become read-only. | B6. |

Constraints are added `NOT VALID` and then validated, so you see a clear error if any existing row breaks a rule
(nothing is changed or deleted). If validation fails, stop and send me the error — no data is modified automatically.

## Draft SQL

```sql
-- PROPOSAL — DO NOT APPLY WITHOUT APPROVAL
begin;

-- 1. Length / size limits ---------------------------------------------------------------
alter table public.services
  add constraint services_title_len check (length(title) <= 120) not valid,
  add constraint services_description_len check (length(description) <= 4000) not valid,
  add constraint services_city_len check (length(city) <= 80) not valid,
  add constraint services_category_known check (category in ('tech','design','tutoring','home','care','healthcare',
    'engineering','automotive','business','events','personal','student','other')) not valid,
  add constraint services_details_size check (pg_column_size(details) <= 8192) not valid;

alter table public.profiles
  add constraint profiles_display_name_len check (length(display_name) <= 80) not valid,
  add constraint profiles_title_len check (title is null or length(title) <= 80) not valid,
  add constraint profiles_bio_len check (bio is null or length(bio) <= 1000) not valid,
  add constraint profiles_city_len check (city is null or length(city) <= 80) not valid,
  add constraint profiles_area_len check (area is null or length(area) <= 80) not valid,
  add constraint profiles_details_size check (pg_column_size(professional_details) <= 8192) not valid;

alter table public.requests
  add constraint requests_details_size check (pg_column_size(details) <= 4096) not valid;

-- 3. Photo path ownership (same statement block: constraints) ---------------------------
alter table public.services
  add constraint services_image_own_folder check (image_url is null or image_url like owner_id::text || '/%') not valid;
alter table public.profiles
  add constraint profiles_avatar_own_folder check (avatar_url is null or avatar_url like id::text || '/%') not valid;
alter table public.portfolio_items
  add constraint portfolio_image_own_folder check (image_url like owner_id::text || '/%') not valid;

-- Validate existing rows (fails loudly, changes nothing, if a row breaks a rule).
alter table public.services validate constraint services_title_len;
alter table public.services validate constraint services_description_len;
alter table public.services validate constraint services_city_len;
alter table public.services validate constraint services_category_known;
alter table public.services validate constraint services_details_size;
alter table public.services validate constraint services_image_own_folder;
alter table public.profiles validate constraint profiles_display_name_len;
alter table public.profiles validate constraint profiles_title_len;
alter table public.profiles validate constraint profiles_bio_len;
alter table public.profiles validate constraint profiles_city_len;
alter table public.profiles validate constraint profiles_area_len;
alter table public.profiles validate constraint profiles_details_size;
alter table public.profiles validate constraint profiles_avatar_own_folder;
alter table public.requests validate constraint requests_details_size;
alter table public.portfolio_items validate constraint portfolio_image_own_folder;

-- 2. Daily caps ---------------------------------------------------------------------------
create or replace function public.enforce_daily_cap() returns trigger
language plpgsql set search_path = public as $$
declare n int; cap int; who uuid;
begin
  if TG_TABLE_NAME = 'services' then
    who := new.owner_id; cap := 20;
    select count(*) into n from public.services where owner_id = who and created_at > now() - interval '24 hours';
  elsif TG_TABLE_NAME = 'requests' then
    who := new.client_id; cap := 30;
    select count(*) into n from public.requests where client_id = who and created_at > now() - interval '24 hours';
  elsif TG_TABLE_NAME = 'messages' then
    who := new.sender_id; cap := 300;
    select count(*) into n from public.messages where sender_id = who and created_at > now() - interval '24 hours';
  end if;
  if n >= cap then raise exception 'daily_limit_reached' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke execute on function public.enforce_daily_cap() from public, anon, authenticated;

create trigger services_daily_cap before insert on public.services for each row execute function public.enforce_daily_cap();
create trigger requests_daily_cap before insert on public.requests for each row execute function public.enforce_daily_cap();
create trigger messages_daily_cap before insert on public.messages for each row execute function public.enforce_daily_cap();

-- Uploads: the existing insert policy plus a 24 h cap on the user's own folder.
drop policy if exists "service images owner upload" on storage.objects;
create policy "service images owner upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images' and (storage.foldername(name))[1] = auth.uid()::text
    and (select count(*) from storage.objects o
         where o.bucket_id = 'service-images' and (storage.foldername(o.name))[1] = auth.uid()::text
           and o.created_at > now() - interval '24 hours') < 40);

-- 1b. Signup must never fail on a long name (Google or the signup form): cut it to the limit.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end $$;

-- 4. Profile update grant -----------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (display_name, title, bio, city, area, avatar_url, professional_details, preferred_lang)
  on public.profiles to authenticated;

commit;
```

## Before it becomes a real migration I will

0. (Found in review, 2026-10-24) The signup trigger copies the full name into `display_name`; with the new 80-char limit a
   longer name would make **signup itself fail**. The draft now truncates it in the trigger (1b), and the signup form
   name field gets `maxLength={80}` (it has none today).

1. Check every app write still fits (e.g. `updateProfile` only sends the granted columns; the app shows a friendly
   message for `daily_limit_reached` instead of a raw error — small UI change + i18n in 3 languages).
2. Add pgTAP tests: each limit rejects one-over and accepts the maximum; caps reject the (cap+1)th insert; foreign-folder
   paths are rejected; deprecated columns can't be updated; everything existing still passes (26 tests).
3. Show you the final SQL; you apply it; you run `node scripts/db-test.mjs`.

## Decisions for you

- Approve the four parts (or a subset).
- The cap numbers (20 services / 30 requests / 300 messages / 40 uploads per 24 h).
- Whether a total storage cap per account is also wanted (e.g. 200 files).
