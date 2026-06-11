// Reading (Libio) seed data — first-run library contents.
// Reading order = priority: index 0 is the "primary" book.

export const LIBIO_BOOKS_SEED = {
  reading: [
    { id: 1, title: 'Meditations', author: 'Marcus Aurelius', genre: 'Philosophy', color: '#8B7355',
      currentPage: 134, totalPages: 215, progress: 62, daysLeft: 4,
      quotes: [{ text: 'You have power over your mind, not outside events.', page: 48 }], rating: 0 },
    { id: 2, title: 'Snow Crash', author: 'Neal Stephenson', genre: 'Sci-Fi', color: '#4A6741',
      currentPage: 98, totalPages: 543, progress: 18, daysLeft: 22, quotes: [], rating: 0 },
    { id: 7, title: 'The Overstory', author: 'Richard Powers', genre: 'Fiction', color: '#5E6B47',
      currentPage: 211, totalPages: 502, progress: 42, daysLeft: 14, quotes: [], rating: 0 },
  ],
  read: [
    { id: 3, title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', color: '#C4956A',
      currentPage: 197, totalPages: 197, progress: 100, finishedDate: 'Jan 12, 2026', quotes: [], rating: 5 },
    { id: 4, title: 'Tuesdays with Morrie', author: 'Mitch Albom', genre: 'Memoir', color: '#7A8FA6',
      currentPage: 192, totalPages: 192, progress: 100, finishedDate: 'Mar 3, 2026', quotes: [], rating: 4 },
  ],
  wantToRead: [
    { id: 5, title: 'The Obstacle Is the Way', author: 'Ryan Holiday', genre: 'Philosophy', color: '#B87B5A',
      currentPage: 0, totalPages: 224, progress: 0, tags: ['favorites'], quotes: [], rating: 0 },
    { id: 6, title: 'Cryptonomicon', author: 'Neal Stephenson', genre: 'Sci-Fi', color: '#556B7A',
      currentPage: 0, totalPages: 918, progress: 0, tags: ['re-read someday'], quotes: [], rating: 0 },
  ],
  paused: [
    { id: 8, title: 'Infinite Jest', author: 'David Foster Wallace', genre: 'Fiction', color: '#3D4A5C',
      currentPage: 184, totalPages: 1079, progress: 17, pausedDate: 'Feb 8, 2026', quotes: [], rating: 0 },
  ],
};

export const LIBIO_STATS_DATA = {
  booksThisYear: 8, totalPages: 2847, currentStreak: 12, avgRating: 4.5,
  goal: { current: 8, total: 20 },
  monthlyBooks: [
    { month: 'Jan', count: 2 }, { month: 'Feb', count: 1 }, { month: 'Mar', count: 2 },
    { month: 'Apr', count: 1 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 },
    { month: 'Jul', count: 0 }, { month: 'Aug', count: 0 }, { month: 'Sep', count: 0 },
    { month: 'Oct', count: 0 }, { month: 'Nov', count: 0 }, { month: 'Dec', count: 0 },
  ],
  topGenres: [
    { genre: 'Philosophy', pct: 40 }, { genre: 'Fiction', pct: 35 }, { genre: 'Sci-Fi', pct: 25 },
  ],
};

export const LIBIO_DISCOVERY_DATA = [
  { id: 10, title: 'A Guide to the Good Life', author: 'William B. Irvine', color: '#7A6B52',
    reason: 'You loved Meditations — this modern take on Stoicism is a natural next read.' },
  { id: 11, title: 'The Name of the Wind', author: 'Patrick Rothfuss', color: '#4B5A6B',
    reason: 'Fans of Snow Crash who enjoy world-building tend to love this epic fantasy.' },
  { id: 12, title: 'Stillness Is the Key', author: 'Ryan Holiday', color: '#8B6B4A',
    reason: 'Pairs perfectly with The Obstacle Is the Way on your want-to-read shelf.' },
  { id: 13, title: 'Diamond Age', author: 'Neal Stephenson', color: '#5A6B5A',
    reason: "Another Stephenson classic — you're clearly enjoying Snow Crash." },
];

export const LIBIO_SEARCH_RESULTS = [
  { id: 101, title: 'The Daily Stoic', author: 'Ryan Holiday', color: '#8B7355' },
  { id: 102, title: 'Letters from a Stoic', author: 'Seneca', color: '#6B7A5A' },
  { id: 103, title: 'How to Think Like a Roman Emperor', author: 'Donald Robertson', color: '#7A6B8B' },
  { id: 104, title: 'A Guide to the Good Life', author: 'William B. Irvine', color: '#8B6B4A' },
  { id: 105, title: 'The Obstacle Is the Way', author: 'Ryan Holiday', color: '#B87B5A' },
];
