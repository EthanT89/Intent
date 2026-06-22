import React from 'react';
import { T } from '../../theme/tokens.js';
import { PillarPill, CategoryLabel, GroupLabel } from '../../components/primitives.jsx';
import { useApp } from '../../store/AppStateContext.jsx';
import { useUI } from '../../store/uiContext.js';
import { dateKey, addDays, intentNow, intentTodayKey, inDayGrace } from '../../lib/dates.js';
import { haptics } from '../../lib/haptics.js';
import {
  isActiveDay, dayCompletionPct, computeRoutineStreak, computeItemStreak,
  withinWindow, windowLabel, TIME_WINDOWS, matchPreset,
} from './model.js';

// ─── Today pill — one checklist card per routine scheduled today ─────────────
export function RoutinePill() {
  const { routines } = useApp();
  const { navigateToPillar } = useUI();
  const today = intentNow();
  const all = routines.list || [];

  // Empty state — no routines yet
  if (all.length === 0) {
    return (
      <PillarPill onNavigate={() => navigateToPillar('routine')}>
        <CategoryLabel>routine</CategoryLabel>
        <div style={{ paddingRight: 16 }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
            color: T.ink, lineHeight: 1.3, marginBottom: 4,
          }}>No routines yet.</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>
            Tap to build your first one.
          </div>
        </div>
      </PillarPill>
    );
  }

  // Paused routines are kept but excluded from Today.
  const list = all.filter(r => r.disabled !== true);
  if (list.length === 0) {
    return (
      <PillarPill onNavigate={() => navigateToPillar('routine')}>
        <CategoryLabel>routine</CategoryLabel>
        <div style={{ paddingRight: 16 }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 3 }}>Routines paused</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Tap to resume one when you're ready.</div>
        </div>
      </PillarPill>
    );
  }

  const activeToday = list.filter(r => isActiveDay(r, today));

  // All routines off today — one compact, quiet card.
  if (activeToday.length === 0) {
    let nextDay = '—';
    for (let i = 1; i < 8; i++) {
      const d = addDays(today, i);
      if (list.some(r => isActiveDay(r, d))) { nextDay = d.toLocaleDateString('en-US', { weekday: 'long' }); break; }
    }
    return (
      <PillarPill onNavigate={() => navigateToPillar('routine')}>
        <CategoryLabel>routine</CategoryLabel>
        <div style={{ paddingRight: 16 }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 3 }}>No routine today</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Next up {nextDay}.</div>
        </div>
      </PillarPill>
    );
  }

  // Only surface routines whose time-of-day window is open right now — but
  // during the post-midnight grace tail (before the 6am cutoff), keep any
  // still-unfinished routine from the wrapping-up day visible so it can be
  // caught up on, even though its window has technically passed.
  const grace = inDayGrace();
  const tKey = intentTodayKey();
  const isComplete = (r) => {
    const map = (routines.history[r.id] || {})[tKey] || {};
    return r.items.length > 0 && r.items.every(it => map[it.id]);
  };
  const activeNow = activeToday.filter(r => withinWindow(r) || (grace && !isComplete(r)));

  // In a gap between windows (e.g. afternoon, between a morning and evening
  // routine) — point to what's next, but keep the section a tap away.
  if (activeNow.length === 0) {
    const nowH = today.getHours() + today.getMinutes() / 60;
    const upcoming = activeToday
      .filter(r => r.window && r.window.start > nowH)
      .sort((a, b) => a.window.start - b.window.start)[0];
    return (
      <PillarPill onNavigate={() => navigateToPillar('routine')}>
        <CategoryLabel>routine</CategoryLabel>
        <div style={{ paddingRight: 16 }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 3 }}>
            {upcoming ? 'Nothing right now' : 'Routines wrapped for today'}
          </div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>
            {upcoming ? `Next: ${upcoming.name} · ${windowLabel(upcoming.window)}` : 'Tap to review or catch up.'}
          </div>
        </div>
      </PillarPill>
    );
  }

  // One card per routine open right now.
  return (
    <>
      {activeNow.map(r => <OneRoutinePill key={r.id} routine={r} today={today} />)}
    </>
  );
}

