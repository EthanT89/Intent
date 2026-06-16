import React from 'react';
import { T } from '../theme/tokens.js';
import { MiniGlyph } from '../components/primitives.jsx';
import { PILLAR_MAP } from '../pillars/registry.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { ConsistencyCard } from '../components/ConsistencyCard.jsx';

// Stats overview: one dashboard card per visible pillar, in the user's order.
// Each card shows the pillar's 2–3 headline numbers (from its getStats) and
// the whole card taps through to the pillar's stats drill-down.

export function StatsScreen({ onDrillDown }) {
  const app = useApp();
  const { settings } = app;
  const { navigateToPillar } = useUI();
  // Cards with a real stats drill-down open it (reading is special-cased in App
  // to show the Libio stats screen); the rest open the pillar's own section,
  // which holds its history — no dead "coming soon" ends.
  const openCard = (p) => ((p.StatsScreen || p.id === 'reading') ? onDrillDown(p.id) : navigateToPillar(p.id));

  const sections = settings.pillarOrder
    .filter(id => settings.pillarVis[id] !== false)
    .map(id => PILLAR_MAP[id])
    .filter(Boolean);

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      {/* Page title */}
      <div style={{
        fontFamily: T.fontSerif, fontSize: 28, fontWeight: 600,
        color: T.ink, marginBottom: 20, marginTop: 4,
      }}>Stats</div>

      {/* Consistency overview */}
      <ConsistencyCard />

      {/* Pillar cards */}
      {sections.map((p) => {
        const stats = p.getStats ? p.getStats(app) : [];
        return (
          <button
            key={p.id}
            onClick={() => openCard(p)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: T.card, border: `0.5px solid ${T.border}`,
              borderRadius: 20, padding: 20, marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 18,
            }}>
              <MiniGlyph color={p.color} />
              <div style={{
                fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
                color: T.ink, flex: 1,
              }}>{p.label}</div>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 1l6 6-6 6" stroke={T.muted} strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 0 }}>
              {stats.map((st, i) => (
                <div key={i} style={{
                  flex: 1,
                  paddingLeft: i > 0 ? 16 : 0,
                  borderLeft: i > 0 ? `0.5px solid ${T.border}` : 'none',
                  marginLeft: i > 0 ? 16 : 0,
                }}>
                  <div style={{
                    fontFamily: T.fontSerif, fontSize: 24, fontWeight: 700,
                    color: T.ink, lineHeight: 1, marginBottom: 5,
                  }}>{st.number}</div>
                  <div style={{
                    fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
                    color: T.muted, lineHeight: 1.3,
                  }}>{st.label}</div>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
