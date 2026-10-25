# Proposal: make the 40-uploads-per-24-h quota apply to real uploads (NOT APPLIED — for review)

Status: **draft, not approved, not applied.** The applied migration `20261024140000` stays in place.

## 1. What we know (evidence, not assumptions)

| Fact | Evidence |
|---|---|
| A real upload through the app succeeded and was not counted | Your before/after: `files_in_folder` 2 → 3, `uploads_logged` 0 → 0 (2026-10-24 19:08 → 19:10 UTC) |
| Storage records the uploader on the file row | Your diagnostic: newest file `owner_id` = Ali's id |
| Storage checks the upload policy **as the caller in a probe that is rolled back**, then writes the row **as a superuser** | Supabase Storage source, `src/storage/uploader.ts` (master): `authorizeUpload` runs `db.testPermission(...)` with `createObject`/`upsertObject`; `completeUpload` runs `this.db.asSuperUser().withTransaction(...)`, re-checks the policy with `db.asCaller()` inside a savepoint that "rolls back only its savepoint", then `db.upsertObject(...)` on the superuser handle |
| ⇒ A slot taken inside the policy is always rolled back; the final write skips policies | Matches the observed 0 exactly. Caveat: this is the current public source; your project's Storage version may differ in detail — the real-upload test below is what proves the fix. |
| Supabase allows triggers on `storage.objects` | Official changelog "Restricting access on auth, storage and realtime schemas" (April 21, 2025): still allowed — "Create RLS policies and database triggers on the following tables: … storage.objects …"; not allowed — creating tables/functions in `storage` |
| Supabase also says to treat the storage schema as read-only | Docs "The Storage Schema": "We strongly recommend refraining from making any alterations to the storage schema and treating it as read-only" (custom indexes and RLS policies are encouraged) |
| Your project | `postgres` has TRIGGER on `storage.objects` (owner `supabase_storage_admin`); storage schema version `revoke-grants-to-unused-operations` |

Reading of the guidance: a trigger on `storage.objects` is an **explicitly permitted** extension point (like policies), with the
function kept in our own schema. It does not alter Storage's tables. The residual risk is that Storage internals change
(e.g. Supabase removed its own prefix triggers in 2026); the trigger depends only on `bucket_id`, `name`, `owner_id`.

## 2. The fix (`supabase/migrations/20261024150000_upload_quota_trigger.sql`)

One `BEFORE INSERT` trigger on `storage.objects` (function `private.enforce_upload_quota()`, not in `storage`):
1. ignores other buckets;
2. identifies the uploader from `owner_id` (set by Storage from the verified login), else the SQL caller; neither ⇒ administrator upload, not limited;
3. takes a per-user advisory lock, counts that user's upload slots in the last 24 h, **raises `daily_limit_reached:uploads` at 40**, otherwise records one slot.

The upload policy returns to the folder rule only, so nothing is counted twice.

**Enforced before accepting, not counted afterwards:** the trigger also fires inside Storage's **probe**, which Storage runs
*before* transferring the file. At the limit the probe fails, so the file is never sent; the app already turns this into the
"40 photos per 24 h" message (`upload_quota_left()` = 0). Under the limit, the probe's slot is rolled back with the probe and the
**final** write takes the one real slot, in the same transaction as the file row.

| Case | Behaviour |
|---|---|
| Concurrency | The final writes of one user are serialized by the lock, so at most 40 committed per 24 h — strict. Two uploads started at 39 can both pass the early probe; the second is then refused at its final write, i.e. **after** its bytes were transferred. Whether Storage removes those bytes is **not verified** (rare: parallel uploads exactly at the limit). |
| Failed upload (transfer fails, size/type refused, duplicate path) | No row is committed ⇒ no slot (tested for the duplicate path) |
| Retries | Each completed upload counts; failed attempts don't. The app never retries on its own. |
| Overwrites (upsert) | The app never overwrites (new random path, `x-upsert: false`); users have no UPDATE policy on files. If overwrites were ever allowed, each would count (`INSERT … ON CONFLICT` fires the insert trigger) — conservative. |
| Administrator uploads (dashboard, service key without a user) | Not limited (no uploader id), like the other quotas |
| Existing files | Untouched; nothing counted retroactively; the window starts from the first upload after applying |

## 3. Alternative: a server-side upload route

| | Storage trigger (proposed) | Server-side upload flow |
|---|---|---|
| Enforcement point | Database, on every write path through Storage (app, scripts, direct API) | Our server route; the database must still forbid direct client uploads, or it can be bypassed |
| Bypass risk | Low: any user upload goes through Storage, which fires the trigger | High unless the client upload policy is removed; then every photo feature must change |
| Early refusal | Yes (probe), except the rare race above | Yes, the route checks before uploading |
| New moving parts | One trigger + function (SQL, tested) | A server route on the Worker, the **service-role secret** in the Worker, multipart handling, size/CPU limits, deployment — none of which exist yet |
| Depends on Storage internals | Yes, on the documented `storage.objects` columns and on "triggers are allowed" | No |
| Effort / risk now | Small, reversible in one script | Large; blocked on the deployment decisions |

Recommendation: the trigger now; revisit a server route only if Storage's behavior changes or we need per-file processing.

## 4. Tests

- `supabase/tests/database/upload_quota.test.sql`, 14 tests, simulating both Storage steps (final write as `service_role`
  with `owner_id`; probe as the signed-in user):
  - 40 accepted and counted once each;
  - the 41st refused at the final write, leaving no file row;
  - the per-user lock;
  - at the limit the **probe** is refused;
  - the folder rule;
  - a refused upload takes no slot;
  - another user is unaffected;
  - one upload = one slot;
  - a failed (duplicate) write takes no slot;
  - an administrator upload is not limited.
- `limits.test.sql` test 28 now accepts either refusal (policy before the fix, trigger after), so the suite passes before and after.
- Expected dry run: 50 + 14 + 6 + 20 = **90**.

## 5. Rollback

`supabase/checks/20261024150000_upload_quota_rollback.sql` drops the trigger and function and restores the current policy.
It touches no file and no file row.

## 6. Mandatory real-Storage verification (after applying, with your approval at each step)

1. `20261024150000_upload_quota_verify.sql` → `passed 5 | total 5 | failing none`; `node scripts/db-test.mjs` → 90/90.
2. **One upload counts once.** Run the baseline query, add one portfolio item with one photo as Ali, then run the query again: expect `uploads_logged` +1 and `files_in_folder` +1.
3. **The limit refuses before upload.** Use the test account Zeineb, so Ali isn't blocked:
   - With your approval, add 39 upload slots for Zeineb in `private.quota_events` from the SQL Editor (this touches only the quota log, never files).
   - Upload one photo: it succeeds (40).
   - Upload another: refused with the "40 photos per 24 h" message, and Zeineb's `files_in_folder` doesn't change.
   - Then, with your approval, delete those 39 test slots.
4. Browser smoke test (profile, service create/edit, request, messages).
