import React from 'react';
import { T } from '../theme/tokens.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { momentumSeries, activeStreak, honoredOn, trackedPillars } from '../lib/momentum.js';
import { intentTodayKey } from '../lib/dates.js';

// A quiet "life in motion" strip for Today: the last 14 days as bars (height =
// how many pillars you honored), plus the current active streak. Tapping opens
// Stats for the fuller picture. Hidden until there's at least one day of data.
export function MomentumStrip() {
  const app = useApp();
  const { goToTab } = useUI();
  const tracked = trackedPillars(app);
  if (tracked.length === 0) return null;

  const series = momentumSeries(app, 14);
  const hasAny = series.some(d => d.count > 0);
  if (!hasAny) return null;

  const streak = activeStreak(app);
  const todayCount = honoredOn(app, intentTodayKey()).length;
  const accent = T.amber;

  return (
    <button
      onClick={() => goToTab && goToTab('stats')}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16,
        padding: '14px 16px', marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, letterSpacing: '0.02em' }}>
          momentum
        </span>
        <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
          {streak > 0
            ? <><span style={{ fontFamily: T.fontSerif, fontWeight: 700, color: T.ink, fontSize: 14 }}>{streak}</span> day{streak === 1 ? '' : 's'} active</>
            : 'begin today'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34 }}>
        {series.map((d, i) => {
          const h = d.count === 0 ? 4 : 8 + d.ratio * 26;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%', height: h, borderRadius: 3,
                background: d.count === 0 ? T.border : accent,
                opacity: d.count === 0 ? 1 : (0.35 + d.ratio * 0.65),
                outline: d.isToday ? `1.5px solid ${T.ink}` : 'none',
                outlineOffset: 1,
                transition: 'height 0.3s ease',
              }} />
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 8 }}>
        {todayCount > 0
          ? `${todayCount} of ${tracked.length} honored today`
          : 'nothing logged yet today'}
      </div>
    </button>
  );
}
