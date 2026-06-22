// momentum.js — the consistency engine. Answers "which pillars did I honor on a
// given day?" from each pillar's raw data, then derives streaks + a series for
// the Today strip and the Stats heatmap. This is the backbone of persistence:
// it turns scattered logs into one picture of a life in motion.

import { dateKey, addDays, intentNow } from './dates.js';

// Attribute a timestamp to its intent day (rolls over at the 6am cutoff), so a
// 1am coffee or deep-work session credits the day that's wrapping up.
const dkOf = (iso) => { try { return dateKey(intentNow(new Date(iso))); } catch { return null; } };

// One check per trackable pillar: did anything happen that day?
export const HONOR_CHECKS = {
  reading: (app, dk) => (app.books?.sessions || []).some(s => s.date === dk),
  movement: (app, dk) => (app.movement?.sessions || []).some(s => (s.date || dkOf(s.at)) === dk),
  routine: (app, dk) => Object.values(app.routines?.history || {}).some(h => h[dk] && Object.values(h[dk]).some(Boolean)),
  coffee: (app, dk) => (app.coffee?.pulls || []).some(p => (p.at ? dkOf(p.at) : null) === dk),
  reflection: (app, dk) => { const d = (app.reflection?.days || {})[dk]; return !!(d && (d.intent || d.evening)); },
  deepwork: (app, dk) => (app.deepwork?.sessions || []).some(s => (s.at ? dkOf(s.at) : null) === dk),
};

// The pillars that participate in momentum — only those the user keeps visible,
// so the picture reflects what matters to *them*.
export function trackedPillars(app) {
  const vis = app.settings?.pillarVis || {};
  return Object.keys(HONOR_CHECKS).filter(id => vis[id] !== false);
}

// Which tracked pillars were honored on a given date key.
export function honoredOn(app, dk) {
  return trackedPillars(app).filter(id => HONOR_CHECKS[id](app, dk));
}

// Last `days` days (oldest→newest) with honored count + ratio.
export function momentumSeries(app, days = 14, today = intentNow()) {
  const tracked = trackedPillars(app);
  const denom = Math.max(1, tracked.length);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const dk = dateKey(d);
    const honored = tracked.filter(id => HONOR_CHECKS[id](app, dk));
    out.push({ date: d, dk, count: honored.length, ratio: honored.length / denom, isToday: i === 0 });
  }
  return out;
}

// Consecutive days (ending today, with a grace for an unstarted today) on which
// at least one tracked pillar was honored.
export function activeStreak(app, today = intentNow()) {
  const tracked = trackedPillars(app);
  if (!tracked.length) return 0;
  const honoredAny = (dk) => tracked.some(id => HONOR_CHECKS[id](app, dk));
  let streak = 0, started = false;
  for (let i = 0; i < 400; i++) {
    const dk = dateKey(addDays(today, -i));
    const has = honoredAny(dk);
    if (i === 0 && !has) { started = true; continue; } // today not done yet — don't break
    if (has) { streak++; started = true; }
    else if (started) break;
  }
  return streak;
}

// Longest honored streak within the last `range` days (for "best" context).
export function bestStreak(app, range = 180, today = intentNow()) {
  const tracked = trackedPillars(app);
  if (!tracked.length) return 0;
  const honoredAny = (dk) => tracked.some(id => HONOR_CHECKS[id](app, dk));
  let best = 0, run = 0;
  for (let i = range - 1; i >= 0; i--) {
    if (honoredAny(dateKey(addDays(today, -i)))) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}

// Per-pillar streak (consecutive days honored, today-grace) — for "most consistent".
export function pillarStreak(app, id, today = intentNow()) {
  const check = HONOR_CHECKS[id];
  if (!check) return 0;
  let streak = 0, started = false;
  for (let i = 0; i < 400; i++) {
    const dk = dateKey(addDays(today, -i));
    const has = check(app, dk);
    if (i === 0 && !has) { started = true; continue; }
    if (has) { streak++; started = true; }
    else if (started) break;
  }
  return streak;
}

// Streak milestones worth a small celebration.
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000];

// Highest milestone reached for a given streak (0 if none yet).
export function highestMilestone(streak) {
  let m = 0;
  for (const x of STREAK_MILESTONES) { if (streak >= x) m = x; else break; }
  return m;
}

// A 6-week heatmap grid (rows = weeks, cols = Mon..Sun) for the Stats card.
export function heatmapWeeks(app, weeks = 6, today = intentNow()) {
  const tracked = trackedPillars(app);
  const denom = Math.max(1, tracked.length);
  // Start on the Monday `weeks-1` weeks ago.
  const mondayIdx = (today.getDay() + 6) % 7;
  const start = addDays(today, -mondayIdx - (weeks - 1) * 7);
  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const dk = dateKey(date);
      const future = date > today;
      const count = future ? 0 : tracked.filter(id => HONOR_CHECKS[id](app, dk)).length;
      row.push({ date, dk, count, ratio: count / denom, future, isToday: dk === dateKey(today) });
    }
    grid.push(row);
  }
  return grid;
}
