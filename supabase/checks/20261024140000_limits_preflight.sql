-- READ-ONLY preflight for 20261024140000_limits_and_quotas.sql. Changes nothing (SELECT only).
-- Run it in the Supabase SQL Editor. Expected result: 0 rows.
-- Any row = existing data that would make the migration stop. Nothing is deleted or rewritten automatically:
-- send me the table/rule/row_id list (no content is shown) and we decide together.
select * from (
  select 'services' as tbl, id::text as row_id, 'title > 120 characters' as rule, length(title) as measured from public.services where length(title) > 120
  union all select 'services', id::text, 'description > 4000 characters', length(description) from public.services where length(description) > 4000
  union all select 'services', id::text, 'city > 80 characters', length(city) from public.services where length(city) > 80
  union all select 'services', id::text, 'category not in the 13 app categories', length(category) from public.services
    where category not in ('tech', 'design', 'tutoring', 'home', 'care', 'healthcare', 'engineering', 'automotive', 'business', 'events', 'personal', 'student', 'other')
  union all select 'services', id::text, 'details > 8192 bytes', octet_length(details::text) from public.services where octet_length(details::text) > 8192
  union all select 'services', id::text, 'photo outside the owner''s folder', null from public.services where image_url is not null and image_url not like owner_id::text || '/%'
  union all select 'profiles', id::text, 'display name > 80 characters', length(display_name) from public.profiles where length(display_name) > 80
  union all select 'profiles', id::text, 'title > 80 characters', length(title) from public.profiles where length(title) > 80
  union all select 'profiles', id::text, 'bio > 1000 characters', length(bio) from public.profiles where length(bio) > 1000
  union all select 'profiles', id::text, 'city > 80 characters', length(city) from public.profiles where length(city) > 80
  union all select 'profiles', id::text, 'area > 80 characters', length(area) from public.profiles where length(area) > 80
  union all select 'profiles', id::text, 'professional details > 8192 bytes', octet_length(professional_details::text) from public.profiles where octet_length(professional_details::text) > 8192
  union all select 'profiles', id::text, 'avatar outside the user''s folder', null from public.profiles where avatar_url is not null and avatar_url not like id::text || '/%'
  union all select 'requests', id::text, 'details > 4096 bytes', octet_length(details::text) from public.requests where octet_length(details::text) > 4096
  union all select 'portfolio_items', id::text, 'photo outside the owner''s folder', null from public.portfolio_items where image_url not like owner_id::text || '/%'
  union all select 'schema', 'private', 'a schema named "private" already exists (the migration would reuse it)', null from pg_namespace where nspname = 'private'
) v
order by tbl, rule;
