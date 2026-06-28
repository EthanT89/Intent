import React from 'react';
import { T } from '../theme/tokens.js';

// A small, earned moment when the active streak crosses a milestone. Same warm,
// quiet tone as the book-finished celebration — confetti, a number, a line.
const LINES = {
  3: 'Three days. A thread is forming.',
  7: 'A full week of showing up.',
  14: 'Two weeks steady.',
  21: 'Three weeks — this is becoming who you are.',
  30: 'A month of intention. Remarkable.',
  50: 'Fifty days. Quietly relentless.',
  75: 'Seventy-five days strong.',
  100: 'One hundred days. A century of showing up.',
  150: '150 days. This is a practice now.',
  200: 'Two hundred days of intention.',
  365: 'A year. An entire year. Look what you built.',
};
const CONFETTI = ['#C4956A', '#7A8C7E', '#8B6B4A', '#7C6F8E', '#B8893E', '#6B7A5A'];

export function StreakCelebration({ milestone, onClose }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pieces = React.useMemo(() => reduceMotion ? [] : Array.from({ length: 30 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1.6 + Math.random() * 1.2,
    color: CONFETTI[i % CONFETTI.length], size: 6 + Math.random() * 6,
  })), [reduceMotion]);
  const line = LINES[milestone] || `${milestone} days of showing up.`;

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 400,
      background: `rgba(26,20,16,${shown ? 0.55 : 0})`, transition: 'background 0.35s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden',
      backdropFilter: shown ? 'blur(2px)' : 'none', WebkitBackdropFilter: shown ? 'blur(2px)' : 'none',
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -20, left: `${p.left}%`, width: p.size, height: p.size * 1.4,
          background: p.color, borderRadius: 1, opacity: 0,
          animation: shown ? `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(.3,.5,.5,1) forwards` : 'none',
        }} />
      ))}
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, borderRadius: 24, padding: '34px 26px 24px', width: '100%', maxWidth: 320, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(26,20,16,0.4)',
        transform: shown ? 'scale(1)' : 'scale(0.9)', opacity: shown ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(.2,.9,.3,1.1), opacity 0.3s',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 44, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{milestone}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.amber, marginTop: 6 }}>day streak</div>
        <p style={{ fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 15, color: T.ink, lineHeight: 1.5, margin: '16px 0 22px' }}>{line}</p>
        <button onClick={onClose} style={{
          width: '100%', padding: '13px', background: T.ink, color: '#FAF7F2', border: 'none',
          borderRadius: 14, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Keep going</button>
      </div>
    </div>
  );
}
