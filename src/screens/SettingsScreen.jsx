import React from 'react';
import { T, BG_OPTIONS, ACCENT_OPTIONS } from '../theme/tokens.js';
import { PILLARS } from '../pillars/registry.js';
import { useApp, DEFAULT_SETTINGS } from '../store/AppStateContext.jsx';
import pkg from '../../package.json';

// Settings — full-page and bottom-sheet presentations sharing one content
// body. Pillar rows come from the registry, so new pillars appear here
// automatically with toggle + drag-reorder.

// ─── iOS switch ───────────────────────────────────────────────────────────────
export function IOSSwitch({ checked, onChange, accent }) {
  const color = accent || T.amber;
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: 44, height: 26, borderRadius: 999, position: 'relative',
        background: checked ? color : '#E1D7C8',
        border: 'none', cursor: 'pointer', padding: 0,
        transition: 'background 0.2s ease', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(44,36,24,0.25)',
        transition: 'left 0.2s ease',
      }} />
    </button>
  );
}

function SettingsCard({ children, style = {}, padding = '4px 16px' }) {
  return (
    <div style={{
      background: T.card,
      border: `0.5px solid ${T.border}`,
      borderRadius: 18,
      padding,
      marginBottom: 12,
      ...style,
    }}>{children}</div>
  );
}

function SettingsSectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
      color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 8, marginTop: 18, paddingLeft: 6,
    }}>{children}</div>
  );
}

