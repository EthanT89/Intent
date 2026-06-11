import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, Glyph, DayPills, DarkButton, StubPage,
} from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';

// Movement pillar — pill is sample content for now, section is a stub.

function MovementPill() {
  const { navigateToPillar } = useUI();
  const weekDays = [
    { label: 'M', done: true },
    { label: 'T', done: true },
    { label: 'W', done: true },
    { label: 'T', done: false },
    { label: 'F', done: false },
    { label: 'S', done: false },
    { label: 'S', done: false },
  ];
  // Highlight the actual current weekday (Monday-first row)
  const todayIndex = (new Date().getDay() + 6) % 7;
  return (
    <PillarPill onNavigate={() => navigateToPillar('movement')}>
      <CategoryLabel>today's lift</CategoryLabel>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Glyph color={T.pillars.movement} />
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
            color: T.ink, marginBottom: 3,
          }}>Push day A</div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 10,
          }}>5 lifts · 45 min</div>
          <DayPills days={weekDays} todayIndex={todayIndex} />
          <DarkButton onClick={() => navigateToPillar('movement')}>Start workout</DarkButton>
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
      { number: '11', label: 'workouts this month' },
      { number: '3 / 4', label: 'this week' },
      { number: '42k', label: 'lbs volume' },
    ];
  },
};
