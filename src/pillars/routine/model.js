// Routine domain model: seeds, synthetic starter history, streak math.
// History shape: { [routineId]: { 'YYYY-MM-DD': { [itemId]: bool } } }

import { dateKey, addDays } from '../../lib/dates.js';

export const ROUTINES_SEED = [
  {
    id: 'morning',
    name: 'Morning',
    description: 'Start the day with intention.',
    daysOn: [0, 1, 2, 3, 4, 5, 6], // JS getDay(): 0 = Sun … 6 = Sat
    items: [
      { id: 'stretch',   label: 'Stretching' },
      { id: 'shower',    label: 'Contrast shower' },
      { id: 'breakfast', label: 'Breakfast with reading' },
      { id: 'meditate',  label: 'Meditation' },
      { id: 'journal',   label: 'Journal' },
    ],
  },
  {
    id: 'evening',
    name: 'Evening',
    description: 'Close the day with care.',
    daysOn: [0, 1, 2, 3, 4, 5, 6],
    items: [
      { id: 'dim',        label: 'Lights down by 9pm' },
      { id: 'no-screens', label: 'No screens after 9:30' },
      { id: 'stretch-pm', label: 'Stretching' },
      { id: 'tomorrow',   label: 'Plan tomorrow' },
    ],
  },
];

export function isActiveDay(routine, d) {
  return routine.daysOn.includes(d.getDay());
}

// Deterministic pseudo-random per (routineId,date,itemId), so the synthetic
// starter history doesn't change across renders.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

// ~120 days of plausible starter history so streaks/strips aren't empty on
// first launch. Generated once, then persisted; real toggles overwrite it.
export function buildRoutineHistory(routine, today = new Date()) {
  const hist = {};
  for (let i = 0; i < 120; i++) {
    const d = addDays(today, -i);
    if (!isActiveDay(routine, d)) continue;
    const k = dateKey(d);
    const dayMap = {};
    routine.items.forEach(item => {
      const seed = hash(`${routine.id}:${k}:${item.id}`);
      // Recent days fully complete so the starter streak feels real;
      // older history is plausibly imperfect.
      const doneRate = i === 0 ? 0.75 : i <= 11 ? 1 : 0.85;
      dayMap[item.id] = (seed % 1000) / 1000 < doneRate;
    });
    hist[k] = dayMap;
  }
  return hist;
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
