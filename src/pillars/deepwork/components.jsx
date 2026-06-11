import React from 'react';
import { T } from '../../theme/tokens.js';
import {
  PillarPill, CategoryLabel, Glyph, ProgressBar, DarkButton,
  BottomSheet, StarRating, SectionHeader, GroupLabel,
} from '../../components/primitives.jsx';
import { useApp } from '../../store/AppStateContext.jsx';
import { useUI } from '../../store/uiContext.js';

// Sample phase content — swap for real phase tracking when the pillar grows up.
const CURRENT_PHASE = { title: 'Phase 4 — shadow mapping', project: 'Software renderer' };

function useElapsedMinutes(startedAt) {
  const calc = () => startedAt ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)) : 0;
  const [mins, setMins] = React.useState(calc);
  React.useEffect(() => {
    setMins(calc());
    if (!startedAt) return;
    const id = setInterval(() => setMins(calc()), 30000);
    return () => clearInterval(id);
  }, [startedAt]);
  return mins;
}

// ─── Deep Work pill (3 states) ────────────────────────────────────────────────
export function DeepWorkPill() {
  const { deepwork, startSession, endSession } = useApp();
  const { navigateToPillar } = useUI();
  const [sessionModal, setSessionModal] = React.useState(false);
  const elapsed = useElapsedMinutes(deepwork.startedAt);
  const onNavigate = () => navigateToPillar('deepwork');

  if (deepwork.state === 'idle') {
    return (
      <PillarPill onNavigate={onNavigate}>
        <CategoryLabel>deep work</CategoryLabel>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Glyph color={T.pillars.deepwork} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
              color: T.ink, marginBottom: 6, lineHeight: 1.3,
            }}>Ready when you are.</div>
            <div style={{
              fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 14,
            }}>No session started today.</div>
            <DarkButton onClick={startSession}>Start session</DarkButton>
          </div>
        </div>
      </PillarPill>
    );
  }

  if (deepwork.state === 'active') {
    const startLabel = deepwork.startedAt
      ? new Date(deepwork.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
      : '';
    return (
      <PillarPill onNavigate={onNavigate}>
        <CategoryLabel>active session</CategoryLabel>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Glyph color={T.pillars.deepwork} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600,
              color: T.ink, lineHeight: 1.3, marginBottom: 3,
            }}>{CURRENT_PHASE.title}</div>
            <div style={{
              fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginBottom: 10,
            }}>{CURRENT_PHASE.project} · {elapsed} min in</div>
            <ProgressBar pct={Math.min(95, (elapsed / 90) * 100)} style={{ marginBottom: 8 }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginBottom: 14,
            }}>
              <span>{elapsed} min in</span>
              <span>{startLabel} — now</span>
            </div>
            <DarkButton onClick={() => setSessionModal(true)}>End session</DarkButton>
          </div>
        </div>
        <LogSessionModal
          open={sessionModal}
          minutes={elapsed}
          onClose={() => setSessionModal(false)}
          onSave={(s) => { setSessionModal(false); endSession(s); }}
        />
      </PillarPill>
    );
  }

  // done — collapsed
  const minutes = deepwork.lastSession ? deepwork.lastSession.minutes : 0;
  return (
    <PillarPill onNavigate={onNavigate}>
      <CategoryLabel>today's session</CategoryLabel>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600,
          color: T.ink,
        }}>{CURRENT_PHASE.title} · {minutes} min</div>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${T.pillars.deepwork}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginLeft: 10,
        }}>
          <svg width="12" height="10" viewBox="0 0 12 10">
            <path d="M1 5l3.5 3.5L11 1" stroke={T.pillars.deepwork}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </PillarPill>
  );
}

