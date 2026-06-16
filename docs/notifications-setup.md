# Turning on notifications (Web Push)

Everything is built. To activate, you set a few env vars on the portfolio, deploy,
and grant permission on your phone. ~10 minutes, one time.

## How it works
```
 Intent PWA  ──subscribe──>  /api/push/subscribe (portfolio)  ──>  Upstash (stores sub + prefs + tz)
 Vercel Cron (hourly) ──>  /api/push/send  ──>  Web Push  ──>  your iPhone
```
The cron checks each hour; for your subscription it computes your local hour and
sends any due reminder (morning / evening / streak-nudge), deduped per day. The
streak-nudge only fires if nothing was honored that day (it reads your synced state).

## ✅ Already done
- **Intent client**: service-worker push handler (`public/push-sw.js`), subscribe
  flow (`src/lib/push.js`), and a real **Settings → Notifications** section with an
  enable toggle, per-reminder switches, and hour pickers. VAPID **public** key is
  baked in.
- **Portfolio**: `src/app/api/push/subscribe/route.ts`, `src/app/api/push/send/route.ts`,
  `web-push` dependency, and an hourly cron in `vercel.json`.

## 🔧 What you do

### 1. Set environment variables on the portfolio (Vercel → Settings → Environment Variables)
| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | (Claude gave you this — same key baked into the app) |
| `VAPID_PRIVATE_KEY` | (Claude gave you this — **keep private**) |
| `VAPID_SUBJECT` | `mailto:ethan.l.thornberg@gmail.com` |
| `CRON_SECRET` | a long random string you invent (Vercel sends it to the cron automatically) |

(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SYNC_TOKEN` are already set
from the sync setup.)

### 2. Deploy the portfolio
Commit & push the portfolio (the push routes + `vercel.json` cron are already in the
working tree — Claude committed them), or `vercel --prod`. The cron registers on deploy.

### 3. Enable on your iPhone
- Make sure Intent is installed to your home screen (Add to Home Screen) and opened
  from there.
- Open it → **Settings → Notifications → Reminders** → toggle on → **Allow** when iOS
  asks. Set your morning/evening hours and the streak nudge.

### Test it immediately (optional)
Trigger the sender manually from your computer:
```
curl -H "Authorization: Bearer <CRON_SECRET>" "https://ethanthornberg.dev/api/push/send"
```
It returns `{ ok, sent, subs }`. To force a send, temporarily set a reminder's hour
to the current hour in Settings, then run the curl.

## ⚠️ Cron frequency note
The cron runs **hourly** (`0 * * * *`), so reminders are **hour-granular** (set "7am",
not "7:30"). On the Vercel **Hobby** plan, cron jobs may be throttled to ~once per day —
if reminders only fire once daily, either upgrade to Pro, or point a free external
scheduler (e.g. cron-job.org, every 15 min) at:
```
https://ethanthornberg.dev/api/push/send   (header: Authorization: Bearer <CRON_SECRET>)
```
and you can ignore the Vercel cron.

## Notes
- iOS haptics aren't possible from a web app — only the native Capacitor wrapper can
  buzz the phone. The in-app haptics already work on Android.
- To rotate VAPID keys: `npx web-push generate-vapid-keys`, update `VAPID_PUBLIC` in
  `src/lib/push.js` + Vercel `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` on Vercel.
