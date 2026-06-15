// Movement (workout) domain model.
//
// Data shape (persisted as intent.movement):
//   exercises: [{ id, name, kind, description }]
//   workouts:  [{ id, name, description, items: [{ exerciseId, sets, reps, weight, duration, distance }] }]
//   schedule:  { recurring: { '0'..'6': [workoutId] }, oneOff: { 'YYYY-MM-DD': [workoutId] } }
//   sessions:  [{ id, date, at, workoutId, name, durationMin, notes,
//                 entries: [{ exerciseId, name, kind, sets:[{reps,weight}], duration, distance, done }] }]

import { dateKey, isThisMonth, weekStart, addDays } from '../../lib/dates.js';

export const MOVEMENT_SEED = {
  exercises: [],
  workouts: [],
  schedule: { recurring: {}, oneOff: {} },
  sessions: [],
};

// Each exercise kind declares which metric fields it uses. This drives both the
// builder (target fields) and the logger (what you record per set).
export const EXERCISE_KINDS = {
  strength:   { label: 'Strength',   fields: ['sets', 'reps', 'weight'], perSet: true,  icon: 'dumbbell' },
  bodyweight: { label: 'Bodyweight', fields: ['sets', 'reps'],           perSet: true,  icon: 'body' },
  cardio:     { label: 'Cardio',     fields: ['duration', 'distance'],   perSet: false, icon: 'run' },
  mobility:   { label: 'Mobility',   fields: ['duration'],               perSet: false, icon: 'stretch' },
};

export const KIND_LIST = Object.entries(EXERCISE_KINDS).map(([id, v]) => ({ id, ...v }));

export const FIELD_META = {
  sets:     { label: 'Sets', unit: '', step: 1 },
  reps:     { label: 'Reps', unit: '', step: 1 },
  weight:   { label: 'Weight', unit: 'lb', step: 5 },
  duration: { label: 'Time', unit: 'min', step: 1 },
  distance: { label: 'Distance', unit: 'mi', step: 0.1 },
};

export function uid(prefix = 'm') {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function kindOf(id) {
  return EXERCISE_KINDS[id] || EXERCISE_KINDS.strength;
}

// What's scheduled for a given date: one-off entries for that exact date plus
// the recurring entries for that weekday. De-duped, returns workout ids.
export function scheduledFor(schedule, d = new Date()) {
  const dow = String(d.getDay());
  const recurring = (schedule.recurring && schedule.recurring[dow]) || [];
  const oneOff = (schedule.oneOff && schedule.oneOff[dateKey(d)]) || [];
  return [...new Set([...oneOff, ...recurring])];
}

// One session's total volume (Σ weight × reps across all sets).
export function sessionVolume(session) {
  let vol = 0;
  (session.entries || []).forEach(e => {
    (e.sets || []).forEach(s => { vol += (Number(s.weight) || 0) * (Number(s.reps) || 0); });
  });
  return vol;
}

export function computeMovementStats(movement) {
  const sessions = movement.sessions || [];
  const monthSessions = sessions.filter(s => isThisMonth(s.at || s.date));
  const volumeThisMonth = monthSessions.reduce((a, s) => a + sessionVolume(s), 0);

  // This week: sessions done since Monday, vs distinct days scheduled this week.
  const ws = weekStart(new Date());
  const weekSessions = sessions.filter(s => {
    const sd = new Date((s.date || s.at) + (s.date ? 'T12:00:00' : ''));
    return sd >= ws;
  });
  let scheduledDays = 0;
  for (let i = 0; i < 7; i++) {
    if (scheduledFor(movement.schedule || {}, addDays(ws, i)).length > 0) scheduledDays++;
  }
  return {
    workoutsThisMonth: monthSessions.length,
    weekDone: weekSessions.length,
    weekScheduled: scheduledDays,
    volumeThisMonth,
  };
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
