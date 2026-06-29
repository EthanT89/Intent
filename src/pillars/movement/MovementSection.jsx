import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { SectionHeader } from '../../components/primitives.jsx';
import { scheduledFor, sessionVolume, kindOf, plural, exerciseSummary, estimateWorkoutMinutes } from './model.js';
import { Segmented, Card, PrimaryBtn, EmptyHint, ACCENT } from './ui.jsx';
import { ExerciseEditor } from './ExerciseEditor.jsx';
import { WorkoutBuilder } from './WorkoutBuilder.jsx';
import { WorkoutLogger } from './WorkoutLogger.jsx';
import { WeeklySchedule } from './WeeklySchedule.jsx';
import { WeightCard } from './WeightCard.jsx';
import { timeAgo, intentNow } from '../../lib/dates.js';

export function MovementSection({ onBack, arg }) {
  const app = useApp();
  const { movement } = app;
  const [view, setView] = React.useState('today');
  const [editingExercise, setEditingExercise] = React.useState(null);
  const [editingWorkout, setEditingWorkout] = React.useState(null);
  const [logging, setLogging] = React.useState(null);
  const [pickLog, setPickLog] = React.useState(false);

  // Deep-link from the Today pill's "Log workout": open the logger straight away
  // for the scheduled workout, or the picker if none is scheduled today.
  React.useEffect(() => {
    if (!arg || arg.open !== 'log') return;
    const wk = arg.workoutId && (movement.workouts || []).find(w => w.id === arg.workoutId);
    if (wk) setLogging(wk);
    else if ((movement.workouts || []).length) setPickLog(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sub-screens take over the section.
  if (editingExercise) return <ExerciseEditor exercise={editingExercise} onClose={() => setEditingExercise(null)} />;
  if (editingWorkout) return <WorkoutBuilder workout={editingWorkout} onClose={() => setEditingWorkout(null)} />;
  if (logging) return <WorkoutLogger workout={logging} onClose={() => setLogging(null)} />;

  const workouts = movement.workouts || [];
  const exercises = movement.exercises || [];
  const sessions = movement.sessions || [];
  const wkById = Object.fromEntries(workouts.map(w => [w.id, w]));
  const exByIdM = Object.fromEntries(exercises.map(e => [e.id, e]));
  const wkMeta = (w) => `${plural((w.items || []).length, 'exercise')} · ~${estimateWorkoutMinutes(w, exByIdM)} min`;
  const todayWorkouts = scheduledFor(movement.schedule || {}, intentNow()).map(id => wkById[id]).filter(Boolean);

  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <SectionHeader title="Movement" accentColor={ACCENT} onBack={onBack} />
      <Segmented value={view} onChange={setView} options={[
        { id: 'today', label: 'Today' },
        { id: 'workouts', label: 'Workouts' },
        { id: 'exercises', label: 'Exercises' },
        { id: 'plan', label: 'Plan' },
      ]} />

      {/* ── TODAY ───────────────────────────────────────────────────────── */}
      {view === 'today' && (
        <>
          {/* Daily bodyweight — quick log + trend */}
          <WeightCard />

          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Today's plan
          </div>
          {todayWorkouts.length === 0 ? (
            <Card style={{ padding: '22px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Rest day</div>
              <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>Nothing scheduled — log something anyway?</div>
            </Card>
          ) : todayWorkouts.map(w => (
            <Card key={w.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink }}>{w.name}</div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{wkMeta(w)}</div>
                </div>
              </div>
              <PrimaryBtn onClick={() => setLogging(w)} color={ACCENT}>Log this workout</PrimaryBtn>
            </Card>
          ))}

          <button onClick={() => (workouts.length ? setPickLog(true) : setEditingWorkout({}))} style={ghostFull}>
            {workouts.length ? '+ Log a different workout' : '+ Create your first workout'}
          </button>

          {/* Recent sessions */}
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '22px 0 8px' }}>
            Recent
          </div>
          {sessions.length === 0 && <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '8px 0', textAlign: 'center' }}>No workouts logged yet.</div>}
          {sessions.slice(0, 10).map(s => {
            const vol = sessionVolume(s);
            const doneCount = (s.entries || []).filter(e => e.done || (e.sets || []).length).length;
            return (
              <Card key={s.id} style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
                      {timeAgo(s.at || s.date)} · {plural(doneCount, 'exercise')}{s.durationMin ? ` · ${s.durationMin} min` : ''}
                    </div>
                  </div>
                  {vol > 0 && <div style={{ fontFamily: T.fontSerif, fontSize: 14, fontWeight: 600, color: T.ink, flexShrink: 0, marginLeft: 10 }}>{vol.toLocaleString()} <span style={{ fontSize: 11, color: T.muted }}>lb</span></div>}
                </div>
              </Card>
            );
          })}
        </>
      )}

      {/* ── WORKOUTS ────────────────────────────────────────────────────── */}
      {view === 'workouts' && (
        <>
          {workouts.length === 0 ? (
            <EmptyHint title="No workouts yet" body="A workout is a reusable set of exercises. Build one, then log it or schedule it." cta="+ New workout" onCta={() => setEditingWorkout({})} />
          ) : (
            <>
              {workouts.map(w => (
                <Card key={w.id} onClick={() => setEditingWorkout(w)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{wkMeta(w)}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setLogging(w); }} style={logBtn}>Log</button>
                  </div>
                </Card>
              ))}
              <button onClick={() => setEditingWorkout({})} style={ghostFull}>+ New workout</button>
            </>
          )}
        </>
      )}

      {/* ── EXERCISES ───────────────────────────────────────────────────── */}
      {view === 'exercises' && (
        <>
          {exercises.length === 0 ? (
            <EmptyHint title="No exercises yet" body="Exercises are your building blocks — lifts, stretches, runs, anything. Make them once and reuse them in any workout." cta="+ New exercise" onCta={() => setEditingExercise({})} />
          ) : (
            <>
              {exercises.map(ex => {
                const sm = exerciseSummary(sessions, ex.id);
                const sub = sm.count > 0
                  ? [sm.usualWeight != null && `usually ${sm.usualWeight} lb`, sm.bestE1RM > 0 && `best ~${Math.round(sm.bestE1RM)}`].filter(Boolean).join(' · ')
                  : null;
                return (
                <Card key={ex.id} onClick={() => setEditingExercise(ex)} style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: T.ink }}>{ex.name}</div>
                      {sub && <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
                    </div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, background: `${ACCENT}14`, padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>{kindOf(ex.kind).label}</div>
                  </div>
                </Card>
                );
              })}
              <button onClick={() => setEditingExercise({})} style={ghostFull}>+ New exercise</button>
            </>
          )}
        </>
      )}

      {/* ── PLAN ────────────────────────────────────────────────────────── */}
      {view === 'plan' && (
        <WeeklySchedule workouts={workouts} onCreateWorkout={() => setEditingWorkout({})} />
      )}

      {/* Quick "log a workout" picker */}
      {pickLog && (
        <div onClick={() => setPickLog(false)} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(40px + var(--safe-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
            <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 14 }}>Log a workout</div>
            <div className="intent-scroll" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {workouts.map(w => (
                <button key={w.id} onClick={() => { setPickLog(false); setLogging(w); }} style={{
                  display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                  background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12,
                }}>
                  <span style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{w.name}</span>
                  <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{wkMeta(w)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ghostFull = {
  width: '100%', padding: '12px', marginTop: 4, cursor: 'pointer',
  background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 12,
  fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: ACCENT,
};
const logBtn = {
  flexShrink: 0, padding: '8px 16px', background: ACCENT, color: '#FAF7F2', border: 'none',
  borderRadius: 999, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600,
};
