import React from 'react';
import { T } from '../theme/tokens.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { itemsForDate, overdueTasks } from '../pillars/calendar/sources.js';
import { compareItems, fmtTime } from '../pillars/calendar/model.js';
import { dateKey } from '../lib/dates.js';

// How late an overdue task is, relative to today (1 = yesterday).
function lateLabel(dueKey, todayKey) {
  const diff = Math.round((new Date(todayKey + 'T12:00:00') - new Date(dueKey + 'T12:00:00')) / 86400000);
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  return new Date(dueKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// What's on today, pulled from the calendar onto the home screen. Bills get
// their own card, so they're excluded here. Tapping opens the calendar.
export function TodayAgenda() {
  const app = useApp();
  const { goToTab, navigateToPillar } = useUI();
  const { toggleTask } = app;

  const items = itemsForDate(app, new Date()).filter(it => it.kind !== 'bill').sort(compareItems);

  // Past-due, unfinished to-dos don't vanish — they resurface here until done or
  // rescheduled, so nothing slips through the cracks.
  const tk = dateKey(new Date());
  const overdue = overdueTasks(app);

  if (items.length === 0 && overdue.length === 0) return null;

  const shown = items.slice(0, 5);
  const more = items.length - shown.length;
  const remaining = items.filter(it => !(it.kind === 'task' && it.done)).length;
  const shownOverdue = overdue.slice(0, 4);

  const onRow = (it) => {
    if (it.kind === 'workout') navigateToPillar('movement');
    else if (it.kind === 'routine') navigateToPillar('routine', it.ref?.id);
    else goToTab('calendar');
  };

  const RED = '#B8453E';

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
      {/* Overdue to-dos resurfaced so they don't get lost on a past day */}
      {overdue.length > 0 && (
        <div style={{ marginBottom: items.length ? 14 : 0 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: RED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Overdue · {overdue.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shownOverdue.map(t => (
              <div key={t.id} onClick={() => goToTab('calendar')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer' }}>
                <button onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }} style={{
                  width: 18, height: 18, flexShrink: 0, borderRadius: '50%', cursor: 'pointer', padding: 0,
                  border: `1.5px solid ${RED}`, background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} />
                <span style={{ width: 58, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: RED }}>{lateLabel(t.due.slice(0, 10), tk)}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              </div>
            ))}
          </div>
          {overdue.length > shownOverdue.length && (
            <button onClick={() => goToTab('calendar')} style={{ background: 'none', border: 'none', padding: '6px 0 0', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: RED }}>
              +{overdue.length - shownOverdue.length} more
            </button>
          )}
        </div>
      )}

      {items.length > 0 && (
      <button onClick={() => goToTab('calendar')} style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%',
        background: 'none', border: 'none', padding: 0, marginBottom: 10, cursor: 'pointer',
      }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>On today</span>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{remaining ? `${remaining} left` : 'all done'}</span>
      </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {shown.map(it => (
          <div key={it.id} onClick={() => onRow(it)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer' }}>
            {it.kind === 'task'
              ? <button onClick={(e) => { e.stopPropagation(); toggleTask(it.ref.id); }} style={{
                  width: 18, height: 18, flexShrink: 0, borderRadius: '50%', cursor: 'pointer', padding: 0,
                  border: `1.5px solid ${it.done ? T.amber : T.border}`, background: it.done ? T.amber : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{it.done && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
              : <span style={{ width: 7, height: 7, borderRadius: 2, background: it.color, flexShrink: 0 }} />}
            <span style={{ width: 58, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{it.allDay ? '' : fmtTime(it.start)}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontSans, fontSize: 14, color: it.done ? T.muted : T.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: it.done ? 'line-through' : 'none' }}>{it.title}</span>
          </div>
        ))}
      </div>

      {more > 0 && (
        <button onClick={() => goToTab('calendar')} style={{ background: 'none', border: 'none', padding: '6px 0 0', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.amber }}>
          +{more} more
        </button>
      )}
    </div>
  );
}
