# Proposal: enforce Turnstile (CAPTCHA) in Supabase Auth — NOT ENABLED, for review

Status: **ENABLED 2026-10-24** (by you); C.0 confirmed by me (tokenless login/recovery/signup → 400 `captcha_failed`); C.1–C.8 reported done; section 2 fix implemented. Original proposal below.

Previous status: **not enabled**. Today the widget runs and the app sends its token as `captchaToken`, but Supabase ignores it
(CAPTCHA protection is off), so a script can still call sign-up / login / password recovery directly.
Prerequisite done: 8.10 OK (widget on login, signup and forgot-password, no domain errors, Arabic/dark, clean console).

## 1. What enforcement changes

Once on, Supabase Auth itself asks Cloudflare whether the token is valid and **refuses the request otherwise**.

| Supabase Auth call | Used by the app | Needs a token once enforced |
|---|---|---|
| Sign up (email + password) | `/signup` | **Yes**, sent ✅ |
| Password login | `/login` | **Yes**, sent ✅ |
| Password recovery email | `/forgot-password` | **Yes**, sent ✅ |
| Magic link / OTP, anonymous sign-in, resend email | not used | (Yes, but the app doesn't call them) |
| Google sign-in (OAuth) | `/login`, `/signup` | No |
| Clicking an email link (confirm, reset) | email → app | No |
| Set the new password (`updateUser`) | `/reset-password` | No |
| Session refresh / staying signed in | everywhere | No |

The app already does what enforcement requires: each page gets a token before sending, and the widget is **reset after
every attempt** (tokens are single-use). An expired token is cleared, and the widget gets a new one by itself.

## 2. A gap to fix before enabling (code only, needs your OK)

When Supabase refuses a token:
- **Login** would show "wrong email or password" (`err_login`), which is misleading;
- **Signup** would show Supabase's raw English error text;
- `/forgot-password` already maps it correctly to `captcha_failed`.

**Fix:** map `captcha_failed` on login and signup to the existing message "La vérification anti-robot a échoué.
Recommencez-la puis renvoyez." (it already exists in 3 languages), and add tests. There's no new package and no
setting changes.

## 3. Exact setup (you do it; I never see the secret)

1. **Cloudflare dashboard** → Turnstile → your SkillLoop widget:
   - check that **Hostnames** lists `localhost` (and later your production domain, *before* deploying there);
   - copy the **Secret key**. Don't paste it in chat, the terminal, `.env` or the repo.
2. **Supabase dashboard** → project `skillloop` → **Authentication → Attack Protection** (called "Bot and Abuse
   Protection" in older dashboards):
   - turn on **Enable CAPTCHA protection**;
   - provider: **Turnstile by Cloudflare**;
   - **Secret key**: paste it;
   - **Save**.
3. That's it. No deploy and no code change is needed (the site key is already in `.env`). It takes effect immediately for
   all sign-up, login and recovery requests.

Never remove `VITE_TURNSTILE_SITE_KEY` while enforcement is on: the app would stop sending tokens and every password
login would fail.

## 4. Fallback if users get blocked

| Situation | What users see | What to do |
|---|---|---|
| Anything going wrong after enabling (bad secret, widespread refusals) | Logins/signups refused | **Kill switch:** Supabase → Attack Protection → turn CAPTCHA **off** → Save. It's immediate, no deploy. The widget keeps running and its tokens are simply ignored again. |
| A single user's browser fails the check (privacy extension, very old browser, VPN) | Interactive challenge, or "verification failed" | Retry the widget; use **Google sign-in** (never needs CAPTCHA); a support contact on the page (needs your support email decision). |
| The widget can't load (Cloudflare outage, network blocks `challenges.cloudflare.com`) | Widget error; password login/signup/recovery impossible | Google sign-in still works; if it lasts, use the kill switch. |
| Production domain missing from the Turnstile hostnames | Widget error on every page (everyone blocked) | Add the domain in Cloudflare (takes effect within minutes) or use the kill switch. Avoided by the deploy checklist order. |
| Secret key leaked or rotated | — | Rotate it in Cloudflare, paste the new one in Supabase. |

**Watching it:** Supabase → Logs → Auth (search "captcha") for refusals; Cloudflare → Turnstile → Analytics for
solve/fail rates.

## 5. Tests to repeat after enabling (on localhost first, then again on production)

| # | Test | Expected |
|---|---|---|
| C.0 | I send a login and a recovery request **without** a token directly to the Auth API, using a made-up email (no real account touched, no email sent). I run it once before and once after enabling. | Before: "invalid credentials" / accepted. After: **refused for CAPTCHA**. This proves enforcement is really on. |
| C.1 | Login with the widget ✓ | Signed in |
| C.2 | Wrong password, then the correct password **without reloading** | First: "wrong email or password"; second: signed in (the reset gives a fresh token) |
| C.3 | Sign up a new address (e.g. `you+c3@gmail.com`) | "Check your email"; confirmation email arrives; confirming signs you in |
| C.4 | `/forgot-password` → email → link → new password → login | Works end to end (repeats 8.3) |
| C.5 | Leave `/login` open **6+ minutes**, then sign in | Works (an expired token is replaced automatically) |
| C.6 | DevTools → Network → block `challenges.cloudflare.com`, reload `/login` | Clear message, the form doesn't send; **Google sign-in still works** |
| C.7 | Google sign-in; reload a signed-in page; open a reset link | All unaffected |
| C.8 | Arabic + dark mode on `/login`, and on a phone width | Widget and messages correct |

If any of C.1–C.5 fail: use the kill switch first, then send me what you saw. I investigate before changing anything.

## 6. Decisions for you

1. Approve the small error-message fix (section 2) before enabling. Recommended.
2. Then approve enabling CAPTCHA protection in Supabase. You do it in the dashboard, then we run C.0–C.8.
3. A support contact for users who can't pass the check (an email address shown on the login page or in the privacy page).
