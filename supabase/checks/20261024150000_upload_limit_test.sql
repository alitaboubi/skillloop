-- FOR REVIEW ONLY — DO NOT RUN until you approve it (2026-10-24). Real-Storage limit test for 20261024150000.
-- Account under test: Zeineb (03ecfb0b-2681-4e4f-b605-9b2328863011). Touches ONLY private.quota_events, never a file.
-- Run each block separately in the SQL Editor, in order, only after 20261024150000 is applied and verified.

-- ── A. Read-only: Zeineb's current state (note both numbers) ──
select
  (select count(*) from private.quota_events where user_id = '03ecfb0b-2681-4e4f-b605-9b2328863011' and kind = 'uploads'
     and created_at > now() - interval '24 hours') as uploads_in_window,
  (select count(*) from storage.objects where bucket_id = 'service-images' and name like '03ecfb0b-2681-4e4f-b605-9b2328863011/%') as files_in_folder;

-- ── B. Seed: bring Zeineb to exactly 39 uploads in the window (needs your approval) ──
-- ONE statement (atomic on its own; its result is what the SQL Editor shows). All seeded rows share ONE created_at
-- (the statement's now()): write down seed_created_at and seeded_rows — cleanup uses both. Real uploads always have
-- their own, different timestamp. If Zeineb already has >= 39 uploads in the window, it inserts nothing.
with seeded as (
  insert into private.quota_events (user_id, kind)
  select '03ecfb0b-2681-4e4f-b605-9b2328863011'::uuid, 'uploads'::text
  from generate_series(1, greatest(0, 39 - (select count(*)::int from private.quota_events
    where user_id = '03ecfb0b-2681-4e4f-b605-9b2328863011' and kind = 'uploads' and created_at > now() - interval '24 hours')))
  returning created_at
)
select min(created_at) as seed_created_at, count(*) as seeded_rows from seeded;
-- Then re-run block A: uploads_in_window must be 39.

-- ── C. In the app as Zeineb: upload ONE portfolio photo → must succeed (40). Then try ONE more → must be refused with
--       "Limite du jour atteinte : 40 photos…". Then re-run block A: uploads_in_window 40, files_in_folder = before + 1. ──

-- ── D. Cleanup preview (read-only): paste seed_created_at from block B ──
select count(*) as rows_to_delete from private.quota_events
where user_id = '03ecfb0b-2681-4e4f-b605-9b2328863011' and kind = 'uploads' and created_at = 'PASTE-seed_created_at';
-- Expected: exactly seeded_rows from block B. If different, stop.

-- ── E. Cleanup (needs your approval): ONE statement; paste seed_created_at AND seeded_rows from block B ──
-- Guarded: it deletes ONLY if the number of rows with that exact timestamp equals seeded_rows; otherwise it deletes
-- nothing and returns deleted_rows = 0. The real upload events (other timestamps) are never matched.
with target as (
  select ctid from private.quota_events
  where user_id = '03ecfb0b-2681-4e4f-b605-9b2328863011' and kind = 'uploads' and created_at = 'PASTE-seed_created_at'
), removed as (
  delete from private.quota_events q using target t
  where q.ctid = t.ctid and (select count(*) from target) = PASTE-seeded_rows
  returning 1
)
select count(*) as deleted_rows from removed;
-- Expected: deleted_rows = seeded_rows. (Without cleanup the seeded rows stop counting 24 h after seed_created_at.)
