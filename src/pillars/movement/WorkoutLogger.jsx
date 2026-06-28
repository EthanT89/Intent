import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { kindOf, FIELD_META, epley1RM, bestE1RM } from './model.js';
import { usePointerSort, arrayMove } from './dnd.js';
import { BackBar, PrimaryBtn, NumberField, DragHandle, ACCENT } from './ui.jsx';
import { timeAgo } from '../../lib/dates.js';
import { haptics } from '../../lib/haptics.js';

const DRAFT_KEY = 'intent.logging.draft';

// Most recent prior session entry for an exercise (for "last time" + prefill).
function lastEntryFor(sessions, exerciseId) {
  for (const s of sessions) {
    const e = (s.entries || []).find(en => en.exerciseId === exerciseId && ((en.sets || []).length || en.duration || en.distance));
    if (e) return { entry: e, at: s.at || s.date };
  }
  return null;
}
function summarizeLast(last) {
  if (!last) return null;
  const e = last.entry;
  const when = timeAgo(last.at);
  if ((e.sets || []).length) {
    const parts = e.sets.map(s => `${s.weight ? s.weight + '×' : ''}${s.reps ?? ''}`).filter(Boolean);
    return `Last: ${parts.join(', ')} · ${when}`;
  }
  const bits = [];
  if (e.duration) bits.push(`${e.duration} min`);
  if (e.distance) bits.push(`${e.distance} mi`);
  return bits.length ? `Last: ${bits.join(' · ')} · ${when}` : null;
}

