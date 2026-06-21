import React from 'react';
import { T } from '../theme/tokens.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import {
  dateKey, addDays, addMonths, startOfMonth, isSameDay,
} from '../lib/dates.js';
import {
  fmtTime, fmtHourLabel, minutesOf, layoutTimed, compareItems, buildICS, DEFAULT_EVENT_COLOR, pad2,
} from '../pillars/calendar/model.js';
import { itemsForRange, itemsForDate, inboxTasks, CAL_SOURCES } from '../pillars/calendar/sources.js';
import { CalendarComposer } from '../pillars/calendar/CalendarComposer.jsx';
import { BillsManager } from '../pillars/calendar/BillsScreen.jsx';
import { refreshSubscriptions } from '../lib/icsSync.js';
import { deviceCalSupported, ensureReadAccess, listDeviceCalendars, fetchDeviceEvents } from '../lib/deviceCalendar.js';
import { EVENT_COLORS } from '../pillars/calendar/model.js';

const DEVICE_WINDOW = { back: 45, fwd: 120 }; // days of device events to cache

// Re-read the phone's calendars into the cache (best-effort, native only).
async function syncDeviceCal(app, { force = false } = {}) {
  if (!deviceCalSupported()) return;
  const dc = app.deviceCal || {};
  if (!dc.enabled) return;
  if (!force && dc.fetchedAt && Date.now() - new Date(dc.fetchedAt).getTime() < 15 * 60 * 1000) return;
  const from = addDays(new Date(), -DEVICE_WINDOW.back);
  const to = addDays(new Date(), DEVICE_WINDOW.fwd);
  const events = await fetchDeviceEvents(from, to, dc.calendarIds);
  app.setDeviceCal({ ...dc, events, fetchedAt: new Date().toISOString(), error: null });
}

