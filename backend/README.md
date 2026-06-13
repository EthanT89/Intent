# Personal data store — reusable backup/sync API

A tiny serverless endpoint you host **once** on your portfolio and reuse for
every app you build. It's a namespaced key/value store with bearer auth, backed
by a free Upstash Redis database.

```
GET  /api/store?app=<app>&key=<key>     -> { app, key, data, updatedAt }  (404 if none)
PUT  /api/store?app=<app>&key=<key>     body { data, updatedAt }          -> { ok, updatedAt }
Authorization: Bearer <SYNC_TOKEN>
```

- `app` namespaces each application (`intent`, `workouts`, `notes`, …).
- `key` lets one app keep multiple documents (defaults to `state`).
- Everything is gated by a single shared secret (`SYNC_TOKEN`).

It's intentionally generic: a new app = a new `app` value. No backend changes.

---

## One-time setup (Vercel — recommended)

1. **Create a free Redis DB**: sign up at <https://upstash.com> → create a Redis
   database → from its dashboard copy **REST URL** and **REST TOKEN**.

2. **Add the function to your portfolio**: copy [`store.js`](./store.js) into your
   portfolio repo as **`api/store.js`** (Vercel auto-exposes `api/*` as functions).

3. **Set environment variables** in the Vercel project (Settings → Environment
   Variables):

   | Name | Value |
   |------|-------|
   | `UPSTASH_REDIS_REST_URL` | `https://…upstash.io` |
   | `UPSTASH_REDIS_REST_TOKEN` | (from Upstash) |
   | `SYNC_TOKEN` | a long random secret you invent |

4. **Redeploy.** Your endpoint is now `https://<your-portfolio>/api/store`.

5. **Point Intent at it.** Set these build env vars for Intent (in its host/CI, or
   `.env.local` for local dev):

   ```
   VITE_SYNC_URL   = https://<your-portfolio>/api/store
   VITE_SYNC_TOKEN = <the same SYNC_TOKEN>
   ```

   Rebuild/redeploy Intent. Open Settings → **Backup & sync** should read
   "Backed up."

---

## Netlify instead of Vercel

Place the file at `netlify/functions/store.js` and add this shim at the bottom so
Netlify's handler signature maps onto the same logic (or use
`@netlify/functions` + Express). The Vercel `req/res` style also works on Netlify
Functions v2 with `export default`. Easiest path: keep Vercel for the API even if
the site itself is on Netlify — the endpoint is independent of where the static
site lives.

---

## Security notes

- The bearer token lives in the client app, so treat this as a **personal**
  store, not multi-tenant auth. Anyone with the token can read/write that app's
  namespace. For a single-user life tracker that's the accepted trade-off.
- Rotate by changing `SYNC_TOKEN` on the server and `VITE_SYNC_TOKEN` in the app.
- Want stronger isolation later? Swap the bearer check for real auth (e.g. Apple
  sign-in) — the client/contract stay the same.

## Free tier headroom

Upstash free tier is ~10k commands/day. Intent syncs a debounced write per change
and one read per launch — orders of magnitude under the limit, with room for many
more apps sharing the same database.
