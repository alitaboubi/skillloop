-- READ-ONLY checks right AFTER applying 20261030120000_pro_tools.sql. Expected: passed 6 | total 6 | failing none.
select count(*) filter (where ok) as passed, count(*) as total,
       coalesce(string_agg(check_name, '; ') filter (where not ok or ok is null), 'none') as failing
from (
  select 'portfolio_items.video_url present' as check_name,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name = 'video_url') as ok
  union all select 'Pro guards present (motion, upload, theme, stats cleanup)',
    (select count(*) = 4 from pg_trigger where tgname in ('portfolio_motion_guard', 'skillloop_motion_upload', 'profiles_carnet_theme_guard', 'profiles_page_stats_forget'))
  union all select 'bucket accepts videos up to 8 MB',
    (select file_size_limit = 8388608 and 'video/mp4' = any(allowed_mime_types) from storage.buckets where id = 'service-images')
  union all select 'counters not readable by API roles',
    not has_table_privilege('anon', 'private.page_stats', 'select') and not has_table_privilege('authenticated', 'private.page_stats', 'select')
  union all select 'record_page_event public, my_page_stats signed-in only',
    has_function_privilege('anon', 'public.record_page_event(text, uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.my_page_stats(integer)', 'execute')
    and not has_function_privilege('anon', 'public.my_page_stats(integer)', 'execute')
  union all select 'has_pro public', has_function_privilege('anon', 'public.has_pro(uuid)', 'execute')
) v;
