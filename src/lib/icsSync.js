// Read-only external calendar sync.
//
// Browsers can't fetch Google/Apple .ics feeds directly (no CORS), so we go
// through a tiny proxy on the portfolio backend: GET /api/ics?url=<feed> returns
// the raw VCALENDAR text with permissive CORS. Same baked-in host convention as
// cloudSync.js. The feed URL is a *secret* read-only address:
//   • Google:  Settings → <calendar> → "Secret address in iCal format"
//   • Apple:   Share Calendar → Public Calendar → copy link (webcal→https)

import { parseICS } from '../pillars/calendar/ics.js';

const PROXY = (import.meta.env.VITE_SYNC_URL || 'https://ethanthornberg.dev/api/store').replace(/\/store\/?$/, '/ics');
const STALE_MS = 15 * 60 * 1000; // refetch if older than 15 min

export function icsProxyUrl(feedUrl) {
  return `${PROXY}?url=${encodeURIComponent(feedUrl)}`;
}

// Fetch + parse one subscription. Returns { events, fetchedAt, error }.
export async function fetchSubscription(sub) {
  try {
    const res = await fetch(icsProxyUrl(sub.url), { headers: { Accept: 'text/calendar, text/plain' } });
    if (!res.ok) throw new Error(`ics-${res.status}`);
    const text = await res.text();
    const events = parseICS(text, sub.id);
    return { events, fetchedAt: new Date().toISOString(), error: null };
  } catch (e) {
    return { events: null, fetchedAt: new Date().toISOString(), error: String(e.message || e) };
  }
}

// Refresh all enabled subscriptions whose cache is missing/stale. Writes results
// via setSubCache. `force` ignores the staleness window. Best-effort & silent.
export async function refreshSubscriptions(subs, cache, setSubCache, { force = false } = {}) {
  const now = Date.now();
  const due = (subs || []).filter(s => s.enabled !== false && s.url).filter(s => {
    if (force) return true;
    const c = cache[s.id];
    if (!c || !c.fetchedAt) return true;
    return now - new Date(c.fetchedAt).getTime() > STALE_MS;
  });
  for (const s of due) {
    const result = await fetchSubscription(s);
    // Keep the last good events if a refresh errors, so the calendar doesn't blank.
    if (result.error && cache[s.id]?.events) setSubCache(s.id, { ...cache[s.id], fetchedAt: result.fetchedAt, error: result.error });
    else setSubCache(s.id, result);
  }
  return due.length;
}
