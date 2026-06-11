import React from 'react';
import { T } from '../theme/tokens.js';
import { PILLAR_MAP } from '../pillars/registry.js';
import { useApp } from '../store/AppStateContext.jsx';
import { useUI } from '../store/uiContext.js';
import { greetingForNow, longDate } from '../lib/dates.js';

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
  const { settings } = useApp();
  const { openSettings } = useUI();

  const order = settings.pillarOrder;
  const isVisible = (id) => settings.pillarVis[id] !== false;
  const visibleCount = order.filter(isVisible).length;
  const showGreeting = settings.showGreeting !== false;
  const showDate = settings.showDate !== false;

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

      {/* Pillars in user-defined order, filtered by visibility */}
      {order.map(id => {
        if (!isVisible(id)) return null;
        const pillar = PILLAR_MAP[id];
        if (!pillar || !pillar.Pill) return null;
        const Pill = pillar.Pill;
        return <Pill key={id} />;
      })}

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
