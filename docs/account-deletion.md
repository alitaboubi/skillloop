# Account deletion (prepared 2026-10-25 — migration NOT applied, feature OFF)

**Where:** Settings (`/profile?tab=settings`) → "Supprimer mon compte" → read what is deleted/kept → tick "I understand" →
"Supprimer définitivement". Cancel is focused first; the button stays disabled until the box is ticked.

**How (free tier, no service-role key, no server secret):**
1. The browser deletes every file in the user's own Storage folder `<user id>/…` with the user's session (the existing
   "owner delete" policy). SQL never deletes Storage files.
2. The browser calls `public.delete_my_account()` (migration `supabase/migrations/20261025120000_account_deletion.sql`,
   security definer, acts on `auth.uid()` only).
3. The browser clears its local session, cached data and drafts, then goes to the home page.
If step 1 fails, nothing else happens. If step 2 fails, the photos are gone but the account remains; retrying works.

| Data | What happens |
|---|---|
| Sign-in account (`auth.users`): email, password hash, Google link, sessions | **Deleted** |
| Photos (avatar, service photos, portfolio) in Storage | **Deleted** (step 1) |
| Portfolio items, contacts (public and private) | **Deleted** |
| Services that never received a request | **Deleted** |
| Daily usage counters (`private.quota_events`) | **Deleted** |
| Profile row | **Anonymised**: name emptied (shown as "Compte supprimé"), title, bio, city, area, photo, details, old contact columns cleared; `deleted_at` recorded. Kept only so the other person's requests/messages stay linked. Never public (`/pros/<id>` → 404). |
| Services that received requests | **Anonymised**: archived (never public), description/photo/details cleared; **title kept** so the other person's conversation still says what it was about |
| Pending requests | **Closed**: as client → cancelled, as provider → declined (same rules as the app's buttons) |
| Requests and messages with other people | **Retained** (the other person's record), no longer linked to a name, photo or email. Retention period: privacy policy `[PLACEHOLDER]`. |

**Why the migration removes `profiles → auth.users ON DELETE CASCADE`:** deleting a sign-in account would otherwise
delete the profile, which cascades into the *other* person's requests and messages (or fails on the request-history
guard). Profiles are still only created by the signup trigger.

**Known limits:** a user can technically edit their own `deleted_at` (harmless: it only records a date); messages the
deleted user wrote stay readable by the other person (by design, documented in the privacy policy).

**To enable (each step needs your approval, like the earlier migrations):**
1. Preflight (read-only, SQL Editor): `supabase/checks/20261025120000_account_deletion_preflight.sql` → must return 0 rows.
2. Dry run: `node scripts/db-test.mjs --pending supabase/migrations/20261025120000_account_deletion.sql` → all tests pass
   (16 in `account_deletion.test.sql` plus the existing ones).
3. Apply the migration in the SQL Editor; then `supabase/checks/20261025120000_account_deletion_verify.sql` → 4/4.
4. Set the build variable `VITE_ACCOUNT_DELETION=on` and rebuild. Test with a throwaway account (with a photo, a service
   with a request from your second account, and a message): the second account still sees the conversation, the name
   shows "Compte supprimé", the deleted account can no longer sign in.
Rollback: `supabase/checks/20261025120000_account_deletion_rollback.sql` (deleted accounts cannot be restored).
