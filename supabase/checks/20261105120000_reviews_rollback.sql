-- Rollback of 20261105120000_reviews.sql. Turn VITE_REVIEWS off and redeploy FIRST.
-- Deletes every review (ratings, comments, replies, reports) and the requests' acceptance times.
-- Requests and messages themselves are untouched; request creation times stay as stamped.
begin;
drop trigger if exists profiles_reviews_on_delete on public.profiles;
drop function if exists private.reviews_on_account_deleted();
drop function if exists public.provider_reviews(uuid, int, timestamptz);
drop function if exists public.review_summaries(uuid[]);
drop function if exists public.provider_review_summary(uuid);
drop function if exists private.review_author(text);
drop table if exists public.reviews;
drop function if exists private.guard_review();
drop trigger if exists requests_stamp_times on public.requests;
drop function if exists private.stamp_request_times();
alter table public.requests drop column if exists accepted_at;
commit;
