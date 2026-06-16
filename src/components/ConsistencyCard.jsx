import React from 'react';
import { T } from '../theme/tokens.js';
import { PILLAR_MAP } from '../pillars/registry.js';
import { useApp } from '../store/AppStateContext.jsx';
import { heatmapWeeks, activeStreak, bestStreak, trackedPillars, pillarStreak } from '../lib/momentum.js';

// The consistency dashboard at the top of Stats: a 6-week heatmap of how many
// pillars you honored each day, current/best streak, and your most consistent
// pillar. The single clearest picture of persistence.
export function ConsistencyCard() {
  const app = useApp();
  const tracked = trackedPillars(app);
  if (tracked.length === 0) return null;

  const weeks = heatmapWeeks(app, 6);
  const streak = activeStreak(app);
  const best = bestStreak(app);

  // Most consistent pillar right now (longest current per-pillar streak).
  let topPillar = null, topStreak = 0;
  tracked.forEach(id => { const s = pillarStreak(app, id); if (s > topStreak) { topStreak = s; topPillar = id; } });

  const accent = T.amber;
  const shade = (cell) => {
    if (cell.future) return 'transparent';
    if (cell.count === 0) return T.border;
    return accent;
  };
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 20, marginBottom: 12 }}>
      <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 16 }}>
        Consistency
      </div>

      {/* Streak headline */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 30, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{streak}</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 4 }}>day streak</div>
        </div>
        <div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 30, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{best}</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 4 }}>best streak</div>
        </div>
        {topPillar && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.fontSerif, fontSize: 30, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{topStreak}</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {PILLAR_MAP[topPillar]?.label.toLowerCase()} streak
            </div>
          </div>
        )}
      </div>

      {/* Heatmap: columns = weeks, rows = weekday */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 0 }}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{ height: 14, display: 'flex', alignItems: 'center', fontFamily: T.fontSans, fontSize: 8.5, color: T.muted }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {week.map((cell, di) => (
                <div key={di} title={`${cell.dk}: ${cell.count} honored`} style={{
                  height: 14, borderRadius: 3,
                  background: shade(cell),
                  opacity: cell.future ? 0 : (cell.count === 0 ? 1 : 0.3 + cell.ratio * 0.7),
                  outline: cell.isToday ? `1.5px solid ${T.ink}` : 'none', outlineOffset: -1,
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 9.5, color: T.muted }}>less</span>
        {[0, 0.34, 0.67, 1].map((o, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: o === 0 ? T.border : accent, opacity: o === 0 ? 1 : 0.3 + o * 0.7 }} />
        ))}
        <span style={{ fontFamily: T.fontSans, fontSize: 9.5, color: T.muted }}>more</span>
      </div>
    </div>
  );
}
