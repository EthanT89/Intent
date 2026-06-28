import React from 'react';
import { T } from '../../theme/tokens.js';
import { useApp } from '../../store/AppStateContext.jsx';
import { kindOf, uid, KIND_LIST, FIELD_META } from './model.js';
import { usePointerSort, arrayMove } from './dnd.js';
import { BackBar, Labeled, TextInput, PrimaryBtn, NumberField, DragHandle, ACCENT } from './ui.jsx';

// Build / edit a workout: name + an ordered list of exercises with target
// sets/reps/weight (etc.). Reorder by dragging the handle. `workout` is {} for new.
export function WorkoutBuilder({ workout, onClose }) {
  const { movement, saveWorkout, deleteWorkout, saveExercise } = useApp();
  const isNew = !workout.id;
  const [name, setName] = React.useState(workout.name || '');
  const [description, setDescription] = React.useState(workout.description || '');
  const [items, setItems] = React.useState(workout.items || []);
  const [picking, setPicking] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  const rowRefs = React.useRef([]);
  const getRects = React.useCallback(() => rowRefs.current.map(el => el?.getBoundingClientRect()), []);
  const { drag, start } = usePointerSort(items.length, (from, to) => setItems(prev => arrayMove(prev, from, to)), getRects);

  const exById = Object.fromEntries((movement.exercises || []).map(e => [e.id, e]));

  const addExercise = (ex) => {
    const k = kindOf(ex.kind);
    const item = { exerciseId: ex.id };
    if (k.fields.includes('sets')) item.sets = 3;
    if (k.fields.includes('reps')) item.reps = 10;
    if (k.fields.includes('weight')) item.weight = 0;
    if (k.fields.includes('duration')) item.duration = 10;
    if (k.fields.includes('distance')) item.distance = 1;
    setItems(prev => [...prev, item]);
    setPicking(false);
  };
  const patchItem = (i, patch) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const save = () => {
    if (!name.trim()) return;
    saveWorkout({ id: workout.id || uid('wk'), name: name.trim(), description: description.trim(), items });
    onClose();
  };

  // Spin off a copy (current form state included) as a starting point for a variant.
  const duplicate = () => {
    saveWorkout({ id: uid('wk'), name: `${name.trim() || 'Workout'} copy`, description: description.trim(), items });
    onClose();
  };

  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <BackBar label="Movement" onBack={onClose} title={isNew ? 'New workout' : 'Edit workout'} />

      <Labeled label="Name">
        <TextInput value={name} onChange={setName} placeholder="e.g. Push day A" />
      </Labeled>
      <Labeled label="Notes (optional)">
        <TextInput value={description} onChange={setDescription} placeholder="Focus, tempo, anything…" />
      </Labeled>

      <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Exercises · drag to reorder
      </div>

      {items.length === 0 && (
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, padding: '14px 0', textAlign: 'center' }}>
          No exercises yet — add some below.
        </div>
      )}

      {items.map((it, i) => {
        const ex = exById[it.exerciseId];
        const k = kindOf(ex?.kind);
        const dragging = drag?.from === i;
        const showInsert = drag && drag.over === i && drag.from !== i;
        return (
          <div key={i} ref={el => (rowRefs.current[i] = el)}>
            {showInsert && <div style={{ height: 2, background: ACCENT, borderRadius: 2, margin: '4px 0' }} />}
            <div style={{
              background: T.card, border: `0.5px solid ${dragging ? ACCENT : T.border}`, borderRadius: 14,
              padding: 12, marginBottom: 8, opacity: dragging ? 0.6 : 1,
              boxShadow: dragging ? '0 6px 18px rgba(44,36,24,0.16)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: k.fields.length ? 10 : 0 }}>
                <DragHandle onPointerDown={(e) => start(i, e)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex ? ex.name : 'Removed exercise'}</div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{k.label}</div>
                </div>
                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
              </div>
              {k.fields.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {k.fields.map(f => (
                    <NumberField key={f} label={FIELD_META[f].label} unit={FIELD_META[f].unit} step={FIELD_META[f].step}
                      value={it[f]} onChange={v => patchItem(i, { [f]: v })} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add exercise */}
      {!picking ? (
        <button onClick={() => setPicking(true)} style={{
          width: '100%', padding: '12px', marginTop: 4, marginBottom: 18, cursor: 'pointer',
          background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 12,
          fontFamily: T.fontSans, fontSize: 14, fontWeight: 600, color: ACCENT,
        }}>+ Add exercise</button>
      ) : (
        <ExercisePicker
          exercises={movement.exercises || []}
          onPick={addExercise}
          onCreate={(ex) => { const created = { id: uid('ex'), ...ex }; saveExercise(created); addExercise(created); }}
          onCancel={() => setPicking(false)}
        />
      )}

      <PrimaryBtn onClick={save} color={ACCENT} style={{ opacity: name.trim() ? 1 : 0.4 }}>
        {isNew ? 'Create workout' : 'Save changes'}
      </PrimaryBtn>

      {!isNew && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={duplicate}
            style={{ flex: 1, padding: '12px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: ACCENT }}>
            Duplicate
          </button>
          <button onClick={() => { if (confirmDel) { deleteWorkout(workout.id); onClose(); } else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); } }}
            style={{ flex: 1, padding: '12px', background: 'none', border: `1px solid ${confirmDel ? '#B8453E' : T.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: '#B8453E' }}>
            {confirmDel ? 'Tap to confirm' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

// Pick an existing exercise or quick-create a new one inline (keeps builder state).
function ExercisePicker({ exercises, onPick, onCreate, onCancel }) {
  const [creating, setCreating] = React.useState(exercises.length === 0);
  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState('strength');

  return (
    <div style={{ background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.ink }}>{creating ? 'New exercise' : 'Add exercise'}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {!creating && (
        <>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 10 }} className="intent-scroll">
            {exercises.map(ex => (
              <button key={ex.id} onClick={() => onPick(ex)} style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', marginBottom: 6, cursor: 'pointer', textAlign: 'left',
                background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10,
              }}>
                <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, fontWeight: 500 }}>{ex.name}</span>
                <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>{kindOf(ex.kind).label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setCreating(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${ACCENT}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: ACCENT }}>+ New exercise</button>
        </>
      )}

      {creating && (
        <>
          <TextInput value={name} onChange={setName} placeholder="Exercise name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
            {KIND_LIST.map(k => (
              <button key={k.id} onClick={() => setKind(k.id)} style={{
                padding: '9px', borderRadius: 9, cursor: 'pointer',
                border: `1px solid ${kind === k.id ? ACCENT : T.border}`,
                background: kind === k.id ? `${ACCENT}14` : T.card,
                fontFamily: T.fontSans, fontSize: 12.5, fontWeight: 600, color: T.ink,
              }}>{k.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {exercises.length > 0 && <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.muted }}>Back</button>}
            <button onClick={() => { if (name.trim()) onCreate({ name: name.trim(), kind, description: '' }); }} style={{ flex: 2, padding: '11px', background: ACCENT, color: '#FAF7F2', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, opacity: name.trim() ? 1 : 0.4 }}>Create & add</button>
          </div>
        </>
      )}
    </div>
  );
}
