import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, GhostButton, StubPage,
} from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';

// Reflection pillar — cream card; journaling isn't built yet, so it starts blank.

function ReflectionPill() {
  const { navigateToPillar } = useUI();
  return (
    <PillarPill onNavigate={() => navigateToPillar('reflection')} cream>
      <CategoryLabel>reflection</CategoryLabel>
      <div style={{
        fontFamily: T.fontSerif, fontStyle: 'italic',
        fontSize: 15, color: T.ink, lineHeight: 1.6,
        margin: '0 0 10px', paddingRight: 20,
      }}>
        Nothing written yet. The page is yours.
      </div>
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
      { number: '0', label: 'entries this month' },
      { number: '0', label: 'quotes saved' },
      { number: '0', label: 'day streak' },
    ];
  },
};