// ─── Log Session modal ────────────────────────────────────────────────────────
export function LogSessionModal({ open, onClose, onSave, minutes }) {
  const [quality, setQuality] = React.useState(4);
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    if (open) { setQuality(4); setNotes(''); }
  }, [open]);
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>
          Log this session
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 22, color: T.muted, lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>
      <div style={{
        background: T.cardCream, borderRadius: 12, padding: '12px 14px',
        marginBottom: 18, border: `0.5px solid ${T.border}`,
      }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 4 }}>
          active session
        </div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>
          {CURRENT_PHASE.title}
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.fontSans, fontSize: 14, color: T.ink, marginBottom: 20,
      }}>
        <span style={{ color: T.muted }}>Date</span>
        <span style={{ fontWeight: 500 }}>{dateStr}</span>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 56, fontWeight: 600, color: T.ink, lineHeight: 1 }}>{minutes}</div>
        <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, marginTop: 4 }}>minutes</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 6 }}>
          what did you actually do?
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Got the perspective matrix working, started on the depth buffer…"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `0.5px solid ${T.border}`, borderRadius: 10,
            padding: '10px 12px', resize: 'none',
            fontFamily: T.fontSans, fontSize: 14, color: T.ink,
            background: T.card, height: 80, lineHeight: 1.5, outline: 'none',
          }}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 10, textAlign: 'center' }}>
          session quality
        </div>
        <StarRating value={quality} onChange={setQuality} />
      </div>
      <DarkButton onClick={() => onSave({ minutes, notes, quality })}>Done for today</DarkButton>
    </BottomSheet>
  );
}

// ─── Deep Work section (also the Phases tab body) ────────────────────────────
export function DeepWorkSection({ onBack }) {
  const { deepwork } = useApp();
  const accentColor = T.pillars.deepwork;
  const elapsed = useElapsedMinutes(deepwork.startedAt);

  const phases = [
    { title: 'Software renderer', concepts: 18, hours: 47.3, started: 'Apr 12', active: true },
    { title: 'Roblox prep', concepts: 6, hours: 12.1, started: 'Mar 28', active: true },
    { title: 'Spring quarter 2026', concepts: 12, hours: 32.8, started: 'Feb 14', active: false },
  ];

  const recentSessions = [
    { concept: 'Phase 4 — shadow mapping', duration: '47 min', date: 'Today' },
    { concept: 'Phase 4 — shadow mapping', duration: '62 min', date: 'Yesterday' },
    { concept: 'Roblox prep', duration: '38 min', date: 'May 1' },
    { concept: 'Phase 4 — shadow mapping', duration: '55 min', date: 'Apr 30' },
    { concept: 'Roblox prep', duration: '44 min', date: 'Apr 29' },
  ];

  return (
    <div style={{ padding: '10px 16px 120px' }}>
      <SectionHeader title="Deep work" accentColor={accentColor} onBack={onBack} />

      {/* Active session status */}
      {deepwork.state === 'active' && (
        <div style={{
          background: `${accentColor}12`, border: `0.5px solid ${accentColor}40`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: accentColor, marginBottom: 4 }}>
            active session
          </div>
          <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
            {CURRENT_PHASE.title}
          </div>
          <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>{elapsed} min · in progress</div>
        </div>
      )}

      {/* Phases */}
      <GroupLabel>Phases</GroupLabel>
      {phases.map((p, i) => (
        <div key={i} style={{
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 16, padding: '16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        }}>
          <div style={{
            width: 4, height: 36, borderRadius: 999,
            background: p.active ? accentColor : T.border, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink, flex: 1, minWidth: 0 }}>
                {p.title}
              </div>
              {p.active && (
                <span style={{
                  fontFamily: T.fontSans, fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 999,
                  background: `${accentColor}20`, color: accentColor,
                  flexShrink: 0,
                }}>active</span>
              )}
            </div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
              {p.concepts} concepts · {p.hours} hrs · since {p.started}
            </div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M1 1l6 6-6 6" stroke={T.muted} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ))}

      {/* Recent sessions */}
      <GroupLabel>Recent sessions</GroupLabel>
      {recentSessions.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: i < recentSessions.length - 1 ? `0.5px solid ${T.border}` : 'none',
        }}>
          <div>
            <div style={{ fontFamily: T.fontSans, fontSize: 14, color: T.ink, marginBottom: 2 }}>
              {s.concept}
            </div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>{s.date}</div>
          </div>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 15, fontWeight: 600, color: T.ink,
          }}>{s.duration}</div>
        </div>
      ))}
    </div>
  );
}
