import React from 'react';
import { T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, DarkButton, BottomSheet, StarRating,
  SectionHeader, ProgressBar,
} from '../../components/primitives.jsx';
import { useApp } from '../../store/AppStateContext.jsx';
import { useUI } from '../../store/uiContext.js';
import { isToday, isThisMonth, timeAgo } from '../../lib/dates.js';

// ─── Helper: render stars ─────────────────────────────────────────────────────
export function Stars({ rating, size = 12, color }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: color || T.pillars.coffee }}>
      {'★'.repeat(rating)}<span style={{ color: T.border }}>{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

// ─── Today pill — minimal ─────────────────────────────────────────────────────
export function CoffeePill() {
  const { coffee } = useApp();
  const { navigateToPillar, openPullModal } = useUI();
  const pulls = coffee.pulls;
  const todayPulls = pulls.filter(p => isToday(p.at));
  const lastPull = pulls[0];

  return (
    <PillarPill onNavigate={() => navigateToPillar('coffee')}>
      <CategoryLabel>coffee</CategoryLabel>
      <div style={{ paddingRight: 16 }}>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
          color: T.ink, marginBottom: 8, lineHeight: 1.3,
        }}>
          {todayPulls.length === 0
            ? 'No pulls yet today.'
            : `${todayPulls.length} pull${todayPulls.length === 1 ? '' : 's'} today.`
          }
        </div>

        {lastPull && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          }}>
            <Stars rating={lastPull.rating} size={11} />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>{lastPull.recipeName.split(' — ')[0].split(' espresso')[0]}</span>
            <span style={{ flexShrink: 0 }}>{timeAgo(lastPull.at)}</span>
          </div>
        )}

        <DarkButton onClick={() => openPullModal()}>Log a pull</DarkButton>
      </div>
    </PillarPill>
  );
}

