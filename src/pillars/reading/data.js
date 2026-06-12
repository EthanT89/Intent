// Reading (Libio) initial state — shelves start empty.
// LIBIO_SEARCH_RESULTS / LIBIO_DISCOVERY_DATA are the prototype's mock search
// catalog: they aren't *your* data, they're the (for-now) stand-in for a real
// book-search API, and the only way to add books. Swap for a real API later.

export const LIBIO_BOOKS_SEED = {
  reading: [],
  read: [],
  wantToRead: [],
  paused: [],
};

export const LIBIO_STATS_DATA = {
  booksThisYear: 0, totalPages: 0, currentStreak: 0, avgRating: '—',
  goal: { current: 0, total: 20 },
  monthlyBooks: [
    { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
    { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 },
    { month: 'Jul', count: 0 }, { month: 'Aug', count: 0 }, { month: 'Sep', count: 0 },
    { month: 'Oct', count: 0 }, { month: 'Nov', count: 0 }, { month: 'Dec', count: 0 },
  ],
  topGenres: [],
};

export const LIBIO_DISCOVERY_DATA = [
  { id: 10, title: 'A Guide to the Good Life', author: 'William B. Irvine', color: '#7A6B52',
    reason: 'A modern, practical take on Stoicism.' },
  { id: 11, title: 'The Name of the Wind', author: 'Patrick Rothfuss', color: '#4B5A6B',
    reason: 'Epic fantasy with world-building readers love.' },
  { id: 12, title: 'Stillness Is the Key', author: 'Ryan Holiday', color: '#8B6B4A',
    reason: 'On finding calm in a loud world.' },
  { id: 13, title: 'Diamond Age', author: 'Neal Stephenson', color: '#5A6B5A',
    reason: 'A Stephenson classic.' },
];

export const LIBIO_SEARCH_RESULTS = [
  { id: 101, title: 'The Daily Stoic', author: 'Ryan Holiday', color: '#8B7355' },
  { id: 102, title: 'Letters from a Stoic', author: 'Seneca', color: '#6B7A5A' },
  { id: 103, title: 'How to Think Like a Roman Emperor', author: 'Donald Robertson', color: '#7A6B8B' },
  { id: 104, title: 'A Guide to the Good Life', author: 'William B. Irvine', color: '#8B6B4A' },
  { id: 105, title: 'The Obstacle Is the Way', author: 'Ryan Holiday', color: '#B87B5A' },
  { id: 106, title: 'Meditations', author: 'Marcus Aurelius', color: '#8B7355' },
];
