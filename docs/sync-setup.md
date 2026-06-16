# Turning on cloud sync & backup — full setup guide

Right now Intent stores everything **only on each device**. iOS can evict that
storage, so the point of sync is twofold: a durable **backup**, and the same data
across every device you open Intent on. This guide covers exactly what's already
done, what only you can do (it's behind your logins), and how we verify it.

It's a ~15-minute, one-time setup. After that it's automatic forever.

---

## How it works (the 30-second mental model)

```
  Intent (phone / web)  ──HTTPS──>  /api/store on your portfolio  ──>  Upstash Redis
        client                         serverless function              key/value DB
```

- Your portfolio (on Vercel) gains one tiny endpoint, `/api/store`, that reads and
  writes a JSON blob.
- A free Upstash Redis database actually holds the data.
- A shared secret token gates access. Intent sends it on every request.
- It's namespaced (`app=intent`), so the **same endpoint can back up future apps**
  too — just a different `app` value.

Last-write-wins by timestamp: open Intent on a new device, it pulls the latest;
change anything, it pushes (debounced). Offline-safe — it retries on next change.

---

## ✅ What I've already done (no action needed)

- **The backend function** is written and placed in your portfolio repo at
  `C:\Users\ethan\Personal\Coding\websites\portfolio\api\store.js` (a generic,
  reusable, token-gated key/value store backed by Upstash).
- **`vercel.json`** in the portfolio is patched so `/api/*` reaches the function
  (the SPA catch-all no longer swallows it).
- **The Intent client** (`src/lib/cloudSync.js`) is fully wired: pull-on-launch,
  debounced push, last-write-wins, status surfaced in **Settings → Backup & sync**.
- **Intent's deploy** (`.github/workflows/deploy.yml`) already injects the sync
  env vars into the build when you set them (step 4 below). Unset = local-only, so
  nothing breaks until you flip it on.
- I verified the whole round-trip against a local mock of the server (push,
  cross-device pull, restore-after-wipe) — the client behaves correctly.

So the code path is done. What remains is creating *your* accounts/secrets, which
I can't do for you.

---

## 🔧 What you need to do

### Step 1 — Create a free Upstash Redis database
1. Go to **https://upstash.com** → sign up (free tier is plenty).
2. **Create Database** → Redis → pick a region near you → Free plan → Create.
3. On the database page, find the **REST API** section and copy two values:
   - `UPSTASH_REDIS_REST_URL`  (looks like `https://xxxx.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` (a long string)

### Step 2 — Make sure the portfolio function is deployed on Vercel
The function file is already in your portfolio repo locally. It needs to reach
your live Vercel site:
- If your portfolio auto-deploys from a GitHub repo: commit & push the new
  `api/store.js` and the `vercel.json` change to that repo. *(Tell me if you want
  me to commit them locally for you — I can do that; I just won't push to a remote
  without you.)*
- If you deploy via the Vercel CLI: run `vercel --prod` from the portfolio folder.

### Step 3 — Add three environment variables in Vercel
Vercel dashboard → your portfolio project → **Settings → Environment Variables**.
Add these (Production scope):

| Name | Value |
|------|-------|
| `UPSTASH_REDIS_REST_URL`   | from Upstash (Step 1) |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash (Step 1) |
| `SYNC_TOKEN`               | **invent a long random secret** (e.g. 40 random characters) |

Then **redeploy** the portfolio (Deployments → ⋯ → Redeploy) so the vars take effect.

**Quick check:** visit `https://<your-portfolio-domain>/api/store` in a browser.
You should see `{"error":"unauthorized"}`. That means the function is live and the
auth gate works. (A 404 means it's not deployed / not at that path — see
troubleshooting.)

### Step 4 — Tell Intent where to sync
In the **Intent** GitHub repo → **Settings → Secrets and variables → Actions**:
- **Variables** tab → New repository variable:
  `VITE_SYNC_URL` = `https://<your-portfolio-domain>/api/store`
- **Secrets** tab → New repository secret:
  `VITE_SYNC_TOKEN` = the **same** `SYNC_TOKEN` you invented in Step 3

### Step 5 — Redeploy Intent
GitHub → Intent repo → **Actions** → "Deploy to GitHub Pages" → **Run workflow**
(or just push any commit). ~1 minute later, reopen Intent on your phone (fully
close it first so the service worker updates) and check **Settings → Backup &
sync** — it should read **"Backed up."**

---

## 🔁 After you've done the above — what I'll do
- Verify the live round-trip end to end (write on one device, confirm it lands in
  Upstash and restores on another / after a reinstall).
- Help debug anything that's off (CORS, 401s, the status pill stuck on "error").
- If you want, wire a **"Sync now"** confirmation and a periodic background pull so
  multiple devices converge faster.

---

## A note on the security trade-off
Because Intent is a client-only app on a public URL, the sync token ends up
readable in the site's JavaScript. For a personal life-tracker that's the normal
trade-off (worst case: someone with the token could read/write *your* namespace).
If you ever want bank-grade isolation, the upgrade path is real per-user auth
(e.g. sign in with Apple) — the client/contract stay the same. Rotate anytime by
changing `SYNC_TOKEN` on Vercel and `VITE_SYNC_TOKEN` in the Intent repo.

---

## Troubleshooting
- **`/api/store` returns 404** → the function isn't deployed at that path. Confirm
  `api/store.js` is in the deployed portfolio and `vercel.json` has the
  `/((?!api/).*)` rewrite. Redeploy.
- **Status pill says "Sync error"** → open the endpoint in a browser; if it's not
  `{"error":"unauthorized"}`, the function/env is misconfigured. If it is, then
  `VITE_SYNC_URL`/`VITE_SYNC_TOKEN` in the Intent build don't match — recheck Step 4
  and that you re-ran the Intent deploy.
- **"unauthorized" even though it should work** → the `SYNC_TOKEN` (Vercel) and
  `VITE_SYNC_TOKEN` (GitHub) don't match exactly. Re-enter both.
- **Data didn't carry to a new device** → sync is last-write-wins; make sure the
  first device actually pushed (Settings shows "Backed up" with a recent time)
  before opening the second.
