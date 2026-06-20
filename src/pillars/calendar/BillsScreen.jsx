import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { dateKey, todayKey } from '../../lib/dates.js';
import {
  BILL_FREQS, BILL_COLORS, DEFAULT_BILL_COLOR, presetToRecur, recurToPreset, recurLabel,
  nextDueDate, billStatus, fmtMoney, monthSummary, paymentHistory,
} from './bills.js';

const field = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px',
  border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card,
  fontFamily: T.fontSans, fontSize: 15, color: T.ink, outline: 'none',
};
const labelStyle = { fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BILL_REMIND = [{ v: null, l: 'No reminder' }, { v: 0, l: 'On the due date' }, { v: 1, l: '1 day before' }, { v: 3, l: '3 days before' }, { v: 7, l: '7 days before' }];

const STATUS_STYLE = {
  paid: { label: 'Paid', color: '#5A8A5A' },
  auto: { label: 'Autopay', color: '#7A8C7E' },
  due: { label: 'Due today', color: '#B8893E' },
  overdue: { label: 'Overdue', color: '#B8453E' },
  upcoming: { label: '', color: T.muted },
};

// Full-screen bills manager (opened from the calendar options sheet).
export function BillsManager({ onClose, initialEdit }) {
  const { bills, saveBill, deleteBill, setBillPaidAmount } = useApp();
  const [editing, setEditing] = React.useState(initialEdit || null); // bill object, {} for new, or null
  const tk = todayKey();
  const now = new Date();

  const sorted = (bills || []).map(b => ({ b, next: nextDueDate(b, now) }))
    .sort((a, c) => (a.next && c.next) ? a.next - c.next : a.next ? -1 : 1);
  const sum = monthSummary(bills, now.getFullYear(), now.getMonth());

  if (editing) {
    // Use the live bill from the store so a just-recorded payment shows at once
    // (the `editing` snapshot was captured when opened).
    const liveBill = editing.id ? ((bills || []).find(b => b.id === editing.id) || editing) : null;
    return <BillComposer bill={liveBill} occurrenceKey={editing.occurrenceKey} onClose={() => setEditing(null)}
      onSave={(b) => { saveBill(b); setEditing(null); }}
      onDelete={editing.id ? () => { deleteBill(editing.id); setEditing(null); } : null}
      onSetPaid={setBillPaidAmount} />;
  }

  return (
    <div className="intent-scroll" style={{ position: 'absolute', inset: 0, zIndex: 420, background: T.bg, overflowY: 'auto', padding: 'calc(var(--safe-top) + 12px) 16px calc(40px + var(--safe-bottom))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, color: T.amber, padding: 0 }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke={T.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Calendar
        </button>
      </div>

      <h1 style={{ fontFamily: T.fontSerif, fontSize: 26, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Bills & payments</h1>
      <p style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 18 }}>
        {!bills.length ? 'Track what goes out, and when'
          : sum.dueManual > 0 ? `${fmtMoney(sum.projected)} this month · ${fmtMoney(sum.dueManual)} left to pay`
            : `${fmtMoney(sum.projected)} this month · all automatic`}
      </p>

      {sorted.length === 0 && (
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: '32px 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>No bills yet</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Add a recurring payment — rent, your card, subscriptions — and it'll show up on the calendar with reminders.</div>
        </div>
      )}

      {sorted.map(({ b, next }) => {
        const dk = next ? dateKey(next) : null;
        const status = dk ? billStatus(b, dk, tk) : 'upcoming';
        const ss = STATUS_STYLE[status] || STATUS_STYLE.upcoming;
        return (
          <button key={b.id} onClick={() => setEditing(b)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
            background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 8, cursor: 'pointer',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color || DEFAULT_BILL_COLOR, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
              <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
                {recurLabel(b.recur)}{next ? ` · next ${MONTHS[next.getMonth()]} ${next.getDate()}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{b.variable ? (Number(b.amount) ? `~${fmtMoney(b.amount)}` : 'Varies') : fmtMoney(b.amount)}</div>
              {ss.label && <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: ss.color }}>{ss.label}</div>}
            </div>
          </button>
        );
      })}

      <button onClick={() => setEditing({})} style={{
        width: '100%', marginTop: 8, padding: '13px', background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 12,
        cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.amber,
      }}>+ Add a bill</button>
    </div>
  );
}

function BillComposer({ bill, occurrenceKey, onClose, onSave, onDelete, onSetPaid }) {
  const editing = !!bill;
  const r0 = bill?.recur || { unit: 'month', interval: 1, day: 1 };
  const [name, setName] = React.useState(bill?.name || '');
  const [amount, setAmount] = React.useState(bill?.amount != null ? String(bill.amount) : '');
  const [variable, setVariable] = React.useState(bill?.variable ?? false);
  const [payAmt, setPayAmt] = React.useState(bill?.amount ? String(bill.amount) : '');
  const [preset, setPreset] = React.useState(recurToPreset(r0));
  const [day, setDay] = React.useState(r0.day || new Date().getDate());
  const [weekday, setWeekday] = React.useState(r0.weekday ?? 1);
  const [month, setMonth] = React.useState(r0.month || 0);
  const [onceDate, setOnceDate] = React.useState(r0.unit === 'once' ? (r0.anchor || todayKey()) : todayKey());
  const [autopay, setAutopay] = React.useState(bill?.autopay ?? true);
  const [remind, setRemind] = React.useState(bill?.remind != null ? bill.remind : 3);
  const [color, setColor] = React.useState(bill?.color || DEFAULT_BILL_COLOR);
  const [account, setAccount] = React.useState(bill?.account || '');
  const [notes, setNotes] = React.useState(bill?.notes || '');

  const unit = preset === 'once' ? 'once' : preset === 'yearly' ? 'year' : (preset === 'weekly' || preset === 'biweekly') ? 'week' : 'month';

  const save = () => {
    if (!name.trim()) return;
    const recur = presetToRecur(preset, { day: Number(day) || 1, weekday, month, date: onceDate });
    onSave({ id: bill?.id, name: name.trim(), amount: Number(amount) || 0, variable, recur, autopay, remind, color, account: account.trim(), notes: notes.trim(), paid: bill?.paid });
  };

  const occVal = occurrenceKey ? (bill?.paid && bill.paid[occurrenceKey]) : undefined; // true | number | undefined
  const occPaid = !!occVal;
  const showPay = !!occurrenceKey && !(autopay && !variable);
  const history = bill ? paymentHistory(bill) : [];

  return (
    <div className="intent-scroll" style={{ position: 'absolute', inset: 0, zIndex: 420, background: T.bg, overflowY: 'auto', padding: 'calc(var(--safe-top) + 12px) 16px calc(40px + var(--safe-bottom))' }}>
      <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, color: T.amber, padding: 0, marginBottom: 16 }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke={T.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Bills
      </button>

      <input autoFocus={!editing} value={name} onChange={e => setName(e.target.value)} placeholder="Bill name (e.g. Chase card)"
        style={{ ...field, fontFamily: T.fontSerif, fontSize: 20, fontWeight: 600, border: 'none', padding: '4px 2px', marginBottom: 14 }} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>{variable ? 'Typical (est.)' : 'Amount'}</div>
          <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card, paddingLeft: 12 }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 15, color: T.muted }}>$</span>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={variable ? 'optional' : '0'}
              style={{ ...field, border: 'none', paddingLeft: 6 }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Frequency</div>
          <select value={preset} onChange={e => setPreset(e.target.value)} style={{ ...field, appearance: 'none' }}>
            {BILL_FREQS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', marginBottom: 14 }}>
        <div style={{ minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>Amount varies</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11.5, color: T.muted }}>For cards & usage bills — log the real amount when you pay.</div>
        </div>
        <Toggle on={variable} onChange={setVariable} />
      </div>

      {/* When — depends on frequency */}
      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>When</div>
        {unit === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink }}>On the</span>
            <input type="number" min={1} max={31} value={day} onChange={e => setDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
              style={{ ...field, width: 70, textAlign: 'center' }} />
            <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.muted }}>of the month</span>
          </div>
        )}
        {unit === 'year' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...field, appearance: 'none', flex: 1 }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input type="number" min={1} max={31} value={day} onChange={e => setDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
              style={{ ...field, width: 70, textAlign: 'center' }} />
          </div>
        )}
        {unit === 'week' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {DOW1.map((d, i) => (
              <button key={i} onClick={() => setWeekday(i)} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, cursor: 'pointer',
                border: `1px solid ${weekday === i ? T.amber : T.border}`, background: weekday === i ? `${T.amber}14` : T.card,
                fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: weekday === i ? T.ink : T.muted,
              }}>{d}</button>
            ))}
          </div>
        )}
        {unit === 'once' && (
          <input type="date" value={onceDate} onChange={e => setOnceDate(e.target.value)} style={field} />
        )}
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 8 }}>{recurLabel(presetToRecur(preset, { day: Number(day) || 1, weekday, month, date: onceDate }))}</div>
      </div>

      {/* Autopay vs manual */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setAutopay(true)} style={segStyle(autopay)}>Automatic</button>
        <button onClick={() => setAutopay(false)} style={segStyle(!autopay)}>I pay manually</button>
      </div>
      <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
        {autopay ? 'Shown as auto-handled — no action needed, just a heads-up.' : "You'll check it off when paid; overdue ones stay flagged."}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>Reminder</div>
        <select value={remind == null ? 'none' : String(remind)} onChange={e => setRemind(e.target.value === 'none' ? null : Number(e.target.value))} style={{ ...field, appearance: 'none' }}>
          {BILL_REMIND.map(o => <option key={String(o.v)} value={o.v == null ? 'none' : String(o.v)}>{o.l}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>Color</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {BILL_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? `2.5px solid ${T.ink}` : '2.5px solid transparent' }} />
          ))}
        </div>
      </div>

      <input value={account} onChange={e => setAccount(e.target.value)} placeholder="Account / method (optional)" style={{ ...field, marginBottom: 10 }} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" style={{ ...field, height: 56, resize: 'none', marginBottom: 16, lineHeight: 1.5 }} />

      {history.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Payment history</div>
          {history.map(h => (
            <div key={h.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 2px', borderBottom: `0.5px solid ${T.border}` }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.ink }}>{fmtDate(h.date)}</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: h.amount != null ? T.ink : T.muted }}>{h.amount != null ? fmtMoney(h.amount) : 'Paid'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Record this occurrence (when opened from a calendar tap) */}
      {showPay && (
        occPaid ? (
          <button onClick={() => onSetPaid(bill.id, occurrenceKey, null)} style={{
            width: '100%', marginBottom: 12, padding: '13px', borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${T.border}`, background: T.card, color: T.ink, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          }}>✓ {typeof occVal === 'number' ? `Paid ${fmtMoney(occVal)}` : 'Paid'} — tap to undo</button>
        ) : variable ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, border: `0.5px solid ${T.border}`, borderRadius: 12, background: T.card, paddingLeft: 12 }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 15, color: T.muted }}>$</span>
              <input type="number" inputMode="decimal" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="amount paid"
                style={{ ...field, border: 'none', paddingLeft: 6 }} />
            </div>
            <button onClick={() => onSetPaid(bill.id, occurrenceKey, payAmt ? Number(payAmt) : true)} style={{
              flex: '0 0 auto', padding: '13px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#5A8A5A', color: '#fff', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
            }}>Record</button>
          </div>
        ) : (
          <button onClick={() => onSetPaid(bill.id, occurrenceKey, true)} style={{
            width: '100%', marginBottom: 12, padding: '13px', borderRadius: 12, cursor: 'pointer',
            border: 'none', background: '#5A8A5A', color: '#fff', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
          }}>Mark this payment paid</button>
        )
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {onDelete && <button onClick={onDelete} style={{ flex: '0 0 auto', padding: '13px 18px', background: 'none', border: '1px solid #B8453E', borderRadius: 12, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: '#B8453E' }}>Delete</button>}
        <button onClick={save} disabled={!name.trim()} style={{
          flex: 1, padding: '13px', background: T.amber, color: '#FAF7F2', border: 'none', borderRadius: 12,
          cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.45, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
        }}>{editing ? 'Save' : 'Add bill'}</button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
      background: on ? T.amber : T.border, transition: 'background 0.2s',
    }}>
      <span style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff', transform: `translateX(${on ? 18 : 0}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function fmtDate(dk) {
  return new Date(`${dk}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function segStyle(active) {
  return {
    flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${active ? T.amber : T.border}`, background: active ? `${T.amber}14` : T.card,
    fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: active ? T.ink : T.muted,
  };
}
