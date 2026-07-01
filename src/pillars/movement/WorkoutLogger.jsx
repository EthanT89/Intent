import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { kindOf, FIELD_META, epley1RM, bestE1RM, exerciseHistory, progressionTarget, uid } from './model.js';
import { usePointerSort, arrayMove } from './dnd.js';
import { BackBar, PrimaryBtn, NumberField, DragHandle, ACCENT } from './ui.jsx';
import { timeAgo } from '../../lib/dates.js';
import { haptics } from '../../lib/haptics.js';

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
export function WorkoutLogger({ workout, onClose }) {
  const { movement, logWorkoutSession, saveExercise } = useApp();
  const exById = Object.fromEntries((movement.exercises || []).map(e => [e.id, e]));
  const sessions = movement.sessions || [];

  // Build a fresh entry for a workout item (or a swapped-in exercise): prefer
  // what you did last time for THAT exercise, else the template.
  const seedEntry = (it) => {
    const ex = exById[it.exerciseId];
    const k = kindOf(ex?.kind);
    const last = lastEntryFor(sessions, it.exerciseId)?.entry;
    const base = { exerciseId: it.exerciseId, name: ex?.name || 'Exercise', kind: ex?.kind || 'strength', warmup: !!it.warmup, targetReps: it.reps != null ? Number(it.reps) : null, done: false };
    if (k.perSet) {
      if (last && (last.sets || []).length) base.sets = last.sets.map(s => ({ reps: s.reps ?? '', weight: s.weight ?? '' }));
      else { const n = Math.max(1, Number(it.sets) || 1); base.sets = Array.from({ length: n }, () => ({ reps: it.reps ?? '', weight: it.weight ?? '' })); }
    } else { base.duration = (last && last.duration) ?? it.duration ?? ''; base.distance = (last && last.distance) ?? it.distance ?? ''; base.sets = []; }
    return base;
  };

  // Autosave draft — never lose mid-workout progress (survives an app close/crash).
  const DRAFT_KEY = 'intent.workoutDraft';
  const draft0 = React.useRef((() => {
    try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d && d.workoutId === workout.id && Date.now() - (d.savedAt || 0) < 8 * 3600 * 1000) return d; } catch { /* ignore */ }
    return null;
  })()).current;

  const [entries, setEntries] = React.useState(() => (draft0 && draft0.entries) || (workout.items || []).map(seedEntry));
  const [durationMin, setDurationMin] = React.useState(draft0 ? (draft0.durationMin ?? '') : '');
  const [notes, setNotes] = React.useState(draft0 ? (draft0.notes ?? '') : '');
  const [resumed, setResumed] = React.useState(!!draft0);
  const [swapFor, setSwapFor] = React.useState(null); // entry index being swapped

  const applyTarget = (i, t) => setEntries(prev => prev.map((e, idx) => idx !== i ? e
    : { ...e, sets: (e.sets || []).map(s => ({ reps: t.reps ?? s.reps, weight: t.weight ?? s.weight })) }));

  // Swap this exercise for another (machine taken, injury, preference) — re-seeds
  // from the new exercise's own history so its data stays clean.
  const swapExercise = (i, ex) => {
    setEntries(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const k = kindOf(ex.kind);
      const last = lastEntryFor(sessions, ex.id)?.entry;
      const base = { exerciseId: ex.id, name: ex.name, kind: ex.kind, warmup: e.warmup, targetReps: e.targetReps, done: false, note: '' };
      if (k.perSet) base.sets = (last && (last.sets || []).length) ? last.sets.map(s => ({ reps: s.reps ?? '', weight: s.weight ?? '' }))
        : ((e.sets || []).length ? e.sets.map(() => ({ reps: e.targetReps ?? '', weight: '' })) : [{ reps: '', weight: '' }]);
      else { base.duration = last?.duration ?? ''; base.distance = last?.distance ?? ''; base.sets = []; }
      return base;
    }));
    setSwapFor(null);
  };

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

  const anyData = entries.some(e => e.done || (e.sets || []).some(s => s.reps || s.weight) || e.duration || e.distance || e.note);

  // Autosave to a local draft on every change, so progress is never lost if the
  // app closes mid-workout. Cleared when the session is saved for real.
  React.useEffect(() => {
    const has = anyData || !!notes || durationMin !== '';
    try {
      if (has) localStorage.setItem(DRAFT_KEY, JSON.stringify({ workoutId: workout.id, name: workout.name, savedAt: Date.now(), entries, durationMin, notes }));
    } catch { /* storage full / unavailable — ignore */ }
  }, [entries, durationMin, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    logWorkoutSession({
      workoutId: workout.id || null,
      name: workout.name || 'Workout',
      durationMin: durationMin === '' ? null : Number(durationMin),
      notes: notes.trim(),
      entries,
    });
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div style={{ padding: '10px 16px calc(150px + var(--safe-bottom))' }}>
      <BackBar label="Movement" onBack={onClose} title={`Log: ${workout.name || 'Workout'}`} />

      {resumed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '9px 12px', background: `${ACCENT}12`, border: `0.5px solid ${ACCENT}33`, borderRadius: 10 }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 12.5, color: T.ink, flex: 1 }}>Resumed your progress from earlier.</span>
          <button onClick={() => { setEntries((workout.items || []).map(seedEntry)); setDurationMin(''); setNotes(''); setResumed(false); }}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.muted }}>Start fresh</button>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '14px 0', textAlign: 'center' }}>
          This workout has no exercises. Add some in the builder first.
        </div>
      )}

      {entries.map((e, i) => {
        const k = kindOf(e.kind);
        const dragging = drag?.from === i;
        const showInsert = drag && drag.over === i && drag.from !== i;
        const anyWarmup = entries.some(x => x.warmup);
        const showWarmupHdr = anyWarmup && i === 0 && e.warmup;
        const showWorkingHdr = anyWarmup && !e.warmup && (i === 0 || entries[i - 1].warmup);
        // Per-entry so swaps (different exerciseId) get the right history/target.
        const last = lastEntryFor(sessions, e.exerciseId);
        const best = bestE1RM(sessions, e.exerciseId);
        const target = e.warmup ? null : progressionTarget({ reps: e.targetReps }, exerciseHistory(sessions, e.exerciseId));
        return (
          <React.Fragment key={i}>
          {showWarmupHdr && <SectionHdr>Warm-up</SectionHdr>}
          {showWorkingHdr && <SectionHdr>Working sets</SectionHdr>}
          <div ref={el => (rowRefs.current[i] = el)}>
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
                  {summarizeLast(last) || k.label}
                </div>
                {exById[e.exerciseId]?.description && (
                  <div style={{ fontFamily: T.fontSans, fontSize: 11, color: ACCENT, marginTop: 2, lineHeight: 1.35 }}>{exById[e.exerciseId].description}</div>
                )}
              </div>
              <button onClick={() => setSwapFor(i)} aria-label="Swap exercise" style={{
                flexShrink: 0, background: 'none', border: `0.5px solid ${T.border}`, borderRadius: 999, cursor: 'pointer',
                color: T.muted, fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, padding: '5px 10px',
              }}>⇄ Swap</button>
              <DragHandle onPointerDown={(ev) => start(i, ev)} />
            </div>

            {k.perSet && target && (target.weight || target.reps) && (() => {
              const t = target;
              const label = `${t.weight ? t.weight + ' × ' : ''}${t.reps ?? ''}`.trim();
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '7px 10px', background: `${ACCENT}12`, border: `0.5px solid ${ACCENT}33`, borderRadius: 9 }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.ink }}>🎯 Target {label}</span>
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>· {t.reason}</span>
                  <button onClick={() => applyTarget(i, t)} style={{ marginLeft: 'auto', flexShrink: 0, padding: '4px 10px', border: 'none', borderRadius: 999, background: ACCENT, color: '#FAF7F2', fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Use</button>
                </div>
              );
            })()}

            {k.perSet ? (
              <div>
                {e.sets.map((s, si) => {
                  const isPR = k.fields.includes('weight') && best > 0
                    && epley1RM(s.weight, s.reps) > best + 0.01;
                  return (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, flexShrink: 0, fontFamily: T.fontSans, fontSize: 12, color: T.muted, fontWeight: 600 }}>{si + 1}</span>
                    {k.fields.includes('weight') && <NumberField label="Weight" unit="lb" step={5} value={s.weight} onChange={v => patchSet(i, si, { weight: v })} />}
                    {k.fields.includes('reps') && <NumberField label="Reps" step={1} value={s.reps} onChange={v => patchSet(i, si, { reps: v })} />}
                    {isPR && <span title="New estimated 1-rep-max best" style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: 8, fontFamily: T.fontSans, fontSize: 10, fontWeight: 700, color: '#FAF7F2', background: T.amber, padding: '4px 7px', borderRadius: 999, letterSpacing: '0.04em' }}>PR</span>}
                    <button aria-label="Remove set" onClick={() => removeSet(i, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1, padding: '8px 8px', flexShrink: 0, alignSelf: 'flex-end' }}>×</button>
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

            {/* Per-lift note — felt heavy, form cue, machine setting, etc. */}
            <input
              value={e.note || ''}
              onChange={ev => patch(i, { note: ev.target.value })}
              placeholder={last?.entry?.note ? `Last: "${last.entry.note}"` : 'Add a note…'}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '8px 10px', border: `0.5px solid ${T.border}`, borderRadius: 9, background: T.cardCream, fontFamily: T.fontSans, fontSize: 13, color: T.ink, outline: 'none' }}
            />
          </div>
          </div>
          </React.Fragment>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 14 }}>
        <NumberField label="Total time" unit="min" step={5} value={durationMin} onChange={setDurationMin} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it feel? PRs, tweaks…"
        style={{ width: '100%', boxSizing: 'border-box', height: 70, resize: 'none', padding: '11px 13px', border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card, fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none', marginBottom: 16, lineHeight: 1.5 }} />

      <PrimaryBtn onClick={save} color={ACCENT} disabled={!anyData}>Save workout</PrimaryBtn>

      <RestTimer />

      {swapFor != null && (
        <SwapSheet
          exercises={movement.exercises || []}
          current={exById[entries[swapFor]?.exerciseId]}
          onClose={() => setSwapFor(null)}
          onPick={(ex) => swapExercise(swapFor, ex)}
          onCreate={(ex) => { const created = { id: uid('ex'), description: '', ...ex }; saveExercise(created); swapExercise(swapFor, created); }}
        />
      )}
    </div>
  );
}