// ─── Section page — concise lists, tap to drill ───────────────────────────────
export function CoffeeSection({ onBack }) {
  const { coffee } = useApp();
  const { openPullModal, openRecipeModal, viewRecipe } = useUI();
  const accentColor = T.pillars.coffee;
  const { pulls, recipes } = coffee;
  const visiblePulls = pulls.slice(0, 4);

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Coffee" accentColor={accentColor} onBack={onBack} />

      <DarkButton onClick={() => openPullModal()} style={{ marginBottom: 28 }}>Log a pull</DarkButton>

      {/* Recipes */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, marginTop: 8,
      }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>Recipes</div>
        <button onClick={() => openRecipeModal()} style={{
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
          color: accentColor, background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}>+ New</button>
      </div>

      {recipes.length === 0 && (
        <div style={{
          fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          padding: '14px 0', textAlign: 'center',
        }}>No recipes yet — tap "+ New" to dial in your first one.</div>
      )}
      {recipes.map((r, i) => (
        <button key={r.id} onClick={() => viewRecipe(r)} style={{
          display: 'flex', width: '100%', alignItems: 'center',
          padding: '14px 0',
          background: 'none', border: 'none',
          borderBottom: i < recipes.length - 1 ? `0.5px solid ${T.border}` : 'none',
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink,
              marginBottom: 2,
            }}>{r.name}</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
              {r.method}
            </div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 1l6 6-6 6" stroke={T.muted} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ))}

      {/* Recent pulls */}
      <div style={{
        fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
        color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
        marginBottom: 10, marginTop: 28,
      }}>Recent pulls</div>

      {visiblePulls.length === 0 && (
        <div style={{
          fontFamily: T.fontSans, fontSize: 13, color: T.muted,
          padding: '14px 0', textAlign: 'center',
        }}>Nothing logged yet.</div>
      )}
      {visiblePulls.map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 0',
          borderBottom: i < visiblePulls.length - 1 ? `0.5px solid ${T.border}` : 'none',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 14, fontWeight: 600, color: T.ink,
              marginBottom: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.recipeName}</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
              {p.dose} · {p.time}
            </div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
            flexShrink: 0, marginLeft: 12,
          }}>
            <Stars rating={p.rating} size={11} />
            <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
              {timeAgo(p.at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Log Pull Modal ───────────────────────────────────────────────────────────
export function LogPullModal({ open, onClose, recipes, onSave, prefillRecipe }) {
  const [recipeId, setRecipeId] = React.useState(null);
  const [dose, setDose] = React.useState('');
  const [yieldOut, setYieldOut] = React.useState('');
  const [time, setTime] = React.useState('');
  const [rating, setRating] = React.useState(4);
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setRecipeId(prefillRecipe ? prefillRecipe.id : (recipes[0]?.id || null));
      setDose(''); setYieldOut(''); setTime('');
      setRating(4); setNotes('');
    }
  }, [open, prefillRecipe]);

  const selectedRecipe = recipes.find(r => r.id === recipeId);

  const handleSave = () => {
    onSave({
      recipeName: selectedRecipe ? selectedRecipe.name : 'Freestyle',
      method: selectedRecipe ? selectedRecipe.method : 'Espresso',
      dose: dose && yieldOut ? `${dose} g → ${yieldOut} g` : (dose ? `${dose} g` : '—'),
      time: time || '—',
      rating, notes,
    });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>
          Log a pull
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 22, color: T.muted,
          lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>

      {/* Recipe chips */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
          color: T.muted, marginBottom: 6,
        }}>recipe</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recipes.map(r => (
            <button key={r.id} onClick={() => setRecipeId(r.id)} style={{
              padding: '7px 12px', borderRadius: 999,
              border: 'none', cursor: 'pointer',
              background: recipeId === r.id ? T.ink : `${T.border}90`,
              color: recipeId === r.id ? '#FAF7F2' : T.ink,
              fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            }}>{r.name.split(' — ')[0].split(' espresso')[0]}</button>
          ))}
          <button onClick={() => setRecipeId(null)} style={{
            padding: '7px 12px', borderRadius: 999,
            border: 'none', cursor: 'pointer',
            background: recipeId === null ? T.ink : `${T.border}90`,
            color: recipeId === null ? '#FAF7F2' : T.muted,
            fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            fontStyle: 'italic',
          }}>Freestyle</button>
        </div>
      </div>

      {/* Dose / Yield / Time */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { label: 'dose (g)', value: dose, set: setDose, ph: '18' },
          { label: 'yield (g)', value: yieldOut, set: setYieldOut, ph: '42' },
          { label: 'time', value: time, set: setTime, ph: '27s' },
        ].map((f, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
              color: T.muted, marginBottom: 4,
            }}>{f.label}</div>
            <input
              type="text"
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.ph}
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: `0.5px solid ${T.border}`,
                background: T.card, fontFamily: T.fontSerif, fontSize: 18,
                fontWeight: 600, color: T.ink, textAlign: 'center',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
          color: T.muted, marginBottom: 6,
        }}>notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Tasted right in the pocket. Maybe 1 click finer next time…"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `0.5px solid ${T.border}`, borderRadius: 10,
            padding: '10px 12px', resize: 'none',
            fontFamily: T.fontSans, fontSize: 14, color: T.ink,
            background: T.card, height: 64, lineHeight: 1.5, outline: 'none',
          }}
        />
      </div>

      {/* Rating */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
          color: T.muted, marginBottom: 10, textAlign: 'center',
        }}>how was it?</div>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <DarkButton onClick={handleSave}>Save pull</DarkButton>
    </BottomSheet>
  );
}

// ─── Recipe Detail Modal ──────────────────────────────────────────────────────
export function RecipeDetailModal({ recipe, onClose, onLogFromHere }) {
  if (!recipe) return null;
  const accentColor = T.pillars.coffee;

  return (
    <BottomSheet open={!!recipe} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
            color: accentColor, textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: 4,
          }}>{recipe.method}</div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>
            {recipe.name}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 22, color: T.muted,
          lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>

      {/* Ingredients */}
      <div style={{ marginTop: 20 }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
          color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>Ingredients</div>
        {recipe.ingredients.map((ing, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '10px 0',
            borderBottom: i < recipe.ingredients.length - 1 ? `0.5px solid ${T.border}` : 'none',
          }}>
            <div style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink }}>
              {ing.name}
            </div>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink,
            }}>
              {ing.amount} <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>{ing.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Parameters */}
      {recipe.params && recipe.params.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
            color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>Parameters</div>
          {recipe.params.map((p, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              fontFamily: T.fontSans, fontSize: 13,
            }}>
              <span style={{ color: T.muted }}>{p.label}</span>
              <span style={{ color: T.ink, fontWeight: 500 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div style={{
          background: T.cardCream, border: `0.5px solid ${T.border}`,
          borderRadius: 12, padding: '12px 14px', marginTop: 18,
        }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 14, color: T.ink,
            fontStyle: 'italic', lineHeight: 1.5,
          }}>"{recipe.notes}"</div>
        </div>
      )}

      <DarkButton onClick={() => { onClose(); onLogFromHere(recipe); }} style={{ marginTop: 20 }}>
        Brew this
      </DarkButton>
    </BottomSheet>
  );
}

