import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { DAY_LABELS } from './model.js';
import { dateKey, weekStart, addDays } from '../../lib/dates.js';
import { ACCENT, EmptyHint } from './ui.jsx';

// Weekly plan: assign workouts to days. Each assignment is either recurring
// (every week, by weekday) or one-time (a specific date). Add via the day's +,
// drag a chip to another day to move it, tap × to remove. Page weeks with ‹ ›.
export function WeeklySchedule({ workouts, onCreateWorkout }) {
  const { movement, scheduleWorkout, unscheduleWorkout, moveOccurrence, skipOccurrence, endRecurrence, removeRecurrence } = useApp();
  const sched = movement.schedule || { recurring: {}, oneOff: {}, skips: {}, until: {} };
  const wkById = Object.fromEntries(workouts.map(w => [w.id, w]));

  const [weekOffset, setWeekOffset] = React.useState(0);
  const [adding, setAdding] = React.useState(null);   // { dayIndex, date, dow }
  const [removing, setRemoving] = React.useState(null); // { item, day } — recurring removal sheet
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
      .filter(id => !skips.includes(id) && !(until[`${dow}:${id}`] && dk > until[`${dow}:${id}`]))
      .map(id => ({ id, bucket: 'recurring', key: String(dow), dk }));
    const oneOff = (sched.oneOff[dk] || []).map(id => ({ id, bucket: 'oneOff', key: dk, dk }));
    return { i, date, dow, dk, items: [...recurring, ...oneOff] };
  });

  // ── Chip drag (pointer) ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const x = e.clientX, y = e.clientY;
      setDrag(d => d ? { ...d, x, y } : d);
      const el = document.elementsFromPoint(x, y).find(n => n.dataset && n.dataset.day != null);
      setOverDay(el ? Number(el.dataset.day) : null);
      if (e.cancelable) e.preventDefault();
    };
    const up = () => {
      const d = dragRef.current;
      const target = overDay != null ? days[overDay] : null;
      // Moving an instance affects only that day — a recurring occurrence becomes
      // a one-off on the new day and is skipped on its original day; the weekly
      // series is untouched.
      if (d && target && target.dk !== d.dk) {
        moveOccurrence({ bucket: d.bucket, key: d.key, dk: d.dk, id: d.workoutId }, target.dk);
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

  const startDrag = (e, item, workoutId) => {
    setDrag({ ...item, workoutId, x: e.clientX, y: e.clientY });
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
                const isDragging = drag && drag.workoutId === item.id && drag.key === item.key;
                return (
                  <span key={ci}
                    onPointerDown={(e) => startDrag(e, item, item.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, touchAction: 'none', cursor: 'grab',
                      background: `${ACCENT}1A`, color: T.ink, border: `0.5px solid ${ACCENT}55`, borderRadius: 999,
                      padding: '6px 10px', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                      opacity: isDragging ? 0.4 : 1,
                    }}>
                    {item.bucket === 'recurring' && <span title="repeats weekly" style={{ color: ACCENT, fontSize: 11 }}>↻</span>}
                    {w.name}
                    <button onClick={(e) => {
                      e.stopPropagation();
                      if (item.bucket === 'recurring') setRemoving({ item, day });
                      else unscheduleWorkout('oneOff', item.key, item.id);
                    }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      <p style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
        ↻ repeats weekly · drag to move just that day · tap × to remove
      </p>

      {/* Floating drag chip */}
      {drag && (
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
          onAdd={(workoutId, recurring) => {
            if (recurring) scheduleWorkout('recurring', String(adding.dow), workoutId);
            else scheduleWorkout('oneOff', adding.dk, workoutId);
            setAdding(null);
          }}
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

const navBtn = {
  width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.card,
  cursor: 'pointer', fontFamily: T.fontSans, fontSize: 18, color: T.ink, lineHeight: 1,
};

function AddToDay({ day, workouts, onClose, onAdd }) {
  const [recurring, setRecurring] = React.useState(true);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Add to {DAY_LABELS[day.dow]}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 14 }}>{day.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setRecurring(true)} style={toggleStyle(recurring)}>↻ Every week</button>
          <button onClick={() => setRecurring(false)} style={toggleStyle(!recurring)}>Just this day</button>
        </div>

        <div className="intent-scroll" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {workouts.map(w => (
            <button key={w.id} onClick={() => onAdd(w.id, recurring)} style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
              background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
            }}>
              <span style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{w.name}</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{(w.items || []).length} exercises</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function toggleStyle(active) {
  return {
    flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${active ? ACCENT : T.border}`, background: active ? `${ACCENT}14` : T.card,
    fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: active ? T.ink : T.muted,
  };
}
