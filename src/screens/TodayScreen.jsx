import React from 'react';
import { T } from '../theme/tokens.js';
import { PILLAR_MAP } from '../pillars/registry.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { greetingForNow, longDate, todayKey } from '../lib/dates.js';
import { MomentumStrip } from '../components/MomentumStrip.jsx';

// The app's namesake: a single editable line of intent for the day. Tap to edit;
// saves on blur. Mirrors the Reflection pillar's morning intent for the same day.
function IntentHeader() {
  const { reflection, setDayIntent } = useApp();
  const saved = (reflection.days || {})[todayKey()]?.intent || '';
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(saved);
  const ref = React.useRef(null);
  React.useEffect(() => { setText(saved); }, [saved]);
  React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const evening = new Date().getHours() >= 17;

  const commit = () => { setEditing(false); if (text.trim() !== saved) setDayIntent(text.trim()); };

  return (
    <div style={{
      background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 16,
      padding: '14px 16px', marginBottom: 18,
    }}>
      <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, letterSpacing: '0.02em', marginBottom: 6 }}>
        {evening ? 'today’s intent — how did it go?' : 'today’s intent'}
      </div>
      {editing ? (
        <textarea
          ref={ref} value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          placeholder="What matters today?"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            border: 'none', outline: 'none', background: 'transparent',
            fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 16, color: T.ink, lineHeight: 1.5,
          }}
        />
      ) : (
        <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
          {saved ? (
            <div style={{ fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 16, color: T.ink, lineHeight: 1.5 }}>"{saved}"</div>
          ) : (
            <div style={{ fontFamily: T.fontSerif, fontStyle: 'italic', fontSize: 16, color: T.muted, lineHeight: 1.5 }}>
              {evening ? 'Set one for tomorrow…' : 'What matters today?'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GearIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" stroke={color} strokeWidth="1.7"/>
      <path d="M19.4 13a7.7 7.7 0 000-2l2-1.6-2-3.4-2.3.8a7.6 7.6 0 00-1.7-1L15 3h-4l-.4 2.4a7.6 7.6 0 00-1.7 1l-2.3-.8-2 3.4 2 1.6a7.7 7.7 0 000 2l-2 1.6 2 3.4 2.3-.8a7.6 7.6 0 001.7 1L11 21h4l.4-2.4a7.6 7.6 0 001.7-1l2.3.8 2-3.4-2-1.6z"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function TodayScreen() {
  const app = useApp();
  const { settings } = app;
  const { openSettings, navigateToPillar } = useUI();

  const order = settings.pillarOrder;
  const isVisible = (id) => settings.pillarVis[id] !== false;
  const visibleCount = order.filter(isVisible).length;
  const showGreeting = settings.showGreeting !== false;
  const showDate = settings.showDate !== false;

  // Split visible pillars into active vs. done-today (collapsed below) so the
  // screen surfaces what still needs attention.
  const visibleIds = order.filter(isVisible);
  const activeIds = [];
  const doneIds = [];
  visibleIds.forEach(id => {
    const p = PILLAR_MAP[id];
    if (!p || !p.Pill) return;
    const daily = p.getDaily ? p.getDaily(app) : null;
    if (daily && daily.done) doneIds.push(id); else activeIds.push(id);
  });

  return (
    <div style={{ padding: '12px 16px 120px', position: 'relative' }}>
      {/* Gear icon — top-right */}
      <button
        onClick={openSettings}
        aria-label="Settings"
        style={{
          position: 'absolute', top: 8, right: 12, zIndex: 10,
          width: 36, height: 36, borderRadius: '50%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <GearIcon color={T.muted} />
      </button>

      {/* Greeting — tappable */}
      {showGreeting && (
        <button
          onClick={openSettings}
          style={{
            display: 'block', textAlign: 'left',
            background: 'none', border: 'none', padding: 0, margin: 0,
            cursor: 'pointer',
            marginBottom: showDate ? 4 : 22, paddingTop: 4,
          }}
        >
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 2 }}>
            {greetingForNow()}
          </div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 28, fontWeight: 600, color: T.ink, lineHeight: 1.15 }}>
            {settings.userName}.
          </div>
        </button>
      )}
      {showDate && (
        <div style={{
          fontFamily: T.fontSans, fontSize: 12, color: T.muted,
          marginBottom: 22,
          marginTop: showGreeting ? 0 : 4,
        }}>{longDate()}</div>
      )}

      {/* Today's intent — the app's namesake */}
      {visibleCount > 0 && <IntentHeader />}

      {/* Momentum — your consistency at a glance */}
      {visibleCount > 0 && <MomentumStrip />}

      {/* Active pillars (not yet done today) */}
      {activeIds.map(id => {
        const Pill = PILLAR_MAP[id].Pill;
        return <Pill key={id} />;
      })}

      {/* Done today — collapsed */}
      {doneIds.length > 0 && (
        <div style={{ marginTop: activeIds.length ? 14 : 0 }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, paddingLeft: 4 }}>
            Done today
          </div>
          <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {doneIds.map((id, i) => {
              const p = PILLAR_MAP[id];
              return (
                <button key={id} onClick={() => navigateToPillar(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 14px', background: 'none', cursor: 'pointer', textAlign: 'left',
                  border: 'none', borderTop: i ? `0.5px solid ${T.border}` : 'none',
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ flex: 1, fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.ink }}>{p.label}</span>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke={T.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state if everything is hidden */}
      {visibleCount === 0 && (
        <div style={{
          marginTop: 60, textAlign: 'center',
          padding: '40px 24px',
        }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600,
            color: T.ink, marginBottom: 8,
          }}>A clean slate.</div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.6,
            marginBottom: 20,
          }}>You've hidden every pillar. Turn some back on in Settings.</div>
          <button
            onClick={openSettings}
            style={{
              background: T.ink, color: '#FAF7F2',
              border: 'none', borderRadius: 12,
              padding: '12px 24px', cursor: 'pointer',
              fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
            }}
          >Open Settings</button>
        </div>
      )}
    </div>
  );
}
