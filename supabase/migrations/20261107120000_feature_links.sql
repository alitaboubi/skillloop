-- PREPARED 2026-11-07 — NOT APPLIED. Needs your approval (dry run → apply → verify), like the earlier ones.
--   Needs (applied): 20261106140000_social_features.sql.
--   Dry run: node scripts/db-test.mjs --pending supabase/migrations/20261107120000_feature_links.sql
--   Verify after applying: supabase/checks/20261107120000_feature_links_verify.sql
--   Rollback: supabase/checks/20261107120000_feature_links_rollback.sql
--   No flag: the app already reads the new fields when they are there (before: one link per notification).
--
-- The bell opens a « video » sheet for feature_you / feature_new with BOTH links (Instagram and Facebook) and the date.
-- my_notifications() gains feature_instagram_url, feature_facebook_url and feature_published_at; everything else is
-- unchanged (feature_url stays for older app versions).
begin;

create or replace function public.my_notifications(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'unread', (select count(*) from public.notifications n where n.user_id = auth.uid() and n.read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', n.id, 'kind', n.kind, 'created_at', n.created_at, 'read_at', n.read_at,
          'request_id', n.request_id, 'service_id', n.service_id,
          'service_title', s.title, 'actor_name', a.display_name,
          'feature_id', n.feature_id, 'feature_title', f.title, 'feature_url', coalesce(f.instagram_url, f.facebook_url),
          'feature_instagram_url', f.instagram_url, 'feature_facebook_url', f.facebook_url, 'feature_published_at', f.published_at)
        order by n.created_at desc, n.id)
      from (select * from public.notifications x where x.user_id = auth.uid()
            order by x.created_at desc, x.id limit least(50, greatest(1, coalesce(p_limit, 30)))) n
      left join public.services s on s.id = n.service_id
      left join public.profiles a on a.id = n.actor_id
      left join public.social_posts f on f.id = n.feature_id and f.published_at is not null), '[]'::jsonb))
  where auth.uid() is not null
$$;
revoke all on function public.my_notifications(int) from public, anon;
grant execute on function public.my_notifications(int) to authenticated;

commit;
