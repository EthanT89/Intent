import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import { PillarPill, CategoryLabel, GhostButton, SectionHeader } from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { todayKey, dateKey, addDays } from '../../lib/dates.js';
import { honoredOn } from '../../lib/momentum.js';

// Local labels (avoid importing the registry — it imports this file back).
const HONOR_LABELS = {
  reading: 'Reading', movement: 'Movement', routine: 'Routine',
  coffee: 'Coffee', reflection: 'Reflection', deepwork: 'Deep work',
};

const ACCENT = PILLAR_COLORS.reflection;

function hasEntry(day) { return !!(day && (day.intent || day.evening)); }

function intentStreak(days, today = new Date()) {
  let streak = 0, started = false;
  for (let i = 0; i < 365; i++) {
    const k = dateKey(addDays(today, -i));
    const has = hasEntry(days[k]);
    if (i === 0 && !has) { started = true; continue; }
    if (has) { streak++; started = true; }
    else if (started) break;
  }
  return streak;
}

// ─── Pill ──────────────────────────────────────────────────────────────────────
function ReflectionPill() {
  const { navigateToPillar } = useUI();
  const { reflection } = useApp();
  const days = reflection.days || {};
  const today = days[todayKey()] || {};
  const evening = new Date().getHours() >= 17;

  let body, cta;
  if (today.intent) {
    body = <>"{today.intent}"</>;
    cta = evening && !today.evening ? 'Reflect on today' : 'Open reflection';
  } else {
    body = evening ? 'How did today go?' : 'What matters today?';
    cta = evening ? 'Reflect on today' : 'Set your intent';
  }

  return (
    <PillarPill onNavigate={() => navigateToPillar('reflection')} cream>
      <CategoryLabel>{evening ? 'this evening' : 'today’s intent'}</CategoryLabel>
      <div style={{ fontFamily: T.fontSerif, fontStyle: today.intent ? 'italic' : 'normal', fontSize: 16, color: T.ink, lineHeight: 1.6, margin: '0 0 12px', paddingRight: 12 }}>
        {body}
      </div>
      <GhostButton>{cta}</GhostButton>
    </PillarPill>
  );
}

// ─── Reusable journal field ─────────────────────────────────────────────────────
function JournalField({ label, placeholder, value, onSave }) {
  const [text, setText] = React.useState(value || '');
  React.useEffect(() => { setText(value || ''); }, [value]);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { if (text !== (value || '')) onSave(text); }}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: 90, resize: 'none',
          padding: '13px 14px', border: `0.5px solid ${T.border}`, borderRadius: 14,
          background: T.cardCream, fontFamily: T.fontSerif, fontSize: 15, color: T.ink,
          outline: 'none', lineHeight: 1.6,
        }}
      />
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────────────
function ReflectionSection({ onBack }) {
  const app = useApp();
  const { reflection, setDayIntent, setDayEvening } = app;
  const days = reflection.days || {};
  const tKey = todayKey();
  const today = days[tKey] || {};
  const evening = new Date().getHours() >= 17;
  const honoredToday = honoredOn(app, tKey).filter(id => id !== 'reflection').map(id => HONOR_LABELS[id]);

  // This week recap (Mon-first) — light "weekly review".
  const mondayIdx = (new Date().getDay() + 6) % 7;
  const weekStartDate = addDays(new Date(), -mondayIdx);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    return { label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], has: hasEntry(days[dateKey(d)]), isToday: dateKey(d) === tKey };
  });
  const weekCount = week.filter(d => d.has).length;

  // Past entries (most recent first, excluding today).
  const past = Object.keys(days)
    .filter(k => k !== tKey && hasEntry(days[k]))
    .sort((a, b) => (a < b ? 1 : -1))
    .slice(0, 30);

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Reflection" accentColor={ACCENT} onBack={onBack} />

      {/* Today */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
          {evening ? 'Closing the day' : 'Setting the day'}
        </div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 16 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        {honoredToday.length > 0 && (
          <div style={{
            background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
            padding: '11px 13px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today you honored</span>
            <div style={{ fontFamily: T.fontSerif, fontSize: 15, color: T.ink, marginTop: 5, lineHeight: 1.4 }}>
              {honoredToday.join(' · ')}
            </div>
          </div>
        )}
        <JournalField label="Today's intent" placeholder="What matters most today?" value={today.intent} onSave={setDayIntent} />
        <JournalField label="Evening reflection" placeholder="How did it go? What will you carry forward?" value={today.evening} onSave={setDayEvening} />
      </div>

      {/* This week */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>This week</span>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{weekCount} / 7 days</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {week.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 36, borderRadius: 10, marginBottom: 5,
                background: d.has ? ACCENT : T.cardCream,
                border: `1px solid ${d.isToday ? ACCENT : T.border}`,
              }} />
              <span style={{ fontFamily: T.fontSans, fontSize: 10, color: d.isToday ? ACCENT : T.muted, fontWeight: d.isToday ? 700 : 500 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {past.length > 0 && (
        <>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Earlier</div>
          {past.map(k => {
            const d = days[k];
            return (
              <div key={k} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginBottom: 6 }}>
                  {new Date(k + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                {d.intent && <div style={{ fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 14, color: T.ink, lineHeight: 1.5, marginBottom: d.evening ? 8 : 0 }}>"{d.intent}"</div>}
                {d.evening && <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{d.evening}</div>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default {
  id: 'reflection',
  label: 'Reflection',
  color: ACCENT,
  Pill: ReflectionPill,
  Section: ReflectionSection,
  StatsScreen: null,
  getDaily(app) {
    const d = (app.reflection.days || {})[todayKey()] || {};
    return { done: !!(d.intent && d.evening) };
  },
  getStats(app) {
    const days = (app.reflection && app.reflection.days) || {};
    const now = new Date();
    const entriesThisMonth = Object.keys(days).filter(k => {
      const d = new Date(k + 'T12:00:00');
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && hasEntry(days[k]);
    }).length;
    return [
      { number: String(entriesThisMonth), label: 'entries this month' },
      { number: String(intentStreak(days)), label: 'day streak' },
      { number: String(Object.keys(days).filter(k => hasEntry(days[k])).length), label: 'total entries' },
    ];
  },
};
