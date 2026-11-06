-- Rollback of 20261106130000_support.sql. Turn VITE_SUPPORT off and redeploy FIRST. Deletes every support conversation.
begin;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_messages') then
    alter publication supabase_realtime drop table public.support_messages;
  end if;
end $$;
drop trigger if exists profiles_support_forget on public.profiles;
drop function if exists private.support_forget();
drop function if exists public.admin_support_set_status(uuid, text);
drop function if exists public.admin_support_reply(uuid, text);
drop function if exists public.admin_support_thread(uuid);
drop function if exists public.admin_support_inbox(text);
drop function if exists public.support_mark_read();
drop table if exists public.support_messages;
drop table if exists public.support_threads;
drop function if exists private.support_after();
drop function if exists private.support_guard();
delete from public.notifications where kind in ('support_new', 'support_reply');
commit;
