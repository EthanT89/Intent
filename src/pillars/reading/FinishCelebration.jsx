import React from 'react';
import { BookCover } from './BookCover.jsx';

// Celebration overlay shown when a book is finished. Confetti + a warm message,
// the running "books this year" count, and a nudge toward the next read.
const LINES = [
  'One more story lived.',
  'Another one for the shelf.',
  'Finished — and well read.',
  'The last page turned.',
  'A book completed is a small triumph.',
];
const NUDGES = [
  'What will you open next?',
  'Your next read is waiting.',
  'Time to pick the next one.',
  'On to the next adventure.',
];

const CONFETTI = ['#C4956A', '#7A8C7E', '#8B6B4A', '#7C6F8E', '#B8893E', '#6B7A5A'];

export function FinishCelebration({ book, booksThisYear, onClose, onFindNext }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Stable per-mount picks (no Math.random in render path that re-runs).
  const pick = React.useMemo(() => ({
    line: LINES[Math.floor(Math.random() * LINES.length)],
    nudge: NUDGES[Math.floor(Math.random() * NUDGES.length)],
    pieces: Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.6 + Math.random() * 1.2,
      color: CONFETTI[i % CONFETTI.length],
      rot: Math.random() * 360,
      size: 6 + Math.random() * 6,
    })),
  }), []);

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 400,
      background: `rgba(26,20,16,${shown ? 0.55 : 0})`,
      transition: 'background 0.35s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'hidden',
      backdropFilter: shown ? 'blur(2px)' : 'none', WebkitBackdropFilter: shown ? 'blur(2px)' : 'none',
    }}>
      {/* Confetti */}
      {pick.pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -20, left: `${p.left}%`,
          width: p.size, height: p.size * 1.4, background: p.color, borderRadius: 1,
          transform: `rotate(${p.rot}deg)`,
          animation: shown ? `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(.3,.5,.5,1) forwards` : 'none',
          opacity: 0,
        }} />
      ))}

      <div onClick={e => e.stopPropagation()} style={{
        background: '#FAF7F2', borderRadius: 24, padding: '32px 26px 26px',
        width: '100%', maxWidth: 320, textAlign: 'center', position: 'relative',
        boxShadow: '0 20px 60px rgba(26,20,16,0.4)',
        transform: shown ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(12px)',
        opacity: shown ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(.2,.9,.3,1.1), opacity 0.3s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ transform: shown ? 'rotate(0)' : 'rotate(-8deg)', transition: 'transform 0.5s 0.1s cubic-bezier(.2,.9,.3,1.1)' }}>
            <BookCover book={book} width={72} height={104} radius={8} />
          </div>
        </div>

        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4956A', marginBottom: 8 }}>
          Finished
        </div>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 700, color: '#2C2418', lineHeight: 1.25, marginBottom: 6 }}>
          {book.title}
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 14, color: '#8C7B63', marginBottom: 18 }}>
          {pick.line}
        </p>

        <div style={{
          background: '#FFF8F0', border: '0.5px solid #EAE0D4', borderRadius: 16,
          padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: 34, fontWeight: 700, color: '#2C2418', lineHeight: 1 }}>
            {booksThisYear}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#A89880', marginTop: 4 }}>
            {booksThisYear === 1 ? 'book read this year' : 'books read this year'}
          </div>
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#A89880', marginBottom: 18 }}>
          {pick.nudge}
        </p>

        <button onClick={onFindNext} style={{
          width: '100%', padding: '13px', background: '#2C2418', color: '#FAF7F2',
          border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
        }}>Find my next read</button>
        <button onClick={onClose} style={{
          width: '100%', padding: '10px', background: 'transparent', color: '#A89880',
          border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Done</button>
      </div>
    </div>
  );
}