// A single routine's checklist card on Today.
function OneRoutinePill({ routine, today }) {
  const { routines, toggleRoutineItem } = useApp();
  const { navigateToPillar } = useUI();
  const history = routines.history[routine.id] || {};
  const todayMap = history[intentTodayKey()] || {};
  const doneCount = routine.items.filter(it => todayMap[it.id]).length;
  const allDone = routine.items.length > 0 && doneCount === routine.items.length;
  const streak = computeRoutineStreak(routine, history, today);

  const lower = routine.name.toLowerCase();
  const label = lower === 'morning' ? 'this morning' : lower === 'evening' ? 'this evening' : lower;

  return (
    <PillarPill onNavigate={() => navigateToPillar('routine', routine.id)}>
      <CategoryLabel>{label}</CategoryLabel>
      <div style={{ paddingRight: 16 }}>
        {routine.items.length === 0 && (
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '2px 0 6px' }}>
            No items yet — tap to add some.
          </div>
        )}
        {routine.items.map((item) => {
          const done = !!todayMap[item.id];
          return (
            <button key={item.id} onClick={e => { e.stopPropagation(); haptics.tap(); toggleRoutineItem(routine.id, item.id); }} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 0', textAlign: 'left',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${done ? T.ink : T.border}`,
                background: done ? T.ink : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && (
                  <svg width="10" height="8" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="#fff"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{
                fontFamily: T.fontSans, fontSize: 14,
                color: done ? T.muted : T.ink,
                textDecoration: done ? 'line-through' : 'none',
              }}>{item.label}</span>
            </button>
          );
        })}
        <div style={{
          fontFamily: T.fontSans, fontSize: 12, color: allDone ? T.pillars.routine : T.muted,
          marginTop: 10, paddingTop: 10,
          borderTop: `0.5px solid ${T.border}`,
        }}>{allDone ? '✓ ' : ''}{doneCount} of {routine.items.length} done · {streak} day streak</div>
      </div>
    </PillarPill>
  );
}

