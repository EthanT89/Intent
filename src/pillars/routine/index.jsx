import { PILLAR_COLORS } from '../../theme/tokens.js';
import { RoutinePill, RoutineSection } from './components.jsx';
import { computeRoutineStreak, completionPct30, isActiveDay, isDayComplete } from './model.js';
import { intentNow, intentTodayKey } from '../../lib/dates.js';

export default {
  id: 'routine',
  label: 'Routine',
  color: PILLAR_COLORS.routine,
  Pill: RoutinePill,
  Section: RoutineSection,
  StatsScreen: null, // stub for now
  getDaily(app) {
    const active = (app.routines.list || []).filter(r => r.disabled !== true && isActiveDay(r, intentNow()));
    if (!active.length) return { done: false };
    const tk = intentTodayKey();
    const done = active.every(r => r.items.length > 0 && isDayComplete(r, (app.routines.history[r.id] || {})[tk]));
    return { done };
  },
  getStats(app) {
    const list = app.routines.list || [];
    const primary = list.find(r => r.disabled !== true) || list[0];
    if (!primary) return [{ number: '—', label: 'no routines' }];
    const history = app.routines.history[primary.id] || {};
    return [
      { number: `${completionPct30(primary, history)}%`, label: 'completion this month' },
      { number: String(computeRoutineStreak(primary, history)), label: 'day streak' },
    ];
  },
};