const HOUR = 52;   // px per hour in the day grid
const GUTTER = 46; // left time-label gutter

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarScreen({ intent, onConsumeIntent } = {}) {
  const app = useApp();
  const { calendar, setCalendarView, setCalendarLayer, toggleTask } = app;
  const { navigateToPillar } = useUI();

  const [view, setView] = React.useState(calendar.settings?.defaultView || 'day');
  const [cursor, setCursor] = React.useState(() => new Date());
  const [composer, setComposer] = React.useState(null);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [billsView, setBillsView] = React.useState(null); // null | {} | { bill, occurrenceKey }
  const bodyRef = React.useRef(null);
  const now = new Date();

  // Switching to month/week/agenda should start at the top (Day manages its own
  // scroll-to-now). Runs after Day's child effect, so only touch non-day views.
  React.useEffect(() => { if (view !== 'day' && bodyRef.current) bodyRef.current.scrollTop = 0; }, [view]);

  // Pull read-only external calendars on open (throttled inside refreshSubscriptions).
  React.useEffect(() => {
    const subs = calendar.settings?.subscriptions || [];
    if (subs.length) refreshSubscriptions(subs, app.calCache, app.setSubCache);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Honor a cross-screen request to open the bills manager (from Today's card).
  React.useEffect(() => {
    if (intent === 'bills') { setBillsView('list'); onConsumeIntent && onConsumeIntent(); }
  }, [intent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull device (native) calendars on open (native only; throttled; no-op on web).
  React.useEffect(() => { syncDeviceCal(app); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeView = (v) => { setView(v); setCalendarView(v); };
  const shift = (dir) => {
    if (view === 'month') setCursor(c => addMonths(c, dir));
    else if (view === 'week' || view === 'agenda') setCursor(c => addDays(c, dir * 7));
    else setCursor(c => addDays(c, dir));
  };

  const openItem = (it) => {
    if (it.kind === 'event') setComposer({ mode: 'event', event: it.ref, date: it.date });
    else if (it.kind === 'task') setComposer({ mode: 'task', task: it.ref, date: it.date });
    else if (it.kind === 'workout') navigateToPillar('movement');
    else if (it.kind === 'routine') navigateToPillar('routine', it.ref.id);
    else if (it.kind === 'bill') {
      const bill = (app.bills || []).find(b => b.id === it.ref.billId);
      if (bill) setBillsView({ ...bill, occurrenceKey: it.ref.dueKey });
    }
  };

  const weekSun = addDays(cursor, -cursor.getDay());
  const title = view === 'month'
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'agenda'
      ? 'Upcoming'
      : view === 'week'
        ? `${weekSun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekSun, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
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
          {['day', 'week', 'month', 'agenda'].map(v => (
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
      <div ref={bodyRef} className="intent-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 130px' }}>
        <div key={view} className="cal-fade">
          {view === 'day' && <DayView app={app} cursor={cursor} now={now} onItem={openItem} onCreate={(h) => setComposer({ mode: 'event', date: dateKey(cursor), startHour: h })} />}
          {view === 'week' && <WeekView app={app} cursor={cursor} now={now} onItem={openItem} onPickDay={(d) => { setCursor(d); changeView('day'); }} onCreate={(d, h) => setComposer({ mode: 'event', date: dateKey(d), startHour: h })} />}
          {view === 'month' && <MonthView app={app} cursor={cursor} now={now} onPickDay={(d) => { setCursor(d); changeView('day'); }} />}
          {view === 'agenda' && <AgendaView app={app} cursor={cursor} now={now} onItem={openItem} onToggle={toggleTask} />}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setComposer({ mode: 'event', date: dateKey(cursor) })} style={{
        position: 'absolute', right: 20, bottom: 'calc(96px + var(--safe-bottom))', zIndex: 50,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: T.amber, color: '#FAF7F2', fontSize: 30, lineHeight: 1,
        boxShadow: '0 6px 20px rgba(44,36,24,0.28)',
      }}>+</button>

      {composer && <CalendarComposer composer={composer} onClose={() => setComposer(null)} />}
      {optionsOpen && <OptionsSheet app={app} onClose={() => setOptionsOpen(false)} setCalendarLayer={setCalendarLayer} onBills={() => { setOptionsOpen(false); setBillsView('list'); }} />}
      {billsView && <BillsManager onClose={() => setBillsView(null)} initialEdit={typeof billsView === 'object' ? billsView : null} />}
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

  // Auto-scroll the day grid to ~now (or 7am) when the day changes. The actual
  // scroller is the calendar body (.intent-scroll), not this inner div.
  React.useEffect(() => {
    const sc = scrollRef.current && scrollRef.current.closest('.intent-scroll');
    if (!sc) return;
    const focusMin = isToday ? minutesOf(now) - 60 : 7 * 60;
    sc.scrollTop = Math.max(0, (focusMin / 60) * HOUR);
  }, [dateKey(cursor)]); // eslint-disable-line react-hooks/exhaustive-deps

  const gridClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onCreate(Math.max(0, Math.min(23, Math.floor(y / HOUR))));
  };

  // ── Drag-to-move + resize (native events only) ──────────────────────────────
  const SNAP = 15;
  const hhmm = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
  const [drag, setDrag] = React.useState(null);
  const dragRef = React.useRef(null); dragRef.current = drag;

  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const d = dragRef.current; if (!d) return;
      const dy = e.clientY - d.startY;
      const deltaMin = Math.round((dy / HOUR * 60) / SNAP) * SNAP;
      const moved = d.moved || Math.abs(dy) > 4;
      let ps = d.origStart, pe = d.origEnd;
      if (d.mode === 'move') {
        const dur = d.origEnd - d.origStart;
        ps = Math.max(0, Math.min(1440 - dur, d.origStart + deltaMin));
        pe = ps + dur;
      } else {
        pe = Math.max(d.origStart + SNAP, Math.min(1440, d.origEnd + deltaMin));
      }
      setDrag({ ...d, previewStart: ps, previewEnd: pe, moved });
      if (e.cancelable) e.preventDefault();
    };
    const up = () => {
      const d = dragRef.current;
      if (d) {
        if (!d.moved) onItem(d.item);
        else {
          const sDate = d.ev.start.slice(0, 10);
          const eDate = (d.ev.end || d.ev.start).slice(0, 10);
          app.saveEvent({ ...d.ev, start: `${sDate}T${hhmm(d.previewStart)}`, end: `${eDate}T${hhmm(d.previewEnd)}` });
        }
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag ? drag.id + drag.mode : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e, it, mode) => {
    e.stopPropagation();
    setDrag({ id: it.id, mode, startY: e.clientY, origStart: it.start, origEnd: it.end, previewStart: it.start, previewEnd: it.end, moved: false, ev: it.ref, item: it });
  };

  return (
    <div>
      {/* All-day lane */}
      {allDay.length > 0 && (
        <div style={{ padding: '8px 0 10px', borderBottom: `0.5px solid ${T.border}`, marginBottom: 4 }}>
          {allDay.map(it => (
            <div key={it.id} onClick={() => onItem(it)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              padding: '7px 10px', marginBottom: 4, cursor: 'pointer', borderRadius: 8,
              background: `${it.color}1F`,
            }}>
              {it.kind === 'task'
                ? <Check done={it.done} color={it.color} />
                : <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />}
              <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.5 : 1 }}>{it.title}</span>
              <KindTag kind={it.kind} item={it} />
            </div>
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
            const dr = drag && drag.id === it.id ? drag : null;
            const sMin = dr ? dr.previewStart : it.start;
            const eMin = dr ? dr.previewEnd : it.end;
            const top = (sMin / 60) * HOUR;
            const height = Math.max(20, ((eMin - sMin) / 60) * HOUR - 2);
            const leftPct = dr ? 0 : it.col / it.cols;
            const widthCalc = dr ? `calc(100% - ${GUTTER + 6}px)` : `calc((100% - ${GUTTER + 6}px) / ${it.cols} - 3px)`;
            const leftCalc = `calc(${GUTTER}px + (100% - ${GUTTER + 6}px) * ${leftPct})`;
            const draggable = it.kind === 'event';
            const fmtMin = (m) => fmtTime(new Date(0, 0, 0, Math.floor(m / 60), m % 60));
            const tLabel = `${fmtMin(sMin)} – ${fmtMin(eMin)}`;
            return (
              <div key={it.id}
                onPointerDown={draggable ? (e) => startDrag(e, it, 'move') : undefined}
                onClick={draggable ? undefined : () => onItem(it)}
                style={{
                  position: 'absolute', top, height, left: leftCalc, width: widthCalc,
                  background: `${it.color}26`, borderRadius: 6,
                  borderLeft: `3px solid ${it.color}`,
                  padding: '3px 6px', textAlign: 'left', cursor: draggable ? 'grab' : 'pointer', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  touchAction: draggable ? 'none' : 'auto',
                  zIndex: dr ? 20 : 1, boxShadow: dr ? '0 6px 18px rgba(44,36,24,0.22)' : 'none',
                }}>
                <span style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: it.done ? 'line-through' : 'none' }}>{it.title}</span>
                {(height > 30 || dr) && <span style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tLabel}</span>}
                {height > 52 && it.location && <span style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.location}</span>}
                {draggable && (
                  <span onPointerDown={(e) => startDrag(e, it, 'resize')} style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, cursor: 'ns-resize', touchAction: 'none',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  }}>
                    <span style={{ width: 22, height: 3, borderRadius: 2, background: it.color, marginBottom: 2, opacity: 0.6 }} />
                  </span>
                )}
              </div>
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

// ── Week view (7-day time grid) ──────────────────────────────────────────────
function WeekView({ app, cursor, now, onItem, onPickDay, onCreate }) {
  const scrollRef = React.useRef(null);
  const sunday = addDays(cursor, -cursor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const all = itemsForRange(app, sunday, addDays(sunday, 6));
  const byDate = {};
  all.forEach(it => { (byDate[it.date] = byDate[it.date] || []).push(it); });

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (7 * 60 / 60) * HOUR;
  }, [dateKey(sunday)]); // eslint-disable-line react-hooks/exhaustive-deps

  const colLeft = (d, sub, cols) => `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${d / 7} + ((100% - ${GUTTER}px) / 7) * ${sub / cols})`;
  const colWidth = (cols) => `calc((100% - ${GUTTER}px) / 7 / ${cols} - 1px)`;

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'flex', paddingLeft: GUTTER, position: 'sticky', top: 0, background: T.bg, zIndex: 6, paddingBottom: 4 }}>
        {days.map((d, i) => {
          const today = isSameDay(d, now);
          const sel = isSameDay(d, cursor);
          return (
            <button key={i} onClick={() => onPickDay(new Date(d))} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 9, color: T.muted, fontWeight: 500 }}>{DOW1[i]}</span>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                background: today ? T.amber : 'transparent', color: today ? '#FAF7F2' : sel ? T.amber : T.ink,
              }}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* All-day lane (compact) */}
      <div style={{ display: 'flex', paddingLeft: GUTTER, borderBottom: `0.5px solid ${T.border}`, minHeight: 6, marginBottom: 2 }}>
        {days.map((d, i) => {
          const ad = (byDate[dateKey(d)] || []).filter(it => it.allDay);
          return (
            <div key={i} style={{ flex: 1, padding: '0 1px 3px', minWidth: 0 }}>
              {ad.slice(0, 2).map(it => (
                <button key={it.id} onClick={() => onItem(it)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: `${it.color}2E`, borderRadius: 3, padding: '1px 3px', marginTop: 2, overflow: 'hidden' }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 8, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textDecoration: it.done ? 'line-through' : 'none' }}>{it.title}</span>
                </button>
              ))}
              {ad.length > 2 && <span style={{ fontFamily: T.fontSans, fontSize: 8, color: T.muted, paddingLeft: 3 }}>+{ad.length - 2}</span>}
            </div>
          );
        })}
      </div>

      {/* Hour grid */}
      <div ref={scrollRef} style={{ position: 'relative', overflowX: 'hidden' }}>
        <div style={{ position: 'relative', height: 24 * HOUR }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ position: 'absolute', top: h * HOUR, left: 0, right: 0, height: HOUR, borderTop: `0.5px solid ${T.border}` }}>
              <span style={{ position: 'absolute', left: 0, top: -7, width: GUTTER - 6, textAlign: 'right', fontFamily: T.fontSans, fontSize: 9, color: T.muted }}>{h === 0 ? '' : fmtHourLabel(h).replace(' ', '')}</span>
            </div>
          ))}
          {/* day separators */}
          {days.map((_, i) => i > 0 && <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${i / 7})`, width: '0.5px', background: T.border }} />)}

          {/* tap-to-create per day */}
          {days.map((d, i) => (
            <div key={i} onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onCreate(new Date(d), Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR))));
            }} style={{ position: 'absolute', top: 0, height: 24 * HOUR, left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${i / 7})`, width: `calc((100% - ${GUTTER}px) / 7)` }} />
          ))}

          {/* events per day */}
          {days.map((d, di) => {
            const timed = (byDate[dateKey(d)] || []).filter(it => !it.allDay && it.start)
              .map(it => ({ ...it, start: minutesOf(it.start), end: Math.max(minutesOf(it.start) + 20, minutesOf(it.end || it.start)) }));
            const laid = layoutTimed(timed);
            return laid.map(it => {
              const top = (it.start / 60) * HOUR;
              const height = Math.max(14, ((it.end - it.start) / 60) * HOUR - 2);
              return (
                <button key={it.id} onClick={() => onItem(it)} style={{
                  position: 'absolute', top, height, left: colLeft(di, it.col, it.cols), width: colWidth(it.cols),
                  background: `${it.color}2E`, borderLeft: `2px solid ${it.color}`, borderRadius: 4,
                  padding: '1px 2px', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', border: 'none', borderLeft: `2px solid ${it.color}`,
                }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 8.5, fontWeight: 600, color: T.ink, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{it.title}</span>
                </button>
              );
            });
          })}

          {/* now line in today's column */}
          {days.map((d, i) => isSameDay(d, now) && (
            <div key={`n${i}`} style={{ position: 'absolute', top: (minutesOf(now) / 60) * HOUR, height: 0, left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${i / 7})`, width: `calc((100% - ${GUTTER}px) / 7)`, borderTop: '1.5px solid #B8453E', zIndex: 5 }}>
              <span style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: '#B8453E' }} />
            </div>
          ))}
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
                    {it.ref?.remind != null && <Bell />}
                    <KindTag kind={it.kind} item={it} />
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

