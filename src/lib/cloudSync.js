// cloudSync.js — automatic, optional cloud backup/sync for app state.
//
// Talks to a generic personal "data store" API you host on your portfolio
// (see backend/store.js). The API is namespaced by `app`, so this same backend
// serves Intent today and any future app/feature tomorrow — each just picks its
// own APP id below.
//
// Contract (see backend/README.md):
//   GET  {VITE_SYNC_URL}?app=intent&key=state   ->  { data, updatedAt } | 404
//   PUT  {VITE_SYNC_URL}?app=intent&key=state   body { data, updatedAt }
//   Authorization: Bearer {VITE_SYNC_TOKEN}
//
// If VITE_SYNC_URL / VITE_SYNC_TOKEN aren't set, sync is OFF and the app behaves
// exactly as a local-only app — nothing here runs.

import React from 'react';

// Sync config is baked in by design: this is a single-user personal app, so the
// endpoint + token live here as defaults and it works out of the box (incl. local
// dev) with zero build setup. Env vars still override if ever needed.
// The token is intentionally non-sensitive — anyone with it can only read/write
// this one personal namespace. To change it: update both values below AND the
// matching SYNC_TOKEN env var on the portfolio (Vercel), then push.
const BASE = import.meta.env.VITE_SYNC_URL || 'https://ethanthornberg.dev/api/store';
const TOKEN = import.meta.env.VITE_SYNC_TOKEN || 'ethan_temp_key_lakjsalsjflkjljtlknaslgouhuicnljJLNAlklsjdginALKFNlkjsfg';
const APP = 'intent';
const KEY = 'state';
const META_KEY = 'intent.sync.updatedAt'; // local marker of last-synced version

// Never sync from the local dev server — it shares the same production store, so
// dev/preview activity must not read or overwrite real data. Only the built app
// (GitHub Pages / the native shell) syncs.
const isDev = import.meta.env.DEV;

export const syncEnabled = Boolean(BASE && TOKEN) && !isDev;

// Stable stringify (sorted keys) so equal state always serializes identically —
// used both for the wire format dedup and change detection.
export function stableStringify(value) {
  const seen = new WeakSet();
  const norm = (v) => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) return v.map(norm);
      return Object.keys(v).sort().reduce((o, k) => { o[k] = norm(v[k]); return o; }, {});
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

function endpoint() {
  const u = new URL(BASE);
  u.searchParams.set('app', APP);
  u.searchParams.set('key', KEY);
  return u.toString();
}

export async function pullState({ signal } = {}) {
  if (!syncEnabled) return null;
  const res = await fetch(endpoint(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal,
  });
  if (res.status === 404) return null;       // nothing stored yet
  if (res.status === 401) throw new Error('sync-unauthorized');
  if (!res.ok) throw new Error(`sync-pull-${res.status}`);
  const json = await res.json();
  return json && json.data ? json : null;    // { data, updatedAt }
}

export async function pushState(data, { signal } = {}) {
  if (!syncEnabled) return null;
  const updatedAt = new Date().toISOString();
  const res = await fetch(endpoint(), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, updatedAt }),
    signal,
  });
  if (res.status === 401) throw new Error('sync-unauthorized');
  if (!res.ok) throw new Error(`sync-push-${res.status}`);
  const json = await res.json().catch(() => ({}));
  return { updatedAt: json.updatedAt || updatedAt };
}

/**
 * Wire the live app state to the cloud store.
 * @param snapshot  the full app-state object (rebuilt each render)
 * @param hydrate   fn(remoteData) => applies remote data to local state
 * Returns { status, lastSyncedAt, syncNow, enabled }.
 *
 * Strategy: last-write-wins by timestamp. On load, pull; if the remote copy is
 * newer than what we last synced locally, hydrate from it. Thereafter, push
 * (debounced) whenever the state changes. Offline-safe: failures set a status
 * and the next change retries.
 */
export function useCloudSync(snapshot, hydrate) {
  const [status, setStatus] = React.useState(syncEnabled ? 'connecting' : 'disabled');
  const [lastSyncedAt, setLastSyncedAt] = React.useState(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(META_KEY) : null),
  );
  const applyingRef = React.useRef(false);   // suppress the echo-push after hydrate
  const lastSyncedStr = React.useRef('');     // serialized form of last-synced state
  const hydrateRef = React.useRef(hydrate);
  hydrateRef.current = hydrate;

  const snapStr = stableStringify(snapshot);

  // ── Initial pull ────────────────────────────────────────────────────────────
  // No once-only ref guard here: under React StrictMode the effect mounts twice
  // in dev, and a ref guard would let the first (cancelled) run do the work while
  // the second bails — stranding the status. Instead we let it re-run and gate
  // every state write on `cancelled`, so only the live run takes effect.
  React.useEffect(() => {
    if (!syncEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await pullState();
        if (cancelled) return;
        const localTs = localStorage.getItem(META_KEY);
        if (remote && (!localTs || remote.updatedAt > localTs)) {
          // Remote wins — bring it down to this device.
          applyingRef.current = true;
          hydrateRef.current(remote.data);
          lastSyncedStr.current = stableStringify(remote.data);
          localStorage.setItem(META_KEY, remote.updatedAt);
          setLastSyncedAt(remote.updatedAt);
          // Let the resulting re-render settle, then re-enable pushes.
          setTimeout(() => { applyingRef.current = false; }, 0);
        }
        setStatus('idle');
      } catch (e) {
        if (!cancelled) setStatus(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Debounced push on change ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!syncEnabled) return;
    if (applyingRef.current) return;             // don't echo a hydration back up
    if (snapStr === lastSyncedStr.current) return; // nothing actually changed
    const id = setTimeout(async () => {
      setStatus('syncing');
      try {
        const { updatedAt } = await pushState(snapshot);
        lastSyncedStr.current = snapStr;
        localStorage.setItem(META_KEY, updatedAt);
        setLastSyncedAt(updatedAt);
        setStatus('synced');
      } catch (e) {
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [snapStr]);

  // ── Manual "sync now" ─────────────────────────────────────────────────────────
  const syncNow = React.useCallback(async () => {
    if (!syncEnabled) return;
    setStatus('syncing');
    try {
      const { updatedAt } = await pushState(snapshot);
      lastSyncedStr.current = stableStringify(snapshot);
      localStorage.setItem(META_KEY, updatedAt);
      setLastSyncedAt(updatedAt);
      setStatus('synced');
    } catch (e) {
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [snapStr]);

  return { status, lastSyncedAt, syncNow, enabled: syncEnabled };
}
