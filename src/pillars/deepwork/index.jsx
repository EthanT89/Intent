import { PILLAR_COLORS } from '../../theme/tokens.js';
import { DeepWorkPill, DeepWorkSection } from './components.jsx';

export default {
  id: 'deepwork',
  label: 'Deep work',
  color: PILLAR_COLORS.deepwork,
  Pill: DeepWorkPill,
  Section: DeepWorkSection,
  StatsScreen: null, // stub for now
  getStats() {
    return [
      { number: '18', label: 'sessions this month' },
      { number: '24.6', label: 'hours this month' },
      { number: 'P4', label: 'current phase' },
    ];
  },
};
