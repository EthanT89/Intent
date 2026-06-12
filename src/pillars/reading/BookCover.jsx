import React from 'react';

// BookCover — renders a book's cover art when available, otherwise a tasteful
// colored spine (the original prototype look). Used in search results, shelves,
// and detail screens so covers appear everywhere a book is shown.
//
// Cover images load lazily and fade in; if the image 404s (Open Library has the
// record but no art) we fall back to the color spine automatically.
export function BookCover({ book, width = 40, height = 56, radius = 5, style = {} }) {
  const [failed, setFailed] = React.useState(false);
  const showImage = book.cover && !failed;

  return (
    <div style={{
      width, height, borderRadius: radius, flexShrink: 0,
      background: book.color || '#8B7355',
      boxShadow: '1px 2px 6px rgba(44,36,24,0.14)',
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      {/* Subtle spine sheen — only visible on the color fallback */}
      {!showImage && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 55%)',
        }} />
      )}
      {showImage && (
        <img
          src={book.cover}
          alt={book.title ? `Cover of ${book.title}` : 'Book cover'}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}
