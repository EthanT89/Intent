// store.js — a tiny generic "personal data store" API for your portfolio.
//
// One endpoint backs ALL your apps. Each app namespaces its data with `app`,
// and can keep multiple documents under different `key`s:
//
//   GET  /api/store?app=intent&key=state    -> { app, key, data, updatedAt } | 404
//   PUT  /api/store?app=intent&key=state    body { data, updatedAt }  -> { ok, updatedAt }
//
// Auth: every request must send  Authorization: Bearer <SYNC_TOKEN>.
// Storage: Upstash Redis (free tier, REST — works from any serverless host).
//
// ── Deploy (Vercel) ───────────────────────────────────────────────────────────
//   1. Copy this file to your portfolio repo as  api/store.js
//   2. Create a free Upstash Redis DB (https://upstash.com) → copy its
//      REST URL + REST TOKEN.
//   3. In the Vercel project settings → Environment Variables, add:
//        UPSTASH_REDIS_REST_URL   = https://....upstash.io
//        UPSTASH_REDIS_REST_TOKEN = ********
//        SYNC_TOKEN               = <a long random secret you make up>
//   4. Redeploy. Your endpoint is  https://<your-portfolio>/api/store
//
// Then point the Intent app at it (its .env / build env):
//        VITE_SYNC_URL   = https://<your-portfolio>/api/store
//        VITE_SYNC_TOKEN = <the same SYNC_TOKEN>
//
// Netlify: place at netlify/functions/store.js and export `handler` instead —
// see backend/README.md for the 3-line shim.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SYNC_TOKEN = process.env.SYNC_TOKEN;

// Minimal Upstash REST helpers ------------------------------------------------
async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const json = await res.json();
  return json.result;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // gated by the bearer token
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function sanitize(s) {
  // keep namespace ids tame: letters, numbers, dash, underscore, dot
  return typeof s === 'string' ? s.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64) : '';
}

// Default export = Vercel serverless function (Node).
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Config check
  if (!REDIS_URL || !REDIS_TOKEN || !SYNC_TOKEN) {
    return res.status(500).json({ error: 'store not configured' });
  }

  // Auth
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${SYNC_TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const app = sanitize(req.query.app);
  const key = sanitize(req.query.key) || 'state';
  if (!app) return res.status(400).json({ error: 'missing app' });
  const redisKey = `store:${app}:${key}`;

  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', redisKey]);
      if (!raw) return res.status(404).json({ error: 'not found' });
      return res.status(200).json(JSON.parse(raw));
    }

    if (req.method === 'PUT') {
      // Body may arrive parsed (Vercel) or as a string.
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const updatedAt = body.updatedAt || new Date().toISOString();
      const record = { app, key, data: body.data ?? null, updatedAt };
      await redis(['SET', redisKey, JSON.stringify(record)]);
      return res.status(200).json({ ok: true, updatedAt });
    }

    res.setHeader('Allow', 'GET, PUT, OPTIONS');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(502).json({ error: 'store error', detail: String(err.message || err) });
  }
}
