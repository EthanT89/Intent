import React from 'react';

// usePointerSort — a small touch-friendly reorder primitive.
//
// Wire a drag handle's onPointerDown to start(index, e); the hook tracks the
// pointer, computes which slot the finger is over (by measuring rendered rows),
// and calls onReorder(from, to) on drop. Returns the live drag state so the list
// can render a lift/placeholder. Uses pointer events so it works on phones.
export function usePointerSort(count, onReorder, getRects) {
  const [drag, setDrag] = React.useState(null); // { from, over, y }
  const dragRef = React.useRef(null);
  dragRef.current = drag;

  React.useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const rects = getRects();
      let over = drag.from;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (!r) continue;
        if (y < r.top + r.height / 2) { over = i; break; }
        over = i;
      }
      setDrag(d => (d ? { ...d, over, y } : d));
      if (e.cancelable) e.preventDefault();
    };
    const up = () => {
      const d = dragRef.current;
      if (d && d.over != null && d.over !== d.from) onReorder(d.from, d.over);
      setDrag(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, getRects, onReorder]);

  const start = (index, e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setDrag({ from: index, over: index, y });
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  };

  return { drag, start };
}

// Immutable array move helper.
export function arrayMove(arr, from, to) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
