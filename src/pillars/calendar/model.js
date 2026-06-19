// Calendar domain model.
//
// Persisted as `intent.calendar`:
//   events:   [{ id, title, notes, location, allDay,
//                start, end,           // 'YYYY-MM-DD' (all-day) or 'YYYY-MM-DDTHH:mm' (timed), local
//                color, recur, until,  // recur: none|daily|weekday|weekly|monthly ; until: 'YYYY-MM-DD'|null
//                source }]             // 'native' (room for 'google'/'ics'/… later)
//   tasks:    [{ id, title, notes, done, due, color }]   // due: date / datetime / null (inbox)
//   settings: { defaultView, layers }                    // layers: { sourceId: false } to hide
//
// The calendar itself doesn't know about workouts/routines/etc. — those are
// contributed by source adapters (see sources.js). That's the expansion seam:
// a new app feature shows up on the calendar by registering one adapter.

import { addDays, addMonths } from '../../lib/dates.js';

export const CAL_SEED = {
  events: [],
  tasks: [],
  settings: { defaultView: 'day', layers: {} },
};

// Calendar-friendly palette (muted, on-brand). First is the default.
export const EVENT_COLORS = ['#C4956A', '#7A8C7E', '#7C6F8E', '#B8893E', '#B0726A', '#5C6B6B', '#5C3A1F'];
export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0];
export const TASK_COLOR = '#9CA398';

export const RECUR_OPTIONS = [
  { id: 'none', label: 'Does not repeat' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekday', label: 'Every weekday' },
  { id: 'weekly', label: 'Every week' },
  { id: 'monthly', label: 'Every month' },
];

// Reminder lead times (minutes before the reference moment). For timed items the
// reference is the start; for all-day items it's 9:00 AM on the day.
export const REMIND_TIMED = [
  { v: null, l: 'No reminder' }, { v: 0, l: 'At start time' },
  { v: 5, l: '5 minutes before' }, { v: 10, l: '10 minutes before' },
  { v: 15, l: '15 minutes before' }, { v: 30, l: '30 minutes before' },
  { v: 60, l: '1 hour before' }, { v: 120, l: '2 hours before' }, { v: 1440, l: '1 day before' },
];
export const REMIND_ALLDAY = [
  { v: null, l: 'No reminder' }, { v: 0, l: '9:00 AM that day' }, { v: 1440, l: '9:00 AM the day before' },
];

export function uid(prefix = 'cal') {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

// ── Time helpers ────────────────────────────────────────────────────────────
// Stored strings are local (no timezone suffix) so they render the same on any
// device — a personal calendar, not a shared one.
export function parseDT(s) {
  if (!s) return null;
  return new Date(s.length <= 10 ? `${s}T00:00:00` : s);
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function fmtTime(d) {
  if (!d) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}${ap}` : `${h}:${pad2(m)}${ap}`;
}

export function fmtHourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return 'NOON';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// Minutes since midnight for a Date.
export function minutesOf(d) { return d.getHours() * 60 + d.getMinutes(); }

// ── Recurrence expansion ─────────────────────────────────────────────────────
// Yield concrete { start: Date, end: Date } occurrences of an event that
// intersect [rangeStart, rangeEnd]. Duration is preserved across occurrences.
export function expandEvent(ev, rangeStart, rangeEnd) {
  const start = parseDT(ev.start);
  if (!start) return [];
  const end = parseDT(ev.end) || start;
  const durMs = Math.max(0, end - start);
  const recur = ev.recur || 'none';
  const until = ev.until ? new Date(`${ev.until}T23:59:59`) : null;
  const out = [];
  const push = (s) => {
    const e = new Date(s.getTime() + durMs);
    if (e >= rangeStart && s <= rangeEnd) out.push({ start: new Date(s), end: e });
  };

  if (recur === 'none') { push(start); return out; }

  let cur = new Date(start);
  // Fast-forward close to the range to avoid iterating years of history.
  if (cur < rangeStart) {
    const dayMs = 86400000;
    if (recur === 'daily') cur = addDays(cur, Math.floor((rangeStart - cur) / dayMs));
    else if (recur === 'weekly') cur = addDays(cur, Math.floor((rangeStart - cur) / (7 * dayMs)) * 7);
    else if (recur === 'monthly') { let g = 0; while (cur < rangeStart && g++ < 1000) cur = addMonths(cur, 1); }
    // 'weekday' falls through to the loop (range is small)
  }

  let guard = 0;
  while (cur <= rangeEnd && guard++ < 1200) {
    if (until && cur > until) break;
    push(cur);
    if (recur === 'daily') cur = addDays(cur, 1);
    else if (recur === 'weekly') cur = addDays(cur, 7);
    else if (recur === 'monthly') cur = addMonths(cur, 1);
    else if (recur === 'weekday') { do { cur = addDays(cur, 1); } while (cur.getDay() === 0 || cur.getDay() === 6); }
    else break;
  }
  return out;
}

// Sort comparator for a day's items: all-day first, then by start time, then title.
export function compareItems(a, b) {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  if (a.start && b.start && a.start - b.start !== 0) return a.start - b.start;
  return (a.title || '').localeCompare(b.title || '');
}

// ── Greedy overlap layout for a day's timed items ────────────────────────────
// Assigns each item a column and the column-count of its overlap cluster, so the
// grid can lay them side-by-side (like Google's day view).
export function layoutTimed(items) {
  const sorted = items.slice().sort((a, b) => (a.start - b.start) || (a.end - b.end));
  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const cols = [];
    cluster.forEach(it => {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c] <= it.start) { cols[c] = it.end; it._col = c; placed = true; break; }
      }
      if (!placed) { it._col = cols.length; cols.push(it.end); }
    });
    cluster.forEach(it => result.push({ ...it, col: it._col, cols: cols.length }));
    cluster = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach(it => {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  flush();
  return result;
}

// ── ICS export ───────────────────────────────────────────────────────────────
function icsStamp(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}
function icsDate(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
const RRULE = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', weekday: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' };

function esc(s) { return String(s || '').replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n'); }

// Build a VCALENDAR string from native events (recurrence kept as RRULE).
export function buildICS(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Intent//Calendar//EN', 'CALSCALE:GREGORIAN'];
  events.forEach(ev => {
    const s = parseDT(ev.start); if (!s) return;
    const e = parseDT(ev.end) || s;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@intent`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(s)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(e, 1))}`);
    } else {
      lines.push(`DTSTART:${icsStamp(s)}`);
      lines.push(`DTEND:${icsStamp(e)}`);
    }
    if (ev.recur && ev.recur !== 'none' && RRULE[ev.recur]) {
      lines.push(`RRULE:${RRULE[ev.recur]}${ev.until ? `;UNTIL=${ev.until.replace(/-/g, '')}` : ''}`);
    }
    lines.push(`SUMMARY:${esc(ev.title)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${esc(ev.notes)}`);
    if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
