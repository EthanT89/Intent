import React from 'react';
import { PILLAR_COLORS, T } from '../../theme/tokens.js';
import { PillarPill, CategoryLabel, Glyph, DayPills } from '../../components/primitives.jsx';
import { useUI } from '../../store/uiContext.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { MovementSection } from './MovementSection.jsx';
import { MovementStats } from './MovementStats.jsx';
import { scheduledFor, computeMovementStats } from './model.js';
import { dateKey, weekStart, addDays } from '../../lib/dates.js';

function MovementPill() {
  const { navigateToPillar } = useUI();
  const { movement } = useApp();
  const workouts = movement.workouts || [];
  const wkById = Object.fromEntries(workouts.map(w => [w.id, w]));
  const todayWorkouts = scheduledFor(movement.schedule || {}, new Date()).map(id => wkById[id]).filter(Boolean);
  const sessions = movement.sessions || [];
  const loggedToday = sessions.some(s => (s.date || dateKey(new Date(s.at))) === dateKey(new Date()));

  // Week dots: which days this week already have a logged session.
  const ws = weekStart(new Date());
  const sessionDays = new Set(sessions.map(s => s.date || dateKey(new Date(s.at))));
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => ({
    label, done: sessionDays.has(dateKey(addDays(ws, i))),
  }));
  const todayIndex = (new Date().getDay() + 6) % 7;

  const headline = loggedToday ? 'Workout logged ✓'
    : todayWorkouts.length ? todayWorkouts[0].name
    : 'Rest day';
  const sub = loggedToday ? 'Nice work today.'
    : todayWorkouts.length ? `${(todayWorkouts[0].items || []).length} exercises scheduled`
    : workouts.length ? 'Nothing scheduled today' : 'Tap to build your first workout';

  return (
    <PillarPill onNavigate={() => navigateToPillar('movement')}>
      <CategoryLabel>movement</CategoryLabel>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Glyph color={T.pillars.movement} />
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{headline}</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 10 }}>{sub}</div>
          <DayPills days={weekDays} todayIndex={todayIndex} />
        </div>
      </div>
    </PillarPill>
  );
}

export default {
  id: 'movement',
  label: 'Movement',
  color: PILLAR_COLORS.movement,
  Pill: MovementPill,
  Section: MovementSection,
  StatsScreen: MovementStats,
  getDaily(app) {
    const tk = dateKey(new Date());
    const done = (app.movement.sessions || []).some(s => (s.date || dateKey(new Date(s.at))) === tk);
    return { done };
  },
  getStats(app) {
    const s = computeMovementStats(app.movement || {});
    return [
      { number: String(s.workoutsThisMonth), label: 'workouts this month' },
      { number: `${s.weekDone} / ${s.weekScheduled}`, label: 'this week' },
      { number: s.volumeThisMonth >= 1000 ? `${Math.round(s.volumeThisMonth / 1000)}k` : String(s.volumeThisMonth), label: 'lb volume' },
    ];
  },
};