// ─── Add Recipe Modal — variable ingredients ──────────────────────────────────
export function AddRecipeModal({ open, onClose, onSave }) {
  const [name, setName] = React.useState('');
  const [method, setMethod] = React.useState('Espresso');
  const [ingredients, setIngredients] = React.useState([
    { name: '', amount: '', unit: 'g' },
    { name: '', amount: '', unit: 'g' },
  ]);
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(''); setMethod('Espresso');
      setIngredients([
        { name: '', amount: '', unit: 'g' },
        { name: '', amount: '', unit: 'g' },
      ]);
      setNotes('');
    }
  }, [open]);

  const updateIng = (i, field, val) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  };
  const addIng = () => setIngredients(prev => [...prev, { name: '', amount: '', unit: 'g' }]);
  const removeIng = (i) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), method,
      ingredients: ingredients.filter(i => i.name.trim()),
      params: [], notes: notes.trim(),
    });
    onClose();
  };

  const inputStyle = {
    border: `0.5px solid ${T.border}`, borderRadius: 8,
    padding: '8px 10px', fontFamily: T.fontSans, fontSize: 13,
    background: T.card, color: T.ink, outline: 'none',
    boxSizing: 'border-box',
  };

  const methods = ['Espresso', 'Pour-over', 'Espresso drink', 'French press', 'Moka', 'Aeropress', 'Other'];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>
          New recipe
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 22, color: T.muted,
          lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 6 }}>name</div>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Onyx Monarch espresso"
          style={{ ...inputStyle, width: '100%', fontFamily: T.fontSerif, fontSize: 16, fontWeight: 600 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 6 }}>method</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {methods.map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              padding: '6px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: method === m ? T.ink : `${T.border}90`,
              color: method === m ? '#FAF7F2' : T.muted,
              fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted }}>
            ingredients
          </div>
          <button onClick={addIng} style={{
            fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
            color: T.pillars.coffee, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }}>+ Add ingredient</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text" value={ing.name}
                onChange={e => updateIng(i, 'name', e.target.value)}
                placeholder="Ingredient"
                style={{ ...inputStyle, flex: 2, minWidth: 0 }}
              />
              <input
                type="text" value={ing.amount}
                onChange={e => updateIng(i, 'amount', e.target.value)}
                placeholder="amt"
                style={{ ...inputStyle, width: 56, textAlign: 'center', fontFamily: T.fontSerif, fontWeight: 600 }}
              />
              <input
                type="text" value={ing.unit}
                onChange={e => updateIng(i, 'unit', e.target.value)}
                placeholder="unit"
                style={{ ...inputStyle, width: 48, color: T.muted, textAlign: 'center' }}
              />
              <button onClick={() => removeIng(i)} disabled={ingredients.length === 1} style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'transparent', border: 'none',
                cursor: ingredients.length === 1 ? 'default' : 'pointer',
                color: ingredients.length === 1 ? T.border : T.muted,
                fontSize: 18, lineHeight: 1, flexShrink: 0,
              }}>−</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 6 }}>
          notes (optional)
        </div>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Anything to remember about how to brew it…"
          style={{
            ...inputStyle, width: '100%', resize: 'none', height: 56,
            fontFamily: T.fontSerif, fontStyle: 'italic', lineHeight: 1.5,
          }}
        />
      </div>

      <DarkButton onClick={handleSave}>Save recipe</DarkButton>
    </BottomSheet>
  );
}