// Log a workout session. Pre-fills each exercise's sets from the workout's
// targets; you record what you actually did (weight × reps per set, or
// time/distance), check off exercises, add overall duration + notes.
// Pass `session` to enter edit mode — pre-fills from the existing session
// and updates it in place on save.
export function WorkoutLogger({ workout, session: editSession, onClose }) {
  const { movement, logWorkoutSession, updateSession } = useApp();
  const exById = Object.fromEntries((movement.exercises || []).map(e => [e.id, e]));
  const sessions = movement.sessions || [];

  // "Last time" per exercise — shown as a hint and used to prefill.
  const lastByEx = {};
  (workout.items || []).forEach(it => { lastByEx[it.exerciseId] = lastEntryFor(sessions, it.exerciseId); });

  // All-time best estimated 1RM per exercise (from past sessions only), so a set
  // that beats it can light up as a PR while you log.
  const bestByEx = {};
  (workout.items || []).forEach(it => { bestByEx[it.exerciseId] = bestE1RM(sessions, it.exerciseId); });

  // Seed entries: edit session > saved draft > last time > template.
  const [entries, setEntries] = React.useState(() => {
    if (editSession) return editSession.entries || [];
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && draft.workoutId === workout.id && draft.entries) return draft.entries;
    } catch {}
    return (workout.items || []).map(it => {
      const ex = exById[it.exerciseId];
      const k = kindOf(ex?.kind);
      const last = lastByEx[it.exerciseId]?.entry;
      const base = { exerciseId: it.exerciseId, name: ex?.name || 'Exercise', kind: ex?.kind || 'strength', done: false };
      if (k.perSet) {
        if (last && (last.sets || []).length) {
          base.sets = last.sets.map(s => ({ reps: s.reps ?? '', weight: s.weight ?? '' }));
        } else {
          const n = Math.max(1, Number(it.sets) || 1);
          base.sets = Array.from({ length: n }, () => ({ reps: it.reps ?? '', weight: it.weight ?? '' }));
        }
      } else {
        base.duration = (last && last.duration) ?? it.duration ?? '';
        base.distance = (last && last.distance) ?? it.distance ?? '';
        base.sets = [];
      }
      return base;
    });
  });

  const [durationMin, setDurationMin] = React.useState(() => {
    if (editSession) return editSession.durationMin ?? '';
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && draft.workoutId === workout.id) return draft.durationMin ?? '';
    } catch {}
    return '';
  });

  const [notes, setNotes] = React.useState(() => {
    if (editSession) return editSession.notes ?? '';
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && draft.workoutId === workout.id) return draft.notes ?? '';
    } catch {}
    return '';
  });

  // Persist in-progress state so the user can exit the app and return.
  React.useEffect(() => {
    if (editSession) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ workoutId: workout.id, entries, durationMin, notes }));
    } catch {}
  }, [entries, durationMin, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  // Drag to reorder exercises mid-workout (same primitive as the builder).
  const rowRefs = React.useRef([]);
  const getRects = React.useCallback(() => rowRefs.current.map(el => el?.getBoundingClientRect()), []);
  const { drag, start } = usePointerSort(entries.length, (from, to) => setEntries(prev => arrayMove(prev, from, to)), getRects);

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
    const payload = {
      workoutId: workout.id || null,
      name: workout.name || 'Workout',
      durationMin: durationMin === '' ? null : Number(durationMin),
      notes: notes.trim(),
      entries,
    };
    if (editSession) {
      updateSession(editSession.id, payload);
    } else {
      clearDraft();
      logWorkoutSession(payload);
    }
    onClose();
  };

  const handleClose = () => { clearDraft(); onClose(); };

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <BackBar label="Movement" onBack={handleClose} title={editSession ? `Edit: ${workout.name || 'Workout'}` : `Log: ${workout.name || 'Workout'}`} />

      {entries.length === 0 && (
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '14px 0', textAlign: 'center' }}>
          This workout has no exercises. Add some in the builder first.
        </div>
      )}

      {entries.map((e, i) => {
        const k = kindOf(e.kind);
        const dragging = drag?.from === i;
        const showInsert = drag && drag.over === i && drag.from !== i;
        return (
          <div key={i} ref={el => (rowRefs.current[i] = el)}>
          {showInsert && <div style={{ height: 2, background: ACCENT, borderRadius: 2, margin: '4px 0' }} />}
          <div style={{
            background: T.card, border: `0.5px solid ${e.done ? ACCENT : T.border}`, borderRadius: 14, padding: 14, marginBottom: 10,
            opacity: dragging ? 0.6 : 1, boxShadow: dragging ? '0 6px 18px rgba(44,36,24,0.16)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { if (!e.done) haptics.done(); patch(i, { done: !e.done }); }} style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                border: `1.5px solid ${e.done ? ACCENT : T.border}`, background: e.done ? ACCENT : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {e.done && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5l3.2 3L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{e.name}</div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
                  {summarizeLast(lastByEx[e.exerciseId]) || k.label}
                </div>
              </div>
              <DragHandle onPointerDown={(ev) => start(i, ev)} />
            </div>

            {k.perSet ? (
              <div>
                {e.sets.map((s, si) => {
                  const isPR = k.fields.includes('weight') && bestByEx[e.exerciseId] > 0
                    && epley1RM(s.weight, s.reps) > bestByEx[e.exerciseId] + 0.01;
                  return (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted, fontWeight: 600 }}>{si + 1}</span>
                    {k.fields.includes('weight') && <NumberField label="Weight" unit="lb" step={5} value={s.weight} onChange={v => patchSet(i, si, { weight: v })} />}
                    {k.fields.includes('reps') && <NumberField label="Reps" step={1} value={s.reps} onChange={v => patchSet(i, si, { reps: v })} />}
                    {isPR && <span title="New estimated 1-rep-max best" style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: 8, fontFamily: T.fontSans, fontSize: 10, fontWeight: 700, color: '#FAF7F2', background: T.amber, padding: '4px 7px', borderRadius: 999, letterSpacing: '0.04em' }}>PR</span>}
                    <button onClick={() => removeSet(i, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 8 }}>×</button>
                  </div>
                  );
                })}
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
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 14 }}>
        <NumberField label="Total time" unit="min" step={5} value={durationMin} onChange={setDurationMin} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it feel? PRs, tweaks…"
        style={{ width: '100%', boxSizing: 'border-box', height: 70, resize: 'none', padding: '11px 13px', border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card, fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none', marginBottom: 16, lineHeight: 1.5 }} />

      <PrimaryBtn onClick={save} color={ACCENT} style={{ opacity: anyData ? 1 : 0.5 }}>{editSession ? 'Update workout' : 'Save workout'}</PrimaryBtn>

      <RestTimer />
    </div>
  );
}

// Floating rest timer — tap a preset to start a countdown between sets.
function RestTimer() {
  const [left, setLeft] = React.useState(0); // seconds remaining; 0 = idle
  const endRef = React.useRef(0);
  React.useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) { clearInterval(id); if (navigator.vibrate) navigator.vibrate(200); }
    }, 250);
    return () => clearInterval(id);
  }, [left > 0]);

  const startSec = (s) => { endRef.current = Date.now() + s * 1000; setLeft(s); };
  const add = (s) => { endRef.current += s * 1000; setLeft(l => l + s); };
  const stop = () => { endRef.current = 0; setLeft(0); };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'sticky', bottom: 90, marginTop: 18, zIndex: 20,
      background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16,
      padding: 12, boxShadow: '0 4px 18px rgba(44,36,24,0.12)',
    }}>
      {left > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: T.fontSerif, fontSize: 26, fontWeight: 700, color: left <= 5 ? '#B8453E' : T.ink, minWidth: 64, textAlign: 'center' }}>{mmss(left)}</span>
          <button onClick={() => add(15)} style={timerBtn}>+15s</button>
          <button onClick={stop} style={{ ...timerBtn, background: ACCENT, color: '#FAF7F2', border: 'none', flex: 1 }}>Done</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.muted, marginRight: 2 }}>Rest</span>
          {[60, 90, 120, 180].map(s => (
            <button key={s} onClick={() => startSec(s)} style={{ ...timerBtn, flex: 1 }}>{s < 120 ? `${s}s` : `${s / 60}m`}</button>
          ))}
        </div>
      )}
    </div>
  );
}
const timerBtn = {
  padding: '9px 10px', borderRadius: 9, border: `0.5px solid ${T.border}`, background: T.cardCream,
  fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink, cursor: 'pointer',
};
