import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, Glyph, DayPills, StubPage,
} from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';

// Movement pillar — tracking isn't built yet; pill shows an honest empty state.

function MovementPill() {
  const { navigateToPillar } = useUI();
  const weekDays = ['M','T','W','T','F','S','S'].map(label => ({ label, done: false }));
  // Highlight the actual current weekday (Monday-first row)
  const todayIndex = (new Date().getDay() + 6) % 7;
  return (
    <PillarPill onNavigate={() => navigateToPillar('movement')}>
      <CategoryLabel>movement</CategoryLabel>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Glyph color={T.pillars.movement} />
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
            color: T.ink, marginBottom: 3,
          }}>No workout logged.</div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 10,
          }}>Workout tracking coming soon.</div>
          <DayPills days={weekDays} todayIndex={todayIndex} />
        </div>
      </div>
    </PillarPill>
  );
}

function MovementSection({ onBack }) {
  return <StubPage title="Movement" accentColor={T.pillars.movement} onBack={onBack} />;
}

export default {
  id: 'movement',
  label: 'Movement',
  color: PILLAR_COLORS.movement,
  Pill: MovementPill,
  Section: MovementSection,
  StatsScreen: null,
  getStats() {
    return [
      { number: '0', label: 'workouts this month' },
      { number: '0 / 0', label: 'this week' },
    ];
  },
};
