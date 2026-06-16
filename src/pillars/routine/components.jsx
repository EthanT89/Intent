import React from 'react';
import { T } from '../../theme/tokens.js';
import { PillarPill, CategoryLabel, GroupLabel } from '../../components/primitives.jsx';
import { useApp } from '../../store/AppStateContext.jsx';
import { useUI } from '../../store/uiContext.js';
import { dateKey, addDays, todayKey } from '../../lib/dates.js';
import { haptics } from '../../lib/haptics.js';
import {
  isActiveDay, dayCompletionPct, computeRoutineStreak, computeItemStreak,
} from './model.js';

// ─── Today pill — first routine scheduled today, live checklist ──────────────
export function RoutinePill() {
  const { routines, toggleRoutineItem } = useApp();
  const { navigateToPillar } = useUI();
  const today = new Date();
  const tKey = todayKey();

  const routine = routines.list.find(r => isActiveDay(r, today)) || routines.list[0];

  // Empty state — no routines yet
  if (!routine) {
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

  const history = routines.history[routine.id] || {};
  const todayMap = history[tKey] || {};
  const doneCount = routine.items.filter(it => todayMap[it.id]).length;
  const streak = computeRoutineStreak(routine, history, today);

  const label = routine.name.toLowerCase() === 'morning' ? 'this morning'
    : routine.name.toLowerCase() === 'evening' ? 'this evening'
    : routine.name.toLowerCase();

  return (
    <PillarPill onNavigate={() => navigateToPillar('routine')}>
      <CategoryLabel>{label}</CategoryLabel>
      <div style={{ paddingRight: 16 }}>
        {routine.items.map((item, i) => {
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
          fontFamily: T.fontSans, fontSize: 12, color: T.muted,
          marginTop: 10, paddingTop: 10,
          borderTop: `0.5px solid ${T.border}`,
        }}>{doneCount} of {routine.items.length} done · {streak} day streak</div>
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
export function RoutineSection({ onBack }) {
  const { routines, toggleRoutineItem, setRoutineList, setRoutineHistory } = useApp();
  const list = routines.list;
  const history = routines.history;
  const [activeId, setActiveId] = React.useState(list[0] && list[0].id);
  const [editing, setEditing] = React.useState(false);
  const [stripEndOffset, setStripEndOffset] = React.useState(0);

  const today = new Date();
  const tKey = todayKey();
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

      {/* Segmented control */}
      <div className="intent-scroll" style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
        {list.map(r => (
          <button key={r.id} onClick={() => setActiveId(r.id)} style={{
            padding: '8px 14px', borderRadius: 999, border: 'none',
            background: activeId === r.id ? T.ink : '#F0EAE0',
            color: activeId === r.id ? '#FAF7F2' : T.muted,
            fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{r.name}</button>
        ))}
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
          marginBottom: 18, lineHeight: 1.5,
        }}>{routine.description}</div>
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

      {/* Today's checklist */}
      <GroupLabel>{isActiveToday ? 'Today' : 'Not scheduled today'}</GroupLabel>
      {isActiveToday ? (
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
      )}

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
    onSave({ ...routine, name: name.trim() || 'Untitled', description: description.trim(), daysOn, items });
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

function presetStyle() {
  return {
    padding: '6px 12px', borderRadius: 999, border: `0.5px solid ${T.border}`,
    background: 'transparent', color: T.muted,
    fontFamily: T.fontSans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
  };
}
function arrowBtnStyle(disabled) {
  return {
    background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
    padding: 2, opacity: disabled ? 0.25 : 1, lineHeight: 0,
  };
}
