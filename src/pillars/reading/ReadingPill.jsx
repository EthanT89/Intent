import React from 'react';
import { T } from '../../theme/tokens.js';
import { PillarPill, CategoryLabel, Glyph, ProgressBar } from '../../components/primitives.jsx';
import { useApp } from '../../store/AppStateContext.jsx';
import { useUI } from '../../store/uiContext.js';

// Today-screen pill: swipeable carousel for 1..n current reads.

export function ReadingPill() {
  const { books } = useApp();
  const { navigateToPillar, logReadingSession } = useUI();
  const reading = books.reading || [];
  const scrollRef = React.useRef(null);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const onNavigate = () => navigateToPillar('reading');

  // Empty state — no current reads
  if (reading.length === 0) {
    return (
      <PillarPill onNavigate={onNavigate}>
        <CategoryLabel>currently reading</CategoryLabel>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Glyph color={T.pillars.reading} />
          <div style={{ flex: 1, paddingRight: 16 }}>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
              color: T.ink, lineHeight: 1.3, marginBottom: 4,
            }}>Nothing on the nightstand.</div>
            <div style={{
              fontFamily: T.fontSans, fontSize: 13, color: T.muted,
            }}>Open Library to add a book.</div>
          </div>
        </div>
      </PillarPill>
    );
  }

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  // Single book — render as plain card (no carousel chrome)
  if (reading.length === 1) {
    return (
      <PillarPill onNavigate={onNavigate}>
        <CategoryLabel>currently reading</CategoryLabel>
        <ReadingBookCard book={reading[0]} onLogSession={logReadingSession} />
      </PillarPill>
    );
  }

  return (
    <PillarPill onNavigate={onNavigate}>
      <CategoryLabel>
        {activeIdx === 0 ? 'currently reading' : 'also reading'}
      </CategoryLabel>

      {/* Carousel — scroll-snap horizontal */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={e => e.stopPropagation()} // swipe shouldn't navigate
        className="intent-scroll"
        style={{
          display: 'flex', overflowX: 'auto', overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          margin: '0 -2px',
        }}
      >
        {reading.map((b) => (
          <div key={b.id} style={{
            flex: '0 0 100%', scrollSnapAlign: 'center', scrollSnapStop: 'always',
            padding: '0 2px', boxSizing: 'border-box',
          }}>
            <ReadingBookCard book={b} onLogSession={logReadingSession} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 6,
        marginTop: 10,
      }}>
        {reading.map((_, i) => (
          <button
            key={i}
            onClick={e => {
              e.stopPropagation();
              const el = scrollRef.current;
              if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
            }}
            aria-label={`Book ${i + 1}`}
            style={{
              width: i === activeIdx ? 16 : 5, height: 5, borderRadius: 999,
              background: i === activeIdx ? T.pillars.reading : T.border,
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'width 0.25s ease, background 0.2s ease',
            }}
          />
        ))}
      </div>
    </PillarPill>
  );
}

function ReadingBookCard({ book, onLogSession }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <Glyph color={book.color || T.pillars.reading} />
      <div style={{ flex: 1, paddingRight: 16, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
          color: T.ink, lineHeight: 1.3, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{book.title}</div>
        <div style={{
          fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 10,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{book.author}</div>
        <ProgressBar pct={book.progress} style={{ marginBottom: 8 }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: T.fontSans, fontSize: 12, color: T.muted,
        }}>
          <span>p. {book.currentPage} / {book.totalPages}</span>
          <button onClick={e => { e.stopPropagation(); onLogSession && onLogSession(book); }} style={{
            fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
            color: T.amber, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }}>Log session</button>
        </div>
      </div>
    </div>
  );
}