function Bell() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BILL_TAG = { paid: { l: 'Paid', c: '#5A8A5A' }, auto: { l: 'Auto', c: '#7A8C7E' }, due: { l: 'Due', c: '#B8893E' }, overdue: { l: 'Overdue', c: '#B8453E' }, upcoming: { l: 'Bill', c: T.muted } };
function KindTag({ kind, item }) {
  if (kind === 'event' || kind === 'task') return null;
  if (kind === 'bill') {
    const s = BILL_TAG[item?.ref?.status] || BILL_TAG.upcoming;
    return <span style={{ fontFamily: T.fontSans, fontSize: 9, fontWeight: 700, color: '#fff', background: s.c, borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{s.l}</span>;
  }
  const label = kind === 'workout' ? 'Workout' : kind === 'routine' ? 'Routine' : kind === 'sub' ? 'Synced' : kind === 'device' ? 'Phone' : kind;
  return <span style={{ fontFamily: T.fontSans, fontSize: 9, fontWeight: 600, color: T.muted, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{label}</span>;
}

// ── Options sheet (layers + export + sync note) ──────────────────────────────
function OptionsSheet({ app, onClose, setCalendarLayer, onBills }) {
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

        <button onClick={onBills} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
          background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: '13px 14px', marginTop: 16, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 16 }}>💳</span>
          <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>Bills &amp; payments</span>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke={T.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        {/* Device (native) calendars — full details from the phone */}
        <DeviceCalendars app={app} />

        {/* Subscribed read-only calendars (Google / Apple / any .ics) */}
        <Subscriptions app={app} />

        <button onClick={exportICS} style={{ width: '100%', marginTop: 18, padding: '13px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>
          Export my events (.ics)
        </button>
      </div>
    </div>
  );
}

function DeviceCalendars({ app }) {
  const supported = deviceCalSupported();
  const dc = app.deviceCal || { enabled: false, calendarIds: [], events: [] };
  const [cals, setCals] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (supported && dc.enabled) listDeviceCalendars().then(setCals);
  }, [supported, dc.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported) {
    return (
      <div style={{ marginTop: 22 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Device calendar</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Reads your phone's own calendars — including work calendars that block web sharing — with full event details. Available in the installed app on your phone.
        </div>
      </div>
    );
  }

  const refetch = async (ids) => {
    const from = addDays(new Date(), -DEVICE_WINDOW.back), to = addDays(new Date(), DEVICE_WINDOW.fwd);
    return fetchDeviceEvents(from, to, ids);
  };
  const enable = async () => {
    setBusy(true);
    const res = await ensureReadAccess();
    if (res !== 'granted') {
      app.setDeviceCal({ ...dc, enabled: false, error: res === 'denied' ? 'Calendar access denied — enable it in Settings' : 'Could not access calendars' });
      setBusy(false); return;
    }
    const list = await listDeviceCalendars(); setCals(list);
    const ids = list.map((c) => c.id);
    app.setDeviceCal({ enabled: true, calendarIds: ids, events: await refetch(ids), fetchedAt: new Date().toISOString(), error: null });
    setBusy(false);
  };
  const toggleCal = async (id) => {
    const ids = dc.calendarIds.includes(id) ? dc.calendarIds.filter((x) => x !== id) : [...dc.calendarIds, id];
    setBusy(true);
    app.setDeviceCal({ ...dc, calendarIds: ids, events: await refetch(ids), fetchedAt: new Date().toISOString() });
    setBusy(false);
  };
  const refresh = async () => { setBusy(true); const events = await refetch(dc.calendarIds); app.setDeviceCal({ ...dc, events, fetchedAt: new Date().toISOString(), error: null }); setBusy(false); };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Device calendar</span>
        {dc.enabled
          ? <button onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.amber, fontFamily: T.fontSans, fontSize: 12, fontWeight: 600 }}>{busy ? 'Syncing…' : 'Refresh'}</button>
          : <button onClick={enable} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.amber, fontFamily: T.fontSans, fontSize: 12, fontWeight: 600 }}>{busy ? 'Connecting…' : 'Connect'}</button>}
      </div>

      {dc.error && <div style={{ fontFamily: T.fontSans, fontSize: 12, color: '#B8453E', marginBottom: 8 }}>{dc.error}</div>}

      {dc.enabled && (
        <>
          <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 8 }}>{(dc.events || []).length} events from your phone</div>
          {cals.map((c) => {
            const on = dc.calendarIds.includes(c.id);
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `0.5px solid ${T.border}` }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color || '#5C6B6B', flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <button onClick={() => toggleCal(c.id)} style={{ width: 40, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, background: on ? T.amber : T.border }}>
                  <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: `translateX(${on ? 16 : 0}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            );
          })}
          <button onClick={() => app.setDeviceCal({ ...dc, enabled: false })} style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Turn off device calendar</button>
        </>
      )}
    </div>
  );
}

function Subscriptions({ app }) {
  const subs = (app.calendar?.settings?.subscriptions) || [];
  const cache = app.calCache || {};
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [color, setColor] = React.useState('#5C6B6B');
  const [busy, setBusy] = React.useState(false);

  const add = () => {
    if (!name.trim() || !url.trim()) return;
    app.addSubscription({ name: name.trim(), url: url.trim(), color });
    setName(''); setUrl(''); setAdding(false);
  };
  const refresh = async () => {
    setBusy(true);
    await refreshSubscriptions(app.calendar?.settings?.subscriptions || [], app.calCache || {}, app.setSubCache, { force: true });
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subscribed calendars · read-only</span>
        {subs.length > 0 && <button onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.amber, fontFamily: T.fontSans, fontSize: 12, fontWeight: 600 }}>{busy ? 'Refreshing…' : 'Refresh'}</button>}
      </div>

      {subs.map(s => {
        const c = cache[s.id];
        const status = c?.error ? 'Couldn’t reach feed' : c?.fetchedAt ? `${(c.events || []).length} events` : 'Not fetched yet';
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: `0.5px solid ${T.border}` }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
              <div style={{ fontFamily: T.fontSans, fontSize: 11, color: c?.error ? '#B8453E' : T.muted }}>{status}</div>
            </div>
            <button onClick={() => app.updateSubscription(s.id, { enabled: s.enabled === false })} style={{
              width: 40, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
              background: s.enabled === false ? T.border : T.amber, position: 'relative',
            }}>
              <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: `translateX(${s.enabled === false ? 0 : 16}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <button onClick={() => app.removeSubscription(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        );
      })}

      {adding ? (
        <div style={{ marginTop: 12 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Google – Personal)" style={subField} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Secret .ics URL" style={{ ...subField, marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
            {EVENT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? `2.5px solid ${T.ink}` : '2.5px solid transparent' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '11px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Cancel</button>
            <button onClick={add} style={{ flex: 2, padding: '11px', background: T.amber, color: '#FAF7F2', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, opacity: name.trim() && url.trim() ? 1 : 0.45 }}>Add calendar</button>
          </div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, lineHeight: 1.6, marginTop: 10 }}>
            Google: Settings → your calendar → “Secret address in iCal format”. Apple: Share Calendar → Public Calendar → copy link.
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: '100%', marginTop: 12, padding: '12px', background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.amber }}>
          + Subscribe to a calendar
        </button>
      )}
    </div>
  );
}

const subField = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px',
  border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card,
  fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none',
};
