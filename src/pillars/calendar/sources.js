// Calendar source registry — the expansion seam.
//
// A "source" turns some slice of app state into normalized calendar items for a
// date range. The calendar UI only ever talks to itemsForRange/itemsForDate, so
// adding a new layer (macros, habits, anything) means writing one adapter and
// appending it to CAL_SOURCES — no UI changes required.
//
// Normalized item shape:
//   { id, sourceId, kind, title, date('YYYY-MM-DD'),
//     allDay, start: Date|null, end: Date|null,
//     color, editable, done?, ref, notes?, location? }

import { dateKey, addDays, startOfDay, endOfDay } from '../../lib/dates.js';
import { PILLAR_COLORS } from '../../theme/tokens.js';
import { scheduledFor } from '../movement/model.js';
import { isActiveDay } from '../routine/model.js';
import { expandEvent, parseDT, DEFAULT_EVENT_COLOR, TASK_COLOR } from './model.js';
import { billOccurrences, billStatus, billTitle, DEFAULT_BILL_COLOR } from './bills.js';
import { todayKey } from '../../lib/dates.js';

function eachDay(start, end, fn) {
  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) fn(new Date(d));
}

// ── Native events ─────────────────────────────────────────────────────────────
function eventsAdapter(app, start, end) {
  const out = [];
  for (const ev of (app.calendar?.events || [])) {
    for (const occ of expandEvent(ev, start, end)) {
      out.push({
        id: `${ev.id}#${dateKey(occ.start)}`,
        sourceId: 'events', kind: 'event',
        title: ev.title || 'Untitled',
        date: dateKey(occ.start),
        allDay: !!ev.allDay,
        start: ev.allDay ? null : occ.start,
        end: ev.allDay ? null : occ.end,
        color: ev.color || DEFAULT_EVENT_COLOR,
        editable: true, ref: ev, notes: ev.notes, location: ev.location,
      });
    }
  }
  return out;
}

// ── Tasks (with a due date) ─────────────────────────────────────────────────
function tasksAdapter(app, start, end) {
  const out = [];
  for (const t of (app.calendar?.tasks || [])) {
    if (!t.due) continue; // undated tasks live in the inbox, not on the grid
    const d = parseDT(t.due);
    if (d < startOfDay(start) || d > endOfDay(end)) continue;
    const timed = t.due.length > 10;
    out.push({
      id: t.id, sourceId: 'tasks', kind: 'task',
      title: t.title, date: dateKey(d),
      allDay: !timed, start: timed ? d : null, end: timed ? d : null,
      color: t.color || TASK_COLOR, editable: true, done: !!t.done, ref: t,
    });
  }
  return out;
}

// ── Scheduled workouts (from the Movement planner) ──────────────────────────
function movementAdapter(app, start, end) {
  const mv = app.movement || {};
  const sched = mv.schedule || {};
  const wkById = Object.fromEntries((mv.workouts || []).map(w => [w.id, w]));
  const out = [];
  eachDay(start, end, (d) => {
    for (const id of scheduledFor(sched, d)) {
      const w = wkById[id]; if (!w) continue;
      out.push({
        id: `wk-${id}-${dateKey(d)}`, sourceId: 'movement', kind: 'workout',
        title: w.name, date: dateKey(d), allDay: true, start: null, end: null,
        color: PILLAR_COLORS.movement, editable: false,
        ref: { type: 'workout', id, count: (w.items || []).length },
      });
    }
  });
  return out;
}

// ── Routines (placed in their time-of-day window) ───────────────────────────
function routineAdapter(app, start, end) {
  const list = (app.routines && app.routines.list) || [];
  const out = [];
  eachDay(start, end, (d) => {
    for (const r of list) {
      if (r.disabled || !isActiveDay(r, d)) continue;
      const w = r.window;
      let s = null, e = null, allDay = true;
      if (w) {
        s = new Date(d); s.setHours(Math.floor(w.start), Math.round((w.start % 1) * 60), 0, 0);
        e = new Date(d);
        if (w.end >= 24) e.setHours(23, 59, 0, 0);
        else e.setHours(Math.floor(w.end), Math.round((w.end % 1) * 60), 0, 0);
        allDay = false;
      }
      out.push({
        id: `rt-${r.id}-${dateKey(d)}`, sourceId: 'routine', kind: 'routine',
        title: r.name, date: dateKey(d), allDay, start: s, end: e,
        color: PILLAR_COLORS.routine, editable: false,
        ref: { type: 'routine', id: r.id, count: (r.items || []).length },
      });
    }
  });
  return out;
}

