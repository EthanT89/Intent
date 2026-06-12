// Reading (Libio) initial state — shelves start empty.
// Book search is now powered by the live Open Library catalog (see
// ./bookSearch.js). LIBIO_DISCOVERY_DATA below is still a small curated set of
// "what's next" recommendations shown on the discovery screen.

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

