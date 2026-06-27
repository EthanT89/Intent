import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { dateKey } from '../../lib/dates.js';
import { EVENT_COLORS, DEFAULT_EVENT_COLOR, RECUR_OPTIONS, REMIND_TIMED, REMIND_ALLDAY, parseDT, pad2 } from './model.js';

const REMIND_VAL = (s) => (s === 'none' ? null : Number(s));
const REMIND_STR = (v) => (v == null ? 'none' : String(v));

const field = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px',
  border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card,
  fontFamily: T.fontSans, fontSize: 15, color: T.ink, outline: 'none',
};
const labelStyle = { fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };

function addMinutesToHHMM(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + mins;
  total = ((total % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

// Unified create/edit sheet. `composer` = { mode, event?, task?, date, startHour? }.
export function CalendarComposer({ composer, onClose }) {
  const { saveEvent, deleteEvent, saveTask, toggleTask, deleteTask } = useApp();
  const [mode, setMode] = React.useState(composer.mode || 'event');

  const baseDate = composer.date || dateKey(new Date());
  const editEvent = composer.event || null;
  const editTask = composer.task || null;

  // ── Event draft ──
  const evStart = editEvent ? parseDT(editEvent.start) : null;
  const evEnd = editEvent ? parseDT(editEvent.end) : null;
  const initStartTime = editEvent && !editEvent.allDay && evStart
    ? `${pad2(evStart.getHours())}:${pad2(evStart.getMinutes())}`
    : (composer.startHour != null ? `${pad2(composer.startHour)}:00` : '09:00');
  const initEndTime = editEvent && !editEvent.allDay && evEnd
    ? `${pad2(evEnd.getHours())}:${pad2(evEnd.getMinutes())}`
    : addMinutesToHHMM(initStartTime, 60);

  const [title, setTitle] = React.useState(editEvent ? editEvent.title : '');
  const [allDay, setAllDay] = React.useState(editEvent ? !!editEvent.allDay : false);
  const [date, setDate] = React.useState(editEvent && evStart ? dateKey(evStart) : baseDate);
  const [startTime, setStartTime] = React.useState(initStartTime);
  const [endTime, setEndTime] = React.useState(initEndTime);
  const [color, setColor] = React.useState(editEvent ? (editEvent.color || DEFAULT_EVENT_COLOR) : DEFAULT_EVENT_COLOR);
  const [recur, setRecur] = React.useState(editEvent ? (editEvent.recur || 'none') : 'none');
  const [notes, setNotes] = React.useState(editEvent ? (editEvent.notes || '') : '');
  const [location, setLocation] = React.useState(editEvent ? (editEvent.location || '') : '');
  const [remind, setRemind] = React.useState(editEvent && editEvent.remind != null ? editEvent.remind : null);

  // ── Task draft ──
  const tDue = editTask && editTask.due ? parseDT(editTask.due) : null;
  const [tTitle, setTTitle] = React.useState(editTask ? editTask.title : '');
  const [tScheduled, setTScheduled] = React.useState(editTask ? !!editTask.due : true);
  const [tTimed, setTTimed] = React.useState(editTask ? !!(editTask.due && editTask.due.length > 10) : false);
  const [tDate, setTDate] = React.useState(tDue ? dateKey(tDue) : baseDate);
  const [tTime, setTTime] = React.useState(tDue && editTask.due.length > 10 ? `${pad2(tDue.getHours())}:${pad2(tDue.getMinutes())}` : '09:00');
  const [tNotes, setTNotes] = React.useState(editTask ? (editTask.notes || '') : '');
  const [tRemind, setTRemind] = React.useState(editTask && editTask.remind != null ? editTask.remind : null);
  const [tRecur, setTRecur] = React.useState(editTask ? (editTask.recur || 'none') : 'none');

  const saveEv = () => {
    if (!title.trim()) return;
    let start = allDay ? date : `${date}T${startTime}`;
    let end = allDay ? date : `${date}T${endTime}`;
    if (!allDay && parseDT(end) <= parseDT(start)) end = `${date}T${addMinutesToHHMM(startTime, 60)}`;
    saveEvent({ id: editEvent?.id, title: title.trim(), allDay, start, end, color, recur, notes: notes.trim(), location: location.trim(), remind });
    onClose();
  };
  const saveTk = () => {
    if (!tTitle.trim()) return;
    const due = tScheduled ? (tTimed ? `${tDate}T${tTime}` : tDate) : null;
    saveTask({ id: editTask?.id, title: tTitle.trim(), due, notes: tNotes.trim(), done: editTask?.done, remind: due ? tRemind : null, recur: due ? tRecur : 'none' });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 400, background: 'rgba(44,36,24,0.32)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="intent-scroll" style={{
        width: '100%', maxHeight: '92%', overflowY: 'auto',
        background: T.card, borderRadius: '20px 20px 0 0', padding: '14px 20px calc(28px + var(--safe-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>

        {/* Event / Task switch (only when creating) */}
        {!editEvent && !editTask && (
          <div style={{ display: 'flex', gap: 4, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {['event', 'task'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: mode === m ? T.card : 'transparent', boxShadow: mode === m ? '0 1px 4px rgba(44,36,24,0.1)' : 'none',
                fontFamily: T.fontSans, fontSize: 13.5, fontWeight: 600, color: mode === m ? T.ink : T.muted, textTransform: 'capitalize',
              }}>{m}</button>
            ))}
          </div>
        )}

        {mode === 'event' ? (
          <>
            <input autoFocus={!editEvent} value={title} onChange={e => setTitle(e.target.value)} placeholder="Add title"
              style={{ ...field, fontFamily: T.fontSerif, fontSize: 19, fontWeight: 600, border: 'none', padding: '4px 2px', marginBottom: 14 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px', marginBottom: 8 }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>All-day</span>
              <Toggle on={allDay} onChange={setAllDay} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Date</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} />
              </div>
              {!allDay && (
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Start</div>
                    <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); if (parseDT(`${date}T${endTime}`) <= parseDT(`${date}T${e.target.value}`)) setEndTime(addMinutesToHHMM(e.target.value, 60)); }} style={field} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>End</div>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={field} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Color</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? `2.5px solid ${T.ink}` : '2.5px solid transparent',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Repeat</div>
              <select value={recur} onChange={e => setRecur(e.target.value)} style={{ ...field, appearance: 'none' }}>
                {RECUR_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Reminder</div>
              <select value={REMIND_STR(remind)} onChange={e => setRemind(REMIND_VAL(e.target.value))} style={{ ...field, appearance: 'none' }}>
                {(allDay ? REMIND_ALLDAY : REMIND_TIMED).map(o => <option key={REMIND_STR(o.v)} value={REMIND_STR(o.v)}>{o.l}</option>)}
              </select>
            </div>

            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" style={{ ...field, marginBottom: 10 }} />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" style={{ ...field, height: 64, resize: 'none', marginBottom: 16, lineHeight: 1.5 }} />

            <SaveRow onSave={saveEv} canSave={!!title.trim()} onDelete={editEvent ? () => { deleteEvent(editEvent.id); onClose(); } : null} label={editEvent ? 'Save' : 'Add event'} />
          </>
        ) : (
          <>
            <input autoFocus={!editTask} value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder="Add a to-do"
              style={{ ...field, fontFamily: T.fontSerif, fontSize: 19, fontWeight: 600, border: 'none', padding: '4px 2px', marginBottom: 14 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px', marginBottom: tScheduled ? 8 : 16 }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>Give it a day</span>
              <Toggle on={tScheduled} onChange={setTScheduled} />
            </div>

            {tScheduled && (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Date</div>
                    <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} style={field} />
                  </div>
                  {tTimed && (
                    <div style={{ flex: 1 }}>
                      <div style={labelStyle}>Time</div>
                      <input type="time" value={tTime} onChange={e => setTTime(e.target.value)} style={field} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px', marginBottom: 14 }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>Set a time</span>
                  <Toggle on={tTimed} onChange={setTTimed} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Repeat</div>
                  <select value={tRecur} onChange={e => setTRecur(e.target.value)} style={{ ...field, appearance: 'none' }}>
                    {RECUR_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Reminder</div>
                  <select value={REMIND_STR(tRemind)} onChange={e => setTRemind(REMIND_VAL(e.target.value))} style={{ ...field, appearance: 'none' }}>
                    {(tTimed ? REMIND_TIMED : REMIND_ALLDAY).map(o => <option key={REMIND_STR(o.v)} value={REMIND_STR(o.v)}>{o.l}</option>)}
                  </select>
                </div>
              </>
            )}

            <textarea value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Notes…" style={{ ...field, height: 64, resize: 'none', marginBottom: 16, lineHeight: 1.5 }} />

            <SaveRow onSave={saveTk} canSave={!!tTitle.trim()} onDelete={editTask ? () => { deleteTask(editTask.id); onClose(); } : null} label={editTask ? 'Save' : 'Add to-do'} />
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2,
      background: on ? T.amber : T.border, transition: 'background 0.2s', position: 'relative',
    }}>
      <span style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff', transform: `translateX(${on ? 18 : 0}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function SaveRow({ onSave, canSave, onDelete, label }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {onDelete && (
        <button onClick={onDelete} style={{ flex: '0 0 auto', padding: '13px 18px', background: 'none', border: `1px solid #B8453E`, borderRadius: 12, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: '#B8453E' }}>Delete</button>
      )}
      <button onClick={onSave} disabled={!canSave} style={{
        flex: 1, padding: '13px', background: T.amber, color: '#FAF7F2', border: 'none', borderRadius: 12,
        cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.45,
        fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
      }}>{label}</button>
    </div>
  );
}