// Swap the current exercise for another (or a new one) — machine taken, injury,
// preference. Same-kind exercises float to the top; search to filter.
function SwapSheet({ exercises, current, onClose, onPick, onCreate }) {
  const [q, setQ] = React.useState('');
  const kind = current?.kind || 'strength';
  const list = exercises
    .filter(e => e.id !== current?.id && e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.kind === kind ? -1 : 1) - (b.kind === kind ? -1 : 1) || a.name.localeCompare(b.name));
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(44,36,24,0.3)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '16px 20px calc(28px + var(--safe-bottom))', maxHeight: '82%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Swap {current?.name || 'exercise'}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 12 }}>Just for this session — history stays with each exercise.</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises…" autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.cardCream, fontFamily: T.fontSans, fontSize: 15, color: T.ink, outline: 'none', marginBottom: 10 }} />
        <div className="intent-scroll" style={{ overflowY: 'auto', flex: 1 }}>
          {list.map(ex => (
            <button key={ex.id} onClick={() => onPick(ex)} style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 13px', marginBottom: 6, cursor: 'pointer', textAlign: 'left',
              background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 10,
            }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.ink }}>{ex.name}</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{kindOf(ex.kind).label}</span>
            </button>
          ))}
          {q.trim() && !list.some(e => e.name.toLowerCase() === q.trim().toLowerCase()) && (
            <button onClick={() => onCreate({ name: q.trim(), kind })} style={{
              width: '100%', padding: '11px', marginTop: 2, cursor: 'pointer', textAlign: 'left',
              background: 'transparent', border: `1px dashed ${ACCENT}`, borderRadius: 10,
              fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: ACCENT,
            }}>+ Create "{q.trim()}" ({kindOf(kind).label})</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Section divider in the logger (Warm-up / Working sets).
function SectionHdr({ children }) {
  return (
    <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 8px' }}>{children}</div>
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
      position: 'sticky', bottom: 'calc(96px + var(--safe-bottom))', marginTop: 18, zIndex: 50,
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