// ─── Days-on row (S M T W T F S) ──────────────────────────────────────────────
const DAY_LETTERS = ['S','M','T','W','T','F','S'];
export function DaysOnRow({ daysOn, onToggle, size = 26 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {DAY_LETTERS.map((letter, i) => {
        const on = daysOn.includes(i);
        return (
          <button key={i}
            onClick={onToggle ? (e) => { e.stopPropagation(); onToggle(i); } : undefined}
            disabled={!onToggle}
            style={{
              width: size, height: size, borderRadius: '50%',
              background: on ? T.pillars.routine : 'transparent',
              border: `1px solid ${on ? T.pillars.routine : T.border}`,
              color: on ? '#FAF7F2' : T.muted,
              fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
              cursor: onToggle ? 'pointer' : 'default',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{letter}</button>
        );
      })}
    </div>
  );
}

// ─── 30-day strip (whole routine — color intensity by completion) ────────────
function RoutineHeatStrip({ routine, history, endDate, onPrev, onNext, hasNext }) {
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(endDate, -i);
    const k = dateKey(d);
    const active = isActiveDay(routine, d);
    let bg, label;
    if (!active) {
      bg = '#F0EAE0'; label = `${k} — off day`;
    } else {
      const pct = dayCompletionPct(routine, history[k]);
      if (pct === 0) { bg = T.border; }
      else if (pct < 0.5) { bg = `${T.pillars.routine}55`; }
      else if (pct < 1) { bg = `${T.pillars.routine}99`; }
      else { bg = T.pillars.routine; }
      label = `${k} — ${Math.round(pct * 100)}%`;
    }
    cells.push({ key: k, bg, label, d });
  }
  const start = cells[0].d;
  const end = cells[29].d;
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={onPrev} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 6px', color: T.muted, fontFamily: T.fontSans, fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 1L1 5l4 4" stroke={T.muted} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, fontWeight: 500 }}>
          {fmt(start)} — {fmt(end)}
        </div>
        <button onClick={onNext} disabled={!hasNext} style={{
          background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'default',
          padding: '4px 6px', opacity: hasNext ? 1 : 0.3,
        }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M1 1l4 4-4 4" stroke={T.muted} strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {cells.map(c => (
          <div key={c.key} title={c.label} style={{
            flex: 1, aspectRatio: '1', borderRadius: 3, background: c.bg,
            maxHeight: 22,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── 30-day strip (per item — binary) ────────────────────────────────────────
function ItemHeatStrip({ routine, history, itemId, endDate }) {
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(endDate, -i);
    const k = dateKey(d);
    const active = isActiveDay(routine, d);
    let bg;
    if (!active) bg = '#F0EAE0';
    else if (history[k] && history[k][itemId]) bg = T.pillars.routine;
    else bg = T.border;
    cells.push({ key: k, bg });
  }
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {cells.map(c => (
        <div key={c.key} style={{ flex: 1, height: 14, borderRadius: 2, background: c.bg, maxWidth: 8 }} />
      ))}
    </div>
  );
}

// ─── Routine detail page ─────────────────────────────────────────────────────
export function RoutineSection({ onBack, arg }) {
  const { routines, toggleRoutineItem, setRoutineList, setRoutineHistory } = useApp();
  const list = routines.list;
  const history = routines.history;
  // Focus the routine passed in (from a Today card), else today's active one, else first.
  const initialId = (arg && list.some(r => r.id === arg)) ? arg
    : (list.find(r => isActiveDay(r, intentNow())) || list[0] || {}).id;
  const [activeId, setActiveId] = React.useState(initialId);
  const [editing, setEditing] = React.useState(false);
  const [stripEndOffset, setStripEndOffset] = React.useState(0);

  const today = intentNow();
  const tKey = intentTodayKey();
  const routine = list.find(r => r.id === activeId);
  React.useEffect(() => {
    if (!routine && list.length > 0) setActiveId(list[0].id);
  }, [routine, list]);

  const createRoutine = () => {
    const newId = `routine-${Date.now()}`;
    setRoutineList(prev => [...prev, {
      id: newId, name: 'New routine', description: '',
      daysOn: [0,1,2,3,4,5,6], items: [],
    }]);
    setRoutineHistory(prev => ({ ...prev, [newId]: {} }));
    setActiveId(newId);
    setEditing(true);
  };

  // Empty state — no routines yet
  if (!routine && !editing) {
    return (
      <div style={{ padding: '10px 16px 120px' }}>
        <div style={{ paddingTop: 8, marginBottom: 16 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: T.fontSans, fontSize: 13, color: T.pillars.routine, padding: 0,
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
              <path d="M7 1L1 7l6 6" stroke={T.pillars.routine} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Today
          </button>
        </div>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 30, fontWeight: 600, color: T.ink,
          lineHeight: 1.1, marginBottom: 24,
        }}>Routines</div>
        <div style={{
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 16, padding: '36px 24px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
            color: T.ink, marginBottom: 8,
          }}>Nothing here yet.</div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 13, color: T.muted,
            lineHeight: 1.6, marginBottom: 20,
          }}>A routine is a named checklist with its own schedule, streak, and history.</div>
          <button onClick={createRoutine} style={{
            background: T.ink, color: '#FAF7F2',
            border: 'none', borderRadius: 12,
            padding: '12px 24px', cursor: 'pointer',
            fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          }}>Create your first routine</button>
        </div>
      </div>
    );
  }

  if (!routine) return null;

  const accent = T.pillars.routine;
  const routineHist = history[routine.id] || {};
  const todayMap = routineHist[tKey] || {};
  const todayDoneCount = routine.items.filter(it => todayMap[it.id]).length;
  const streak = computeRoutineStreak(routine, routineHist, today);
  const stripEnd = addDays(today, -stripEndOffset);
  const isActiveToday = isActiveDay(routine, today);
  const disabled = routine.disabled === true;
  const resume = () => setRoutineList(prev => prev.map(r => r.id === routine.id ? { ...r, disabled: false } : r));

  if (editing) {
    return <EditRoutineScreen
      routine={routine}
      onClose={() => setEditing(false)}
      onSave={(updated) => {
        setRoutineList(prev => prev.map(r => r.id === routine.id ? updated : r));
        setEditing(false);
      }}
      onDelete={() => {
        setRoutineList(prev => prev.filter(r => r.id !== routine.id));
        setRoutineHistory(prev => {
          const out = { ...prev };
          delete out[routine.id];
          return out;
        });
        setEditing(false);
      }}
      canDelete={true} // empty state handles zero routines, so the last one is deletable too
    />;
  }

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      {/* Header with back + edit */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: T.fontSans, fontSize: 13, color: accent, padding: 0,
        }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke={accent} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Today
        </button>
        <button onClick={() => setEditing(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          padding: '4px 8px', marginRight: -8,
        }}>Edit routine</button>
      </div>

      {/* Title + tabs */}
      <div style={{
        fontFamily: T.fontSerif, fontSize: 30, fontWeight: 600, color: T.ink,
        lineHeight: 1.1, marginBottom: 14,
      }}>Routines</div>

      {/* Segmented control — each chip shows ✓ if complete today, • if active today */}
      <div className="intent-scroll" style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
        {list.map(r => {
          const sel = activeId === r.id;
          const off = r.disabled === true;
          const activeDay = isActiveDay(r, today);
          const rHist = history[r.id] || {};
          const rToday = rHist[tKey] || {};
          const complete = !off && activeDay && r.items.length > 0 && r.items.every(it => rToday[it.id]);
          const mark = off ? '⏸ ' : complete ? '✓ ' : activeDay ? '• ' : '';
          return (
            <button key={r.id} onClick={() => setActiveId(r.id)} style={{
              padding: '8px 14px', borderRadius: 999, border: 'none',
              background: sel ? T.ink : '#F0EAE0',
              color: sel ? '#FAF7F2' : T.muted,
              fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              opacity: off && !sel ? 0.55 : 1,
            }}>
              <span style={{ color: complete ? (sel ? '#9FD3B0' : T.pillars.routine) : 'inherit' }}>{mark}</span>{r.name}
            </button>
          );
        })}
        <button onClick={createRoutine} style={{
          padding: '8px 12px', borderRadius: 999, border: `1px dashed ${T.border}`,
          background: 'transparent', color: T.muted,
          fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>+ Add</button>
      </div>

      {/* Description */}
      {routine.description && (
        <div style={{
          fontFamily: T.fontSerif, fontStyle: 'italic',
          fontSize: 14, color: T.muted,
          marginBottom: routine.window ? 8 : 18, lineHeight: 1.5,
        }}>{routine.description}</div>
      )}

      {/* Time-of-day window */}
      {routine.window && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18,
          background: `${accent}14`, color: T.ink, border: `0.5px solid ${accent}44`,
          borderRadius: 999, padding: '5px 11px',
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={accent} strokeWidth="1.8"/>
            <path d="M12 7v5l3 2" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {windowLabel(routine.window)}
        </div>
      )}

      {/* Paused banner */}
      {disabled && (
        <div style={{
          background: `${accent}10`, border: `0.5px solid ${accent}44`, borderRadius: 16,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Paused</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 14 }}>
            This routine is hidden from Today and won't affect your streaks. Its history is kept.
          </div>
          <button onClick={resume} style={{
            background: accent, color: '#FAF7F2', border: 'none', borderRadius: 12,
            padding: '11px 20px', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          }}>Resume routine</button>
        </div>
      )}

      {/* Streak + days-on row */}
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 16, padding: 18, marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
            color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase',
            marginBottom: 4,
          }}>Streak</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: T.fontSerif, fontSize: 38, fontWeight: 700,
              color: T.ink, lineHeight: 1,
            }}>{streak}</span>
            <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>days</span>
          </div>
        </div>
        <div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
            color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase',
            marginBottom: 8, textAlign: 'right',
          }}>Days on</div>
          <DaysOnRow daysOn={routine.daysOn} size={22} />
        </div>
      </div>

      {/* Today's checklist (hidden while paused) */}
      {!disabled && <GroupLabel>{isActiveToday ? 'Today' : 'Not scheduled today'}</GroupLabel>}
      {!disabled && (isActiveToday ? (
        <div style={{
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 16, padding: '6px 16px', marginBottom: 8,
        }}>
          {routine.items.map((item, i) => {
            const done = !!todayMap[item.id];
            return (
              <button key={item.id} onClick={() => { haptics.tap(); toggleRoutineItem(routine.id, item.id); }} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '11px 0', textAlign: 'left',
                borderBottom: i < routine.items.length - 1 ? `0.5px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${done ? T.ink : T.border}`,
                  background: done ? T.ink : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && (
                    <svg width="11" height="9" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="#fff"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{
                  fontFamily: T.fontSans, fontSize: 15,
                  color: done ? T.muted : T.ink,
                  textDecoration: done ? 'line-through' : 'none',
                  flex: 1,
                }}>{item.label}</span>
                <span style={{
                  fontFamily: T.fontSans, fontSize: 12, color: T.muted,
                }}>{computeItemStreak(routine, routineHist, item.id, today)}d</span>
              </button>
            );
          })}
          {routine.items.length === 0 && (
            <div style={{
              fontFamily: T.fontSans, fontSize: 13, color: T.muted,
              padding: '14px 0', textAlign: 'center',
            }}>No items yet. Tap "Edit routine" to add some.</div>
          )}
          {routine.items.length > 0 && (
            <div style={{
              fontFamily: T.fontSans, fontSize: 12, color: T.muted,
              padding: '11px 0 10px',
              borderTop: `0.5px solid ${T.border}`,
              textAlign: 'center',
            }}>{todayDoneCount} of {routine.items.length} done</div>
          )}
        </div>
      ) : (
        <div style={{
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 16, padding: '14px 16px', marginBottom: 8,
          fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          textAlign: 'center', lineHeight: 1.5,
        }}>Off today — back on {(() => {
          for (let i = 1; i < 8; i++) {
            const d = addDays(today, i);
            if (isActiveDay(routine, d)) {
              return d.toLocaleDateString('en-US', { weekday: 'long' });
            }
          }
          return '—';
        })()}.</div>
      ))}

      {/* 30-day strip */}
      <GroupLabel>Last 30 days</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 16, padding: 16, marginBottom: 8,
      }}>
        <RoutineHeatStrip
          routine={routine}
          history={routineHist}
          endDate={stripEnd}
          onPrev={() => setStripEndOffset(o => o + 30)}
          onNext={() => setStripEndOffset(o => Math.max(0, o - 30))}
          hasNext={stripEndOffset > 0}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 12, fontFamily: T.fontSans, fontSize: 11, color: T.muted,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>less</span>
            {[T.border, `${T.pillars.routine}55`, `${T.pillars.routine}99`, T.pillars.routine].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            ))}
            <span>more</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F0EAE0' }} />
            <span>off day</span>
          </div>
        </div>
      </div>

      {/* Per-item history */}
      <GroupLabel>By item</GroupLabel>
      {routine.items.map(item => {
        const itemStreak = computeItemStreak(routine, routineHist, item.id, today);
        return (
          <div key={item.id} style={{
            background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: 16, padding: '14px 16px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{itemStreak}d streak</span>
            </div>
            <ItemHeatStrip
              routine={routine}
              history={routineHist}
              itemId={item.id}
              endDate={stripEnd}
            />
          </div>
        );
      })}
      {routine.items.length === 0 && (
        <div style={{
          fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          padding: '14px 16px', textAlign: 'center',
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 16, marginBottom: 8,
        }}>No items.</div>
      )}
    </div>
  );
}

