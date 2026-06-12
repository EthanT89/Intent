import type { CapacitorConfig } from '@capacitor/cli';

// ── Intent native shell (Capacitor) ──────────────────────────────────────────
//
// Strategy: "B on A" — a thin native app that loads your live, hosted PWA.
//
//   • Set INTENT_URL to your deployed app (e.g. https://intent.yourdomain.com)
//     and the native app becomes a thin client over it. Push to the repo →
//     your host rebuilds → the app shows the new version on next launch. No
//     rebuilding or re-signing the native binary to ship updates.
//
//   • Leave INTENT_URL unset and the app bundles the local `dist/` build, so it
//     runs fully offline out of the box (updates then require a native rebuild).
//
// After changing INTENT_URL, re-run `npm run native:sync` to bake it in.
//
// Note: localStorage is scoped per origin, so data does NOT carry between the
// bundled origin and a remote URL. Pick one mode and stick with it.

const remoteUrl = process.env.INTENT_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.ethanthornberg.intent',
  appName: 'Intent',
  webDir: 'dist',
  backgroundColor: '#E8E0D4',
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          // We host over HTTPS; never allow plaintext.
          cleartext: false,
        },
      }
    : {}),
  ios: {
    contentInset: 'always',
    backgroundColor: '#E8E0D4',
  },
  android: {
    backgroundColor: '#E8E0D4',
  },
};

export default config;
