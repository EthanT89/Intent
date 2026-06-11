import { PILLAR_COLORS } from '../../theme/tokens.js';
import { RoutinePill, RoutineSection } from './components.jsx';
import { computeRoutineStreak, completionPct30 } from './model.js';

export default {
  id: 'routine',
  label: 'Routine',
  color: PILLAR_COLORS.routine,
  Pill: RoutinePill,
  Section: RoutineSection,
  StatsScreen: null, // stub for now
  getStats(app) {
    const primary = app.routines.list[0];
    if (!primary) return [{ number: '—', label: 'no routines' }];
    const history = app.routines.history[primary.id] || {};
    return [
      { number: `${completionPct30(primary, history)}%`, label: 'completion this month' },
      { number: String(computeRoutineStreak(primary, history)), label: 'day streak' },
    ];
  },
};