// ─── Edit routine screen ─────────────────────────────────────────────────────
function EditRoutineScreen({ routine, onClose, onSave, onDelete, canDelete }) {
  const [name, setName] = React.useState(routine.name);
  const [description, setDescription] = React.useState(routine.description || '');
  const [daysOn, setDaysOn] = React.useState(routine.daysOn);
  const [items, setItems] = React.useState(routine.items);
  const [newItemLabel, setNewItemLabel] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [enabled, setEnabled] = React.useState(routine.disabled !== true);
  const [timeWindow, setTimeWindow] = React.useState(routine.window || null);
  const [customMode, setCustomMode] = React.useState(matchPreset(routine.window) === 'custom');
  const preset = customMode ? 'custom' : matchPreset(timeWindow);
  const win = timeWindow || { start: 8, end: 17 };
  const setWinStart = (v) => setTimeWindow({ start: Math.max(0, Math.min(23, v)), end: win.end });
  const setWinEnd = (v) => setTimeWindow({ start: win.start, end: Math.max(1, Math.min(24, v)) });

  const toggleDay = (i) => {
    setDaysOn(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort());
  };
  const moveItem = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setItems(next);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setItems([...items, { id: `item-${Date.now()}`, label }]);
    setNewItemLabel('');
  };

  const save = () => {
    onSave({ ...routine, name: name.trim() || 'Untitled', description: description.trim(), daysOn, items, window: timeWindow, disabled: !enabled });
  };

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, marginBottom: 18,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 14, color: T.muted, padding: 0,
        }}>Cancel</button>
        <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>
          Edit routine
        </div>
        <button onClick={save} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          color: T.pillars.routine, padding: 0,
        }}>Save</button>
      </div>

      {/* Name */}
      <GroupLabel>Name</GroupLabel>
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 12, padding: '12px 14px',
          fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink,
          outline: 'none', marginBottom: 12,
        }}
      />

      {/* Description */}
      <GroupLabel>Description</GroupLabel>
      <textarea
        value={description} onChange={e => setDescription(e.target.value)}
        placeholder="What is this routine for?"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 12, padding: '12px 14px',
          fontFamily: T.fontSans, fontSize: 14, color: T.ink,
          resize: 'none', minHeight: 60, lineHeight: 1.5,
          outline: 'none', marginBottom: 12,
        }}
      />

      {/* Days on */}
      <GroupLabel>Active on</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 4,
      }}>
        <DaysOnRow daysOn={daysOn} onToggle={toggleDay} size={32} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => setDaysOn([0,1,2,3,4,5,6])} style={presetStyle()}>Every day</button>
          <button onClick={() => setDaysOn([1,2,3,4,5])} style={presetStyle()}>Weekdays</button>
          <button onClick={() => setDaysOn([0,6])} style={presetStyle()}>Weekends</button>
        </div>
      </div>

      {/* Time of day */}
      <GroupLabel>Time of day</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_WINDOWS.map(p => {
            const on = !customMode && preset === p.id;
            return (
              <button key={p.id} onClick={() => { setCustomMode(false); setTimeWindow(p.window); }}
                style={presetStyle(on)}>{p.label}</button>
            );
          })}
          <button onClick={() => { setCustomMode(true); if (!timeWindow) setTimeWindow({ start: 8, end: 17 }); }}
            style={presetStyle(customMode)}>Custom</button>
        </div>
        {customMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <HourStepper label="From" value={win.start} onChange={setWinStart} min={0} max={23} />
            <span style={{ color: T.muted, fontFamily: T.fontSans, fontSize: 13, marginTop: 16 }}>to</span>
            <HourStepper label="Until" value={win.end} onChange={setWinEnd} min={1} max={24} />
          </div>
        )}
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 12 }}>
          {timeWindow ? `Shows on Today ${windowLabel(timeWindow)}.` : 'Shows on Today all day.'}
        </div>
      </div>

      {/* Items */}
      <GroupLabel>Items</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 12, padding: '6px 14px', marginBottom: 4,
      }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 0',
            borderBottom: idx < items.length - 1 ? `0.5px solid ${T.border}` : 'none',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={arrowBtnStyle(idx === 0)}>
                <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
                  <path d="M1 5l3.5-4L8 5" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={arrowBtnStyle(idx === items.length - 1)}>
                <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
                  <path d="M1 1l3.5 4L8 1" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <input
              type="text" value={item.label}
              onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none',
                padding: '4px 0', minWidth: 0,
              }}
            />
            <button onClick={() => removeItem(idx)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.muted, fontFamily: T.fontSans, fontSize: 18, padding: '0 4px', lineHeight: 1,
            }}>×</button>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{
            fontFamily: T.fontSans, fontSize: 13, color: T.muted,
            padding: '10px 0', textAlign: 'center',
          }}>No items yet.</div>
        )}
      </div>

      {/* Add item */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
        <input
          type="text" value={newItemLabel}
          onChange={e => setNewItemLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
          placeholder="Add an item…"
          style={{
            flex: 1, boxSizing: 'border-box', minWidth: 0,
            background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: 999, padding: '10px 14px',
            fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none',
          }}
        />
        <button onClick={addItem} disabled={!newItemLabel.trim()} style={{
          padding: '10px 16px',
          background: T.ink, color: '#FAF7F2',
          border: 'none', borderRadius: 999, cursor: newItemLabel.trim() ? 'pointer' : 'default',
          fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          opacity: newItemLabel.trim() ? 1 : 0.35,
        }}>Add</button>
      </div>

      {/* Status — pause without deleting */}
      <GroupLabel>Status</GroupLabel>
      <button onClick={() => setEnabled(v => !v)} style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 12, textAlign: 'left',
        background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 12,
        padding: '14px 16px', cursor: 'pointer',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.ink }}>{enabled ? 'Active' : 'Paused'}</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 2 }}>
            {enabled ? 'Shows on Today and counts toward streaks' : 'Hidden from Today; history kept, streaks unaffected'}
          </div>
        </div>
        <span style={{
          width: 44, height: 26, borderRadius: 999, flexShrink: 0, position: 'relative',
          background: enabled ? T.pillars.routine : '#E1D7C8', transition: 'background 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 20, height: 20,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(44,36,24,0.25)',
          }} />
        </span>
      </button>

      {/* Delete */}
      {canDelete && (
        <>
          <div style={{ height: 24 }} />
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{
              width: '100%', padding: '13px',
              background: 'transparent', color: '#A04A3C',
              border: '1px solid #A04A3C33', borderRadius: 12,
              fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>Delete routine</button>
          ) : (
            <div style={{
              background: '#A04A3C12', border: '0.5px solid #A04A3C40',
              borderRadius: 12, padding: 16, textAlign: 'center',
            }}>
              <div style={{
                fontFamily: T.fontSans, fontSize: 13, color: T.ink,
                marginBottom: 12, lineHeight: 1.5,
              }}>This will delete the routine and its history. Sure?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', color: T.muted,
                  border: `0.5px solid ${T.border}`, borderRadius: 999,
                  fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Keep it</button>
                <button onClick={onDelete} style={{
                  flex: 1, padding: '11px',
                  background: '#A04A3C', color: '#FAF7F2',
                  border: 'none', borderRadius: 999,
                  fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Delete</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function presetStyle(active = false) {
  return {
    padding: '6px 12px', borderRadius: 999,
    border: `1px solid ${active ? T.pillars.routine : T.border}`,
    background: active ? `${T.pillars.routine}18` : 'transparent',
    color: active ? T.ink : T.muted,
    fontFamily: T.fontSans, fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
  };
}

function fmtHour12(h) {
  if (h >= 24) return '12am';
  const ap = h >= 12 ? 'pm' : 'am';
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}${ap}`;
}
function HourStepper({ label, value, onChange, min, max }) {
  const btn = {
    width: 30, height: 30, borderRadius: 8, border: `0.5px solid ${T.border}`,
    background: 'transparent', color: T.ink, cursor: 'pointer',
    fontFamily: T.fontSans, fontSize: 16, lineHeight: 1,
  };
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} style={btn}>−</button>
        <span style={{ flex: 1, textAlign: 'center', fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{fmtHour12(value)}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} style={btn}>+</button>
      </div>
    </div>
  );
}
function arrowBtnStyle(disabled) {
  return {
    background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
    padding: 2, opacity: disabled ? 0.25 : 1, lineHeight: 0,
  };
}
