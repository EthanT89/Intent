import React from 'react';
import { T } from '../../theme/tokens.js';

export const ACCENT = T.pillars.movement;

export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? 'pressable' : undefined} style={{
      background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16,
      padding: 16, marginBottom: 10, cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

export function PrimaryBtn({ children, onClick, color = T.ink, style = {}, disabled = false }) {
  return (
    <button disabled={disabled} onClick={e => { e.stopPropagation(); if (!disabled) onClick && onClick(e); }} style={{
      width: '100%', padding: '13px', background: color, color: '#FAF7F2',
      border: 'none', borderRadius: 12, fontFamily: T.fontSans, fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, ...style,
    }}>{children}</button>
  );
}

export function GhostBtn({ children, onClick, color = T.ink, style = {} }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick && onClick(e); }} style={{
      padding: '10px 14px', background: 'transparent', color,
      border: `1px solid ${T.border}`, borderRadius: 10,
      fontFamily: T.fontSans, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...style,
    }}>{children}</button>
  );
}

export function Labeled({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, ...rest }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} {...rest}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '11px 13px',
        border: `0.5px solid ${T.border}`, borderRadius: 10, background: T.card,
        fontFamily: T.fontSans, fontSize: 14, color: T.ink, outline: 'none',
      }} />
  );
}

// Compact number field with −/+ steppers (touch-friendly).
export function NumberField({ label, value, onChange, step = 1, unit = '', min = 0 }) {
  const v = value === '' || value == null ? '' : Number(value);
  const bump = (dir) => {
    const base = v === '' ? 0 : v;
    const next = Math.max(min, +(base + dir * step).toFixed(2));
    onChange(next);
  };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.muted, marginBottom: 4, textAlign: 'center' }}>{label}{unit ? ` (${unit})` : ''}</div>}
      <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', background: T.card }}>
        <button aria-label={`Decrease${label ? ' ' + label.toLowerCase() : ''}`} onClick={() => bump(-1)} style={stepBtn}>−</button>
        <input
          type="number" inputMode="decimal" value={v}
          onFocus={e => e.target.select()}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', textAlign: 'center', background: 'transparent', fontFamily: T.fontSans, fontSize: 15, fontWeight: 600, color: T.ink, padding: '9px 0' }}
        />
        <button aria-label={`Increase${label ? ' ' + label.toLowerCase() : ''}`} onClick={() => bump(1)} style={stepBtn}>+</button>
      </div>
    </div>
  );
}
const stepBtn = {
  width: 42, flexShrink: 0, alignSelf: 'stretch', border: 'none', background: 'transparent',
  fontFamily: T.fontSans, fontSize: 18, color: T.muted, cursor: 'pointer', lineHeight: 1,
};

export function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: T.cardCream, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 18 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: active ? T.card : 'transparent',
            boxShadow: active ? '0 1px 4px rgba(44,36,24,0.1)' : 'none',
            fontFamily: T.fontSans, fontSize: 12.5, fontWeight: 600,
            color: active ? T.ink : T.muted,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

export function Chip({ children, color = ACCENT, onRemove, onClick, style = {} }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `${color}1A`, color: T.ink, border: `0.5px solid ${color}55`,
      borderRadius: 999, padding: '6px 10px', fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {children}
      {onRemove && (
        <button aria-label="Remove" onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 14, lineHeight: 1, padding: '4px 6px', margin: '-4px -6px -4px 0' }}>×</button>
      )}
    </span>
  );
}

export function EmptyHint({ title, body, cta, onCta }) {
  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: '32px 22px', textAlign: 'center' }}>
      <div style={{ fontFamily: T.fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: cta ? 18 : 0 }}>{body}</div>
      {cta && <PrimaryBtn onClick={onCta} color={ACCENT} style={{ width: 'auto', display: 'inline-block', padding: '11px 22px' }}>{cta}</PrimaryBtn>}
    </div>
  );
}

export function DragHandle(props) {
  return (
    <span {...props} style={{ cursor: 'grab', touchAction: 'none', padding: '4px 2px', color: T.muted, flexShrink: 0, display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 16, height: 1.6, background: 'currentColor', borderRadius: 2, display: 'block' }} />)}
    </span>
  );
}

export function BackBar({ label, onBack, title, right }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
        cursor: 'pointer', fontFamily: T.fontSans, fontSize: 13, color: ACCENT, padding: 0, marginBottom: 10,
      }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {label}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h1 style={{ fontFamily: T.fontSerif, fontSize: 26, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{title}</h1>
        {right}
      </div>
    </div>
  );
}
