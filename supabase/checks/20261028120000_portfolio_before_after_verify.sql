-- READ-ONLY checks right AFTER applying 20261028120000_portfolio_before_after.sql. Expected: passed 4 | total 4 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'before columns exist' as check_name,
    (select count(*) = 2 from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items'
       and column_name in ('before_image_url', 'before_consent_at')) as ok
  union all select 'consent + own-folder constraints present',
    (select count(*) = 3 from pg_constraint where conrelid = 'public.portfolio_items'::regclass
       and conname in ('portfolio_before_own_folder', 'portfolio_before_needs_consent', 'portfolio_before_differs'))
  union all select 'consent trigger present',
    exists (select 1 from pg_trigger where tgname = 'portfolio_before_after' and tgrelid = 'public.portfolio_items'::regclass)
  union all select 'storage read rule covers before photos',
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'service images public read' and qual like '%before_image_url%')
) v;
