import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { KIND_LIST, uid, exerciseHistory, exerciseSummary } from './model.js';
import { timeAgo } from '../../lib/dates.js';
import { BackBar, Labeled, TextInput, PrimaryBtn, ACCENT } from './ui.jsx';

const fmtSets = (sets) => (sets || []).map(s => `${s.weight ? s.weight + '×' : ''}${s.reps ?? ''}`).filter(Boolean).join(', ');

function Stat({ n, unit, l }) {
  return (
    <div style={{ flex: 1, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: '11px 12px' }}>
      <div style={{ fontFamily: T.fontSerif, fontSize: 20, fontWeight: 700, color: T.ink, lineHeight: 1 }}>
        {n}{unit && <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: T.fontSans, fontSize: 10.5, color: T.muted, marginTop: 4 }}>{l}</div>
    </div>
  );
}

// Create or edit a reusable exercise. `exercise` is {} for a new one.
export function ExerciseEditor({ exercise, onClose }) {
  const { saveExercise, deleteExercise, movement } = useApp();
  const isNew = !exercise.id;
  const history = isNew ? [] : exerciseHistory(movement.sessions || [], exercise.id);
  const summary = isNew ? { count: 0 } : exerciseSummary(movement.sessions || [], exercise.id);
  const [name, setName] = React.useState(exercise.name || '');
  const [kind, setKind] = React.useState(exercise.kind || 'strength');
  const [description, setDescription] = React.useState(exercise.description || '');
  const [confirmDel, setConfirmDel] = React.useState(false);

  const save = () => {
    if (!name.trim()) return;
    saveExercise({ id: exercise.id || uid('ex'), name: name.trim(), kind, description: description.trim() });
    onClose();
  };

  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <BackBar label="Movement" onBack={onClose} title={isNew ? 'New exercise' : 'Edit exercise'} />

      <Labeled label="Name">
        <TextInput value={name} onChange={setName} placeholder="e.g. Barbell bench press" />
      </Labeled>

      <Labeled label="Type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {KIND_LIST.map(k => {
            const active = kind === k.id;
            return (
              <button key={k.id} onClick={() => setKind(k.id)} style={{
                padding: '12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${active ? ACCENT : T.border}`,
                background: active ? `${ACCENT}14` : T.card,
                fontFamily: T.fontSans,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{k.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{k.fields.join(' · ')}</div>
              </button>
            );
          })}
        </div>
      </Labeled>

      <Labeled label="Notes (optional)">
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Cues, form notes, anything to remember…"
          style={{
            width: '100%', boxSizing: 'border-box', height: 80, resize: 'none',
            padding: '11px 13px', border: `0.5px solid ${T.border}`, borderRadius: 10,
            background: T.card, fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none', lineHeight: 1.5,
          }} />
      </Labeled>

      {/* History — what you usually do */}
      {!isNew && summary.count > 0 && (
        <div style={{ marginTop: 4, marginBottom: 18 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>History</div>

          {/* glance stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {summary.usualWeight != null && <Stat n={`${summary.usualWeight}`} unit="lb" l="usual" />}
            {summary.bestE1RM > 0 && <Stat n={`${Math.round(summary.bestE1RM)}`} unit="lb" l="best ~1RM" />}
            <Stat n={`${summary.count}`} l="sessions" />
          </div>

          {/* recent sessions */}
          <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {history.slice(0, 12).map((h, i) => (
              <div key={i} style={{ padding: '10px 13px', borderTop: i ? `0.5px solid ${T.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {fmtSets(h.sets) || [h.duration && `${h.duration} min`, h.distance && `${h.distance} mi`].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted, flexShrink: 0 }}>{timeAgo(h.at || h.date)}</span>
                </div>
                {h.note && <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, fontStyle: 'italic', marginTop: 3 }}>"{h.note}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <PrimaryBtn onClick={save} color={ACCENT} disabled={!name.trim()}>
        {isNew ? 'Create exercise' : 'Save changes'}
      </PrimaryBtn>

      {!isNew && (
        <button onClick={() => { if (confirmDel) { deleteExercise(exercise.id); onClose(); } else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); } }}
          style={{ width: '100%', marginTop: 12, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: '#B8453E' }}>
          {confirmDel ? 'Tap again to delete' : 'Delete exercise'}
        </button>
      )}
    </div>
  );
}
