# « Vu sur SkillLoop » — reels about real pros and clients

**Goal:** when SkillLoop posts a reel on Instagram / Facebook about a pro or a client, the people in it see it in the app,
choose to show it on their public profile, and share it. Other members can be told a new video is out.

## Going live (once)
1. Dry run: `node scripts/db-test.mjs --pending supabase/migrations/20261106140000_social_features.sql`
2. Apply the migration in the SQL editor, then run `supabase/checks/20261106140000_social_features_verify.sql` (expect 6/6).
3. Cloudflare → Build variables: `VITE_SOCIAL_FEATURES=on` (VITE_ADMIN and VITE_NOTIFICATIONS already on) → redeploy.
Rollback: turn the flag off, redeploy, then `supabase/checks/20261106140000_social_features_rollback.sql`.

## Each new reel (2 minutes)
1. Get the agreement of every person in the video **before** posting (WhatsApp is fine; keep the message).
2. Post the reel on Instagram / Facebook.
3. /admin → « Publications réseaux » → « Nouvelle publication »: title (people read it), paste the links as they are,
   search and add the people (≤ 12).
4. « Publier et prévenir ». Tick « Prévenir aussi tous les membres » only for the best reels — at most one every 12 h.
5. In the list, follow who chose « Sur votre profil ». A gentle reminder after 3 days for those still « À vous de choisir ».

## What members see
- The bell: « Nouvelle vidéo SkillLoop » (everyone) or « Vous êtes à l'affiche » (people in the video).
- A click opens the video sheet: « Voir sur Instagram », « Voir sur Facebook », then « Je veux ma vidéo » (the support chat
  opens with a ready message — answer those in /admin → Support) or « Choisir si elle s'affiche sur mon profil ».
- Both links in the sheet come from `20261107120000_feature_links.sql` (applied 2026-11-07).

## Rules (enforced by the database)
- Nothing shows on a public profile until that person chooses it in the app; they can hide it at any time.
- The public profile never shows who else is in a video. Operators never see email addresses.
- Deleting a post removes it from profiles and from everyone's notifications. Deleting an account removes the person.

## Status (2026-11-07)
- Live on skillloop.tn: migrations 20261106140000_social_features and 20261107120000_feature_links applied; flag
  VITE_SOCIAL_FEATURES=on; PRs #15 (feature), #16 (« vous voulez votre vidéo ? » in the alert), #17 (video sheet),
  #18 (test robust to real data) merged.
- First real post: reel ep9 « 30 DT kol jem3a » (marketing/reel-ep9), announced to everyone, nobody tagged (Hamma is an
  AI character).
- Not checked yet in a browser: the video sheet with a real notification (second account), the prefilled support message.
- Ideas not built: a « Je veux ma vidéo » request list in /admin (today they arrive as support messages), counting clicks
  on Instagram / Facebook from the sheet, a reminder to people still « À vous de choisir » after 3 days.
