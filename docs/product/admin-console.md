# Operator console (/admin)

One page, six sections (tabs; the open one is in the address: `?section=`):

| Section | What it does | Needs |
|---|---|---|
| Vue d'ensemble | « À faire aujourd'hui » (unread support, choices waiting in posts, requests waiting > 48 h, new accounts; pending payments and trials ending when those exist) + the figures (7 / 30 / 90 days) | 20261107130000_admin_console for the to-dos |
| Messages | Support inbox: search, open / closed / all, reply, close. `?c=<user>` opens one conversation (also from « Écrire » on an account) | VITE_SUPPORT |
| Utilisateurs | Every account (name, city, pro / client, services, requests, support state, join date), search by name or city, filter, sort, pages of 25. A click opens the side panel (`?u=`): facts, services, public profile, « Écrire », Pro access | 20261107130000_admin_console |
| Publications réseaux | « Vu sur SkillLoop » | VITE_SOCIAL_FEATURES |
| Abonnements | Who has Pro (now / trial / ended), founders, end dates; give Pro for 30 / 90 / 365 / N days or end it now (confirmed, with a note) + the action log | 20261029120000_subscriptions + 20261107140000_admin_subscriptions |
| Paiements | Declared payments to approve | VITE_PAYMENTS |

A block whose migration is not applied says which file to apply instead of failing.

## Going live
1. `node scripts/db-test.mjs --pending supabase/migrations/20261107130000_admin_console.sql` → apply → `supabase/checks/20261107130000_admin_console_verify.sql` (3/3).
2. Pro access: only once **20261029120000_subscriptions.sql is applied** (it also turns on the free-plan limits: 2 published
   services, 6 portfolio items for non-Pro — read its header first). Then
   `node scripts/db-test.mjs --pending supabase/migrations/20261107140000_admin_subscriptions.sql` → apply → verify (2/2).
No build variable: the console uses the functions as soon as they exist.

## Rules
- Operators = private.admins (SQL editor only). Every admin_* function refuses everyone else (42501).
- Never an email address; never the text of private client ↔ pro conversations (only support conversations, which are
  addressed to the team).
- Pro changes are written to the log (who, for whom, days, note, new end) and kept 365 days.
