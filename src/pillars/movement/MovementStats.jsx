import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { SectionHeader } from '../../components/primitives.jsx';
import { sessionVolume, kindOf } from './model.js';
import { weekStart, addDays, isThisMonth, timeAgo } from '../../lib/dates.js';
import { ACCENT } from './ui.jsx';

// Movement stats drill-down: volume & workout cadence over the last 8 weeks,
// personal records per exercise (best set + estimated 1RM), and recent sessions.
export function MovementStats({ onBack }) {
  const { movement } = useApp();
  const sessions = movement.sessions || [];
  const exById = Object.fromEntries((movement.exercises || []).map(e => [e.id, e]));

  const monthSessions = sessions.filter(s => isThisMonth(s.at || s.date));
  const volMonth = monthSessions.reduce((a, s) => a + sessionVolume(s), 0);

  // Per-week (last 8) workouts + volume.
  const now = new Date();
  const weeks = [];
  for (let w = 7; w >= 0; w--) {
    const ws = weekStart(addDays(now, -w * 7));
    const we = addDays(ws, 7);
    const inWeek = sessions.filter(s => { const d = new Date((s.date || s.at) + (s.date ? 'T12:00:00' : '')); return d >= ws && d < we; });
    weeks.push({
      label: ws.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      count: inWeek.length,
      volume: inWeek.reduce((a, s) => a + sessionVolume(s), 0),
      current: w === 0,
    });
  }

  // Personal records — best estimated 1RM per exercise (Epley), plus heaviest set.
  const prs = {};
  sessions.forEach(s => (s.entries || []).forEach(e => {
    (e.sets || []).forEach(set => {
      const w = Number(set.weight) || 0, r = Number(set.reps) || 0;
      if (w <= 0 || r <= 0) return;
      const e1rm = w * (1 + r / 30);
      const cur = prs[e.exerciseId];
      if (!cur || e1rm > cur.e1rm) prs[e.exerciseId] = { e1rm, weight: w, reps: r, name: e.name || exById[e.exerciseId]?.name || 'Exercise' };
    });
  }));
  const prList = Object.values(prs).sort((a, b) => b.e1rm - a.e1rm).slice(0, 12);

  const card = { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 20, marginBottom: 12 };
  const label = { fontFamily: T.fontSans, fontSize: 12, color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 };

  const maxCount = Math.max(...weeks.map(w => w.count), 1);
  const maxVol = Math.max(...weeks.map(w => w.volume), 1);

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Movement" accentColor={ACCENT} onBack={onBack} backLabel="Stats" />

      {sessions.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '36px 22px' }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>No workouts yet</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Log a workout and your trends + PRs will show here.</div>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          {/* Headline metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { n: String(monthSessions.length), l: 'workouts this month' },
              { n: volMonth >= 1000 ? `${(volMonth / 1000).toFixed(1)}k` : String(volMonth), l: 'lb volume this month' },
            ].map((m, i) => (
              <div key={i} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: '16px 14px' }}>
                <div style={{ fontFamily: T.fontSerif, fontSize: 26, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{m.n}</div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 6 }}>{m.l}</div>
              </div>
            ))}
          </div>

          {/* Workouts per week */}
          <div style={card}>
            <div style={label}>Workouts per week · last 8</div>
            <Bars data={weeks.map(w => ({ ...w, value: w.count }))} max={maxCount} />
          </div>

          {/* Volume per week */}
          <div style={card}>
            <div style={label}>Volume per week (lb)</div>
            <Bars data={weeks.map(w => ({ ...w, value: w.volume }))} max={maxVol} />
          </div>

          {/* PRs */}
          {prList.length > 0 && (
            <div style={card}>
              <div style={label}>Personal records</div>
              {prList.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < prList.length - 1 ? 12 : 0, marginBottom: i < prList.length - 1 ? 12 : 0, borderBottom: i < prList.length - 1 ? `0.5px solid ${T.border}` : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>best set {p.weight}×{p.reps}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 700, color: T.ink }}>{Math.round(p.e1rm)}</div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted }}>est. 1RM</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent */}
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={label}>Recent sessions</div>
            {sessions.slice(0, 8).map((s, i) => {
              const vol = sessionVolume(s);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < Math.min(8, sessions.length) - 1 ? 10 : 0, marginBottom: i < Math.min(8, sessions.length) - 1 ? 10 : 0, borderBottom: i < Math.min(8, sessions.length) - 1 ? `0.5px solid ${T.border}` : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: T.fontSerif, fontSize: 14, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{timeAgo(s.at || s.date)}{s.durationMin ? ` · ${s.durationMin} min` : ''}</div>
                  </div>
                  {vol > 0 && <div style={{ fontFamily: T.fontSerif, fontSize: 14, fontWeight: 600, color: T.ink, flexShrink: 0, marginLeft: 10 }}>{vol.toLocaleString()} lb</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Bars({ data, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3,
            background: d.value > 0 ? (d.current ? T.ink : ACCENT) : T.border,
            height: d.value > 0 ? `${(d.value / max) * 60}px` : '3px',
          }} />
          <span style={{ fontSize: 8.5, color: T.muted, whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
