// Movement (workout) domain model.
//
// Data shape (persisted as intent.movement):
//   exercises: [{ id, name, kind, description }]
//   workouts:  [{ id, name, description, items: [{ exerciseId, sets, reps, weight, duration, distance }] }]
//   schedule:  { recurring: { '0'..'6': [ rule ] },       // repeats by weekday
//               oneOff:    { 'YYYY-MM-DD': [workoutId] }, // a single dated assignment
//               skips:     { 'YYYY-MM-DD': [workoutId] }, // suppress one recurring occurrence
//               until:     { '<dow>:<workoutId>': 'YYYY-MM-DD' } } // series ends after this date
//   A recurring `rule` is either a bare workoutId string (= every week) or
//   { id, freq, anchor }: freq=2 means every-other-week, anchored to the ISO
//   week of `anchor` (so two biweekly rules on the same weekday alternate).
//   sessions:  [{ id, date, at, workoutId, name, durationMin, notes,
//                 entries: [{ exerciseId, name, kind, sets:[{reps,weight}], duration, distance, done }] }]
//   weights:   { 'YYYY-MM-DD': number }   // daily bodyweight log, one entry per day

import { dateKey, isThisMonth, weekStart, addDays } from '../../lib/dates.js';

export const MOVEMENT_SEED = {
  exercises: [],
  workouts: [],
  schedule: { recurring: {}, oneOff: {}, skips: {}, until: {} },
  sessions: [],
  weights: {},
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

// "1 exercise" / "2 exercises" — count with a correctly pluralized noun.
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function kindOf(id) {
  return EXERCISE_KINDS[id] || EXERCISE_KINDS.strength;
}

// Recurring rule accessors (a rule is a string or { id, freq, anchor }).
export const ruleId = (r) => (typeof r === 'string' ? r : r.id);
export const ruleFreq = (r) => (typeof r === 'string' ? 1 : (r.freq || 1));
export const ruleAnchor = (r) => (typeof r === 'string' ? null : r.anchor || null);

// Monday-anchored absolute week number (for every-other-week parity).
export function weekIndex(d) {
  return Math.floor(weekStart(d).getTime() / (7 * 86400000));
}

// Does a recurring rule fall on date d's week, given its cadence?
export function ruleActiveOnWeek(rule, d) {
  const freq = ruleFreq(rule);
  if (freq <= 1) return true;
  const anchor = ruleAnchor(rule);
  if (!anchor) return true;
  const diff = weekIndex(d) - weekIndex(new Date(`${anchor}T12:00:00`));
  return (((diff % freq) + freq) % freq) === 0;
}

// What's scheduled for a given date: one-off entries for that exact date plus
// the recurring rules for that weekday whose cadence lands on this week — minus
// any occurrence skipped (moved/removed for just that day) or past its series'
// end date. De-duped, returns workout ids.
export function scheduledFor(schedule, d = new Date()) {
  if (!schedule) return [];
  const dow = String(d.getDay());
  const dk = dateKey(d);
  const skips = (schedule.skips && schedule.skips[dk]) || [];
  const until = schedule.until || {};
  const recurring = [];
  for (const rule of ((schedule.recurring && schedule.recurring[dow]) || [])) {
    const id = ruleId(rule);
    if (skips.includes(id)) continue;               // this single occurrence removed/moved
    const u = until[`${dow}:${id}`];
    if (u && dk > u) continue;                       // series ended before this date
    if (!ruleActiveOnWeek(rule, d)) continue;        // off-week for an every-other-week rule
    recurring.push(id);
  }
  const oneOff = (schedule.oneOff && schedule.oneOff[dk]) || [];
  return [...new Set([...oneOff, ...recurring])];
}

// Estimated one-rep max (Epley): weight × (1 + reps/30). The standard way to
// compare sets of different weight×reps for progressive overload. 0 if not a
// valid weighted set.
export function epley1RM(weight, reps) {
  const w = Number(weight) || 0, r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
}

// Best estimated 1RM ever recorded for an exercise across past sessions
// (optionally excluding one session). Drives the live PR flag while logging.
export function bestE1RM(sessions, exerciseId, excludeSessionId = null) {
  let best = 0;
  for (const s of (sessions || [])) {
    if (excludeSessionId && s.id === excludeSessionId) continue;
    for (const e of (s.entries || [])) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of (e.sets || [])) {
        const v = epley1RM(set.weight, set.reps);
        if (v > best) best = v;
      }
    }
  }
  return best;
}

// Per-exercise performance log (newest first) — every session you did this
// exercise, with its sets, note, and computed top weight / est. 1RM. The basis
// for the "what do I usually do?" history.
export function exerciseHistory(sessions, exerciseId) {
  const out = [];
  for (const s of (sessions || [])) {
    const e = (s.entries || []).find(en => en.exerciseId === exerciseId);
    if (!e) continue;
    const sets = (e.sets || []).filter(st => st.reps || st.weight);
    if (!sets.length && !e.duration && !e.distance && !e.note) continue;
    const e1rm = sets.reduce((m, st) => Math.max(m, epley1RM(st.weight, st.reps)), 0);
    const topWeight = sets.reduce((m, st) => Math.max(m, Number(st.weight) || 0), 0);
    out.push({ date: s.date || (s.at || '').slice(0, 10), at: s.at, sets, duration: e.duration, distance: e.distance, note: e.note || '', e1rm, topWeight });
  }
  return out;
}

