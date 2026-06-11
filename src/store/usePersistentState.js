import { useEffect, useState } from 'react';

// localStorage-backed useState. Every app data slice persists through one of
// these, so everything survives reloads / app restarts on the phone.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch { /* corrupt entry — fall through to initial */ }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full or unavailable — state still works in memory */ }
  }, [key, value]);

  return [value, setValue];
}

export const STORAGE_PREFIX = 'intent.';

export function clearAllAppData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
