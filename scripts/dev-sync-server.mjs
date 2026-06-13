// Local mock of the personal data store (backend/store.js) for development.
// Same HTTP contract, in-memory storage, no Redis. Run:  node scripts/dev-sync-server.mjs
// Then point the app at it:
//   VITE_SYNC_URL=http://localhost:8787/api/store
//   VITE_SYNC_TOKEN=dev-secret
import http from 'node:http';

const PORT = 8787;
const TOKEN = process.env.DEV_SYNC_TOKEN || 'dev-secret';
const store = new Map(); // `${app}:${key}` -> record

const send = (res, code, obj) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
};

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/api/store') return send(res, 404, { error: 'not found' });
  if ((req.headers.authorization || '') !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'unauthorized' });

  const app = (url.searchParams.get('app') || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const key = (url.searchParams.get('key') || 'state').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!app) return send(res, 400, { error: 'missing app' });
  const id = `${app}:${key}`;

  if (req.method === 'GET') {
    const rec = store.get(id);
    return rec ? send(res, 200, rec) : send(res, 404, { error: 'not found' });
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body || '{}'); } catch { /* ignore */ }
      const updatedAt = parsed.updatedAt || new Date().toISOString();
      const rec = { app, key, data: parsed.data ?? null, updatedAt };
      store.set(id, rec);
      console.log(`[store] PUT ${id} (${(body.length / 1024).toFixed(1)} KiB) @ ${updatedAt}`);
      send(res, 200, { ok: true, updatedAt });
    });
    return;
  }
  return send(res, 405, { error: 'method not allowed' });
}).listen(PORT, () => console.log(`dev sync store on http://localhost:${PORT}/api/store (token: ${TOKEN})`));
