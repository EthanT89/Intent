import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { Card, NumberField, PrimaryBtn, GhostBtn, ACCENT } from './ui.jsx';
import { weightSummary, weightTrend } from './model.js';
import { intentTodayKey } from '../../lib/dates.js';

// Relative label for a YYYY-MM-DD date key (Today / Yesterday / Nd ago / date).
function whenLabel(key) {
  const today = intentTodayKey();
  if (key === today) return 'today';
  const diff = Math.round((new Date(today + 'T12:00:00') - new Date(key + 'T12:00:00')) / 86400000);
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Minimal trend line over the most recent entries.
function Sparkline({ data }) {
  if (data.length < 2) return null;
  const w = 100, h = 30, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const px = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const py = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const pts = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const lastX = px(data.length - 1), lastY = py(data[data.length - 1]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 30, display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.4" fill={ACCENT} />
    </svg>
  );
}

export function WeightCard() {
  const { movement, logWeight } = useApp();
  const { entries, latest, delta } = weightSummary(movement);
  const tk = intentTodayKey();
  const loggedToday = !!(movement.weights || {})[tk];

  // Start in edit mode only when nothing is logged today; prefill with the most
  // recent weight so a daily tap is just confirm-or-nudge.
  const [editing, setEditing] = React.useState(!loggedToday);
  const [val, setVal] = React.useState(
    loggedToday ? (movement.weights || {})[tk] : (latest ? latest.weight : '')
  );

  const save = () => {
    const v = Number(val);
    if (!v || v <= 0) return;
    logWeight(v);
    setEditing(false);
  };

  const deltaColor = delta == null || delta === 0 ? T.muted : delta < 0 ? '#5A8A5A' : '#B07A4A';
  const deltaText = delta == null ? null : `${delta > 0 ? '+' : ''}${delta} lb`;
  const trend = weightTrend(entries);
  const hasRate = trend.ratePerWeek != null && Math.abs(trend.ratePerWeek) >= 0.05;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Bodyweight
          </div>
          {latest ? (
            <>
              <div style={{ fontFamily: T.fontSerif, fontSize: 26, fontWeight: 600, color: T.ink, lineHeight: 1 }}>
                {latest.weight}<span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.muted, marginLeft: 4 }}>lb</span>
              </div>
              <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{whenLabel(latest.date)}</span>
                {!hasRate && deltaText && (
                  <span style={{ color: deltaColor, fontWeight: 600 }}>
                    {delta < 0 ? '▼' : delta > 0 ? '▲' : ''} {deltaText.replace('-', '')}
                  </span>
                )}
              </div>
              {hasRate && (
                <div style={{ fontFamily: T.fontSans, fontSize: 12.5, color: T.ink, fontWeight: 600, marginTop: 3 }}>
                  {trend.ratePerWeek > 0 ? '▲' : '▼'} {Math.abs(trend.ratePerWeek).toFixed(2)} lb/wk
                  <span style={{ color: T.muted, fontWeight: 500 }}>{trend.avg != null ? ` · 7-day avg ${trend.avg}` : ' trend'}</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600, color: T.ink }}>Track your weight</div>
          )}
        </div>
        {entries.length >= 2 && (
          <div style={{ width: 96, flexShrink: 0, paddingTop: 6 }}>
            <Sparkline data={entries.slice(-14).map(e => e.weight)} />
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <NumberField value={val} onChange={setVal} step={0.2} min={0} unit="lb" />
          <PrimaryBtn onClick={save} color={ACCENT} style={{ width: 'auto', flexShrink: 0, padding: '11px 20px' }}>
            {loggedToday ? 'Update' : 'Log'}
          </PrimaryBtn>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <GhostBtn onClick={() => setEditing(true)} color={ACCENT} style={{ width: '100%' }}>
            {loggedToday ? '✓ Logged today · tap to edit' : "+ Log today's weight"}
          </GhostBtn>
        </div>
      )}
    </Card>
  );
}
