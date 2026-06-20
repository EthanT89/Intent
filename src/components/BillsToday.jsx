import React from 'react';
import { T } from '../theme/tokens.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { dateKey } from '../lib/dates.js';
import { monthSummary, overdueOccurrences, nextDueDate, fmtMoney } from '../pillars/calendar/bills.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A calm "money out" glance on Today: what's left to pay this month, what's
// overdue, and the next bill due. Tapping opens the calendar.
export function BillsToday() {
  const { bills } = useApp();
  const { openBills } = useUI();
  if (!bills || bills.length === 0) return null;

  const now = new Date();
  const sum = monthSummary(bills, now.getFullYear(), now.getMonth());
  const overdue = overdueOccurrences(bills, now);
  const overdueSum = overdue.reduce((a, o) => a + o.amount, 0);

  let next = null;
  for (const b of bills) {
    const d = nextDueDate(b, now);
    if (d && (!next || d < next.date)) next = { date: d, bill: b };
  }
  const amtLabel = (b) => b.variable ? (Number(b.amount) ? `~${fmtMoney(b.amount)}` : 'varies') : fmtMoney(b.amount);

  const headlineBig = overdue.length ? fmtMoney(overdueSum) : sum.dueManual > 0 ? fmtMoney(sum.dueManual) : fmtMoney(sum.projected);
  const headlineLabel = overdue.length ? `overdue · ${overdue.length}` : sum.dueManual > 0 ? 'left to pay' : 'this month';
  const headlineColor = overdue.length ? '#B8453E' : T.ink;

  return (
    <button onClick={openBills} style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: T.card, border: `0.5px solid ${overdue.length ? '#B8453E55' : T.border}`, borderRadius: 16,
      padding: '14px 16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bills</span>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{MONTHS[now.getMonth()]}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: T.fontSerif, fontSize: 24, fontWeight: 600, color: headlineColor, lineHeight: 1 }}>{headlineBig}</span>
        <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{headlineLabel}</span>
      </div>

      {sum.projected > 0 && (
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 4 }}>
          {fmtMoney(sum.paid)} of {fmtMoney(sum.projected)} paid this month
        </div>
      )}

      {next && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: `0.5px solid ${T.border}` }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: next.bill.color || T.muted, flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 13, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: T.muted }}>Next · </span>{next.bill.name} · {amtLabel(next.bill)}
          </span>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, flexShrink: 0 }}>
            {dateKey(next.date) === dateKey(now) ? 'today' : `${MONTHS[next.date.getMonth()]} ${next.date.getDate()}`}
          </span>
        </div>
      )}
    </button>
  );
}
