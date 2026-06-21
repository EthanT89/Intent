import type { CapacitorConfig } from '@capacitor/cli';

// ── Intent native shell (Capacitor) ──────────────────────────────────────────
//
// Strategy: "B on A" — a thin native app that loads your live, hosted PWA.
//
//   • By default it loads the live GitHub Pages deploy (DEFAULT_URL below), so
//     the native app is a thin client: push to the repo → Pages rebuilds → the
//     app shows the new version on next launch. No rebuilding or re-signing the
//     native binary to ship updates.
//
//   • Override the target with the INTENT_URL env var (e.g. a custom domain
//     like https://intent.yourdomain.com).
//
//   • Set INTENT_URL="" (empty) to instead bundle the local `dist/` build, so
//     the app runs fully offline (updates then require a native rebuild).
//
// After changing the target, re-run `npm run native:sync` to bake it in.
//
// Note: localStorage is scoped per origin, so data does NOT carry between the
// bundled origin and a remote URL. Pick one mode and stick with it.

const DEFAULT_URL = 'https://ethant89.github.io/Intent/';
const remoteUrl = process.env.INTENT_URL === undefined
  ? DEFAULT_URL
  : process.env.INTENT_URL.trim();

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
    // Capacitor 8 defaults to Swift Package Manager; we use CocoaPods so the
    // build produces App.xcworkspace (the CI .ipa build expects it) and the
    // capacitor-calendar pod integrates cleanly.
    packageManager: 'CocoaPods',
  },
  android: {
    backgroundColor: '#E8E0D4',
  },
};

export default config;
