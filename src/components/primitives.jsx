import React from 'react';
import { createPortal } from 'react-dom';
import { T } from '../theme/tokens.js';

// Shared design primitives — ported 1:1 from the design prototype
// (intent-components.jsx). Every card on Today is a <PillarPill>.

// ─── Category label ──────────────────────────────────────────────────────────
export function CategoryLabel({ children }) {
  return (
    <div style={{
      fontFamily: T.fontSans, fontSize: 11, fontWeight: 500,
      color: T.muted, letterSpacing: '0.02em', marginBottom: 10,
    }}>{children}</div>
  );
}

// ─── Glyph anchor ────────────────────────────────────────────────────────────
export function Glyph({ color, small = false }) {
  const w = small ? 44 : 52;
  const h = small ? 64 : 76;
  return (
    <div style={{
      width: w, height: h, borderRadius: 6, background: color,
      boxShadow: '2px 2px 8px rgba(44,36,24,0.15)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: 0, right: 0,
        height: 1, background: 'rgba(255,255,255,0.18)',
      }} />
    </div>
  );
}

// ─── Mini glyph (for stats rows) ─────────────────────────────────────────────
export function MiniGlyph({ color }) {
  return (
    <div style={{
      width: 28, height: 40, borderRadius: 4, background: color,
      flexShrink: 0, position: 'relative', overflow: 'hidden',
      boxShadow: '1px 1px 4px rgba(44,36,24,0.12)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
      }} />
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = undefined, height = 3, style = {} }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: 999,
      background: T.border, overflow: 'hidden', ...style,
    }}>
      <div style={{
        width: `${Math.min(100, pct)}%`, height: '100%',
        borderRadius: 999, background: color || T.amber,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

// ─── Pillar pill wrapper (all homescreen cards) ──────────────────────────────
// onNavigate: called when tapping anywhere except action buttons inside
export function PillarPill({ children, onNavigate, cream = false, style = {} }) {
  return (
    <div
      onClick={onNavigate}
      className={onNavigate ? 'pressable' : undefined}
      style={{
        background: cream ? T.cardCream : T.card,
        border: `0.5px solid ${T.border}`,
        borderRadius: 20, padding: 20,
        marginBottom: 12, position: 'relative',
        cursor: onNavigate ? 'pointer' : 'default',
        ...style,
      }}
    >
      {onNavigate && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          color: T.muted, lineHeight: 1,
          pointerEvents: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke={T.muted} strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
export function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'today',    label: 'Today',    icon: TabIconToday },
    { id: 'calendar', label: 'Calendar', icon: TabIconCalendar },
    { id: 'stats',    label: 'Stats',    icon: TabIconStats },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(24px + var(--safe-bottom))',
      left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 999, padding: '10px 26px',
      display: 'flex', gap: 30,
      boxShadow: '0 4px 24px rgba(44,36,24,0.12), 0 0 0 0.5px rgba(234,224,212,0.8)',
      zIndex: 100,
    }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <Icon color={isActive ? T.amber : T.muted} />
            <span style={{
              fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
              color: isActive ? T.amber : T.muted,
            }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TabIconToday({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth="1.8"/>
      <path d="M7 2v4M15 2v4M2 9h18" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="6" y="12" width="3" height="3" rx="1" fill={color}/>
      <rect x="13" y="12" width="3" height="3" rx="1" fill={color}/>
    </svg>
  );
}
export function TabIconPhases({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h16M3 9h12M3 13h14M3 17h10"
        stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
export function TabIconCalendar({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="4" width="16" height="15" rx="2.5" stroke={color} strokeWidth="1.8"/>
      <path d="M3 8h16M7 2.5v3M15 2.5v3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="12.5" r="1.3" fill={color}/>
      <circle cx="13.5" cy="12.5" r="1.3" fill={color}/>
    </svg>
  );
}
export function TabIconStats({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 17V9M8 17V5M13 17V11M18 17V7"
        stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Bottom sheet modal ──────────────────────────────────────────────────────
export function BottomSheet({ open, onClose, children }) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!mounted) return null;
  // Portal to the app frame so the sheet always covers the full screen,
  // regardless of where in the tree it was opened from.
  const frame = document.getElementById('app-frame');
  const sheet = (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: `rgba(44,36,24,${visible ? 0.28 : 0})`,
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: T.card,
          borderRadius: '20px 20px 0 0',
          padding: '12px 20px calc(40px + var(--safe-bottom))',
          maxHeight: '92%', overflowY: 'auto',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
        className="intent-scroll"
      >
        <div style={{
          width: 36, height: 4, borderRadius: 999,
          background: T.border, margin: '0 auto 20px',
        }} />
        {children}
      </div>
    </div>
  );
  return frame ? createPortal(sheet, frame) : sheet;
}

// ─── Section back header ─────────────────────────────────────────────────────
export function SectionHeader({ title, accentColor, onBack, backLabel = 'Today' }) {
  return (
    <div style={{ paddingTop: 8, paddingBottom: 4 }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 14,
          color: accentColor || T.muted,
          marginBottom: 10, padding: 0,
        }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke={accentColor || T.muted}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {backLabel}
        </button>
      )}
      <div style={{
        fontFamily: T.fontSerif, fontSize: 28, fontWeight: 600,
        color: T.ink, marginBottom: 20,
      }}>{title}</div>
    </div>
  );
}

// ─── Group label (inside section pages) ──────────────────────────────────────
export function GroupLabel({ children }) {
  return (
    <div style={{
      fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
      color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
      marginBottom: 8, marginTop: 20,
    }}>{children}</div>
  );
}

// ─── Ghost button ────────────────────────────────────────────────────────────
export function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}
      style={{
        display: 'block', width: '100%',
        background: 'transparent', color: T.ink,
        border: `1.5px solid ${T.ink}`, borderRadius: 12, padding: '12px 0',
        fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
        marginTop: 14, cursor: 'pointer', textAlign: 'center',
      }}
    >{children}</button>
  );
}

// ─── Dark CTA button ─────────────────────────────────────────────────────────
export function DarkButton({ children, onClick, style = {} }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick && onClick(e); }}
      style={{
        display: 'block', width: '100%',
        background: T.ink, color: '#FAF7F2',
        border: 'none', borderRadius: 12, padding: '13px 0',
        fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', textAlign: 'center',
        ...style,
      }}
    >{children}</button>
  );
}

