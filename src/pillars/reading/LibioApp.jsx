import React from 'react';
import { useApp } from '../../store/AppStateContext.jsx';
import { greetingForNow, isThisYear, weekStart, dateKey, addDays } from '../../lib/dates.js';
import {
  LIBIO_STATS_DATA, LIBIO_DISCOVERY_DATA,
} from './data.js';
import { searchBooks } from './bookSearch.js';
import { BookCover } from './BookCover.jsx';

// Full Libio app embedded as the Reading pillar — ported 1:1 from the design
// prototype (intent-libio.jsx). Libio keeps its own fixed palette; it reads as
// a distinct app living inside Intent.

const SAFE_TOP_PAD = 'calc(var(--safe-top) + 24px)';

// Convert a stored finished-date label ("Jun 15, 2026") or ISO string into the
// YYYY-MM-DD a <input type="date"> expects. Falls back to today.
function toDateInput(label) {
  if (!label) return '';
  const d = new Date(label);
  if (isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ─── Common components ────────────────────────────────────────────────────────
export function LibioBookCover({ color, cover, title, width = 44, height = 64 }) {
  const [failed, setFailed] = React.useState(false);
  const showImage = cover && !failed;
  return (
    <div style={{
      width, height, borderRadius: 6, background: color, flexShrink: 0,
      display: 'flex', alignItems: 'flex-end', padding: 4,
      boxShadow: '2px 2px 8px rgba(44,36,24,0.15)',
      position: 'relative', overflow: 'hidden',
    }}>
      {!showImage && <>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }} />
        <div style={{
          width: '100%', height: 1, background: 'rgba(255,255,255,0.2)',
          position: 'absolute', top: '30%', left: 0,
        }} />
      </>}
      {showImage && (
        <img src={cover} alt={title ? `Cover of ${title}` : 'Book cover'}
          loading="lazy" onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

export function LibioProgressBar({ pct, height = 4, color = '#C4956A', trackColor = '#EAE0D4' }) {
  return (
    <div style={{ height, borderRadius: 999, background: trackColor, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: color,
        borderRadius: 999, transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function LibioTagPill({ label }) {
  return (
    <span style={{
      background: '#FFF8F0', color: '#8B5E3C',
      borderRadius: 999, padding: '3px 10px',
      fontSize: 11, fontFamily: "'DM Sans', sans-serif",
      fontWeight: 500, letterSpacing: 0.2, border: '0.5px solid #EAE0D4',
    }}>{label}</span>
  );
}

function LibioStarRating({ rating, onRate, size = 18 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onRate && onRate(i)} style={{
          fontSize: size, cursor: onRate ? 'pointer' : 'default',
          color: i <= rating ? '#C4956A' : '#EAE0D4', lineHeight: 1,
        }}>★</span>
      ))}
    </div>
  );
}

// ─── Libio internal tab bar ───────────────────────────────────────────────────
function LibioTabBar({ activeTab, onTabChange }) {
  const tabs = [
    {
      id: 'home', label: 'Home',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 12L12 4l9 8" stroke={active ? '#C4956A' : '#A89880'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={active ? '#C4956A' : '#A89880'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'library', label: 'Library',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="4" height="18" rx="1" stroke={active ? '#C4956A' : '#A89880'} strokeWidth="1.8"/>
          <rect x="10" y="3" width="4" height="18" rx="1" stroke={active ? '#C4956A' : '#A89880'} strokeWidth="1.8"/>
          <path d="M16.5 3.5l3.8 17.1" stroke={active ? '#C4956A' : '#A89880'} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'stats', label: 'Stats',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="14" width="4" height="7" rx="1" fill={active ? '#C4956A' : '#A89880'}/>
          <rect x="10" y="9" width="4" height="12" rx="1" fill={active ? '#C4956A' : '#A89880'}/>
          <rect x="17" y="4" width="4" height="17" rx="1" fill={active ? '#C4956A' : '#A89880'}/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(24px + var(--safe-bottom))',
      left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
      borderRadius: 999, padding: '10px 28px',
      display: 'flex', gap: 36, alignItems: 'center',
      boxShadow: '0 4px 24px rgba(44,36,24,0.12), 0 0 0 0.5px rgba(234,224,212,0.8)',
      zIndex: 100,
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
          background: 'none', border: 'none', padding: '4px 8px',
          cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, outline: 'none',
        }}>
          {tab.icon(activeTab === tab.id)}
          <span style={{
            fontSize: 10, fontFamily: "'DM Sans', sans-serif",
            color: activeTab === tab.id ? '#C4956A' : '#A89880',
            fontWeight: activeTab === tab.id ? 600 : 400, letterSpacing: 0.2,
          }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Log Session Sheet ────────────────────────────────────────────────────────
export function LibioLogSessionSheet({ book, onClose, onSave }) {
  const [currentPage, setCurrentPage] = React.useState('');
  const [finishChecked, setFinishChecked] = React.useState(false);
  const [date] = React.useState(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );

  const lastPage = book ? book.currentPage : 0;
  const entered = currentPage === '' ? null : parseInt(currentPage);
  const pagesRead = entered !== null ? entered - lastPage : null;
  const isWarning = entered !== null && entered < lastPage;
  const isOver = entered !== null && entered > book.totalPages;
  const isValid = entered !== null && entered > lastPage && entered <= book.totalPages;
  const canSave = finishChecked || isValid;

  const handleSave = () => {
    if (finishChecked) { onSave(isValid ? pagesRead : 0, true); onClose(); return; }
    if (!isValid) return;
    onSave(pagesRead, false);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(44,36,24,0.28)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#FFFFFF',
        borderRadius: '20px 20px 0 0',
        padding: '0 24px calc(44px + var(--safe-bottom))',
        boxShadow: '0 -2px 24px rgba(44,36,24,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#EAE0D4' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
          <h2 style={{ fontFamily: "'Lora', serif", fontSize: 21, color: '#2C2418', fontWeight: 600 }}>Log session</h2>
          <button onClick={onClose} style={{
            background: '#F0EAE0', border: 'none', borderRadius: 999,
            width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A89880', fontSize: 17, lineHeight: 1,
          }}>×</button>
        </div>
        {book && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', background: '#FFF8F0',
            borderRadius: 12, marginBottom: 22, border: '0.5px solid #EAE0D4',
          }}>
            <LibioBookCover color={book.color} cover={book.cover} title={book.title} width={32} height={44} />
            <div>
              <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontWeight: 600, color: '#2C2418', lineHeight: 1.3 }}>{book.title}</p>
              <p style={{ fontSize: 12, color: '#A89880', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{book.author}</p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: '#2C2418', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Date</span>
          <span style={{ fontSize: 14, color: '#A89880', fontFamily: "'DM Sans', sans-serif" }}>{date}</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <input
            type="number" min="1"
            placeholder={String(lastPage)}
            value={currentPage}
            onChange={e => setCurrentPage(e.target.value)}
            style={{
              width: '100%', padding: '8px 14px',
              border: 'none', background: 'transparent',
              fontFamily: "'Lora', serif", fontSize: 56, fontWeight: 700,
              color: currentPage === '' ? '#A89880' : '#2C2418',
              textAlign: 'center', outline: 'none', lineHeight: 1,
            }}
          />
          <p style={{ fontSize: 13, color: '#A89880', fontFamily: "'DM Sans', sans-serif" }}>current page</p>
        </div>
        <div style={{ textAlign: 'center', minHeight: 24, marginBottom: 24 }}>
          {isWarning && (
            <p style={{ fontSize: 12, color: '#C4956A', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              Hmm, that's before p. {lastPage} — did you flip the book upside down?
            </p>
          )}
          {isOver && (
            <p style={{ fontSize: 12, color: '#C4956A', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              Wow — didn't know there was an extended edition! This one only has {book.totalPages} pages.
            </p>
          )}
          {isValid && !finishChecked && (
            <p style={{ fontSize: 12, color: '#A89880', fontFamily: "'DM Sans', sans-serif" }}>
              Read {pagesRead} pages · was on p. {lastPage}
            </p>
          )}
          {finishChecked && (
            <p style={{ fontSize: 12, color: '#7A8C7E', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              Marking as finished — no need for the exact page.
            </p>
          )}
        </div>

        {/* Finish toggle — log this session AND mark the book done in one tap */}
        <button onClick={() => setFinishChecked(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', marginBottom: 16, cursor: 'pointer', textAlign: 'left',
          background: finishChecked ? '#F2F5F0' : '#FAF7F2',
          border: `1px solid ${finishChecked ? '#7A8C7E' : '#EAE0D4'}`, borderRadius: 14,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            border: `1.5px solid ${finishChecked ? '#7A8C7E' : '#C2B6A2'}`,
            background: finishChecked ? '#7A8C7E' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {finishChecked && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5l3.2 3L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </span>
          <span>
            <span style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2C2418' }}>I finished the book 🎉</span>
            <span style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#A89880', marginTop: 1 }}>Logs this session and marks it done</span>
          </span>
        </button>

        <button onClick={handleSave} disabled={!canSave} style={{
          width: '100%', padding: '15px',
          background: finishChecked ? '#7A8C7E' : '#2C2418', color: '#FAF7F2',
          border: 'none', borderRadius: 999,
          fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
          cursor: canSave ? 'pointer' : 'default',
          opacity: canSave ? 1 : 0.35, transition: 'opacity 0.2s, background 0.2s',
        }}>{finishChecked ? 'Finish book' : 'Save session'}</button>
      </div>
    </div>
  );
}

// ─── Shelf Picker Modal ───────────────────────────────────────────────────────
function LibioShelfPickerModal({ book, onSelect, onDismiss }) {
  const shelves = [
    { id: 'reading', label: 'Reading', filled: true },
    { id: 'wantToRead', label: 'Want to Read', filled: false },
    { id: 'read', label: 'Read', filled: false },
  ];
  return (
    <div onClick={onDismiss} style={{
      position: 'absolute', inset: 0, zIndex: 300,
      background: 'rgba(44,36,24,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 280, background: '#FFFFFF', borderRadius: 20,
        padding: '28px 24px 20px',
        boxShadow: '0 8px 32px rgba(44,36,24,0.14)',
      }}>
        <p style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 600, color: '#2C2418', textAlign: 'center', marginBottom: 6 }}>Add to shelf</p>
        {book && (
          <p style={{ fontSize: 12, color: '#A89880', textAlign: 'center', marginBottom: 20, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
            {book.title}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shelves.map(s => (
            <button key={s.id} onClick={() => onSelect(s.id)} style={{
              width: '100%', padding: '13px', borderRadius: 999,
              border: s.filled ? 'none' : '1.5px solid #2C2418',
              background: s.filled ? '#2C2418' : 'transparent',
              color: s.filled ? '#FAF7F2' : '#2C2418',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{s.label}</button>
          ))}
        </div>
        <button onClick={onDismiss} style={{
          display: 'block', margin: '16px auto 0',
          background: 'none', border: 'none',
          fontSize: 13, color: '#A89880',
          fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function LibioHomeScreen({ books, stats, onBookTap, onLogSession, onDiscovery, onAddBook, userName }) {
  const currentBook = books.reading[0];
  const otherCurrent = books.reading.slice(1);
  const hasAnyBooks = ['reading','read','wantToRead','paused'].some(s => (books[s] || []).length > 0);
  // Live figures for the streak + yearly-goal pills.
  const a = computeReadingAnalytics(books);
  const goalTotal = (stats && stats.goal && stats.goal.total) || 20;
  return (
    <div className="intent-scroll" style={{
      height: '100%', overflowY: 'auto', overflowX: 'hidden',
      padding: `${SAFE_TOP_PAD} 20px 100px`,
      fontFamily: "'DM Sans', sans-serif",
      background: '#FAF7F2',
    }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#A89880', marginBottom: 4 }}>{greetingForNow()}</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: 28, color: '#2C2418', fontWeight: 600, lineHeight: 1.2 }}>{userName}.</h1>
      </div>

      {/* Empty state — nothing on any shelf yet */}
      {!currentBook && (
        <div style={{
          background: '#FFFFFF', border: '0.5px solid #EAE0D4',
          borderRadius: 20, padding: '36px 24px', marginBottom: 16, textAlign: 'center',
        }}>
          <svg width="64" height="48" viewBox="0 0 64 48" fill="none" style={{ marginBottom: 16 }}>
            <path d="M32 8 C24 8 14 10 8 14 L8 40 C14 37 24 36 32 38 C40 36 50 37 56 40 L56 14 C50 10 40 8 32 8Z" stroke="#C4956A" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <path d="M32 8 L32 38" stroke="#C4956A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h3 style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 600, color: '#2C2418', marginBottom: 8 }}>
            Nothing on the nightstand.
          </h3>
          <p style={{ fontSize: 13, color: '#A89880', lineHeight: 1.5, marginBottom: 20 }}>
            Add your first book to start tracking.
          </p>
          <button onClick={onAddBook} style={{
            padding: '12px 22px', background: '#2C2418', color: '#FAF7F2',
            border: 'none', borderRadius: 999, fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, fontWeight: 600, cursor: 'pointer', margin: '0 auto',
          }}>+ Add a book</button>
        </div>
      )}

      {/* Currently Reading — primary */}
      {currentBook && (
        <div onClick={() => onBookTap(currentBook)} style={{
          background: '#FFFFFF', border: '0.5px solid #EAE0D4',
          borderRadius: 20, padding: 20, marginBottom: otherCurrent.length > 0 ? 10 : 16, cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500 }}>Currently Reading</p>
            {otherCurrent.length > 0 && (
              <span style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.4, fontWeight: 500 }}>Primary</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <LibioBookCover color={currentBook.color} width={52} height={76} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 600, color: '#2C2418', marginBottom: 4, lineHeight: 1.3 }}>{currentBook.title}</h3>
              <p style={{ fontSize: 13, color: '#A89880', marginBottom: 12 }}>{currentBook.author}</p>
              <LibioProgressBar pct={currentBook.progress} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: '#A89880' }}>p. {currentBook.currentPage} / {currentBook.totalPages}</span>
                <span style={{ fontSize: 12, color: '#A89880' }}>{currentBook.progress}%{currentBook.daysLeft ? ` · ${currentBook.daysLeft}d left` : ''}</span>
              </div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onLogSession(currentBook); }} style={{
            width: '100%', padding: '13px',
            background: '#2C2418', color: '#FAF7F2',
            border: 'none', borderRadius: 12,
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Log reading session</button>
        </div>
      )}

      {/* Also reading */}
      {otherCurrent.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 500, padding: '10px 4px 8px' }}>
            Also reading
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherCurrent.map(b => (
              <div key={b.id} onClick={() => onBookTap(b)} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                background: '#FFFFFF', border: '0.5px solid #EAE0D4',
                borderRadius: 14, padding: '10px 12px', cursor: 'pointer',
              }}>
                <LibioBookCover color={b.color} width={32} height={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontWeight: 600, color: '#2C2418', lineHeight: 1.3, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#A89880' }}>{b.progress}%</span>
                    <span style={{ fontSize: 11, color: '#EAE0D4' }}>·</span>
                    <span style={{ fontSize: 11, color: '#A89880' }}>p. {b.currentPage} / {b.totalPages}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onLogSession(b); }} style={{
                  background: '#FFF8F0', border: '0.5px solid #EAE0D4', borderRadius: 999,
                  padding: '6px 12px', color: '#C4956A', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                }}>Log</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontSize: 11, color: '#A89880', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>Streak</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#2C2418', fontFamily: "'Lora', serif" }}>{a.streak}</p>
          <p style={{ fontSize: 11, color: '#A89880' }}>days in a row</p>
        </div>
        <div style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            <span style={{ fontSize: 11, color: '#A89880', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>{new Date().getFullYear()} Goal</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#2C2418', fontFamily: "'Lora', serif" }}>
            {a.booksThisYear}<span style={{ fontSize: 13, color: '#A89880', fontWeight: 400 }}>/{goalTotal}</span>
          </p>
          <LibioProgressBar pct={(a.booksThisYear / goalTotal) * 100} height={3} />
        </div>
      </div>

      {/* What's Next — only once there's something in the library */}
      {hasAnyBooks && (
      <div style={{ background: '#FFF8F0', border: '0.5px solid #EAE0D4', borderRadius: 20, padding: 20 }}>
        <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>What's Next?</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <LibioBookCover color="#7A6B52" width={44} height={64} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 600, color: '#2C2418', marginBottom: 3 }}>A Guide to the Good Life</h4>
            <p style={{ fontSize: 12, color: '#A89880', marginBottom: 6 }}>William B. Irvine</p>
            <p style={{ fontSize: 12, color: '#8B6B4A', lineHeight: 1.5 }}>You loved Meditations — a natural Stoic companion.</p>
          </div>
        </div>
        <button onClick={onDiscovery} style={{
          padding: '10px 18px', background: 'transparent', color: '#2C2418',
          border: '1.5px solid #2C2418', borderRadius: 10,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>See why</button>
      </div>
      )}
    </div>
  );
}

// ─── Library Screen ───────────────────────────────────────────────────────────
function LibioLibraryScreen({ books, onBookTap, onAddBook }) {
  const [shelf, setShelf] = React.useState('reading');
  const shelves = [
    { id: 'reading', label: 'Reading' },
    { id: 'read', label: 'Read' },
    { id: 'wantToRead', label: 'Want to Read' },
    { id: 'paused', label: 'Paused' },
  ];
  const currentBooks = books[shelf] || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2' }}>
      <div style={{ padding: `${SAFE_TOP_PAD} 20px 16px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: '#2C2418' }}>Library</h1>
        <button onClick={onAddBook} style={{
          background: '#2C2418', color: '#FAF7F2', border: 'none', borderRadius: 999,
          padding: '7px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add
        </button>
      </div>
      <div className="intent-scroll" style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexShrink: 0, overflowX: 'auto' }}>
        {shelves.map(s => (
          <button key={s.id} onClick={() => setShelf(s.id)} style={{
            padding: '8px 14px', borderRadius: 999, border: 'none',
            background: shelf === s.id ? '#2C2418' : '#F0EAE0',
            color: shelf === s.id ? '#FAF7F2' : '#A89880',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{s.label}</button>
        ))}
      </div>
      <div className="intent-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
        {currentBooks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center' }}>
            <svg width="64" height="48" viewBox="0 0 64 48" fill="none" style={{ marginBottom: 20 }}>
              <path d="M32 8 C24 8 14 10 8 14 L8 40 C14 37 24 36 32 38 C40 36 50 37 56 40 L56 14 C50 10 40 8 32 8Z" stroke="#C4956A" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
              <path d="M32 8 L32 38" stroke="#C4956A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <h3 style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 600, color: '#2C2418', marginBottom: 8 }}>Nothing here yet</h3>
            <p style={{ fontSize: 14, color: '#A89880', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: 24 }}>
              {shelf === 'reading' ? 'What are you diving into?'
                : shelf === 'read' ? 'Your finished books will live here.'
                : shelf === 'paused' ? "Books you've set aside will live here — you can always pick them back up."
                : "Save books you're curious about."}
            </p>
            {shelf !== 'paused' && (
              <button onClick={onAddBook} style={{
                padding: '12px 22px', background: '#2C2418', color: '#FAF7F2',
                border: 'none', borderRadius: 999, fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 16 }}>+</span> Add a book
              </button>
            )}
          </div>
        ) : (
          currentBooks.map((book, i) => (
            <div key={book.id} onClick={() => onBookTap(book)} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: i < currentBooks.length - 1 ? '0.5px solid #EAE0D4' : 'none',
              cursor: 'pointer',
            }}>
              <LibioBookCover color={book.color} cover={book.cover} title={book.title} width={44} height={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <h3 style={{ fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 600, color: '#2C2418', lineHeight: 1.3, flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                  {shelf === 'reading' && i === 0 && currentBooks.length > 1 && (
                    <span style={{
                      fontSize: 9, color: '#C4956A', letterSpacing: 0.6,
                      textTransform: 'uppercase', fontWeight: 600,
                      background: '#FFF8F0', border: '0.5px solid #EAE0D4',
                      padding: '2px 6px', borderRadius: 999, flexShrink: 0,
                    }}>Primary</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#A89880', marginBottom: 8 }}>{book.author}</p>
                {shelf === 'reading' && (
                  <div>
                    <LibioProgressBar pct={book.progress} height={3} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: '#A89880' }}>{book.progress}%</span>
                      <span style={{ fontSize: 11, color: '#A89880' }}>{book.daysLeft ? `${book.daysLeft}d left` : ''}</span>
                    </div>
                  </div>
                )}
                {shelf === 'read' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <LibioStarRating rating={book.rating} size={14} />
                    <span style={{ fontSize: 11, color: '#A89880' }}>Finished {book.finishedDate}</span>
                  </div>
                )}
                {shelf === 'wantToRead' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(book.tags || []).map(tag => <LibioTagPill key={tag} label={tag} />)}
                  </div>
                )}
                {shelf === 'paused' && (
                  <div>
                    <LibioProgressBar pct={book.progress} height={3} trackColor="#F0EAE0" color="#A89880" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: '#A89880' }}>{book.progress}% · p. {book.currentPage} / {book.totalPages}</span>
                      <span style={{ fontSize: 11, color: '#A89880' }}>Paused {book.pausedDate || ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Book Detail Screen ───────────────────────────────────────────────────────
function LibioBookDetailScreen({ book, shelf, isPrimary, hasSiblings, onBack, onLogSession, onDiscovery, onUpdateBook, onMakePrimary, onPauseBook, onResumeBook, onMoveToShelf, onFinishBook, onSetFinishedDate }) {
  const [rating, setRating] = React.useState(book.rating || 0);
  const [quotes, setQuotes] = React.useState(book.quotes || []);
  const [editingDate, setEditingDate] = React.useState(false);
  const [addingQuote, setAddingQuote] = React.useState(false);
  const [newQuote, setNewQuote] = React.useState('');
  const [newQuotePage, setNewQuotePage] = React.useState('');

  const handleRate = (r) => {
    setRating(r);
    onUpdateBook && onUpdateBook({ ...book, rating: r });
  };

  const handleAddQuote = () => {
    if (!newQuote.trim()) return;
    const q = { text: newQuote.trim(), page: parseInt(newQuotePage) || '?' };
    const updated = [...quotes, q];
    setQuotes(updated);
    setNewQuote(''); setNewQuotePage(''); setAddingQuote(false);
    onUpdateBook && onUpdateBook({ ...book, quotes: updated });
  };

  const estimatedFinish = () => {
    if (book.daysLeft) {
      const d = new Date(); d.setDate(d.getDate() + book.daysLeft);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '—';
  };

  const primaryBtn = {
    width: '100%', padding: '14px', background: '#2C2418', color: '#FAF7F2',
    border: 'none', borderRadius: 14, fontFamily: "'DM Sans', sans-serif",
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
  };
  const secondaryBtn = {
    flex: 1, padding: '11px', background: 'transparent', color: '#2C2418',
    border: '0.5px solid #EAE0D4', borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  };
  const move = (target) => onMoveToShelf && onMoveToShelf(book, target);

  return (
    <div style={{ height: '100%', position: 'relative', fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2' }}>
      <button onClick={onBack} style={{
        position: 'absolute', top: 'calc(var(--safe-top) + 16px)', left: 16, zIndex: 50,
        background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 999,
        padding: '6px 14px 6px 10px', color: '#FAF7F2', fontSize: 13, fontWeight: 500,
        cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: "'DM Sans', sans-serif", boxShadow: '0 1px 8px rgba(44,36,24,0.15)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#FAF7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <div className="intent-scroll" style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ height: 220, background: book.color, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
          {book.cover && (
            <>
              {/* Blurred cover wash fills the band, sharp cover floats centered */}
              <img src={book.cover} alt="" aria-hidden="true" style={{
                position: 'absolute', inset: '-20px', width: 'calc(100% + 40px)', height: 'calc(100% + 40px)',
                objectFit: 'cover', filter: 'blur(24px) brightness(0.7)', opacity: 0.6,
              }} />
              <img src={book.cover} alt={`Cover of ${book.title}`} style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                height: 168, width: 'auto', borderRadius: 6, boxShadow: '0 6px 24px rgba(44,36,24,0.35)',
              }} />
            </>
          )}
        </div>
        <div style={{ padding: '20px 20px 100px' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Lora', serif", fontSize: 24, fontWeight: 700, color: '#2C2418', lineHeight: 1.2, marginBottom: 4 }}>{book.title}</h1>
            <p style={{ fontSize: 14, color: '#A89880', marginBottom: 10 }}>{book.author}</p>
            <LibioTagPill label={book.genre} />
          </div>
          {shelf === 'reading' && (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Progress</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#A89880' }}>Page {book.currentPage} of {book.totalPages}</span>
                <span style={{ color: '#2C2418', fontWeight: 600 }}>{book.progress}%</span>
              </div>
              <LibioProgressBar pct={book.progress} height={6} />
              {book.progress >= 100
                ? <p style={{ fontSize: 12, color: '#7A8C7E', marginTop: 8, fontWeight: 600 }}>You've reached the last page — mark it finished below.</p>
                : <p style={{ fontSize: 12, color: '#A89880', marginTop: 8 }}>Est. finish: {estimatedFinish()}</p>}
            </div>
          )}
          {shelf === 'read' && (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 500 }}>Finished</p>
                <button onClick={() => setEditingDate(v => !v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2418',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {book.finishedDate || 'Set date'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4" stroke="#C4956A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              {editingDate && (
                <div style={{ marginTop: 12 }}>
                  <input
                    type="date"
                    defaultValue={toDateInput(book.finishedDate)}
                    max={toDateInput(new Date().toISOString())}
                    onChange={e => {
                      if (!e.target.value) return;
                      const d = new Date(e.target.value + 'T12:00:00');
                      onSetFinishedDate && onSetFinishedDate(book.id, d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '0.5px solid #EAE0D4', background: '#FAF7F2',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2418', outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#A89880', marginTop: 6 }}>Set when you actually finished it — counts toward that year's total.</p>
                </div>
              )}
            </div>
          )}
          {shelf === 'paused' && (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 500 }}>Paused</p>
                {book.pausedDate && <span style={{ fontSize: 11, color: '#A89880' }}>since {book.pausedDate}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#A89880' }}>Page {book.currentPage} of {book.totalPages}</span>
                <span style={{ color: '#2C2418', fontWeight: 600 }}>{book.progress}%</span>
              </div>
              <LibioProgressBar pct={book.progress} height={6} color="#A89880" trackColor="#F0EAE0" />
            </div>
          )}
          {/* ── Primary action by shelf ─────────────────────────────────── */}
          {shelf === 'reading' && book.progress < 100 && (
            <button onClick={() => onLogSession(book)} style={primaryBtn}>Log session</button>
          )}
          {shelf === 'reading' && book.progress >= 100 && (
            <button onClick={() => onFinishBook && onFinishBook(book)} style={primaryBtn}>Mark as finished 🎉</button>
          )}
          {shelf === 'wantToRead' && (
            <button onClick={() => move('reading')} style={primaryBtn}>Start reading</button>
          )}
          {shelf === 'paused' && (
            <button onClick={() => onResumeBook && onResumeBook(book)} style={primaryBtn}>Resume reading</button>
          )}

          {/* ── Secondary actions by shelf — every shelf has an exit ─────── */}
          {shelf === 'reading' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {!isPrimary && hasSiblings && (
                <button onClick={() => onMakePrimary && onMakePrimary(book)} style={secondaryBtn}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1 1 4.6L8 11.7 3.9 13.9l1-4.6L1.5 6.2l4.6-.5L8 1.5z"
                      stroke="#C4956A" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Make primary
                </button>
              )}
              {book.progress < 100 && (
                <button onClick={() => onFinishBook && onFinishBook(book)} style={secondaryBtn}>Mark as read</button>
              )}
              <button onClick={() => onPauseBook && onPauseBook(book)} style={{ ...secondaryBtn, color: '#A89880' }}>
                <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                  <rect x="1" y="1" width="2.5" height="9" rx="0.5" fill="#A89880"/>
                  <rect x="6.5" y="1" width="2.5" height="9" rx="0.5" fill="#A89880"/>
                </svg>
                Pause
              </button>
            </div>
          )}
          {shelf === 'read' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => move('reading')} style={secondaryBtn}>Move to reading</button>
              <button onClick={() => move('wantToRead')} style={secondaryBtn}>Want to read</button>
            </div>
          )}
          {shelf === 'wantToRead' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => onFinishBook && onFinishBook(book)} style={secondaryBtn}>Mark as read</button>
            </div>
          )}
          {shelf === 'paused' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => move('wantToRead')} style={secondaryBtn}>Want to read</button>
              <button onClick={() => onFinishBook && onFinishBook(book)} style={secondaryBtn}>Mark as read</button>
            </div>
          )}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#A89880' }}>Your rating</span>
            <LibioStarRating rating={rating} onRate={handleRate} size={24} />
          </div>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#A89880', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>Saved Quotes</p>
            {quotes.map((q, i) => (
              <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '0.5px solid #EAE0D4' }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 14, color: '#2C2418', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 4 }}>"{q.text}"</p>
                <span style={{ fontSize: 11, color: '#A89880' }}>— Page {q.page}</span>
              </div>
            ))}
            {addingQuote ? (
              <div>
                <textarea placeholder="Quote text…" value={newQuote} onChange={e => setNewQuote(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '0.5px solid #EAE0D4', background: '#FAF7F2',
                    fontFamily: "'Lora', serif", fontSize: 13, color: '#2C2418',
                    resize: 'none', height: 72, boxSizing: 'border-box',
                    outline: 'none', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic',
                  }}
                />
                <input type="number" placeholder="Page number" value={newQuotePage} onChange={e => setNewQuotePage(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '0.5px solid #EAE0D4', background: '#FAF7F2',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#2C2418',
                    boxSizing: 'border-box', outline: 'none', marginBottom: 10,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAddingQuote(false)} style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid #EAE0D4',
                    background: 'transparent', color: '#A89880',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={handleAddQuote} style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                    background: '#2C2418', color: '#FAF7F2',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Save</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingQuote(true)} style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 13, color: '#C4956A', fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 17 }}>+</span> Add quote
              </button>
            )}
          </div>
          <button onClick={onDiscovery} style={{
            width: '100%', padding: '13px', background: 'transparent', color: '#2C2418',
            border: '1.5px solid #2C2418', borderRadius: 14,
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>More like this</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Screen (Libio) ─────────────────────────────────────────────────────
// Build reading analytics from live books + session log.
function computeReadingAnalytics(books) {
  const sessions = books.sessions || [];
  const read = books.read || [];
  const now = new Date();

  const pagesThisYear = sessions.filter(s => isThisYear(new Date(s.date))).reduce((a, s) => a + (s.pages || 0), 0);
  const pagesAllTime = sessions.reduce((a, s) => a + (s.pages || 0), 0);
  const booksThisYear = read.filter(b => isThisYear(b.finishedDate ? new Date(b.finishedDate) : null)).length;
  const rated = read.filter(b => b.rating > 0);
  const avgRating = rated.length ? (rated.reduce((a, b) => a + b.rating, 0) / rated.length).toFixed(1) : '—';

  // Reading-day streak (a day with ≥1 session). Today not yet read doesn't break it.
  const dayset = new Set(sessions.map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  if (!dayset.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  while (dayset.has(dateKey(cursor))) { streak++; cursor = addDays(cursor, -1); }

  // Pages per day — last 14 days.
  const perDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(now, -i);
    const k = dateKey(d);
    const pages = sessions.filter(s => s.date === k).reduce((a, s) => a + (s.pages || 0), 0);
    perDay.push({ label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), pages, today: i === 0 });
  }

  // Pages per week — last 8 weeks (Mon-start buckets).
  const perWeek = [];
  for (let w = 7; w >= 0; w--) {
    const ws = weekStart(addDays(now, -w * 7));
    const we = addDays(ws, 7);
    const pages = sessions.filter(s => { const sd = new Date(s.date + 'T12:00:00'); return sd >= ws && sd < we; })
      .reduce((a, s) => a + (s.pages || 0), 0);
    perWeek.push({ label: ws.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), pages, current: w === 0 });
  }

  // Books finished per month this year.
  const perMonth = Array.from({ length: 12 }, (_, m) => ({ month: new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'short' }), count: 0 }));
  read.forEach(b => { if (b.finishedDate) { const d = new Date(b.finishedDate); if (isThisYear(d)) perMonth[d.getMonth()].count++; } });

  const recentFinished = [...read]
    .filter(b => b.finishedDate)
    .sort((a, b) => new Date(b.finishedDate) - new Date(a.finishedDate))
    .slice(0, 5);

  return { pagesThisYear, pagesAllTime, booksThisYear, avgRating, streak, perDay, perWeek, perMonth, recentFinished, hasData: sessions.length > 0 || read.length > 0 };
}

function MiniBars({ data, valueKey, highlightKey, color = '#C4956A', height = 70 }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 10 ? 3 : 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3,
            background: d[valueKey] > 0 ? (d[highlightKey] ? '#2C2418' : color) : '#EAE0D4',
            height: d[valueKey] > 0 ? `${(d[valueKey] / max) * (height - 18)}px` : '3px',
            transition: 'height 0.4s ease',
          }} />
          <span style={{ fontSize: 8.5, color: '#A89880', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LibioStatsScreen() {
  const { books } = useApp();
  const a = computeReadingAnalytics(books);
  const card = { background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 20, padding: 20, marginBottom: 16 };
  const cardLabel = { fontSize: 12, color: '#A89880', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 };
  return (
    <div className="intent-scroll" style={{ height: '100%', overflowY: 'auto', padding: `${SAFE_TOP_PAD} 20px 100px`, fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2' }}>
      <h1 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: '#2C2418', marginBottom: 24 }}>Stats</h1>

      {!a.hasData && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <h3 style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 600, color: '#2C2418', marginBottom: 8 }}>No reading logged yet</h3>
          <p style={{ fontSize: 13, color: '#A89880', lineHeight: 1.5 }}>Log a session or finish a book and your trends will appear here.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Books this year', value: a.booksThisYear, unit: 'books' },
          { label: 'Pages this year', value: a.pagesThisYear.toLocaleString(), unit: 'pages' },
          { label: 'Reading streak', value: a.streak, unit: 'days' },
          { label: 'Avg rating', value: a.avgRating, unit: '/ 5 ★' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 16, padding: '16px 14px' }}>
            <p style={{ fontSize: 11, color: '#A89880', marginBottom: 8, fontWeight: 500, letterSpacing: 0.3 }}>{m.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 700, color: '#2C2418' }}>{m.value}</span>
              <span style={{ fontSize: 11, color: '#A89880' }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <p style={cardLabel}>Pages per day · last 14 days</p>
        <MiniBars data={a.perDay} valueKey="pages" highlightKey="today" />
      </div>

      <div style={card}>
        <p style={cardLabel}>Pages per week · last 8 weeks</p>
        <MiniBars data={a.perWeek} valueKey="pages" highlightKey="current" />
      </div>

      <div style={card}>
        <p style={cardLabel}>Books finished per month · {new Date().getFullYear()}</p>
        <MiniBars data={a.perMonth} valueKey="count" highlightKey="none" />
      </div>

      {a.recentFinished.length > 0 && (
        <div style={{ ...card, marginBottom: 0 }}>
          <p style={cardLabel}>Recently finished</p>
          {a.recentFinished.map((b, i) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: i < a.recentFinished.length - 1 ? 12 : 0, marginBottom: i < a.recentFinished.length - 1 ? 12 : 0, borderBottom: i < a.recentFinished.length - 1 ? '0.5px solid #EAE0D4' : 'none' }}>
              <LibioBookCover color={b.color} cover={b.cover} title={b.title} width={30} height={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontWeight: 600, color: '#2C2418', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</p>
                <p style={{ fontSize: 12, color: '#A89880' }}>{b.finishedDate}</p>
              </div>
              {b.rating > 0 && <span style={{ fontSize: 12, color: '#C4956A' }}>{'★'.repeat(b.rating)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Discovery Screen ─────────────────────────────────────────────────────────
function LibioDiscoveryScreen({ onBack }) {
  const [added, setAdded] = React.useState({});
  return (
    <div className="intent-scroll" style={{ height: '100%', overflowY: 'auto', padding: `${SAFE_TOP_PAD} 20px 100px`, fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 6,
        color: '#A89880', fontSize: 13, cursor: 'pointer',
        marginBottom: 20, fontFamily: "'DM Sans', sans-serif",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#A89880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <h1 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: '#2C2418', marginBottom: 4 }}>What's next?</h1>
      <p style={{ fontSize: 13, color: '#A89880', marginBottom: 24 }}>Based on your library</p>
      {LIBIO_DISCOVERY_DATA.map((book) => (
        <div key={book.id} style={{ background: '#FFFFFF', border: '0.5px solid #EAE0D4', borderRadius: 18, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <LibioBookCover color={book.color} width={52} height={76} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 600, color: '#2C2418', marginBottom: 3, lineHeight: 1.3 }}>{book.title}</h3>
              <p style={{ fontSize: 12, color: '#A89880', marginBottom: 8 }}>{book.author}</p>
              <p style={{ fontSize: 12, color: '#8B6B4A', lineHeight: 1.5 }}>{book.reason}</p>
            </div>
          </div>
          <button onClick={() => setAdded(prev => ({ ...prev, [book.id]: true }))} style={{
            padding: '10px 16px',
            background: added[book.id] ? '#F0EAE0' : 'transparent',
            color: added[book.id] ? '#A89880' : '#2C2418',
            border: `1.5px solid ${added[book.id] ? '#EAE0D4' : '#2C2418'}`,
            borderRadius: 10, fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 600,
            cursor: added[book.id] ? 'default' : 'pointer', transition: 'all 0.2s',
          }}>{added[book.id] ? '✓ Added' : '+ Add to library'}</button>
        </div>
      ))}
    </div>
  );
}

// ─── Add Book Screen ──────────────────────────────────────────────────────────
// Centered hint/empty/error state for the search screen.
function LibioSearchHint({ icon, title, body }) {
  const glyphs = {
    search: <><circle cx="11" cy="11" r="7" stroke="#C4956A" strokeWidth="1.6"/><path d="M16.5 16.5L21 21" stroke="#C4956A" strokeWidth="1.6" strokeLinecap="round"/></>,
    empty: <path d="M5 7h14M5 12h14M5 17h9" stroke="#C4956A" strokeWidth="1.6" strokeLinecap="round"/>,
    warn: <><path d="M12 8v5" stroke="#C4956A" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16.5" r="0.4" fill="#C4956A" stroke="#C4956A" strokeWidth="1.2"/><path d="M12 3l9 16H3z" stroke="#C4956A" strokeWidth="1.6" strokeLinejoin="round"/></>,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 70, paddingLeft: 24, paddingRight: 24 }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16, opacity: 0.9 }}>
        {glyphs[icon] || glyphs.search}
      </svg>
      <h3 style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 600, color: '#2C2418', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#A89880', lineHeight: 1.5, maxWidth: 260 }}>{body}</p>
    </div>
  );
}

function LibioAddBookScreen({ onBack, onAddToShelf, active }) {
  const [query, setQuery] = React.useState('');
  const [shelfPicker, setShelfPicker] = React.useState(null);
  const [added, setAdded] = React.useState({});
  const [results, setResults] = React.useState([]);
  const [status, setStatus] = React.useState('idle'); // idle | loading | ok | error
  const inputRef = React.useRef(null);

  // Autofocus the search field when the screen is actually shown — NOT on mount.
  // All Libio screens are mounted side-by-side (inactive ones translated off to
  // the right), so focusing while off-screen makes the browser scroll the
  // container horizontally and blanks the whole app. Gate on `active` and pass
  // preventScroll so focus never moves the viewport.
  React.useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(id);
  }, [active]);

  // Debounced live search against the global catalog, with in-flight abort so a
  // fast typist never sees stale results land out of order.
  React.useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setStatus('idle'); return; }

    setStatus('loading');
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const books = await searchBooks(q, { signal: controller.signal, limit: 20 });
        setResults(books);
        setStatus('ok');
      } catch (err) {
        if (err.name !== 'AbortError') setStatus('error');
      }
    }, 350);

    return () => { clearTimeout(id); controller.abort(); };
  }, [query]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", background: '#FAF7F2', position: 'relative' }}>
      <div style={{ padding: `${SAFE_TOP_PAD} 20px 16px`, flexShrink: 0 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#A89880', fontSize: 13, cursor: 'pointer',
          marginBottom: 16, fontFamily: "'DM Sans', sans-serif",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#A89880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Library
        </button>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: '#2C2418', marginBottom: 16 }}>Add a book</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0EAE0', borderRadius: 999, padding: '12px 18px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="#A89880" strokeWidth="1.8"/>
            <path d="M16.5 16.5L21 21" stroke="#A89880" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, author, or ISBN"
            autoComplete="off" autoCorrect="off" autoCapitalize="words"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2C2418', minWidth: 0 }}
          />
          {query.length > 0 && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#A89880', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>
      <div className="intent-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 40px' }}>
        {/* Idle — no query yet */}
        {status === 'idle' && (
          <LibioSearchHint
            icon="search"
            title="Find any book"
            body="Search millions of titles by name, author, or ISBN."
          />
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 14 }}>
            <div className="libio-spinner" style={{
              width: 26, height: 26, borderRadius: '50%',
              border: '2.5px solid #EAE0D4', borderTopColor: '#C4956A',
            }} />
            <p style={{ fontSize: 13, color: '#A89880', fontFamily: "'DM Sans', sans-serif" }}>Searching…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <LibioSearchHint
            icon="warn"
            title="Couldn't reach the catalog"
            body="Check your connection and try again."
          />
        )}

        {/* No results */}
        {status === 'ok' && results.length === 0 && (
          <LibioSearchHint
            icon="empty"
            title="No matches"
            body={`Nothing found for "${query.trim()}". Try a different spelling or the author's name.`}
          />
        )}

        {/* Results */}
        {status === 'ok' && results.map((book, i) => (
          <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < results.length - 1 ? '0.5px solid #EAE0D4' : 'none' }}>
            <BookCover book={book} width={40} height={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontWeight: 600, color: '#2C2418', lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
              <p style={{ fontSize: 12, color: '#A89880', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
              <p style={{ fontSize: 11, color: '#C2B6A2', marginTop: 2 }}>
                {[book.genre, book.year, book.totalPages ? `${book.totalPages} pp` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {added[book.id] ? (
              <span style={{ fontSize: 15, color: '#7A8C7E', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>✓</span>
            ) : (
              <button onClick={() => setShelfPicker(book)} style={{
                width: 28, height: 28, borderRadius: 999,
                background: '#FFF8F0', border: '0.5px solid #EAE0D4',
                color: '#C4956A', fontSize: 18, lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
              }}>+</button>
            )}
          </div>
        ))}
      </div>
      {shelfPicker && (
        <LibioShelfPickerModal
          book={shelfPicker}
          onSelect={(shelf) => {
            setAdded(prev => ({ ...prev, [shelfPicker.id]: shelf }));
            onAddToShelf && onAddToShelf(shelfPicker, shelf);
            setShelfPicker(null);
          }}
          onDismiss={() => setShelfPicker(null)}
        />
      )}
    </div>
  );
}

// ─── LibioApp root — the full embedded app ────────────────────────────────────
export function LibioApp({ initialTab, onLogSessionExternal }) {
  const { books, setBooks, settings, finishBook, setBookFinishedDate } = useApp();
  const [tab, setTab] = React.useState(initialTab || 'home');
  const [screen, setScreen] = React.useState('main'); // main | bookDetail | discovery | addBook
  const [selectedBook, setSelectedBook] = React.useState(null);
  const [logSessionBook, setLogSessionBook] = React.useState(null);

  const findShelf = (book) => {
    for (const s of ['reading', 'read', 'wantToRead', 'paused']) {
      if ((books[s] || []).some(b => b.id === book.id)) return s;
    }
    return null;
  };

  const handleBookTap = (book) => { setSelectedBook(book); setScreen('bookDetail'); };
  const handleLogSession = (book) => {
    if (onLogSessionExternal) onLogSessionExternal(book);
    else setLogSessionBook(book);
  };
  const handleSaveSession = (pagesRead) => {
    setBooks(prev => {
      const updated = { ...prev };
      updated.reading = prev.reading.map(b => {
        if (b.id !== logSessionBook.id) return b;
        const newPage = Math.min(b.totalPages, b.currentPage + pagesRead);
        return { ...b, currentPage: newPage, progress: Math.round((newPage / b.totalPages) * 100) };
      });
      return updated;
    });
    if (selectedBook && selectedBook.id === logSessionBook.id) {
      setSelectedBook(prev => {
        const newPage = Math.min(prev.totalPages, prev.currentPage + pagesRead);
        return { ...prev, currentPage: newPage, progress: Math.round((newPage / prev.totalPages) * 100) };
      });
    }
    setLogSessionBook(null);
  };
  const handleUpdateBook = (updatedBook) => {
    setBooks(prev => {
      const updated = { ...prev };
      ['reading','read','wantToRead','paused'].forEach(shelf => {
        updated[shelf] = (prev[shelf] || []).map(b => b.id === updatedBook.id ? updatedBook : b);
      });
      return updated;
    });
  };

  // Reorder: move book to index 0 of reading shelf
  const handleMakePrimary = (book) => {
    setBooks(prev => {
      const others = prev.reading.filter(b => b.id !== book.id);
      const target = prev.reading.find(b => b.id === book.id);
      if (!target) return prev;
      return { ...prev, reading: [target, ...others] };
    });
  };

  // Move from reading → paused (next book auto-promotes by virtue of array order)
  const handlePauseBook = (book) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setBooks(prev => ({
      ...prev,
      reading: prev.reading.filter(b => b.id !== book.id),
      paused: [{ ...book, pausedDate: today }, ...(prev.paused || [])],
    }));
    setScreen('main');
  };

  // Move from paused → reading (appended at end — user can promote if they want)
  const handleResumeBook = (book) => {
    setBooks(prev => ({
      ...prev,
      paused: (prev.paused || []).filter(b => b.id !== book.id),
      reading: [...prev.reading, { ...book, pausedDate: undefined }],
    }));
    setScreen('main');
  };

  // General shelf transition — the single source of truth for moving a book
  // between reading / read / wantToRead / paused. Removes it from wherever it is
  // and re-adds it to the target with shelf-appropriate fields.
  const handleMoveToShelf = (book, target) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setBooks(prev => {
      const cleaned = {};
      for (const s of ['reading', 'read', 'wantToRead', 'paused']) {
        cleaned[s] = (prev[s] || []).filter(b => b.id !== book.id);
      }
      // strip status-specific stamps, then apply the target's
      let entry = { ...book, pausedDate: undefined, finishedDate: undefined };
      if (target === 'read') {
        entry = { ...entry, progress: 100, currentPage: book.totalPages || book.currentPage || 0, finishedDate: today };
      } else if (target === 'paused') {
        entry = { ...entry, pausedDate: today };
      } else if (target === 'wantToRead') {
        entry = { ...entry, progress: 0, currentPage: 0 }; // not started yet
      }
      // reading keeps its current page/progress as-is (so "undo finish" works)
      cleaned[target] = [...cleaned[target], entry];
      return { ...prev, ...cleaned };
    });
    setScreen('main');
  };

  // Add a searched book to a shelf for real, carrying its real metadata
  // (page count, genre, cover) through from the catalog.
  const handleAddToShelf = (book, shelf) => {
    setBooks(prev => {
      const exists = ['reading','read','wantToRead','paused'].some(s => (prev[s] || []).some(b => b.id === book.id));
      if (exists) return prev;
      const totalPages = book.totalPages || 250; // fall back when the record omits it
      const entry = {
        ...book,
        genre: book.genre || 'General',
        currentPage: shelf === 'read' ? totalPages : 0,
        totalPages,
        progress: shelf === 'read' ? 100 : 0,
        quotes: [], rating: 0,
        ...(shelf === 'read' ? { finishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } : {}),
      };
      return { ...prev, [shelf]: [...(prev[shelf] || []), entry] };
    });
  };

  const slideStyle = {
    position: 'absolute', inset: 0,
    transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.3s',
    background: '#FAF7F2',
  };

  // Safety net: the off-screen screens (translated right) live in this
  // overflow:hidden container. If anything ever focus-scrolls it sideways, the
  // visible screen would slide out of view. Snap any horizontal scroll back to 0.
  const rootRef = React.useRef(null);
  const pinScroll = () => { const el = rootRef.current; if (el && el.scrollLeft !== 0) el.scrollLeft = 0; };

  return (
    <div ref={rootRef} onScroll={pinScroll}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#FAF7F2' }}>

      {/* Main screens */}
      <div style={{ ...slideStyle, transform: screen === 'main' ? 'translateX(0)' : 'translateX(-100%)', opacity: screen === 'main' ? 1 : 0, pointerEvents: screen === 'main' ? 'auto' : 'none' }}>
        {tab === 'home' && <LibioHomeScreen books={books} stats={LIBIO_STATS_DATA} onBookTap={handleBookTap} onLogSession={handleLogSession} onDiscovery={() => setScreen('discovery')} onAddBook={() => setScreen('addBook')} userName={settings.userName} />}
        {tab === 'library' && <LibioLibraryScreen books={books} onBookTap={handleBookTap} onAddBook={() => setScreen('addBook')} />}
        {tab === 'stats' && <LibioStatsScreen stats={LIBIO_STATS_DATA} />}

        {/* Libio's own tab bar replaces Intent's while inside Reading */}
        <LibioTabBar activeTab={tab} onTabChange={setTab} />
      </div>

      {/* Book Detail */}
      <div style={{ ...slideStyle, transform: screen === 'bookDetail' ? 'translateX(0)' : 'translateX(100%)', opacity: screen === 'bookDetail' ? 1 : 0, pointerEvents: screen === 'bookDetail' ? 'auto' : 'none' }}>
        {selectedBook && (() => {
          // Always render the LIVE copy from state, not the stale snapshot taken
          // when the card was tapped — so finishing/logging reflects immediately.
          const live = ['reading', 'read', 'wantToRead', 'paused']
            .map(s => (books[s] || []).find(b => b.id === selectedBook.id)).find(Boolean) || selectedBook;
          const detailShelf = findShelf(live);
          const isPrimary = detailShelf === 'reading' && books.reading[0] && books.reading[0].id === live.id;
          const hasSiblings = detailShelf === 'reading' && books.reading.length > 1;
          return (
            <LibioBookDetailScreen
              book={live}
              shelf={detailShelf}
              isPrimary={isPrimary}
              hasSiblings={hasSiblings}
              onBack={() => setScreen('main')}
              onLogSession={handleLogSession}
              onDiscovery={() => setScreen('discovery')}
              onUpdateBook={handleUpdateBook}
              onMakePrimary={handleMakePrimary}
              onPauseBook={handlePauseBook}
              onResumeBook={handleResumeBook}
              onMoveToShelf={handleMoveToShelf}
              onFinishBook={(b) => { finishBook(b); setScreen('main'); }}
              onSetFinishedDate={setBookFinishedDate}
            />
          );
        })()}
      </div>

      {/* Discovery */}
      <div style={{ ...slideStyle, transform: screen === 'discovery' ? 'translateX(0)' : 'translateX(100%)', opacity: screen === 'discovery' ? 1 : 0, pointerEvents: screen === 'discovery' ? 'auto' : 'none' }}>
        <LibioDiscoveryScreen onBack={() => setScreen(selectedBook ? 'bookDetail' : 'main')} />
      </div>

      {/* Add Book */}
      <div style={{ ...slideStyle, transform: screen === 'addBook' ? 'translateX(0)' : 'translateX(100%)', opacity: screen === 'addBook' ? 1 : 0, pointerEvents: screen === 'addBook' ? 'auto' : 'none' }}>
        <LibioAddBookScreen active={screen === 'addBook'} onBack={() => setScreen('main')} onAddToShelf={handleAddToShelf} />
      </div>

      {/* Log Session Sheet */}
      {logSessionBook && (
        <LibioLogSessionSheet book={logSessionBook} onClose={() => setLogSessionBook(null)} onSave={handleSaveSession} />
      )}
    </div>
  );
}