function SettingRow({ label, hint, children, divider = true, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 0',
        borderBottom: divider ? `0.5px solid ${T.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fontSans, fontSize: 14, fontWeight: 500, color: T.ink,
        }}>{label}</div>
        {hint && (
          <div style={{
            fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 2,
          }}>{hint}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// Cloud sync status + manual trigger. When sync isn't configured (no server
// env), it reads as a quiet "local only" with a pointer to set it up.
function SyncRow({ sync }) {
  const STATUS = {
    disabled:   { dot: '#C2B6A2', text: 'Local only',     hint: 'Cloud backup not set up yet' },
    connecting: { dot: '#C4956A', text: 'Connecting…',    hint: 'Checking your backup' },
    idle:       { dot: '#7A8C7E', text: 'Backed up',      hint: 'Synced to your server' },
    syncing:    { dot: '#C4956A', text: 'Syncing…',       hint: 'Saving changes' },
    synced:     { dot: '#7A8C7E', text: 'Backed up',      hint: 'All changes saved' },
    offline:    { dot: '#C2B6A2', text: 'Offline',        hint: 'Will sync when back online' },
    error:      { dot: '#B8453E', text: 'Sync error',     hint: 'Tap to retry' },
  };
  const s = STATUS[sync?.status] || STATUS.disabled;
  const when = sync?.lastSyncedAt
    ? new Date(sync.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  const enabled = sync?.enabled;
  const hint = enabled && when ? `Last backup ${when}` : s.hint;

  return (
    <SettingRow
      label={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
          {s.text}
        </span>
      }
      hint={hint}
      divider={false}
      onClick={enabled ? () => sync.syncNow() : undefined}
    >
      {enabled ? (
        <span style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, color: T.amber }}>
          {sync.status === 'syncing' ? '…' : 'Sync now'}
        </span>
      ) : null}
    </SettingRow>
  );
}

// Compact −/value/+ stepper for numeric settings.
function Stepper({ value, onChange, min = 0, step = 1 }) {
  const btn = {
    width: 32, height: 32, borderRadius: 9, border: `0.5px solid ${T.border}`,
    background: T.card, cursor: 'pointer', fontFamily: T.fontSans, fontSize: 18,
    color: T.ink, lineHeight: 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(Math.max(min, value - step))} style={btn}>−</button>
      <span style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, minWidth: 28, textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(value + step)} style={btn}>+</button>
    </div>
  );
}

function ColorSwatches({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(c => (
        <button
          key={c}
          onClick={e => { e.stopPropagation(); onChange(c); }}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: c, padding: 0, cursor: 'pointer',
            border: value === c ? `2px solid ${T.ink}` : `0.5px solid ${T.border}`,
            boxShadow: value === c ? '0 0 0 2px #fff inset' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function PillarSwatch({ color }) {
  return (
    <div style={{
      width: 24, height: 32, borderRadius: 4, background: color,
      boxShadow: '1px 1px 4px rgba(44,36,24,0.12)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 60%)',
      }} />
    </div>
  );
}

function DragHandle({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="4" cy="4" r="1.1" fill={color || T.muted}/>
      <circle cx="10" cy="4" r="1.1" fill={color || T.muted}/>
      <circle cx="4" cy="7" r="1.1" fill={color || T.muted}/>
      <circle cx="10" cy="7" r="1.1" fill={color || T.muted}/>
      <circle cx="4" cy="10" r="1.1" fill={color || T.muted}/>
      <circle cx="10" cy="10" r="1.1" fill={color || T.muted}/>
    </svg>
  );
}

// ─── Pillar reorder list — pointer-based drag ────────────────────────────────
function PillarList({ order, visibility, onReorder, onToggleVisibility }) {
  const [drag, setDrag] = React.useState(null);
  const ROW_H = 56;

  const onPointerDown = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      id: order[idx],
      fromIdx: idx,
      currentIdx: idx,
      startY: e.clientY,
      offsetY: 0,
      pointerId: e.pointerId,
    });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const offsetY = e.clientY - drag.startY;
    const shift = Math.round(offsetY / ROW_H);
    const currentIdx = Math.max(0, Math.min(order.length - 1, drag.fromIdx + shift));
    setDrag(prev => prev && { ...prev, offsetY, currentIdx });
  };

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.currentIdx !== drag.fromIdx) {
      const next = [...order];
      next.splice(drag.fromIdx, 1);
      next.splice(drag.currentIdx, 0, drag.id);
      onReorder(next);
    }
    setDrag(null);
  };

  const displayIndex = (idx) => {
    if (!drag) return idx;
    if (idx === drag.fromIdx) return drag.currentIdx;
    if (drag.fromIdx < drag.currentIdx) {
      if (idx > drag.fromIdx && idx <= drag.currentIdx) return idx - 1;
    } else {
      if (idx >= drag.currentIdx && idx < drag.fromIdx) return idx + 1;
    }
    return idx;
  };

  return (
    <div style={{
      position: 'relative',
      height: order.length * ROW_H,
      touchAction: 'none',
    }}>
      {order.map((id, idx) => {
        const meta = PILLARS.find(p => p.id === id);
        if (!meta) return null;
        const isDragging = drag && drag.id === id;
        const dispIdx = displayIndex(idx);
        const top = isDragging ? idx * ROW_H + drag.offsetY : dispIdx * ROW_H;

        return (
          <div
            key={id}
            style={{
              position: 'absolute', left: 0, right: 0,
              top, height: ROW_H,
              transition: isDragging ? 'none' : 'top 0.22s cubic-bezier(0.32,0.72,0,1)',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 4px',
              borderBottom: idx < order.length - 1 ? `0.5px solid ${T.border}` : 'none',
              background: isDragging ? T.cardCream : 'transparent',
              borderRadius: isDragging ? 12 : 0,
              boxShadow: isDragging ? '0 8px 24px rgba(44,36,24,0.18)' : 'none',
              zIndex: isDragging ? 5 : 1,
            }}
          >
            <div
              onPointerDown={(e) => onPointerDown(e, idx)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                padding: '14px 8px 14px 4px',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
            >
              <DragHandle color={isDragging ? T.ink : T.muted} />
            </div>

            <PillarSwatch color={meta.color} />

            <div style={{
              flex: 1, minWidth: 0,
              fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
              color: visibility[id] ? T.ink : T.muted,
            }}>{meta.label}</div>

            <IOSSwitch
              checked={!!visibility[id]}
              onChange={(v) => onToggleVisibility(id, v)}
              accent={meta.color}
            />
          </div>
        );
      })}
    </div>
  );
}

function TextRow({ label, value, onChange, placeholder }) {
  return (
    <SettingRow label={label}>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        onClick={e => e.stopPropagation()}
        style={{
          textAlign: 'right',
          fontFamily: T.fontSans, fontSize: 14, color: T.ink,
          background: 'transparent', border: 'none', outline: 'none',
          width: 140, minWidth: 0,
        }}
      />
    </SettingRow>
  );
}

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke={T.muted} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Settings content (shared between full-page and sheet) ───────────────────
function SettingsContent() {
  const {
    settings, setSetting, patchSettings,
    exportData, eraseAllData, firstUse, sync,
  } = useApp();

  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmErase, setConfirmErase] = React.useState(false);

  const memberSince = new Date(firstUse).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Profile</SettingsSectionLabel>
      <SettingsCard>
        <TextRow
          label="Name"
          value={settings.userName}
          onChange={v => setSetting('userName', v)}
          placeholder="Your name"
        />
        <SettingRow label="Member since" divider={false}>
          <span style={{ fontFamily: T.fontSans, fontSize: 14, color: T.muted }}>
            {memberSince}
          </span>
        </SettingRow>
      </SettingsCard>

      {/* ── Pillars ─────────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Pillars</SettingsSectionLabel>
      <div style={{
        fontFamily: T.fontSans, fontSize: 12, color: T.muted,
        marginBottom: 10, paddingLeft: 6, lineHeight: 1.5,
      }}>
        Drag to reorder how they appear on Today. Toggle off to hide.
      </div>
      <SettingsCard padding="6px 12px">
        <PillarList
          order={settings.pillarOrder}
          visibility={settings.pillarVis}
          onReorder={(next) => setSetting('pillarOrder', next)}
          onToggleVisibility={(id, v) => setSetting('pillarVis', { ...settings.pillarVis, [id]: v })}
        />
      </SettingsCard>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Appearance</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Background" hint="App canvas color">
          <ColorSwatches
            value={settings.bgColor}
            options={BG_OPTIONS}
            onChange={v => setSetting('bgColor', v)}
          />
        </SettingRow>
        <SettingRow label="Accent" hint="Buttons, links, highlights" divider={false}>
          <ColorSwatches
            value={settings.accentColor}
            options={ACCENT_OPTIONS}
            onChange={v => setSetting('accentColor', v)}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Today screen ────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Today screen</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Show greeting" hint={`Good morning, ${settings.userName || 'you'} — etc.`}>
          <IOSSwitch
            checked={settings.showGreeting !== false}
            onChange={v => setSetting('showGreeting', v)}
          />
        </SettingRow>
        <SettingRow label="Show date" hint="Today's date under the greeting" divider={false}>
          <IOSSwitch
            checked={settings.showDate !== false}
            onChange={v => setSetting('showDate', v)}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Goals ───────────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Goals</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Books per year" hint="Your reading target" divider={false}>
          <Stepper
            value={settings.readingGoal ?? 20}
            min={1} step={1}
            onChange={v => setSetting('readingGoal', v)}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Notifications (placeholders until push is wired up) ─────────── */}
      <SettingsSectionLabel>Notifications</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Morning intent" hint="7:30 am — set the day">
          <IOSSwitch
            checked={settings.notifMorning !== false}
            onChange={v => setSetting('notifMorning', v)}
          />
        </SettingRow>
        <SettingRow label="Evening reflection" hint="9:00 pm — close the loop">
          <IOSSwitch
            checked={settings.notifEvening !== false}
            onChange={v => setSetting('notifEvening', v)}
          />
        </SettingRow>
        <SettingRow label="Pillar nudges" hint="Reminders when streaks are at risk" divider={false}>
          <IOSSwitch
            checked={settings.notifNudges === true}
            onChange={v => setSetting('notifNudges', v)}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Presentation ────────────────────────────────────────────────── */}
      <SettingsSectionLabel>This panel</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Open as" hint="How Settings appears" divider={false}>
          <div style={{ display: 'flex', gap: 4, background: T.border, borderRadius: 999, padding: 2 }}>
            {[
              { id: 'page',  label: 'Page' },
              { id: 'sheet', label: 'Sheet' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={e => { e.stopPropagation(); setSetting('settingsPresentation', opt.id); }}
                style={{
                  padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: settings.settingsPresentation === opt.id ? T.card : 'transparent',
                  color: settings.settingsPresentation === opt.id ? T.ink : T.muted,
                  fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                  boxShadow: settings.settingsPresentation === opt.id ? '0 1px 2px rgba(44,36,24,0.1)' : 'none',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </SettingRow>
      </SettingsCard>

      {/* ── Backup & sync ───────────────────────────────────────────────── */}
      <SettingsSectionLabel>Backup &amp; sync</SettingsSectionLabel>
      <SettingsCard>
        <SyncRow sync={sync} />
      </SettingsCard>

      {/* ── Data ────────────────────────────────────────────────────────── */}
      <SettingsSectionLabel>Data</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Export data" hint="Download a JSON copy" onClick={exportData}>
          <Chevron />
        </SettingRow>
        <SettingRow
          label={
            <span style={{ color: confirmReset ? '#B8453E' : T.ink }}>
              {confirmReset ? 'Tap again to confirm' : 'Reset all settings'}
            </span>
          }
          hint={confirmReset ? 'This restores defaults.' : 'Pillars, appearance, toggles'}
          onClick={() => {
            if (confirmReset) {
              patchSettings(DEFAULT_SETTINGS);
              setConfirmReset(false);
            } else {
              setConfirmReset(true);
              setTimeout(() => setConfirmReset(false), 3000);
            }
          }}
        >
          <span style={{
            fontFamily: T.fontSans, fontSize: 13,
            color: confirmReset ? '#B8453E' : T.muted,
          }}>{confirmReset ? '⚠' : ''}</span>
        </SettingRow>
        <SettingRow
          label={
            <span style={{ color: '#B8453E' }}>
              {confirmErase ? 'Tap again — erases everything' : 'Erase all data'}
            </span>
          }
          hint={confirmErase ? 'Pulls, books, routines, settings — gone.' : 'Start completely fresh'}
          divider={false}
          onClick={() => {
            if (confirmErase) {
              eraseAllData();
            } else {
              setConfirmErase(true);
              setTimeout(() => setConfirmErase(false), 3000);
            }
          }}
        >
          <span style={{ fontFamily: T.fontSans, fontSize: 13, color: '#B8453E' }}>
            {confirmErase ? '⚠' : ''}
          </span>
        </SettingRow>
      </SettingsCard>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <SettingsSectionLabel>About</SettingsSectionLabel>
      <SettingsCard>
        <SettingRow label="Version" divider={false}>
          <span style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted }}>
            {pkg.version}
          </span>
        </SettingRow>
      </SettingsCard>

      <div style={{
        fontFamily: T.fontSerif, fontStyle: 'italic',
        fontSize: 12, color: T.muted, textAlign: 'center',
        marginTop: 28, paddingLeft: 20, paddingRight: 20, lineHeight: 1.6,
      }}>
        "We are what we repeatedly do."
      </div>
    </div>
  );
}

// ─── Settings full-page screen ────────────────────────────────────────────────
export function SettingsScreen({ onBack }) {
  return (
    <div style={{ padding: '8px 16px 120px' }}>
      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.fontSans, fontSize: 14,
          color: T.amber,
          marginBottom: 10, padding: 0,
        }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke={T.amber}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Today
        </button>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 28, fontWeight: 600,
          color: T.ink, marginBottom: 12,
        }}>Settings</div>
      </div>

      <SettingsContent />
    </div>
  );
}

// ─── Settings as bottom sheet (tall, ~88% viewport) ──────────────────────────
export function SettingsSheet({ open, onClose }) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const id = setTimeout(() => setMounted(false), 340);
      return () => clearTimeout(id);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 250,
        background: `rgba(44,36,24,${visible ? 0.32 : 0})`,
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', height: '88%', background: T.bg,
          borderRadius: '20px 20px 0 0',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* grab handle */}
        <div style={{ padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 999,
            background: T.border, margin: '0 auto',
          }} />
        </div>

        {/* sheet header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px 12px', flexShrink: 0,
        }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 22, fontWeight: 600, color: T.ink,
          }}>Settings</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
            color: T.amber, padding: 0,
          }}>Done</button>
        </div>

        {/* scrollable body */}
        <div className="intent-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '0 16px 24px',
          WebkitOverflowScrolling: 'touch',
        }}>
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}
