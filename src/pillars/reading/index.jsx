import { PILLAR_COLORS } from '../../theme/tokens.js';
import { ReadingPill } from './ReadingPill.jsx';
import { LibioApp, LibioStatsScreen, LibioLogSessionSheet } from './LibioApp.jsx';
import { LIBIO_STATS_DATA } from './data.js';
import { isThisYear } from '../../lib/dates.js';

// Reading is the one pillar that takes over the whole screen (the embedded
// Libio app) instead of opening an in-shell Section — `fullScreen: true`
// tells the app shell to mount LibioApp as a swipeable card layer.
export default {
  id: 'reading',
  label: 'Reading',
  color: PILLAR_COLORS.reading,
  Pill: ReadingPill,
  Section: null,
  fullScreen: true,
  FullScreenApp: LibioApp,
  StatsScreen: null, // handled specially: Stats > Reading embeds LibioStatsScreen
  LibioStatsScreen,
  LibioLogSessionSheet,
  statsData: LIBIO_STATS_DATA,
  getStats(app) {
    const read = app.books.read || [];
    const booksThisYear = read.filter(b => isThisYear(b.finishedDate ? new Date(b.finishedDate) : null)).length;
    const pagesThisYear = (app.books.sessions || [])
      .filter(s => isThisYear(s.date ? new Date(s.date) : null))
      .reduce((a, s) => a + (s.pages || 0), 0);
    return [
      { number: String(booksThisYear), label: 'books this year' },
      { number: pagesThisYear.toLocaleString(), label: 'pages this year' },
      { number: String(app.books.reading.length), label: 'currently reading' },
    ];
  },
};
