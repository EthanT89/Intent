// Routine domain model: streak + completion math.
// History shape: { [routineId]: { 'YYYY-MM-DD': { [itemId]: bool } } }
// daysOn uses JS getDay(): 0 = Sun … 6 = Sat

import { dateKey, addDays } from '../../lib/dates.js';

export function isActiveDay(routine, d) {
  return routine.daysOn.includes(d.getDay());
}

export function isDayComplete(routine, dayMap) {
  if (!dayMap) return false;
  return routine.items.every(it => dayMap[it.id]);
}

export function dayCompletionPct(routine, dayMap) {
  if (!dayMap) return 0;
  const total = routine.items.length;
  if (total === 0) return 0;
  const done = routine.items.filter(it => dayMap[it.id]).length;
  return done / total;
}

// Whole-routine streak: walk back from today across days-on.
// Today only counts if fully complete; an unfinished today doesn't break it.
export function computeRoutineStreak(routine, history, today = new Date()) {
  let streak = 0;
  let started = false;
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    if (!isActiveDay(routine, d)) continue;
    const k = dateKey(d);
    const complete = isDayComplete(routine, history[k]);
    if (i === 0 && !complete) { started = true; continue; }
    if (complete) { streak++; started = true; }
    else if (started) break;
  }
  return streak;
}

// Per-item streak — same walk, single item.
export function computeItemStreak(routine, history, itemId, today = new Date()) {
  let streak = 0;
  let started = false;
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    if (!isActiveDay(routine, d)) continue;
    const k = dateKey(d);
    const done = !!(history[k] && history[k][itemId]);
    if (i === 0 && !done) { started = true; continue; }
    if (done) { streak++; started = true; }
    else if (started) break;
  }
  return streak;
}

// Completion % over the last 30 active days (used on the Stats card).
export function completionPct30(routine, history, today = new Date()) {
  let activeDays = 0, score = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (!isActiveDay(routine, d)) continue;
    activeDays++;
    score += dayCompletionPct(routine, history[dateKey(d)]);
  }
  return activeDays === 0 ? 0 : Math.round((score / activeDays) * 100);
}