// ── Subscribed external calendars (read-only: Google / Apple / any .ics) ─────
// Reads the per-device cache populated by lib/icsSync.js. Each subscription has
// its own enable flag + color; items are never editable here.
function subscriptionsAdapter(app, start, end) {
  const subs = (app.calendar?.settings?.subscriptions) || [];
  const cache = app.calCache || {};
  const out = [];
  for (const sub of subs) {
    if (sub.enabled === false) continue;
    const cached = cache[sub.id];
    if (!cached || !Array.isArray(cached.events)) continue;
    for (const ev of cached.events) {
      for (const occ of expandEvent(ev, start, end)) {
        out.push({
          id: `${ev.id}#${dateKey(occ.start)}`,
          sourceId: 'subscriptions', kind: 'sub',
          title: ev.title || 'Untitled',
          date: dateKey(occ.start),
          allDay: !!ev.allDay,
          start: ev.allDay ? null : occ.start,
          end: ev.allDay ? null : occ.end,
          color: sub.color || '#5C6B6B',
          editable: false, ref: { type: 'sub', sub: sub.name }, notes: ev.notes, location: ev.location,
        });
      }
    }
  }
  return out;
}

// ── Bills & payments ─────────────────────────────────────────────────────────
function billsAdapter(app, start, end) {
  const tk = todayKey();
  const out = [];
  for (const b of (app.bills || [])) {
    for (const due of billOccurrences(b, start, end)) {
      const dk = dateKey(due);
      const status = billStatus(b, dk, tk);
      out.push({
        id: `bill-${b.id}-${dk}`, sourceId: 'bills', kind: 'bill',
        title: billTitle(b, dk),
        date: dk, allDay: true, start: null, end: null,
        color: b.color || DEFAULT_BILL_COLOR, editable: false,
        done: status === 'paid',
        ref: { type: 'bill', billId: b.id, amount: b.amount, autopay: !!b.autopay, status, dueKey: dk, remind: b.remind },
      });
    }
  }
  return out;
}

// ── Device (native) calendars — read from the phone's own calendars ──────────
// Events are pre-fetched + cached (concrete occurrences) by lib/deviceCalendar.js;
// here we just emit the ones in range. Read-only.
function deviceAdapter(app, start, end) {
  const dc = app.deviceCal;
  if (!dc || dc.enabled === false) return [];
  const out = [];
  for (const ev of (dc.events || [])) {
    const s = parseDT(ev.start);
    if (!s || s < start || s > end) continue;
    out.push({
      id: ev.id, sourceId: 'device', kind: 'device',
      title: ev.title || '(busy)', date: dateKey(s),
      allDay: !!ev.allDay,
      start: ev.allDay ? null : s,
      end: ev.allDay ? null : (parseDT(ev.end) || s),
      color: '#5C6B6B', editable: false,
      ref: { type: 'device' }, notes: ev.notes, location: ev.location,
    });
  }
  return out;
}

// The registry. `always: true` sources can't be toggled off.
export const CAL_SOURCES = [
  { id: 'events', label: 'Events', color: DEFAULT_EVENT_COLOR, adapter: eventsAdapter, always: true },
  { id: 'tasks', label: 'Tasks', color: TASK_COLOR, adapter: tasksAdapter },
  { id: 'movement', label: 'Workouts', color: PILLAR_COLORS.movement, adapter: movementAdapter },
  { id: 'routine', label: 'Routines', color: PILLAR_COLORS.routine, adapter: routineAdapter },
  { id: 'subscriptions', label: 'Subscribed calendars', color: '#5C6B6B', adapter: subscriptionsAdapter },
  { id: 'bills', label: 'Bills & payments', color: DEFAULT_BILL_COLOR, adapter: billsAdapter },
  { id: 'device', label: 'Device calendar', color: '#5C6B6B', adapter: deviceAdapter },
  // Future: { id: 'reading', ... }, { id: 'macros', ... }
];

export function sourceVisible(app, id) {
  const layers = (app.calendar?.settings?.layers) || {};
  return layers[id] !== false;
}

// All items intersecting [startDate, endDate], respecting layer visibility.
export function itemsForRange(app, startDate, endDate) {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  const out = [];
  for (const s of CAL_SOURCES) {
    if (!sourceVisible(app, s.id)) continue;
    try { out.push(...s.adapter(app, start, end)); } catch { /* a bad adapter shouldn't break the calendar */ }
  }
  return out;
}

export function itemsForDate(app, date) {
  const k = dateKey(date);
  return itemsForRange(app, date, date).filter(it => it.date === k);
}

// Undated tasks (the inbox) — not tied to any day.
export function inboxTasks(app) {
  return (app.calendar?.tasks || []).filter(t => !t.due);
}

// Past-due, unfinished dated tasks (relative to `now`), oldest first — so an
// undone to-do resurfaces instead of being stranded on a day already gone by.
export function overdueTasks(app, now = new Date()) {
  const tk = dateKey(now);
  return (app.calendar?.tasks || [])
    .filter(t => t.due && !t.done && t.due.slice(0, 10) < tk)
    .sort((a, b) => (a.due < b.due ? -1 : 1));
}
