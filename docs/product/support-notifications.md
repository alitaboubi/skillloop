# Support & notifications: the playbook

2026-11-06. What we built, why it works this way, how to switch it on, and how to run support every day.

## The idea in one sentence

**Nobody on SkillLoop should ever wonder « et maintenant ? ».** When something happens, the right person knows within
seconds (notifications). When someone is stuck, a real person from the team is one tap away (support).

Trust is our product. A client who sends a request and hears nothing leaves forever. A pro who gets a request and
doesn't see it loses the job. These two features close that gap.

## What users see

### The bell (notifications)
Top of the screen, next to Messages (desktop and phone). A lime badge counts what's unread. One tap opens a short list
grouped by *Aujourd'hui / Cette semaine / Plus tôt*; tapping an item opens the exact place (the conversation, the service,
the reviews) and marks it read. A small toast appears when something new arrives while the page is open.

| Event | Who is told | Why it matters |
|---|---|---|
| Account created | the new user | first nudge: photo + city = trust |
| First publication of a service | the pro | « it's live — share the link » |
| New request | the pro | speed of reply is the #1 conversion factor |
| Request accepted / declined | the client | no silent rejections; declined points to other pros |
| Client cancels | the pro | no wasted trip |
| Appointment set, en route, started, done | the client | the « Suivi d'intervention » made visible |
| New review / reply to a review | the pro / the client | closes the trust loop |
| Support message / team reply | operators / the user | support feels like a chat, not an email void |

**Deliberately not notified:** each chat message (the Messages badge already does it — two alerts for one thing is noise),
marketing, « you haven't logged in for a while ». Every notification must be about *your* request, *your* service or
*your* account. If we ever add one that isn't, users will learn to ignore the bell.

### The help button (support)
A round ink button with a lime « ? » at the bottom corner of every page (on phones it hides on pages that already have a
bar at the bottom — the conversation, the offer wizard, the service page, checkout — and stays reachable from the menu).
It opens **Aide & support**:

1. **Aide rapide** — six honest answers (request a service, publish, the pro doesn't answer, is it free, account,
   report abuse), each with a button to the right page. Most questions end here.
2. **Écrire à l'équipe** — one conversation per user with « L'équipe SkillLoop ». The page they were on is attached (path
   only, never the query string). Signed-out visitors are asked to log in, and still see the e-mail.
3. **Direct contact** — contact@skillloop.tn always, WhatsApp when `VITE_SUPPORT_WHATSAPP` is set.

Operators answer from **/admin → Support**: open / resolved / all, unread counts, who the person is (name, city, number of
services and requests — never the email), reply as « L'équipe SkillLoop », mark resolved. A user writing again reopens it.

## How it is built (and why it is safe)

- **The database writes notifications, never the browser.** Triggers on real events, so a notification can't be faked
  and can't be forgotten by a buggy screen. A row stores only ids and a kind; the sentence is written in the reader's
  language at display time, with the *current* name (a deleted account shows « Compte supprimé »).
- **Limits:** 100 newest / 90 days per user (notifications); 8 messages per 10 min and 40 per day per user (support).
  One unread support alert per conversation, so a burst of 5 messages is one bell entry.
- **Privacy:** users only ever read their own rows (RLS). Operators see support text because that's the job, but not
  emails. Deleting an account deletes its notifications and support conversation.
- **Flags:** everything is off until the migrations are applied: `VITE_NOTIFICATIONS`, `VITE_SUPPORT`. With the flags
  off, the help button still works (quick answers + e-mail).

## Switching it on (your steps, in order)

1. **Admin** (if not done): `supabase/migrations/20261102120000_admin.sql` → dry run, apply, verify, add yourself to
   `private.admins`, `VITE_ADMIN=on`.
2. **Notifications:** dry run
   `node scripts/db-test.mjs --pending supabase/migrations/20261106120000_notifications.sql` → apply in the SQL editor →
   run `supabase/checks/20261106120000_notifications_verify.sql` (expect 5/5) → `VITE_NOTIFICATIONS=on` → redeploy.
3. **Support:** dry run with `--pending` for the support migration (plus admin/notifications if not applied yet) → apply →
   `supabase/checks/20261106130000_support_verify.sql` (expect 5/5) → `VITE_SUPPORT=on` (+ optional
   `VITE_SUPPORT_WHATSAPP`) → redeploy.
4. Test it yourself with two accounts: send a request, accept it, set a time, mark done, leave a review, write to
   support, answer from /admin. Every step should ring the bell on the other side.

Rollbacks are in `supabase/checks/*_rollback.sql` (support first, then notifications; flags off before).

## Running support: the founder's rules

- **Reply fast, even if it's to say « je regarde ».** Target: first answer within 2 working hours, 9h–19h. Don't promise
  that on screen until we hold it for a month — the panel deliberately says « dès que possible ».
- **Same language as the user.** Derja if they write derja, French if French. Short sentences, no jargon.
- **Name the next step.** Every reply ends with what happens next (« je contacte le pro et je reviens vers vous ce
  soir »).
- **Close only when solved**, then « Marquer résolue ». If they write again, it reopens by itself.
- **Every ticket is product feedback.** Once a week, read the resolved conversations: if the same question comes 3 times,
  it becomes a Quick answer or a product fix.
- **Abuse reports first.** A safety report (scam, fake profile, harassment) jumps the queue. Hide the service / review
  in the SQL editor if needed, and answer the reporter.

### Ready-to-use replies (adapt, never paste blindly)
- *Pro ne répond pas:* « Merci de nous avoir prévenus. On relance le pro aujourd'hui. Si pas de réponse d'ici 48 h, vous
  pouvez annuler et écrire à un autre pro — on peut vous en proposer. »
- *Publication refusée:* « Le message vient d'un champ obligatoire : titre (5 caractères min.), description
  (20 min.), ville et prix. Quel message s'affiche exactement ? »
- *Derja:* « Ahla bik ! Fhemna l mochkla, taw nchoufouha w nraj3oulek lyoum. »

## What to measure (in /admin, next iteration)

- Median time to first support reply, conversations opened / resolved per week, top 5 reasons.
- Request reply rate and median pro reply time **before vs after** notifications — this is the number that proves the
  feature.
- Share of notifications opened (read_at) per kind: a kind nobody opens should be removed.

## Next (not built yet, in order of impact)

1. **E-mail for important events** (new request for a pro, accepted for a client) when the user hasn't opened the app
   for 1 h — most pros don't keep SkillLoop open. Needs an e-mail provider (Resend / Brevo) + a Worker job.
2. **Web push** (PWA) — same events, on the phone lock screen. Needs a service worker + VAPID keys.
3. **Notification settings** per kind (e-mail on/off), once e-mail exists.
4. **WhatsApp Business** for pros, later and only with consent.
