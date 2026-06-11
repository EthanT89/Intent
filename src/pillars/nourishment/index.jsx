import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, ProgressBar, DarkButton, BottomSheet,
  SectionHeader, GroupLabel, BarChart,
} from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';

// Nourishment pillar — pill + section with sample data, log modals work as
// sheets but don't persist yet (the pillar is hidden by default).

function NourishmentPill() {
  const { navigateToPillar } = useUI();
  const [proteinModal, setProteinModal] = React.useState(false);
  const [weightModal, setWeightModal] = React.useState(false);
  const proteinPct = Math.round(86 / 140 * 100);
  return (
    <PillarPill onNavigate={() => navigateToPillar('nourishment')}>
      <CategoryLabel>nourishment</CategoryLabel>
      <div style={{ paddingRight: 16 }}>
        {/* Protein row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Protein</span>
          <span style={{
            fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink,
            flex: 1, textAlign: 'center',
          }}>86 / 140 g</span>
          <button onClick={e => { e.stopPropagation(); setProteinModal(true); }} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: T.border, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontSans, fontSize: 18, color: T.muted, lineHeight: 1,
          }}>+</button>
        </div>
        {/* Weight row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Weight</span>
          <span style={{
            fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink,
            flex: 1, textAlign: 'center',
          }}>172 lb</span>
          <button onClick={e => { e.stopPropagation(); setWeightModal(true); }} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: T.border, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontSans, fontSize: 18, color: T.muted, lineHeight: 1,
          }}>+</button>
        </div>
        <ProgressBar pct={proteinPct} />
        <div style={{
          fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 5,
          textAlign: 'right',
        }}>{proteinPct}% of daily goal</div>
      </div>
      <ProteinModal open={proteinModal} onClose={() => setProteinModal(false)} />
      <WeightModal open={weightModal} onClose={() => setWeightModal(false)} />
    </PillarPill>
  );
}

function ProteinModal({ open, onClose }) {
  const [amount, setAmount] = React.useState(0);
  const chips = [
    { label: '+25g  chicken breast', value: 25 },
    { label: '+30g  whey shake', value: 30 },
    { label: '+40g  steak', value: 40 },
  ];
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>Log protein</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 22, color: T.muted, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 56, fontWeight: 600, color: T.ink, lineHeight: 1 }}>
          {amount > 0 ? `+${amount}` : '0'}
        </div>
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginTop: 4 }}>grams</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {chips.map((c, i) => (
          <button key={i} onClick={() => setAmount(c.value)} style={{
            padding: '12px 16px', border: `0.5px solid ${amount === c.value ? T.amber : T.border}`,
            borderRadius: 12, background: amount === c.value ? `${T.amber}15` : T.card,
            fontFamily: T.fontSans, fontSize: 14, color: T.ink, cursor: 'pointer', textAlign: 'left',
          }}>{c.label}</button>
        ))}
        <button onClick={() => setAmount(0)} style={{
          padding: '12px 16px', border: `0.5px solid ${T.border}`,
          borderRadius: 12, background: T.card,
          fontFamily: T.fontSans, fontSize: 14, color: T.muted, cursor: 'pointer', textAlign: 'left',
        }}>Custom amount</button>
      </div>
      <DarkButton onClick={onClose}>Add to today</DarkButton>
    </BottomSheet>
  );
}

function WeightModal({ open, onClose }) {
  const [weight, setWeight] = React.useState(172.0);
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>Log weight</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 22, color: T.muted, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 56, fontWeight: 600, color: T.ink, lineHeight: 1 }}>
          {weight.toFixed(1)}
        </div>
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginTop: 4 }}>lbs</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setWeight(w => Math.max(100, +(w - 0.2).toFixed(1)))} style={{
          flex: 1, padding: '14px 0', border: `0.5px solid ${T.border}`,
          borderRadius: 12, background: T.card, fontFamily: T.fontSans,
          fontSize: 16, fontWeight: 600, color: T.ink, cursor: 'pointer',
        }}>−0.2</button>
        <button onClick={() => setWeight(w => +(w + 0.2).toFixed(1))} style={{
          flex: 1, padding: '14px 0', border: `0.5px solid ${T.border}`,
          borderRadius: 12, background: T.card, fontFamily: T.fontSans,
          fontSize: 16, fontWeight: 600, color: T.ink, cursor: 'pointer',
        }}>+0.2</button>
      </div>
      <DarkButton onClick={onClose}>Save weight</DarkButton>
    </BottomSheet>
  );
}

// ─── Section page ────────────────────────────────────────────────────────────
function NourishmentSection({ onBack }) {
  const accentColor = T.pillars.nourishment;
  const weekProtein = [
    { label: 'M', value: 122 },
    { label: 'T', value: 98 },
    { label: 'W', value: 140 },
    { label: 'T', value: 115 },
    { label: 'F', value: 132 },
    { label: 'S', value: 87 },
    { label: 'S', value: 86 },
  ];
  const weightTrend = [172.8, 172.6, 172.4, 172.8, 172.2, 172.0, 172.4, 172.2, 172.0, 171.8, 172.0, 172.0, 172.2, 172.0];

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Nourishment" accentColor={accentColor} onBack={onBack} />

      {/* Today's stats */}
      <GroupLabel>Today</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
        {[
          { label: 'protein', number: '86 / 140', sub: 'grams' },
          { label: 'weight', number: '172', sub: 'lbs' },
        ].map((m, i) => (
          <div key={i} style={{
            background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: 16, padding: '14px 16px',
          }}>
            <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontFamily: T.fontSerif, fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{m.number}</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      {/* Protein progress */}
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>protein progress</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: accentColor }}>61%</div>
        </div>
        <ProgressBar pct={61} color={accentColor} height={5} />
      </div>

      {/* This week protein */}
      <GroupLabel>This week</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 16, padding: '16px', marginBottom: 8,
      }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 12 }}>
          daily protein · g
        </div>
        <BarChart data={weekProtein} color={accentColor} />
      </div>

      {/* Weight trend */}
      <GroupLabel>Weight trend</GroupLabel>
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 16, padding: '16px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted }}>
            last 14 days
          </div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
            −0.8 lb
          </div>
        </div>
        <WeightLineChart values={weightTrend} color={accentColor} />
      </div>

      {/* Recent meals */}
      <GroupLabel>Today's log</GroupLabel>
      {[
        { meal: 'Greek yogurt + granola', protein: 18, time: '7:30 am' },
        { meal: 'Chicken + rice bowl', protein: 42, time: '12:15 pm' },
        { meal: 'Protein shake', protein: 26, time: '3:00 pm' },
      ].map((m, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: i < 2 ? `0.5px solid ${T.border}` : 'none',
        }}>
          <div>
            <div style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, marginBottom: 2 }}>{m.meal}</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{m.time}</div>
          </div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>
            +{m.protein}g
          </div>
        </div>
      ))}
    </div>
  );
}

function WeightLineChart({ values, color }) {
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const w = 310, h = 60, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const [x, y] = pts[i].split(',').map(Number);
        return (
          <circle key={i} cx={x} cy={y} r={i === values.length - 1 ? 4 : 2.5}
            fill={i === values.length - 1 ? color : `${color}80`} />
        );
      })}
    </svg>
  );
}

export default {
  id: 'nourishment',
  label: 'Nourishment',
  color: PILLAR_COLORS.nourishment,
  Pill: NourishmentPill,
  Section: NourishmentSection,
  StatsScreen: null,
  getStats() {
    return [
      { number: '127g', label: 'avg protein' },
      { number: '172', label: 'current weight' },
      { number: '−1.2', label: '30-day change (lb)' },
    ];
  },
};
