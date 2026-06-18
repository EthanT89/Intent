// bookSearch.js — live book catalog backed by the Open Library Search API.
//
// Why Open Library:
//   • Free, no API key, no auth — works from a static host (GitHub Pages, your
//     portfolio site, anywhere).
//   • CORS-enabled, so the browser can call it directly. No backend needed.
//   • Covers ~40M editions / 20M+ works — effectively "every book, within reason."
//   • Cover thumbnails via a sibling CDN (covers.openlibrary.org).
//
// The catalog lives on Open Library's servers, so nothing is bundled into the
// app — the build stays tiny and search scales to the whole catalog. We keep it
// snappy with: debounced input (in the component), in-flight request abort, a
// small in-memory LRU cache, and lazy-loaded cover images.
//
// Swap target: to move to Google Books later, only mapDoc() + the URL change.

const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const COVER_CDN = 'https://covers.openlibrary.org/b/id';

// Fields we actually use — requesting a subset keeps responses small and fast.
const FIELDS = [
  'key', 'title', 'author_name', 'cover_i',
  'first_publish_year', 'number_of_pages_median', 'subject', 'edition_count',
].join(',');

// Muted spine palette used when a book has no cover art (deterministic per book).
const SPINE_PALETTE = [
  '#7A6B52', '#4B5A6B', '#8B6B4A', '#5A6B5A', '#7A6B8B',
  '#6B7A5A', '#8B7355', '#B87B5A', '#6B5A7A', '#5C6B6B',
  '#8B5A5A', '#5A7A6B',
];

// A curated genre vocabulary — Open Library subjects are noisy, so we map the
// first recognized subject to a clean label rather than surfacing raw tags.
const GENRE_MATCHERS = [
  [/fantasy/i, 'Fantasy'],
  [/science fiction|sci-fi|scifi/i, 'Sci-Fi'],
  [/myster|detective|thriller|crime/i, 'Mystery'],
  [/romance/i, 'Romance'],
  [/horror/i, 'Horror'],
  [/biograph|memoir|autobiograph/i, 'Biography'],
  [/history|historical/i, 'History'],
  [/philosoph|stoic/i, 'Philosophy'],
  [/psycholog/i, 'Psychology'],
  [/business|economic|management|finance/i, 'Business'],
  [/self-help|self help|personal development/i, 'Self-help'],
  [/poetry|poems/i, 'Poetry'],
  [/cook|recipe|food/i, 'Cooking'],
  [/science|physics|biology|mathematics/i, 'Science'],
  [/religio|spiritual|theolog/i, 'Religion'],
  [/comic|graphic novel|manga/i, 'Comics'],
  [/children|juvenile|picture book/i, "Children's"],
  [/fiction/i, 'Fiction'],
];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function colorFor(seed) {
  return SPINE_PALETTE[hashString(seed) % SPINE_PALETTE.length];
}

function pickGenre(subjects) {
  if (!Array.isArray(subjects)) return 'General';
  for (const [re, label] of GENRE_MATCHERS) {
    if (subjects.some(s => re.test(s))) return label;
  }
  return 'General';
}

export function coverUrl(coverId, size = 'M') {
  return coverId ? `${COVER_CDN}/${coverId}-${size}.jpg` : null;
}

// Map one Open Library "doc" into the app's book shape.
function mapDoc(doc) {
  const title = doc.title || 'Untitled';
  const author = (doc.author_name && doc.author_name[0]) || 'Unknown author';
  return {
    // Work key is a stable unique id across the whole catalog, e.g. "/works/OL27448W"
    id: doc.key,
    title,
    author,
    cover: coverUrl(doc.cover_i, 'M'),
    coverId: doc.cover_i || null,
    color: colorFor(`${title}|${author}`),
    totalPages: doc.number_of_pages_median || null,
    genre: pickGenre(doc.subject),
    year: doc.first_publish_year || null,
  };
}

// ── Tiny in-memory LRU cache so repeat / backspace queries are instant ───────
const CACHE_MAX = 50;
const cache = new Map();

function cacheGet(key) {
  if (!cache.has(key)) return undefined;
  const val = cache.get(key);
  cache.delete(key); cache.set(key, val); // bump to most-recent
  return val;
}
function cacheSet(key, val) {
  cache.set(key, val);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

/**
 * Search the global book catalog.
 * @param {string} query  free text — title, author, or ISBN
 * @param {object} opts   { signal?: AbortSignal, limit?: number }
 * @returns {Promise<Array>} normalized book objects (possibly empty)
 */
export async function searchBooks(query, { signal, limit = 20 } = {}) {
  const q = query.trim();
  if (!q) return [];

  const cacheKey = `${limit}:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}&limit=${limit}&fields=${FIELDS}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Book search failed (${res.status})`);

  const data = await res.json();
  const results = (data.docs || [])
    .filter(d => d.title) // drop malformed records
    .map(mapDoc);

  cacheSet(cacheKey, results);
  return results;
}

/**
 * Suggest what to read next, from the live catalog, based on the user's library:
 * more from authors they've read (weighted by rating) and more in their top genre.
 * Excludes books already on any shelf. Returns [] if there's nothing to seed from.
 * @param {object} books  the books slice { reading, read, wantToRead, paused }
 * @param {object} opts   { signal?: AbortSignal, limit?: number }
 */
export async function recommendBooks(books, { signal, limit = 8 } = {}) {
  const owned = new Set();
  const ownedKeys = new Set();
  const key = (b) => `${(b.title || '').toLowerCase()}|${(b.author || '').toLowerCase()}`;
  for (const shelf of ['reading', 'read', 'wantToRead', 'paused']) {
    for (const b of (books[shelf] || [])) { owned.add(b.id); ownedKeys.add(key(b)); }
  }

  const lib = [...(books.read || []), ...(books.reading || [])];
  // Top authors, weighted by how many you've read + your rating.
  const authorScore = {};
  lib.forEach(b => {
    if (b.author && b.author !== 'Unknown author') authorScore[b.author] = (authorScore[b.author] || 0) + 1 + (b.rating || 0);
  });
  const topAuthors = Object.entries(authorScore).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
  // Top genre.
  const genreScore = {};
  lib.forEach(b => { if (b.genre && b.genre !== 'General') genreScore[b.genre] = (genreScore[b.genre] || 0) + 1; });
  const topGenre = Object.entries(genreScore).sort((a, b) => b[1] - a[1])[0]?.[0];

  const queries = [];
  topAuthors.forEach(a => queries.push({ q: `author:"${a}"`, reason: `More from ${a}` }));
  if (topGenre) queries.push({ q: `subject:"${topGenre.toLowerCase()}"`, reason: `Because you read ${topGenre.toLowerCase()}` });
  if (queries.length === 0) return [];

  const out = [];
  const seen = new Set();
  for (const { q, reason } of queries) {
    let docs = [];
    try { docs = await searchBooks(q, { signal, limit: 12 }); } catch { continue; }
    for (const b of docs) {
      const k = key(b);
      if (!b.title || owned.has(b.id) || ownedKeys.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push({ ...b, reason });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
