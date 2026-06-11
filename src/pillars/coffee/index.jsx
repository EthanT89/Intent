import { PILLAR_COLORS } from '../../theme/tokens.js';
import { CoffeePill, CoffeeSection, CoffeeStatsScreen } from './components.jsx';
import { isThisMonth } from '../../lib/dates.js';

// Pillar manifest — see src/pillars/registry.js for the shape.
export default {
  id: 'coffee',
  label: 'Coffee',
  color: PILLAR_COLORS.coffee,
  Pill: CoffeePill,
  Section: CoffeeSection,
  StatsScreen: CoffeeStatsScreen,
  getStats(app) {
    const pulls = app.coffee.pulls;
    const monthPulls = pulls.filter(p => isThisMonth(p.at));
    const avgRating = pulls.length
      ? (pulls.reduce((a, p) => a + (p.rating || 0), 0) / pulls.length).toFixed(1)
      : '—';
    const times = pulls
      .map(p => { const m = /^(\d+)s$/.exec(p.time || ''); return m ? parseInt(m[1]) : null; })
      .filter(v => v != null);
    const avgTime = times.length ? `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}s` : '—';
    return [
      { number: String(monthPulls.length), label: 'pulls this month' },
      { number: avgRating, label: 'avg rating' },
      { number: avgTime, label: 'avg pull time' },
    ];
  },
};
