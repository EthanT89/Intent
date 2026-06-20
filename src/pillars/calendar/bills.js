// Bills & payments domain.
//
// Persisted as `intent.bills` — an array of:
//   { id, name, amount, variable, color, autopay, account, notes,
//     recur: { unit:'month'|'week'|'year'|'once', interval, day, weekday, month, anchor },
//     remind,                 // days before the due date to nudge (null = off)
//     paid: { 'YYYY-MM-DD': true | <actualAmount> } }
//   `variable` bills (e.g. a credit card) have an unknown charge each cycle —
//   `amount` is just a typical estimate; the real amount is recorded per
//   occurrence in `paid` when you log the payment.
//
// Recurrence is day-of-month aware (e.g. the 4th of every month) — the thing
// calendar events couldn't express. Bills surface on the calendar via a source
// adapter (see sources.js), so they're just another toggleable layer.

import { dateKey, addDays, weekStart, startOfDay, endOfDay } from '../../lib/dates.js';

export function uid(prefix = 'bill') {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export const BILL_COLORS = ['#5C6B6B', '#7A8C7E', '#B8893E', '#7C6F8E', '#B0726A', '#5C3A1F', '#C4956A'];
export const DEFAULT_BILL_COLOR = BILL_COLORS[0];

// Composer presets → a normalized recur object.
export const BILL_FREQS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'every2mo', label: 'Every 2 months' },
  { id: 'quarterly', label: 'Every 3 months' },
  { id: 'biannual', label: 'Every 6 months' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'once', label: 'One-time' },
];

const MONTH_PRESETS = { monthly: 1, every2mo: 2, quarterly: 3, biannual: 6 };

export function presetToRecur(preset, { day = 1, weekday = 1, month = 0, date }) {
  const anchor = date || null;
  if (MONTH_PRESETS[preset]) return { unit: 'month', interval: MONTH_PRESETS[preset], day, anchor };
  if (preset === 'yearly') return { unit: 'year', interval: 1, day, month, anchor };
  if (preset === 'weekly') return { unit: 'week', interval: 1, weekday, anchor };
  if (preset === 'biweekly') return { unit: 'week', interval: 2, weekday, anchor };
  if (preset === 'once') return { unit: 'once', anchor: date };
  return { unit: 'month', interval: 1, day, anchor };
}

