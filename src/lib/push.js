// push.js — Web Push enrollment for the installed PWA.
//
// Flow: request permission → subscribe via the service worker's PushManager
// (with our VAPID public key) → register the subscription + the user's reminder
// prefs + timezone with the portfolio push API. A Vercel Cron on the portfolio
// then sends the morning / evening / streak-nudge pushes at the right local time.
//
// Baked-in config (single-user app), same convention as cloudSync.js.

const TOKEN = import.meta.env.VITE_SYNC_TOKEN || 'ethan_temp_key_lakjsalsjflkjljtlknaslgouhuicnljJLNAlklsjdginALKFNlkjsfg';
const PUSH_BASE = (import.meta.env.VITE_SYNC_URL || 'https://ethanthornberg.dev/api/store').replace(/\/store\/?$/, '/push');
const VAPID_PUBLIC = 'BOs-Va0zqyeXinK1yzsOLvT--v0WEieEIEaZM4ujAngDcGPfz4FhIuzdhuge_dpWBslpgyq0sT47w-GjGN1f1Jw';

export function pushSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
}

export function notificationPermission() {
  return (typeof Notification !== 'undefined') ? Notification.permission : 'default';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function tz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

async function postSubscription(subscription, prefs) {
  const res = await fetch(`${PUSH_BASE}/subscribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, prefs, tz: tz() }),
  });
  if (!res.ok) throw new Error(`push-subscribe-${res.status}`);
  return res.json().catch(() => ({}));
}

// Request permission + subscribe. Returns:
//   'enabled'     — fully on (subscribed + registered with the server)
//   'pending'     — permission + subscription OK, but the server wasn't reachable
//                   (e.g. not deployed yet); refreshPush() retries on next launch
//   'denied'      — permission denied
//   'unsupported' — no push support (not an installed PWA / unsupported browser)
//   'error'       — couldn't create a push subscription
export async function enablePush(prefs) {
  if (!pushSupported()) return 'unsupported';
  let perm;
  try { perm = await Notification.requestPermission(); } catch { return 'error'; }
  if (perm !== 'granted') return 'denied';
  let sub;
  try {
    const reg = await navigator.serviceWorker.ready;
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
  } catch { return 'error'; }
  // Server registration is best-effort: the subscription already exists in the
  // browser, so if the endpoint is down we still count it enabled and retry later.
  try { await postSubscription(sub.toJSON(), prefs); }
  catch { return 'pending'; }
  return 'enabled';
}

// Push updated reminder prefs for the existing subscription (no permission prompt).
export async function syncPushPrefs(prefs) {
  if (!pushSupported() || notificationPermission() !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  await postSubscription(sub.toJSON(), prefs);
  return true;
}

// Re-register the current subscription + prefs + timezone. Call on app launch so
// the server self-heals against rotated subscriptions and timezone changes
// (travel). Silent — never prompts.
export async function refreshPush(prefs) {
  if (!pushSupported() || notificationPermission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    await postSubscription(sub.toJSON(), prefs);
    return true;
  } catch { return false; }
}

// Fire a one-off test push (confirms the whole pipeline).
export async function sendTest() {
  const res = await fetch(`${PUSH_BASE}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`push-test-${res.status}`);
  return res.json();
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch(`${PUSH_BASE}/subscribe`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch { /* ignore */ }
  await sub.unsubscribe().catch(() => {});
}

// Build the prefs payload from settings.
export function prefsFromSettings(s) {
  return {
    morning: s.notifMorning !== false,
    morningHour: s.notifMorningHour ?? 7,
    morningMinute: s.notifMorningMinute ?? 0,
    evening: s.notifEvening !== false,
    eveningHour: s.notifEveningHour ?? 21,
    eveningMinute: s.notifEveningMinute ?? 0,
    nudge: s.notifNudges === true,
    nudgeHour: s.notifNudgeHour ?? 20,
    nudgeMinute: s.notifNudgeMinute ?? 0,
  };
}
