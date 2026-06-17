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

### Test it immediately
After enabling, tap **Settings → Notifications → Send test notification** — it pushes
a test to your phone and reports the result inline. (Or curl the sender:
`curl -H "Authorization: Bearer <CRON_SECRET>" "https://ethanthornberg.dev/api/push/send"`.)

## ⚠️ Cron frequency note
Reminder times are **minute-precise** (e.g. 7:30am), and the sender uses a 90-minute
**catch-up window**: it delivers a reminder at the first cron tick after its target
time (and only once per day). So:
- **Vercel cron runs hourly** (`0 * * * *`) → a 7:30 reminder lands by ~8:00.
- Want it closer to exact? Point a free external scheduler (e.g. **cron-job.org**,
  every 15 min) at the sender and you'll get ≤15-min precision:
  ```
  https://ethanthornberg.dev/api/push/send   (header: Authorization: Bearer <CRON_SECRET>)
  ```
- On the Vercel **Hobby** plan, the built-in cron may be throttled to ~once/day — in
  that case use the external scheduler above (then the Vercel cron doesn't matter).

The app also re-registers your subscription + timezone on every launch, so it
self-heals after iOS rotates the subscription or you travel to a new timezone.

## Notes
- iOS haptics aren't possible from a web app — only the native Capacitor wrapper can
  buzz the phone. The in-app haptics already work on Android.
- To rotate VAPID keys: `npx web-push generate-vapid-keys`, update `VAPID_PUBLIC` in
  `src/lib/push.js` + Vercel `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` on Vercel.
