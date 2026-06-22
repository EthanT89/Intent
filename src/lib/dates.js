// Shared date helpers. All history is keyed by YYYY-MM-DD local-date strings.

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

// A new "intent day" begins at this local hour, not midnight. Anything logged
// before it counts toward the previous day — so reading past 1am, or a workout
// you forgot to log before bed, still lands on the day it belonged to. You're
// not done with a day until you've slept.
export const DAY_CUTOFF_HOUR = 6;

// True when we're in the post-midnight grace tail of the previous intent day.
export function inDayGrace(d = new Date()) {
  return d.getHours() < DAY_CUTOFF_HOUR;
}

// "Now", shifted so the day rolls over at DAY_CUTOFF_HOUR. Same clock time,
// dialed back one calendar day during the grace window. Use this as the anchor
// wherever "which day am I logging / what streak am I on" matters — NOT the
// calendar, which plans forward and rolls at midnight.
export function intentNow(d = new Date()) {
  if (!inDayGrace(d)) return new Date(d);
  const o = new Date(d);
  o.setDate(o.getDate() - 1);
  return o;
}

export function intentTodayKey() {
  return dateKey(intentNow());
}

export function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addMonths(d, n) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfDay(d = new Date()) {
  const o = new Date(d); o.setHours(0, 0, 0, 0); return o;
}

export function endOfDay(d = new Date()) {
  const o = new Date(d); o.setHours(23, 59, 59, 999); return o;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(iso) {
  if (!iso) return false;
  return dateKey(new Date(iso)) === todayKey();
}

export function isThisMonth(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function isThisYear(iso) {
  if (!iso) return false;
  return new Date(iso).getFullYear() === new Date().getFullYear();
}

// Monday-start week key (YYYY-MM-DD of that week's Monday) for bucketing.
export function weekStart(d = new Date()) {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && isToday(iso)) return `${hours}h ago`;
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function greetingForNow() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late,';
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

export function longDate(d = new Date()) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
