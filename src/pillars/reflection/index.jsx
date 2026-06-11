import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, GhostButton, StubPage,
} from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';

// Reflection pillar — cream quote card; section is a stub.

function ReflectionPill() {
  const { navigateToPillar } = useUI();
  return (
    <PillarPill onNavigate={() => navigateToPillar('reflection')} cream>
      <CategoryLabel>a thought from yesterday</CategoryLabel>
      <blockquote style={{
        fontFamily: T.fontSerif, fontStyle: 'italic',
        fontSize: 15, fontWeight: 400,
        color: T.ink, lineHeight: 1.6,
        margin: '0 0 10px', paddingRight: 20,
      }}>
        "You have power over your mind — not outside events. Realize this, and you will find strength."
      </blockquote>
      <div style={{
        fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 2,
      }}>— Meditations, p. 87</div>
      <GhostButton>Write today</GhostButton>
    </PillarPill>
  );
}

function ReflectionSection({ onBack }) {
  return <StubPage title="Reflection" accentColor={T.pillars.reflection} onBack={onBack} />;
}

export default {
  id: 'reflection',
  label: 'Reflection',
  color: PILLAR_COLORS.reflection,
  Pill: ReflectionPill,
  Section: ReflectionSection,
  StatsScreen: null,
  getStats() {
    return [
      { number: '16', label: 'entries this month' },
      { number: '23', label: 'quotes saved' },
      { number: '5', label: 'day streak' },
    ];
  },
};
