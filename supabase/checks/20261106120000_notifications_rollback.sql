-- Rollback of 20261106120000_notifications.sql. Turn VITE_NOTIFICATIONS off and redeploy FIRST.
-- Roll back 20261106140000_social_features.sql and 20261106130000_support.sql before this one if applied (they write notifications).
begin;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end $$;
drop trigger if exists profiles_notify_welcome on public.profiles;
drop trigger if exists services_notify_live on public.services;
drop trigger if exists requests_notify on public.requests;
drop trigger if exists reviews_notify on public.reviews;
drop trigger if exists profiles_notifications_forget on public.profiles;
drop function if exists private.notify_welcome();
drop function if exists private.notify_service_live();
drop function if exists private.notify_request();
drop function if exists private.notify_review();
drop function if exists private.notifications_forget();
drop function if exists public.my_notifications(int);
drop function if exists public.mark_notifications_read(uuid[]);
drop function if exists private.notify(uuid, text, uuid, uuid, uuid);
drop function if exists private.notify(uuid, text, uuid, uuid, uuid, uuid); -- after 20261106140000_social_features
drop table if exists public.notifications;
commit;
