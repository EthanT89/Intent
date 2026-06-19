import React from 'react';
import { T } from '../theme/tokens.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import {
  dateKey, addDays, addMonths, startOfMonth, isSameDay,
} from '../lib/dates.js';
import {
  fmtTime, fmtHourLabel, minutesOf, layoutTimed, compareItems, buildICS, DEFAULT_EVENT_COLOR,
} from '../pillars/calendar/model.js';
import { itemsForRange, itemsForDate, inboxTasks, CAL_SOURCES } from '../pillars/calendar/sources.js';
import { CalendarComposer } from '../pillars/calendar/CalendarComposer.jsx';

const HOUR = 52;   // px per hour in the day grid
const GUTTER = 46; // left time-label gutter

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarScreen() {
  const app = useApp();
  const { calendar, setCalendarView, setCalendarLayer, toggleTask } = app;
  const { navigateToPillar } = useUI();

  const [view, setView] = React.useState(calendar.settings?.defaultView || 'day');
  const [cursor, setCursor] = React.useState(() => new Date());
  const [composer, setComposer] = React.useState(null);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const now = new Date();

  const changeView = (v) => { setView(v); setCalendarView(v); };
  const shift = (dir) => {
    if (view === 'month') setCursor(c => addMonths(c, dir));
    else if (view === 'agenda') setCursor(c => addDays(c, dir * 7));
    else setCursor(c => addDays(c, dir));
  };

  const openItem = (it) => {
    if (it.kind === 'event') setComposer({ mode: 'event', event: it.ref, date: it.date });
    else if (it.kind === 'task') setComposer({ mode: 'task', task: it.ref, date: it.date });
    else if (it.kind === 'workout') navigateToPillar('movement');
    else if (it.kind === 'routine') navigateToPillar('routine', it.ref.id);
  };

  const title = view === 'month'
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'agenda'
      ? 'Upcoming'
      : (isSameDay(cursor, now) ? 'Today' : DOW[cursor.getDay()]);
  const subtitle = view === 'day'
    ? cursor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '4px 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.fontSerif, fontSize: 24, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{title}</div>
            {subtitle && <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => shift(-1)} style={chevBtn}>‹</button>
            <button onClick={() => setCursor(new Date())} style={{
              padding: '7px 12px', borderRadius: 999, border: `0.5px solid ${T.border}`, background: T.card,
              fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.ink, cursor: 'pointer',
            }}>Today</button>
            <button onClick={() => shift(1)} style={chevBtn}>›</button>
            <button onClick={() => setOptionsOpen(true)} style={{ ...chevBtn, fontSize: 18 }} aria-label="Calendar options">⋯</button>
          </div>
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', gap: 4, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
          {['day', 'month', 'agenda'].map(v => (
            <button key={v} onClick={() => changeView(v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: view === v ? T.card : 'transparent', boxShadow: view === v ? '0 1px 4px rgba(44,36,24,0.1)' : 'none',
              fontFamily: T.fontSans, fontSize: 12.5, fontWeight: 600, color: view === v ? T.ink : T.muted, textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>

        {view === 'day' && <WeekStrip app={app} cursor={cursor} onPick={setCursor} now={now} />}
      </div>

      {/* Body */}
      <div className="intent-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 130px' }}>
        {view === 'day' && <DayView app={app} cursor={cursor} now={now} onItem={openItem} onCreate={(h) => setComposer({ mode: 'event', date: dateKey(cursor), startHour: h })} />}
        {view === 'month' && <MonthView app={app} cursor={cursor} now={now} onPickDay={(d) => { setCursor(d); changeView('day'); }} />}
        {view === 'agenda' && <AgendaView app={app} cursor={cursor} now={now} onItem={openItem} onToggle={toggleTask} />}
      </div>

      {/* FAB */}
      <button onClick={() => setComposer({ mode: 'event', date: dateKey(cursor) })} style={{
        position: 'absolute', right: 20, bottom: 'calc(96px + var(--safe-bottom))', zIndex: 50,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: T.amber, color: '#FAF7F2', fontSize: 30, lineHeight: 1,
        boxShadow: '0 6px 20px rgba(44,36,24,0.28)',
      }}>+</button>

      {composer && <CalendarComposer composer={composer} onClose={() => setComposer(null)} />}
      {optionsOpen && <OptionsSheet app={app} onClose={() => setOptionsOpen(false)} setCalendarLayer={setCalendarLayer} />}
    </div>
  );
}

const chevBtn = {
  width: 34, height: 34, borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.card,
  cursor: 'pointer', fontFamily: T.fontSans, fontSize: 18, color: T.ink, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

// ── Week strip (Day view) ────────────────────────────────────────────────────
function WeekStrip({ app, cursor, onPick, now }) {
  const sunday = addDays(cursor, -cursor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
      {days.map((d, i) => {
        const sel = isSameDay(d, cursor);
        const today = isSameDay(d, now);
        const has = itemsForDate(app, d).length > 0;
        return (
          <button key={i} onClick={() => onPick(new Date(d))} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted, fontWeight: 500 }}>{DOW1[i]}</span>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
              background: sel ? T.amber : 'transparent',
              color: sel ? '#FAF7F2' : today ? T.amber : T.ink,
              border: today && !sel ? `1.5px solid ${T.amber}` : '1.5px solid transparent',
            }}>{d.getDate()}</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: has && !sel ? T.amber : 'transparent' }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Day view (time grid) ─────────────────────────────────────────────────────
function DayView({ app, cursor, now, onItem, onCreate }) {
  const scrollRef = React.useRef(null);
  const items = itemsForDate(app, cursor).sort(compareItems);
  const allDay = items.filter(it => it.allDay);
  const timed = items.filter(it => !it.allDay && it.start).map(it => ({ ...it, _s: minutesOf(it.start), _e: Math.max(minutesOf(it.start) + 20, minutesOf(it.end || it.start)) }));
  const laid = layoutTimed(timed.map(it => ({ ...it, start: it._s, end: it._e })));
  const isToday = isSameDay(cursor, now);

  // Auto-scroll to ~7am (or now) when the day changes.
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const focusMin = isToday ? minutesOf(now) - 60 : 7 * 60;
    scrollRef.current.scrollTop = Math.max(0, (focusMin / 60) * HOUR);
  }, [dateKey(cursor)]); // eslint-disable-line react-hooks/exhaustive-deps

  const gridClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onCreate(Math.max(0, Math.min(23, Math.floor(y / HOUR))));
  };

  return (
    <div>
      {/* All-day lane */}
      {allDay.length > 0 && (
        <div style={{ padding: '8px 0 10px', borderBottom: `0.5px solid ${T.border}`, marginBottom: 4 }}>
          {allDay.map(it => (
            <button key={it.id} onClick={() => onItem(it)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              padding: '7px 10px', marginBottom: 4, cursor: 'pointer', borderRadius: 8, border: 'none',
              background: `${it.color}1F`,
            }}>
              {it.kind === 'task'
                ? <Check done={it.done} color={it.color} />
                : <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />}
              <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.5 : 1 }}>{it.title}</span>
              <KindTag kind={it.kind} />
            </button>
          ))}
        </div>
      )}

      {/* Hour grid */}
      <div ref={scrollRef} style={{ position: 'relative' }}>
        <div style={{ position: 'relative', height: 24 * HOUR }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ position: 'absolute', top: h * HOUR, left: 0, right: 0, height: HOUR, borderTop: `0.5px solid ${T.border}` }}>
              <span style={{ position: 'absolute', left: 0, top: -7, width: GUTTER - 8, textAlign: 'right', fontFamily: T.fontSans, fontSize: 9.5, color: T.muted }}>{h === 0 ? '' : fmtHourLabel(h)}</span>
            </div>
          ))}

          {/* tap-to-create layer */}
          <div onClick={gridClick} style={{ position: 'absolute', top: 0, left: GUTTER, right: 0, height: 24 * HOUR }} />

          {/* events */}
          {laid.map(it => {
            const top = (it.start / 60) * HOUR;
            const height = Math.max(20, ((it.end - it.start) / 60) * HOUR - 2);
            const leftPct = it.col / it.cols;
            const widthCalc = `calc((100% - ${GUTTER + 6}px) / ${it.cols} - 3px)`;
            const leftCalc = `calc(${GUTTER}px + (100% - ${GUTTER + 6}px) * ${leftPct})`;
            return (
              <button key={it.id} onClick={() => onItem(it)} style={{
                position: 'absolute', top, height, left: leftCalc, width: widthCalc,
                background: `${it.color}26`, borderLeft: `3px solid ${it.color}`, borderRadius: 6,
                padding: '3px 6px', textAlign: 'left', cursor: 'pointer', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', border: 'none', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: it.color,
              }}>
                <span style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: it.done ? 'line-through' : 'none' }}>{it.title}</span>
                {height > 30 && <span style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted }}>{fmtTime(it.start ? new Date(0, 0, 0, Math.floor(it._s / 60), it._s % 60) : null)}</span>}
              </button>
            );
          })}

          {/* now line */}
          {isToday && (
            <div style={{ position: 'absolute', left: GUTTER - 4, right: 0, top: (minutesOf(now) / 60) * HOUR, height: 0, borderTop: `1.5px solid #B8453E`, zIndex: 5 }}>
              <span style={{ position: 'absolute', left: -5, top: -4, width: 8, height: 8, borderRadius: '50%', background: '#B8453E' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({ app, cursor, now, onPickDay }) {
  const first = startOfMonth(cursor);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const all = itemsForRange(app, gridStart, cells[41]);
  const byDate = {};
  all.forEach(it => { (byDate[it.date] = byDate[it.date] || []).push(it); });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DOW1.map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, color: T.muted, padding: '4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const today = isSameDay(d, now);
          const dayItems = (byDate[dateKey(d)] || []).slice().sort(compareItems);
          return (
            <button key={i} onClick={() => onPickDay(new Date(d))} style={{
              minHeight: 78, padding: '4px 3px', textAlign: 'left', cursor: 'pointer',
              background: today ? `${T.amber}12` : 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 8,
              display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', opacity: inMonth ? 1 : 0.38,
            }}>
              <span style={{
                fontFamily: T.fontSans, fontSize: 12, fontWeight: today ? 700 : 500,
                color: today ? T.amber : T.ink, alignSelf: 'flex-start',
              }}>{d.getDate()}</span>
              {dayItems.slice(0, 3).map(it => (
                <span key={it.id} style={{
                  display: 'flex', alignItems: 'center', gap: 3, width: '100%',
                  fontFamily: T.fontSans, fontSize: 9, color: T.ink,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.5 : 1 }}>{it.title}</span>
                </span>
              ))}
              {dayItems.length > 3 && <span style={{ fontFamily: T.fontSans, fontSize: 9, color: T.muted }}>+{dayItems.length - 3}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda view ───────────────────────────────────────────────────────────────
function AgendaView({ app, cursor, now, onItem, onToggle }) {
  const start = new Date(cursor); start.setHours(0, 0, 0, 0);
  const end = addDays(start, 45);
  const all = itemsForRange(app, start, end);
  const byDate = {};
  all.forEach(it => { (byDate[it.date] = byDate[it.date] || []).push(it); });
  const days = Object.keys(byDate).sort();
  const inbox = inboxTasks(app);

  if (days.length === 0 && inbox.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Nothing ahead yet</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Tap + to add an event or a to-do, or schedule a workout in Movement — it'll show up here.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {inbox.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={agendaHead}>Anytime</div>
          {inbox.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={() => onItem({ kind: 'task', ref: t, date: null })} />)}
        </div>
      )}
      {days.map(dk => {
        const d = new Date(`${dk}T12:00:00`);
        const items = byDate[dk].slice().sort(compareItems);
        return (
          <div key={dk} style={{ marginBottom: 18 }}>
            <div style={agendaHead}>
              {isSameDay(d, now) ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long' })}
              <span style={{ color: T.muted, fontWeight: 500 }}> · {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            {items.map(it => (
              it.kind === 'task'
                ? <TaskRow key={it.id} task={it.ref} onToggle={onToggle} onOpen={() => onItem(it)} timed={!it.allDay ? it.start : null} />
                : (
                  <button key={it.id} onClick={() => onItem(it)} style={agendaRow}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
                    <span style={{ width: 64, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{it.allDay ? 'all-day' : fmtTime(it.start)}</span>
                    <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                    <KindTag kind={it.kind} />
                  </button>
                )
            ))}
          </div>
        );
      })}
    </div>
  );
}

const agendaHead = { fontFamily: T.fontSans, fontSize: 12, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 };
const agendaRow = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 4px', background: 'none', border: 'none', borderBottom: `0.5px solid ${T.border}`, cursor: 'pointer' };

function TaskRow({ task, onToggle, onOpen, timed }) {
  return (
    <div style={agendaRow}>
      <Check done={task.done} color="#9CA398" onClick={() => onToggle(task.id)} />
      <span onClick={onOpen} style={{ width: timed ? 64 : 0, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{timed ? fmtTime(timed) : ''}</span>
      <span onClick={onOpen} style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, color: task.done ? T.muted : T.ink, fontWeight: 500, textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
    </div>
  );
}

function Check({ done, color, onClick }) {
  return (
    <button onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined} style={{
      width: 20, height: 20, flexShrink: 0, borderRadius: '50%', cursor: onClick ? 'pointer' : 'default',
      border: `1.5px solid ${done ? color : T.border}`, background: done ? color : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    }}>
      {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

function KindTag({ kind }) {
  if (kind === 'event' || kind === 'task') return null;
  const label = kind === 'workout' ? 'Workout' : kind === 'routine' ? 'Routine' : kind;
  return <span style={{ fontFamily: T.fontSans, fontSize: 9, fontWeight: 600, color: T.muted, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{label}</span>;
}

// ── Options sheet (layers + export + sync note) ──────────────────────────────
function OptionsSheet({ app, onClose, setCalendarLayer }) {
  const layers = (app.calendar?.settings?.layers) || {};
  const exportICS = () => {
    const ics = buildICS(app.calendar?.events || []);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'intent-calendar.ics'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 400, background: 'rgba(44,36,24,0.32)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '14px 20px calc(28px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Calendar</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 16 }}>Choose what shows up, and export your events.</div>

        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Layers</div>
        {CAL_SOURCES.map(s => {
          const visible = layers[s.id] !== false;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: `0.5px solid ${T.border}` }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, color: T.ink }}>{s.label}</span>
              {s.always
                ? <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>Always on</span>
                : <button onClick={() => setCalendarLayer(s.id, !visible)} style={{
                    width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2,
                    background: visible ? T.amber : T.border, position: 'relative',
                  }}>
                    <span style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: `translateX(${visible ? 18 : 0}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>}
            </div>
          );
        })}

        <button onClick={exportICS} style={{ width: '100%', marginTop: 18, padding: '13px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>
          Export events (.ics)
        </button>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, lineHeight: 1.6, marginTop: 12 }}>
          Two-way sync with Google &amp; Apple is coming — it runs through your portfolio backend (OAuth), so it'll drop in as another layer here.
        </div>
      </div>
    </div>
  );
}
