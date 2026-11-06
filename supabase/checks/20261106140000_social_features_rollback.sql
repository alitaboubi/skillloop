-- Rollback of 20261106140000_social_features.sql. Turn VITE_SOCIAL_FEATURES off and redeploy FIRST.
-- Deletes every post, every « shown on my profile » choice and their alerts; the bell goes back to its 14 kinds.
begin;
drop trigger if exists profiles_social_forget on public.profiles;
drop function if exists private.social_forget();
drop function if exists public.public_social_features(uuid);
drop function if exists public.set_social_feature_choice(uuid, boolean);
drop function if exists public.my_social_features();
drop function if exists public.admin_social_post_delete(uuid);
drop function if exists public.admin_social_post_publish(uuid, boolean);
drop function if exists public.admin_social_post_save(uuid, text, text, text, uuid[]);
drop function if exists public.admin_social_people_search(text);
drop function if exists public.admin_social_posts();
drop function if exists private.social_post_json(uuid);
drop function if exists private.social_notify_people(uuid);

delete from public.notifications where kind in ('feature_you', 'feature_new');
alter table public.notifications drop column if exists feature_id;
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'welcome', 'service_live', 'request_new', 'request_accepted', 'request_declined', 'request_cancelled',
  'job_scheduled', 'job_on_the_way', 'job_started', 'job_completed', 'review_new', 'review_reply',
  'support_new', 'support_reply'));
drop table if exists public.social_post_people;
drop table if exists public.social_posts;

-- private.notify and my_notifications exactly as in 20261106120000_notifications.sql.
drop function if exists private.notify(uuid, text, uuid, uuid, uuid, uuid);
create or replace function private.notify(p_user uuid, p_kind text, p_request uuid default null, p_service uuid default null, p_actor uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user is not distinct from p_actor then return; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.display_name <> '') then return; end if;
  insert into public.notifications (user_id, kind, request_id, service_id, actor_id) values (p_user, p_kind, p_request, p_service, p_actor);
  delete from public.notifications n where n.user_id = p_user and (
    n.created_at < now() - interval '90 days'
    or n.id in (select x.id from public.notifications x where x.user_id = p_user order by x.created_at desc, x.id offset 100));
end $$;
revoke all on function private.notify(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.my_notifications(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'unread', (select count(*) from public.notifications n where n.user_id = auth.uid() and n.read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', n.id, 'kind', n.kind, 'created_at', n.created_at, 'read_at', n.read_at,
          'request_id', n.request_id, 'service_id', n.service_id,
          'service_title', s.title, 'actor_name', a.display_name)
        order by n.created_at desc, n.id)
      from (select * from public.notifications x where x.user_id = auth.uid()
            order by x.created_at desc, x.id limit least(50, greatest(1, coalesce(p_limit, 30)))) n
      left join public.services s on s.id = n.service_id
      left join public.profiles a on a.id = n.actor_id), '[]'::jsonb))
  where auth.uid() is not null
$$;
revoke all on function public.my_notifications(int) from public, anon;
grant execute on function public.my_notifications(int) to authenticated;
commit;
