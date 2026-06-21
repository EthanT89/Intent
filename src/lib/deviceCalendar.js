// Device (native) calendar bridge — reads the phone's own calendars via EventKit
// (iOS) / CalendarProvider (Android) using @ebarooni/capacitor-calendar.
//
// Why this exists: work calendars (e.g. Ethan's Roblox Google Workspace cal) are
// locked by the org to "free/busy only" for any external/ICS share, so the web
// subscription path can't see event details. But the phone is logged in and the
// OS has full access, so the *native* app can read those events directly.
//
// Read-only. Only works in the installed native shell — in a plain browser
// (the PWA) Capacitor.isNativePlatform() is false and everything no-ops, so the
// web build is unaffected.

import { Capacitor } from '@capacitor/core';

let pluginPromise = null;
async function plugin() {
  if (!pluginPromise) {
    pluginPromise = import('@ebarooni/capacitor-calendar')
      .then((m) => m.CapacitorCalendar || null)
      .catch(() => null);
  }
  return pluginPromise;
}

export function deviceCalSupported() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// 'granted' | 'denied' | 'unsupported' | 'error'
export async function ensureReadAccess() {
  if (!deviceCalSupported()) return 'unsupported';
  const cal = await plugin();
  if (!cal) return 'unsupported';
  try {
    const cur = await cal.checkPermission({ scope: 'readCalendar' });
    if (cur?.result === 'granted') return 'granted';
    const req = await cal.requestReadOnlyCalendarAccess();
    return req?.result === 'granted' ? 'granted' : 'denied';
  } catch { return 'error'; }
}

export async function listDeviceCalendars() {
  if (!deviceCalSupported()) return [];
  const cal = await plugin();
  if (!cal) return [];
  try {
    const { result } = await cal.listCalendars();
    return (result || []).map((c) => ({ id: c.id, title: c.title, color: c.color || null }));
  } catch { return []; }
}

const pad2 = (n) => String(n).padStart(2, '0');
const localDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const localDateTime = (ms) => { const d = new Date(ms); return `${localDate(ms)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

// EventKit already expands recurring events within the range, so we store concrete
// occurrences (no recurrence rule) shaped like our calendar events.
function normalize(e) {
  const allDay = !!e.isAllDay;
  return {
    id: `dev-${e.id}`,
    title: e.title || '(busy)',
    allDay,
    start: allDay ? localDate(e.startDate) : localDateTime(e.startDate),
    end: allDay ? localDate(e.startDate) : localDateTime(e.endDate),
    notes: e.description || '',
    location: e.location || '',
    calendarId: e.calendarId || null,
  };
}

export async function fetchDeviceEvents(fromDate, toDate, calendarIds) {
  if (!deviceCalSupported()) return [];
  const cal = await plugin();
  if (!cal) return [];
  try {
    const { result } = await cal.listEventsInRange({ from: fromDate.getTime(), to: toDate.getTime() });
    const wanted = (calendarIds && calendarIds.length) ? new Set(calendarIds) : null;
    return (result || [])
      .filter((e) => !wanted || wanted.has(e.calendarId))
      .map(normalize);
  } catch { return []; }
}