// ─── Coffee stats drill-down ──────────────────────────────────────────────────
export function CoffeeStatsScreen({ onBack }) {
  const { coffee } = useApp();
  const accent = T.pillars.coffee;

  const monthPulls = coffee.pulls.filter(p => isThisMonth(p.at));
  const avgRatingAll = coffee.pulls.length
    ? (coffee.pulls.reduce((a, p) => a + (p.rating || 0), 0) / coffee.pulls.length).toFixed(1)
    : '—';

  // Last 7 days pull counts
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = ['S','M','T','W','T','F','S'][d.getDay()];
    const count = coffee.pulls.filter(p => {
      const pd = new Date(p.at);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth() && pd.getDate() === d.getDate();
    }).length;
    weekly.push({ label, count });
  }
  const weekTotal = weekly.reduce((a, b) => a + b.count, 0);
  const maxWeek = Math.max(...weekly.map(d => d.count), 1);

  // Last 14 ratings (oldest → newest)
  const ratingHistory = coffee.pulls.slice(0, 14).map(p => p.rating || 0).reverse();
  while (ratingHistory.length < 2) ratingHistory.unshift(0);

  // Recipe distribution
  const counts = {};
  coffee.pulls.forEach(p => { counts[p.recipeName] = (counts[p.recipeName] || 0) + 1; });
  const total = coffee.pulls.length || 1;
  const byRecipe = Object.entries(counts)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Dial-in: most-pulled espresso recipe
  const topEspresso = byRecipe.find(r => {
    const recipe = coffee.recipes.find(x => x.name === r.name);
    return recipe && recipe.method === 'Espresso';
  });
  const dialPulls = topEspresso ? coffee.pulls.filter(p => p.recipeName === topEspresso.name) : [];
  const parseDose = (s) => {
    const m = /([\d.]+)\s*g\s*(?:→\s*([\d.]+)\s*g)?/.exec(s || '');
    return m ? { dose: parseFloat(m[1]), yieldOut: m[2] ? parseFloat(m[2]) : null } : null;
  };
  const parsed = dialPulls.map(p => parseDose(p.dose)).filter(Boolean);
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const avgDose = avg(parsed.map(p => p.dose));
  const avgYield = avg(parsed.map(p => p.yieldOut).filter(v => v != null));
  const parseTime = (s) => { const m = /^(\d+)s$/.exec(s || ''); return m ? parseInt(m[1]) : null; };
  const times = dialPulls.map(p => parseTime(p.time)).filter(v => v != null);
  const avgTime = avg(times);
  const dialRating = dialPulls.length
    ? (dialPulls.reduce((a, p) => a + (p.rating || 0), 0) / dialPulls.length).toFixed(1) : '—';

  const lastRating = coffee.pulls[0] ? coffee.pulls[0].rating : 0;

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Coffee stats" accentColor={accent} onBack={onBack} backLabel="Stats" />

      {/* Top metric grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginBottom: 14,
      }}>
        {[
          { label: 'Pulls this month', value: String(monthPulls.length), unit: 'pulls' },
          { label: 'This week',        value: String(weekTotal), unit: 'pulls' },
          { label: 'Avg rating',       value: avgRatingAll, unit: '/ 5 ★' },
          { label: 'Avg pull time',    value: times.length ? String(Math.round(avgTime)) : '—', unit: 'sec' },
        ].map((m, i) => (
          <div key={i} style={{
            background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: 16, padding: '14px 14px',
          }}>
            <div style={{
              fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
              color: T.muted, marginBottom: 8, letterSpacing: 0.3,
            }}>{m.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontFamily: T.fontSerif, fontSize: 26, fontWeight: 700,
                color: T.ink, lineHeight: 1,
              }}>{m.value}</span>
              <span style={{ fontSize: 11, color: T.muted }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pulls per day — bar chart */}
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 20, padding: 20, marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase',
          }}>Pulls per day</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
            last 7 days
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 6,
          height: 100,
        }}>
          {weekly.map((d, i) => {
            const isTodayBar = i === weekly.length - 1;
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6, height: '100%',
                justifyContent: 'flex-end',
              }}>
                <div style={{
                  fontFamily: T.fontSerif, fontSize: 11, fontWeight: 600,
                  color: d.count > 0 ? T.ink : T.muted,
                }}>{d.count || ''}</div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: d.count > 0 ? (isTodayBar ? accent : `${accent}55`) : T.border,
                  height: d.count > 0 ? `${(d.count / maxWeek) * 70}px` : '4px',
                  transition: 'height 0.4s ease',
                }} />
                <div style={{
                  fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
                  color: isTodayBar ? accent : T.muted,
                }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating trend — sparkline */}
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 20, padding: 20, marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
            color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase',
          }}>Rating trend</div>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
            last {ratingHistory.length} pulls
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 3, height: 56,
        }}>
          {ratingHistory.map((r, i) => (
            <div key={i} style={{
              flex: 1, height: `${(r / 5) * 100}%`,
              background: i === ratingHistory.length - 1 ? accent : `${accent}40`,
              borderRadius: 2, minHeight: 4,
              transition: 'height 0.4s ease',
            }} />
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 10, fontFamily: T.fontSans, fontSize: 10, color: T.muted,
        }}>
          <span>earlier</span>
          <span style={{ color: T.ink, fontWeight: 600 }}>now · {'★'.repeat(lastRating)}</span>
        </div>
      </div>

      {/* By recipe */}
      <div style={{
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 20, padding: 20, marginBottom: 12,
      }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
          color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase',
          marginBottom: 14,
        }}>By recipe</div>

        {byRecipe.map((r, i) => (
          <div key={i} style={{ marginBottom: i < byRecipe.length - 1 ? 14 : 0 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'baseline', marginBottom: 6,
            }}>
              <span style={{
                fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                color: T.ink, flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingRight: 8,
              }}>{r.name}</span>
              <span style={{
                fontFamily: T.fontSans, fontSize: 12, color: T.muted, flexShrink: 0,
              }}>
                <span style={{ color: T.ink, fontWeight: 600 }}>{r.count}</span> · {r.pct}%
              </span>
            </div>
            <ProgressBar pct={r.pct} color={accent} height={5} />
          </div>
        ))}
      </div>

      {/* Dial-in card */}
      {topEspresso && (
        <div style={{
          background: T.cardCream, border: `0.5px solid ${T.border}`,
          borderRadius: 20, padding: 20,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: 4,
          }}>
            <div style={{
              fontFamily: T.fontSans, fontSize: 12, fontWeight: 500,
              color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase',
            }}>Dial-in</div>
            <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.muted }}>
              {dialPulls.length} pulls
            </div>
          </div>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
            color: T.ink, marginBottom: 16, lineHeight: 1.3,
          }}>{topEspresso.name}</div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 0, marginBottom: 16,
          }}>
            {[
              { label: 'dose',  value: avgDose ? avgDose.toFixed(1) : '—',  unit: 'g' },
              { label: 'yield', value: avgYield ? avgYield.toFixed(1) : '—', unit: 'g' },
              { label: 'time',  value: times.length ? avgTime.toFixed(0) : '—',  unit: 's' },
            ].map((s, i) => (
              <div key={i} style={{
                paddingLeft: i > 0 ? 14 : 0,
                borderLeft: i > 0 ? `0.5px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
                  color: T.muted, marginBottom: 4, letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>avg {s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{
                    fontFamily: T.fontSerif, fontSize: 22, fontWeight: 700,
                    color: T.ink, lineHeight: 1,
                  }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: 12, borderTop: `0.5px solid ${T.border}`,
            fontFamily: T.fontSans, fontSize: 12,
          }}>
            <span style={{ color: T.muted }}>Ratio</span>
            <span style={{ color: T.ink, fontWeight: 600 }}>
              {avgDose && avgYield ? `1 : ${(avgYield / avgDose).toFixed(1)}` : '—'}
            </span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: 8,
            fontFamily: T.fontSans, fontSize: 12,
          }}>
            <span style={{ color: T.muted }}>Avg rating</span>
            <span style={{ color: T.ink, fontWeight: 600 }}>
              {dialRating} <span style={{ color: accent }}>★</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
