// Tiny haptic feedback helper. No-ops where unsupported (desktop, most iOS
// browsers) — purely additive delight on devices that buzz (Android PWA).
const can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptics = {
  tap()     { if (can) navigator.vibrate(8); },
  success() { if (can) navigator.vibrate([0, 18, 40, 24]); },
  done()    { if (can) navigator.vibrate(22); },
};