// At-a-glance numbers for an exercise: how often, your typical working weight
// (the most frequent top-set weight over recent sessions), best est. 1RM, and
// the most recent per-exercise note.
export function exerciseSummary(sessions, exerciseId) {
  const h = exerciseHistory(sessions, exerciseId);
  if (!h.length) return { count: 0, usualWeight: null, bestE1RM: 0, lastNote: '', lastDate: null };
  const recent = h.slice(0, 6).map(x => x.topWeight).filter(w => w > 0);
  let usualWeight = null;
  if (recent.length) {
    const freq = {};
    recent.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    usualWeight = Number(Object.entries(freq).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0][0]);
  }
  return {
    count: h.length,
    usualWeight,
    bestE1RM: h.reduce((m, x) => Math.max(m, x.e1rm), 0),
    lastNote: (h.find(x => x.note) || {}).note || '',
    lastDate: h[0].date,
  };
}

// Progressive-overload suggestion for a lift, via double progression: if last
// time you hit the target reps on every set, bump the weight; otherwise repeat
// the weight and push for more reps. `item` is the workout's template (target
// reps/weight); `history` is exerciseHistory() for this lift (newest first).
// Returns { weight, reps, reason } or null when there's nothing to suggest.
export function progressionTarget(item, history) {
  const targetReps = Number(item && item.reps) || null;
  const last = (history || []).find(h => (h.sets || []).some(s => s.reps || s.weight));
  if (!last) {
    const w = Number(item && item.weight) || null;
    return (w || targetReps) ? { weight: w, reps: targetReps, reason: 'starting target' } : null;
  }
  const lastWeight = last.sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
  const hitAll = targetReps && last.sets.length > 0 && last.sets.every(s => (Number(s.reps) || 0) >= targetReps);
  if (lastWeight > 0 && hitAll) {
    const inc = lastWeight >= 100 ? 5 : 2.5;
    return { weight: lastWeight + inc, reps: targetReps, reason: `up ${inc} lb` };
  }
  return { weight: lastWeight || (Number(item && item.weight) || null), reps: targetReps, reason: lastWeight ? 'beat last' : 'add reps' };
}

// Rough working-time estimate (minutes) so a workout can be kept near a time
// budget. ~3 min per working set (incl. rest); cardio/mobility use their target
// duration (fallbacks: 20 / 5 min).
export function estimateWorkoutMinutes(workout, exById = {}) {
  let min = 0;
  (workout.items || []).forEach(it => {
    const ex = exById[it.exerciseId];
    const k = kindOf(ex && ex.kind);
    if (k.perSet) min += (Number(it.sets) || 3) * 3;
    else if ((ex && ex.kind) === 'cardio') min += Number(it.duration) || 20;
    else min += Number(it.duration) || 5;
  });
  return Math.round(min);
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

// ── Bodyweight ──────────────────────────────────────────────────────────────
// The weights map → a clean list of { date, weight }, oldest first, valid only.
export function weightEntries(movement) {
  const w = (movement && movement.weights) || {};
  return Object.entries(w)
    .map(([date, weight]) => ({ date, weight: Number(weight) }))
    .filter(e => e.weight > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Latest entry, the one before it, and the change between them (for the trend).
export function weightSummary(movement) {
  const entries = weightEntries(movement);
  const latest = entries[entries.length - 1] || null;
  const previous = entries[entries.length - 2] || null;
  const delta = latest && previous ? +(latest.weight - previous.weight).toFixed(1) : null;
  return { entries, latest, previous, delta };
}

// Smoothed bodyweight trend — what actually matters for a bulk/cut. Returns a
// 7-day average (the "true" current weight, noise removed) and a weekly rate
// (least-squares slope over the last `windowDays`, in lb/week). Nulls until
// there's enough data.
export function weightTrend(entries, windowDays = 21) {
  if (!entries || !entries.length) return { avg: null, ratePerWeek: null };
  const t = (d) => new Date(d + 'T12:00:00').getTime();
  const lastT = t(entries[entries.length - 1].date);
  const within = (e, days) => (lastT - t(e.date)) / 86400000 <= days;
  const win7 = entries.filter(e => within(e, 7));
  const avg = win7.length ? +(win7.reduce((a, e) => a + e.weight, 0) / win7.length).toFixed(1) : entries[entries.length - 1].weight;
  const recent = entries.filter(e => within(e, windowDays));
  if (recent.length < 3) return { avg, ratePerWeek: null };
  const x0 = t(recent[0].date);
  const pts = recent.map(e => ({ x: (t(e.date) - x0) / 86400000, y: e.weight }));
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0), sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0), sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom ? (n * sxy - sx * sy) / denom : 0; // lb/day
  return { avg, ratePerWeek: +(slope * 7).toFixed(2) };
}
