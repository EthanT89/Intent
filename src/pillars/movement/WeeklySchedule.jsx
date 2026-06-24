import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { DAY_LABELS, ruleId, ruleFreq, ruleActiveOnWeek, plural } from './model.js';
import { dateKey, weekStart, addDays } from '../../lib/dates.js';
import { ACCENT, EmptyHint } from './ui.jsx';

// Weekly plan: assign workouts to days. Each assignment is either recurring
// (every week, by weekday) or one-time (a specific date). Add via the day's +,
// drag a chip to another day to move it, tap × to remove. Page weeks with ‹ ›.
export function WeeklySchedule({ workouts, onCreateWorkout }) {
  const { movement, scheduleWorkout, unscheduleWorkout, moveOccurrence, skipOccurrence, endRecurrence, removeRecurrence, addRecurringWorkout, moveRecurringDay } = useApp();
  const sched = movement.schedule || { recurring: {}, oneOff: {}, skips: {}, until: {} };
  const wkById = Object.fromEntries(workouts.map(w => [w.id, w]));

  const [weekOffset, setWeekOffset] = React.useState(0);
  const [adding, setAdding] = React.useState(null);   // { dayIndex, date, dow }
  const [removing, setRemoving] = React.useState(null); // { item, day } — recurring removal sheet
  const [acting, setActing] = React.useState(null);   // { item, day } — tap-a-chip action sheet
  const [picking, setPicking] = React.useState(null); // { item, day } — reschedule day picker
  const [dropChoice, setDropChoice] = React.useState(null); // { item, target } — series-vs-week on drag-drop
  const [drag, setDrag] = React.useState(null);       // floating chip while dragging
  const [overDay, setOverDay] = React.useState(null);
  const dragRef = React.useRef(null); dragRef.current = drag;

  const ws = addDays(weekStart(new Date()), weekOffset * 7);
  const todayKeyStr = dateKey(new Date());
  const until = sched.until || {};
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ws, i);
    const dow = date.getDay();
    const dk = dateKey(date);
    const skips = (sched.skips && sched.skips[dk]) || [];
    const recurring = (sched.recurring[String(dow)] || [])
      .filter(r => {
        const id = ruleId(r);
        if (skips.includes(id)) return false;
        if (until[`${dow}:${id}`] && dk > until[`${dow}:${id}`]) return false;
        return ruleActiveOnWeek(r, date);
      })
      .map(r => ({ id: ruleId(r), bucket: 'recurring', key: String(dow), dk, freq: ruleFreq(r) }));
    const oneOff = (sched.oneOff[dk] || []).map(id => ({ id, bucket: 'oneOff', key: dk, dk }));
    return { i, date, dow, dk, items: [...recurring, ...oneOff] };
  });

  // ── Chip drag (pointer) ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const x = e.clientX, y = e.clientY;
      const d0 = dragRef.current;
      if (!d0) return;
      // Only promote a press to a drag once the finger has actually moved — a
      // stationary press is a tap, which opens the action sheet on release.
      const moved = d0.moved || Math.hypot(x - d0.startX, y - d0.startY) > 6;
      setDrag(d => d ? { ...d, x, y, moved } : d);
      if (moved) {
        const el = document.elementsFromPoint(x, y).find(n => n.dataset && n.dataset.day != null);
        setOverDay(el ? Number(el.dataset.day) : null);
        if (e.cancelable) e.preventDefault();
      }
    };
    const up = () => {
      const d = dragRef.current;
      if (d && !d.moved) {
        // Tap → open the per-occurrence action sheet.
        setActing({ item: { bucket: d.bucket, key: d.key, dk: d.dk, id: d.workoutId }, day: d.day });
      } else if (d && d.moved) {
        const target = overDay != null ? days[overDay] : null;
        if (target && target.dk !== d.dk) {
          const item = { bucket: d.bucket, key: d.key, dk: d.dk, id: d.workoutId };
          if (d.bucket === 'recurring') {
            // Recurring → ask whether to move just this week or the whole series.
            setDropChoice({ item, target: { dk: target.dk, dow: target.dow } });
          } else {
            moveOccurrence(item, target.dk);
          }
        }
      }
      setDrag(null); setOverDay(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, overDay, days, moveOccurrence]);

  const startDrag = (e, item, day) => {
    setDrag({ ...item, workoutId: item.id, day, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false });
  };

  if (workouts.length === 0) {
    return <EmptyHint title="No workouts to plan yet" body="Create a workout first, then schedule it across your week." cta="+ New workout" onCta={onCreateWorkout} />;
  }

  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === 1 ? 'Next week'
    : weekOffset === -1 ? 'Last week'
    : `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(ws, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={navBtn}>‹</button>
        <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => o + 1)} style={navBtn}>›</button>
      </div>

      {days.map(day => {
        const isToday = day.dk === todayKeyStr;
        const isOver = overDay === day.i;
        return (
          <div key={day.i} data-day={day.i}
            style={{
              background: isOver ? `${ACCENT}1A` : T.card,
              border: `0.5px solid ${isOver ? ACCENT : T.border}`, borderRadius: 14,
              padding: 12, marginBottom: 8, transition: 'background 0.1s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: day.items.length ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: isToday ? ACCENT : T.ink }}>{DAY_LABELS[day.dow]}</span>
                <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{isToday ? ' · today' : ''}</span>
              </div>
              <button onClick={() => setAdding(day)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600 }}>+ Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {day.items.length === 0 && <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>Rest day</span>}
              {day.items.map((item, ci) => {
                const w = wkById[item.id];
                if (!w) return null;
                const isDragging = drag && drag.moved && drag.dk === item.dk && drag.workoutId === item.id && drag.key === item.key;
                return (
                  <span key={ci}
                    onPointerDown={(e) => startDrag(e, item, day)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, touchAction: 'none', cursor: 'grab',
                      background: `${ACCENT}1A`, color: T.ink, border: `0.5px solid ${ACCENT}55`, borderRadius: 999,
                      padding: '6px 11px', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                      opacity: isDragging ? 0.4 : 1,
                    }}>
                    {item.bucket === 'recurring' && (
                      <span title={item.freq > 1 ? 'every other week' : 'repeats weekly'} style={{ display: 'inline-flex', alignItems: 'center', color: ACCENT, fontSize: 11 }}>
                        ↻{item.freq > 1 && <span style={{ fontSize: 8, fontWeight: 700, marginLeft: 1 }}>2w</span>}
                      </span>
                    )}
                    {w.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
        ↻ weekly · ↻2w every other week · tap for options · drag to move
      </p>

      {/* Floating drag chip */}
      {drag && drag.moved && (
        <div style={{
          position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -130%)',
          zIndex: 500, pointerEvents: 'none',
          background: T.card, color: T.ink, border: `1px solid ${ACCENT}`, borderRadius: 999,
          padding: '6px 12px', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          boxShadow: '0 6px 18px rgba(44,36,24,0.22)',
        }}>{wkById[drag.workoutId]?.name}</div>
      )}

      {/* Add-to-day picker */}
      {adding && (
        <AddToDay
          day={adding}
          workouts={workouts}
          onClose={() => setAdding(null)}
          onAdd={(workoutId, mode) => {
            if (mode === 'weekly') addRecurringWorkout(String(adding.dow), workoutId, 1);
            else if (mode === 'biweekly') addRecurringWorkout(String(adding.dow), workoutId, 2, adding.dk);
            else scheduleWorkout('oneOff', adding.dk, workoutId);
            setAdding(null);
          }}
        />
      )}

      {/* Drag-drop: move just this week or the whole series */}
      {dropChoice && (
        <MoveOccurrence
          workoutName={wkById[dropChoice.item.id]?.name || 'workout'}
          target={dropChoice.target}
          onClose={() => setDropChoice(null)}
          onThisWeek={() => { moveOccurrence(dropChoice.item, dropChoice.target.dk); setDropChoice(null); }}
          onSeries={() => { moveRecurringDay(dropChoice.item.key, dropChoice.item.id, dropChoice.target.dow); setDropChoice(null); }}
        />
      )}

      {/* Remove a recurring occurrence — this day / this & future / every week */}
      {removing && (
        <RemoveOccurrence
          removing={removing}
          workoutName={wkById[removing.item.id]?.name || 'workout'}
          onClose={() => setRemoving(null)}
          onThisDay={() => { skipOccurrence(removing.item.dk, removing.item.id); setRemoving(null); }}
          onThisAndFuture={() => {
            const dayBefore = dateKey(addDays(removing.day.date, -1));
            endRecurrence(String(removing.day.dow), removing.item.id, dayBefore);
            setRemoving(null);
          }}
          onEveryWeek={() => { removeRecurrence(String(removing.day.dow), removing.item.id); setRemoving(null); }}
        />
      )}

      {/* Tap-a-chip action sheet — move to today / reschedule / remove */}
      {acting && (
        <OccurrenceActions
          acting={acting}
          workoutName={wkById[acting.item.id]?.name || 'workout'}
          isToday={acting.item.dk === todayKeyStr}
          onClose={() => setActing(null)}
          onMoveToday={() => { moveOccurrence(acting.item, todayKeyStr); setActing(null); }}
          onReschedule={() => { setPicking(acting); setActing(null); }}
          onRemove={() => {
            if (acting.item.bucket === 'recurring') setRemoving({ item: acting.item, day: acting.day });
            else unscheduleWorkout('oneOff', acting.item.key, acting.item.id);
            setActing(null);
          }}
        />
      )}

      {/* Reschedule — pick a day in the viewed week */}
      {picking && (
        <DayPicker
          picking={picking}
          days={days}
          workoutName={wkById[picking.item.id]?.name || 'workout'}
          onClose={() => setPicking(null)}
          onPick={(dk) => { moveOccurrence(picking.item, dk); setPicking(null); }}
        />
      )}
    </div>
  );
}

// Action sheet for removing a recurring workout occurrence, mirroring how a
// calendar asks whether to delete one event or the whole series.
function RemoveOccurrence({ removing, workoutName, onClose, onThisDay, onThisAndFuture, onEveryWeek }) {
  const dateLabel = removing.day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const rows = [
    { label: 'This day only', sub: dateLabel, onClick: onThisDay },
    { label: 'This & future weeks', sub: `Every ${DAY_LABELS[removing.day.dow]} from here on`, onClick: onThisAndFuture },
    { label: 'Every week', sub: 'Remove the whole repeat', onClick: onEveryWeek, danger: true },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Remove “{workoutName}”</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 16 }}>This repeats weekly — what would you like to remove?</div>

        {rows.map((r, i) => (
          <button key={i} onClick={r.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%',
            padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            background: T.cardCream, border: `0.5px solid ${r.danger ? '#B8453E55' : T.border}`, borderRadius: 12,
          }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: r.danger ? '#B8453E' : T.ink }}>{r.label}</span>
            <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{r.sub}</span>
          </button>
        ))}

        <button onClick={onClose} style={{ width: '100%', padding: '12px', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Cancel</button>
      </div>
    </div>
  );
}

// Tapping a scheduled workout opens this: move to today, reschedule, or remove.
function OccurrenceActions({ acting, workoutName, isToday, onClose, onMoveToday, onReschedule, onRemove }) {
  const recurring = acting.item.bucket === 'recurring';
  const dateLabel = acting.day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const rows = [];
  if (!isToday) rows.push({ label: 'Move to today', sub: 'Just this one', onClick: onMoveToday });
  rows.push({ label: 'Move to another day…', sub: 'Pick a day this week', onClick: onReschedule });
  rows.push({ label: recurring ? 'Remove…' : 'Remove', sub: recurring ? 'This day, future, or every week' : 'Take it off this day', onClick: onRemove, danger: true });
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
          {workoutName}{recurring ? ' ↻' : ''}
        </div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 16 }}>{dateLabel}</div>
        {rows.map((r, i) => (
          <button key={i} onClick={r.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%',
            padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            background: T.cardCream, border: `0.5px solid ${r.danger ? '#B8453E55' : T.border}`, borderRadius: 12,
          }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: r.danger ? '#B8453E' : T.ink }}>{r.label}</span>
            <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{r.sub}</span>
          </button>
        ))}
        <button onClick={onClose} style={{ width: '100%', padding: '12px', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Cancel</button>
      </div>
    </div>
  );
}

// Reschedule picker — the seven days of the viewed week; the current day is disabled.
function DayPicker({ picking, days, workoutName, onClose, onPick }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Move “{workoutName}” to…</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 14 }}>Just this one — repeats stay put</div>
        <div className="intent-scroll" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {days.map(d => {
            const here = d.dk === picking.item.dk;
            return (
              <button key={d.dk} disabled={here} onClick={() => onPick(d.dk)} style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 14px', marginBottom: 8, textAlign: 'left',
                cursor: here ? 'default' : 'pointer', opacity: here ? 0.5 : 1,
                background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
              }}>
                <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>{DAY_LABELS[d.dow]}</span>
                <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{here ? ' · current' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const navBtn = {
  width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.card,
  cursor: 'pointer', fontFamily: T.fontSans, fontSize: 18, color: T.ink, lineHeight: 1,
};

function AddToDay({ day, workouts, onClose, onAdd }) {
  const [mode, setMode] = React.useState('weekly');
  const modes = [
    { id: 'weekly', label: 'Every week' },
    { id: 'biweekly', label: 'Every other' },
    { id: 'once', label: 'Just once' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Add to {DAY_LABELS[day.dow]}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 14 }}>{day.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: mode === 'biweekly' ? 8 : 16 }}>
          {modes.map(m => <button key={m.id} onClick={() => setMode(m.id)} style={toggleStyle(mode === m.id)}>{m.label}</button>)}
        </div>
        {mode === 'biweekly' && (
          <div style={{ fontFamily: T.fontSans, fontSize: 11.5, color: T.muted, lineHeight: 1.5, marginBottom: 14 }}>
            Runs this {DAY_LABELS[day.dow]}, then every other week. Add a second workout the same way next week and they'll alternate (A/B weeks).
          </div>
        )}

        <div className="intent-scroll" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {workouts.map(w => (
            <button key={w.id} onClick={() => onAdd(w.id, mode)} style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
              background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
            }}>
              <span style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{w.name}</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{plural((w.items || []).length, 'exercise')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Drag-drop choice for a recurring workout — like moving a repeating calendar event.
function MoveOccurrence({ workoutName, target, onClose, onThisWeek, onSeries }) {
  const dayName = DAY_LABELS[target.dow];
  const rows = [
    { label: 'Just this week', sub: 'Move only this week — the repeat stays put', onClick: onThisWeek },
    { label: 'The whole series', sub: `Repeat on ${dayName} from now on`, onClick: onSeries },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Move “{workoutName}” to {dayName}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 16 }}>This workout repeats — apply the move to…</div>
        {rows.map((r, i) => (
          <button key={i} onClick={r.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%',
            padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
          }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>{r.label}</span>
            <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{r.sub}</span>
          </button>
        ))}
        <button onClick={onClose} style={{ width: '100%', padding: '12px', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Cancel</button>
      </div>
    </div>
  );
}

function toggleStyle(active) {
  return {
    flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${active ? ACCENT : T.border}`, background: active ? `${ACCENT}14` : T.card,
    fontFamily: T.fontSans, fontSize: 12.5, fontWeight: 600, color: active ? T.ink : T.muted,
  };
}
