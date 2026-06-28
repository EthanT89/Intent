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
  const proteinPct = 0; // nothing logged yet — persistence comes with the pillar build-out
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
          }}>0 / 140 g</span>
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
          }}>— lb</span>
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
  const weekProtein = ['M','T','W','T','F','S','S'].map(label => ({ label, value: 0 }));

  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <SectionHeader title="Nourishment" accentColor={accentColor} onBack={onBack} />

      {/* Today's stats */}
      <GroupLabel>Today</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
        {[
          { label: 'protein', number: '0 / 140', sub: 'grams' },
          { label: 'weight', number: '—', sub: 'lbs' },
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
          <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: accentColor }}>0%</div>
        </div>
        <ProgressBar pct={0} color={accentColor} height={5} />
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
        borderRadius: 16, padding: '20px 16px', marginBottom: 8,
        fontFamily: T.fontSans, fontSize: 13, color: T.muted,
        textAlign: 'center', lineHeight: 1.5,
      }}>No weigh-ins yet.</div>

      {/* Recent meals */}
      <GroupLabel>Today's log</GroupLabel>
      <div style={{
        fontFamily: T.fontSans, fontSize: 13, color: T.muted,
        padding: '14px 0', textAlign: 'center',
      }}>Nothing logged today.</div>
    </div>
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
      { number: '0g', label: 'avg protein' },
      { number: '—', label: 'current weight' },
    ];
  },
};
