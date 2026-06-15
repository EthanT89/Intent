import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { kindOf, FIELD_META } from './model.js';
import { BackBar, PrimaryBtn, NumberField, ACCENT } from './ui.jsx';

// Log a workout session. Pre-fills each exercise's sets from the workout's
// targets; you record what you actually did (weight × reps per set, or
// time/distance), check off exercises, add overall duration + notes.
export function WorkoutLogger({ workout, onClose }) {
  const { movement, logWorkoutSession } = useApp();
  const exById = Object.fromEntries((movement.exercises || []).map(e => [e.id, e]));

  // Seed entries from the workout template.
  const [entries, setEntries] = React.useState(() => (workout.items || []).map(it => {
    const ex = exById[it.exerciseId];
    const k = kindOf(ex?.kind);
    const base = { exerciseId: it.exerciseId, name: ex?.name || 'Exercise', kind: ex?.kind || 'strength', done: false };
    if (k.perSet) {
      const n = Math.max(1, Number(it.sets) || 1);
      base.sets = Array.from({ length: n }, () => ({ reps: it.reps ?? '', weight: it.weight ?? '' }));
    } else {
      base.duration = it.duration ?? '';
      base.distance = it.distance ?? '';
      base.sets = [];
    }
    return base;
  }));
  const [durationMin, setDurationMin] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const patch = (i, p) => setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, ...p } : e));
  const patchSet = (i, si, p) => setEntries(prev => prev.map((e, idx) => {
    if (idx !== i) return e;
    return { ...e, sets: e.sets.map((s, sj) => sj === si ? { ...s, ...p } : s) };
  }));
  const addSet = (i) => setEntries(prev => prev.map((e, idx) => {
    if (idx !== i) return e;
    const last = e.sets[e.sets.length - 1] || { reps: '', weight: '' };
    return { ...e, sets: [...e.sets, { ...last }] };
  }));
  const removeSet = (i, si) => setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, sets: e.sets.filter((_, sj) => sj !== si) } : e));

  const anyData = entries.some(e => e.done || (e.sets || []).some(s => s.reps || s.weight) || e.duration || e.distance);

  const save = () => {
    logWorkoutSession({
      workoutId: workout.id || null,
      name: workout.name || 'Workout',
      durationMin: durationMin === '' ? null : Number(durationMin),
      notes: notes.trim(),
      entries,
    });
    onClose();
  };

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <BackBar label="Movement" onBack={onClose} title={`Log: ${workout.name || 'Workout'}`} />

      {entries.length === 0 && (
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '14px 0', textAlign: 'center' }}>
          This workout has no exercises. Add some in the builder first.
        </div>
      )}

      {entries.map((e, i) => {
        const k = kindOf(e.kind);
        return (
          <div key={i} style={{ background: T.card, border: `0.5px solid ${e.done ? ACCENT : T.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => patch(i, { done: !e.done })} style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                border: `1.5px solid ${e.done ? ACCENT : T.border}`, background: e.done ? ACCENT : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {e.done && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5l3.2 3L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{e.name}</div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{k.label}</div>
              </div>
            </div>

            {k.perSet ? (
              <div>
                {e.sets.map((s, si) => (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted, fontWeight: 600 }}>{si + 1}</span>
                    {k.fields.includes('weight') && <NumberField label="Weight" unit="lb" step={5} value={s.weight} onChange={v => patchSet(i, si, { weight: v })} />}
                    {k.fields.includes('reps') && <NumberField label="Reps" step={1} value={s.reps} onChange={v => patchSet(i, si, { reps: v })} />}
                    <button onClick={() => removeSet(i, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 8 }}>×</button>
                  </div>
                ))}
                <button onClick={() => addSet(i)} style={{ width: '100%', padding: '8px', background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 9, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: ACCENT }}>+ Add set</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {k.fields.map(f => (
                  <NumberField key={f} label={FIELD_META[f].label} unit={FIELD_META[f].unit} step={FIELD_META[f].step}
                    value={e[f]} onChange={v => patch(i, { [f]: v })} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 14 }}>
        <NumberField label="Total time" unit="min" step={5} value={durationMin} onChange={setDurationMin} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it feel? PRs, tweaks…"
        style={{ width: '100%', boxSizing: 'border-box', height: 70, resize: 'none', padding: '11px 13px', border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card, fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none', marginBottom: 16, lineHeight: 1.5 }} />

      <PrimaryBtn onClick={save} color={ACCENT} style={{ opacity: anyData ? 1 : 0.5 }}>Save workout</PrimaryBtn>
    </div>
  );
}