// ─── Star rating ─────────────────────────────────────────────────────────────
export function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path d="M14 3l2.9 8.9H25l-7.4 5.4 2.8 8.7L14 21l-6.4 5 2.8-8.7L3 11.9h8.1z"
              fill={n <= value ? T.amber : T.border}
              stroke={n <= value ? T.amber : T.muted}
              strokeWidth="0.5"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Sparkline bars ──────────────────────────────────────────────────────────
export function Sparkline({ values, color = undefined }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24, marginTop: 6 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${Math.max(15, (v / max) * 100)}%`,
          background: i === values.length - 1 ? (color || T.amber) : T.border,
        }} />
      ))}
    </div>
  );
}

// ─── Bar chart ───────────────────────────────────────────────────────────────
export function BarChart({ data, color = undefined }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0',
            height: `${Math.max(8, (d.value / max) * 68)}px`,
            background: i === data.length - 1 ? (color || T.amber) : T.border,
            transition: 'height 0.4s ease',
          }} />
          <div style={{ fontFamily: T.fontSans, fontSize: 9, color: T.muted }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Day circles ─────────────────────────────────────────────────────────────
export function DayPills({ days, todayIndex = 2 }) {
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
      {days.map((d, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: d.done ? T.ink : 'transparent',
          border: i === todayIndex
            ? `1.5px solid ${T.amber}`
            : d.done ? 'none' : `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.fontSans, fontSize: 10, fontWeight: 500,
          color: d.done ? '#FAF7F2' : i === todayIndex ? T.amber : T.muted,
        }}>{d.label}</div>
      ))}
    </div>
  );
}

// ─── Stub section page ───────────────────────────────────────────────────────
export function StubPage({ title, accentColor, onBack }) {
  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <SectionHeader title={title} accentColor={accentColor} onBack={onBack} />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 60,
      }}>
        <MiniGlyph color={accentColor} />
        <div style={{
          fontFamily: T.fontSans, fontSize: 14, color: T.muted,
          marginTop: 20, textAlign: 'center',
        }}>coming soon</div>
      </div>
    </div>
  );
}

// ─── Pillar stats stub page ──────────────────────────────────────────────────
export function PillarStatStub({ title, accentColor, onBack }) {
  return (
    <div style={{ padding: '10px 16px calc(120px + var(--safe-bottom))' }}>
      <SectionHeader title={title} accentColor={accentColor} onBack={onBack} backLabel="Stats" />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 40,
      }}>
        <MiniGlyph color={accentColor} />
        <div style={{
          fontFamily: T.fontSans, fontSize: 14, color: T.muted,
          marginTop: 20, textAlign: 'center',
        }}>stats coming soon</div>
      </div>
    </div>
  );
}