export function recurToPreset(recur = {}) {
  if (recur.unit === 'once') return 'once';
  if (recur.unit === 'year') return 'yearly';
  if (recur.unit === 'week') return recur.interval >= 2 ? 'biweekly' : 'weekly';
  const m = recur.interval || 1;
  return m === 6 ? 'biannual' : m === 3 ? 'quarterly' : m === 2 ? 'every2mo' : 'monthly';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function recurLabel(recur = {}) {
  const r = recur;
  if (r.unit === 'once') return r.anchor ? `One-time · ${MONTHS[+r.anchor.slice(5, 7) - 1]} ${+r.anchor.slice(8, 10)}` : 'One-time';
  if (r.unit === 'year') return `Yearly · ${MONTHS[r.month || 0]} ${ordinal(r.day || 1)}`;
  if (r.unit === 'week') return `${r.interval >= 2 ? 'Every 2 weeks' : 'Weekly'} · ${WEEKDAYS[r.weekday ?? 1]}`;
  const every = r.interval === 6 ? 'Every 6 months' : r.interval === 3 ? 'Every 3 months' : r.interval === 2 ? 'Every 2 months' : 'Monthly';
  return `${every} · ${ordinal(r.day || 1)}`;
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function clampDay(y, m, day) { return Math.min(day, daysInMonth(y, m)); }
function weekIdx(d) { return Math.floor(weekStart(d).getTime() / (7 * 86400000)); }

// Concrete due Dates (noon-local) for a bill within [start, end].
export function billOccurrences(bill, start, end) {
  const r = bill.recur || {};
  const s = startOfDay(start), e = endOfDay(end);
  const out = [];
  if (r.unit === 'once') {
    if (!r.anchor) return out;
    const d = new Date(`${r.anchor}T12:00:00`);
    if (d >= s && d <= e) out.push(d);
    return out;
  }
  if (r.unit === 'week') {
    const interval = r.interval || 1;
    const wd = r.weekday ?? 1;
    const anchor = r.anchor ? new Date(`${r.anchor}T12:00:00`) : s;
    let d = new Date(s); d.setHours(12, 0, 0, 0);
    while (d.getDay() !== wd) d = addDays(d, 1);
    for (let i = 0; i < 430 && d <= e; i++) {
      if ((((weekIdx(d) - weekIdx(anchor)) % interval) + interval) % interval === 0) out.push(new Date(d));
      d = addDays(d, 7);
    }
    return out;
  }
  if (r.unit === 'year') {
    const interval = r.interval || 1, day = r.day || 1, mon = r.month || 0;
    const anchorY = r.anchor ? +r.anchor.slice(0, 4) : s.getFullYear();
    for (let y = s.getFullYear() - 1; y <= e.getFullYear() + 1; y++) {
      if ((((y - anchorY) % interval) + interval) % interval !== 0) continue;
      const d = new Date(y, mon, clampDay(y, mon, day), 12, 0, 0);
      if (d >= s && d <= e) out.push(d);
    }
    return out;
  }
  // month (default)
  const interval = r.interval || 1, day = r.day || 1;
  const anchor = r.anchor ? new Date(`${r.anchor}T12:00:00`) : new Date(s.getFullYear(), s.getMonth(), 1);
  const anchorMonths = anchor.getFullYear() * 12 + anchor.getMonth();
  let cur = new Date(s.getFullYear(), s.getMonth(), 1);
  for (let i = 0; i < 480; i++) {
    if (cur > e) break;
    const cm = cur.getFullYear() * 12 + cur.getMonth();
    if ((((cm - anchorMonths) % interval) + interval) % interval === 0) {
      const d = new Date(cur.getFullYear(), cur.getMonth(), clampDay(cur.getFullYear(), cur.getMonth(), day), 12, 0, 0);
      if (d >= s && d <= e) out.push(d);
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out;
}

// Next due date on/after `from` (Date) — scans up to ~2 years out.
export function nextDueDate(bill, from = new Date()) {
  const occ = billOccurrences(bill, startOfDay(from), addDays(from, 760));
  return occ[0] || null;
}

export function isPaid(bill, dk) { return !!(bill.paid && bill.paid[dk]); }

// The actual recorded amount for an occurrence (number), or null if unknown.
export function billAmountFor(bill, dk) {
  const p = bill.paid && bill.paid[dk];
  return typeof p === 'number' ? p : null;
}

// Display title for a bill occurrence: actual amount if recorded, else the
// estimate (~) for variable bills, "varies" when there's no estimate, else fixed.
export function billTitle(bill, dk) {
  const actual = billAmountFor(bill, dk);
  if (actual != null) return `${bill.name} · ${fmtMoney(actual)}`;
  if (bill.variable) return Number(bill.amount) ? `${bill.name} · ~${fmtMoney(bill.amount)}` : `${bill.name} · varies`;
  return `${bill.name} · ${fmtMoney(bill.amount)}`;
}

export function fmtMoney(a) {
  const n = Number(a) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

// paid → auto → overdue → due (today) → upcoming
export function billStatus(bill, dueKey, todayKey) {
  if (isPaid(bill, dueKey)) return 'paid';
  if (bill.autopay) return 'auto';
  if (dueKey < todayKey) return 'overdue';
  if (dueKey === todayKey) return 'due';
  return 'upcoming';
}

// Total due in a given calendar month (sum of each bill's occurrences that month).
export function monthlyTotal(bills, year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  let total = 0;
  for (const b of (bills || [])) {
    for (const due of billOccurrences(b, start, end)) {
      const actual = billAmountFor(b, dateKey(due));
      total += actual != null ? actual : (Number(b.amount) || 0);
    }
  }
  return total;
}

// Projected vs paid vs still-to-manually-pay for a calendar month. Variable
// bills count their estimate until an actual amount is recorded.
export function monthSummary(bills, year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  let projected = 0, paid = 0, dueManual = 0, count = 0;
  for (const b of (bills || [])) {
    for (const due of billOccurrences(b, start, end)) {
      const dk = dateKey(due);
      const actual = billAmountFor(b, dk);
      const amt = actual != null ? actual : (Number(b.amount) || 0);
      projected += amt; count++;
      if (isPaid(b, dk)) paid += amt;
      else if (!b.autopay) dueManual += amt;
    }
  }
  return { projected, paid, dueManual, count };
}

// Past manual bill occurrences that haven't been marked paid.
export function overdueOccurrences(bills, today = new Date(), lookbackDays = 95) {
  const start = addDays(today, -lookbackDays);
  const tk = dateKey(today);
  const out = [];
  for (const b of (bills || [])) {
    if (b.autopay) continue;
    for (const due of billOccurrences(b, start, today)) {
      const dk = dateKey(due);
      if (dk < tk && !isPaid(b, dk)) out.push({ bill: b, dk, amount: Number(b.amount) || 0 });
    }
  }
  return out;
}

// The earliest unpaid occurrence of a manual bill (overdue first, else next
// upcoming) as a date key, or null. Drives the quick "mark paid" in the list.
export function nextUnpaid(bill, today = new Date(), lookbackDays = 95, lookaheadDays = 400) {
  if (bill.autopay) return null;
  for (const due of billOccurrences(bill, addDays(today, -lookbackDays), addDays(today, lookaheadDays))) {
    const dk = dateKey(due);
    if (!isPaid(bill, dk)) return dk;
  }
  return null;
}

// Recorded payments for a bill, newest first: { date, amount|null }.
export function paymentHistory(bill, limit = 24) {
  const paid = bill.paid || {};
  return Object.keys(paid)
    .sort((a, b) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(dk => ({ date: dk, amount: typeof paid[dk] === 'number' ? paid[dk] : null }));
}
