import { PILLAR_COLORS } from '../../theme/tokens.js';
import { DeepWorkPill, DeepWorkSection } from './components.jsx';
import { isThisMonth } from '../../lib/dates.js';

export default {
  id: 'deepwork',
  label: 'Deep work',
  color: PILLAR_COLORS.deepwork,
  Pill: DeepWorkPill,
  Section: DeepWorkSection,
  StatsScreen: null, // stub for now
  getStats(app) {
    const sessions = (app.deepwork.sessions || []).filter(s => isThisMonth(s.at));
    const hours = sessions.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
    return [
      { number: String(sessions.length), label: 'sessions this month' },
      { number: hours.toFixed(1), label: 'hours this month' },
    ];
  },
};
