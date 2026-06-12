# Intent

A personal life tracker built on **pillars** — deep work, movement, routine, coffee, nourishment, reading (the embedded Libio app), and reflection. Installable on your phone as a PWA; updates flow automatically when you push to GitHub.

Implemented from the Claude Design handoff (`Intent v2.html` + the swipe-back navigation approved in the design chats).

## Run it locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Connect to GitHub + deploy (one-time)

The repo is already initialized with a GitHub Pages deploy workflow. To go live:

```bash
# 1. Create the repo on github.com (public, no README), then:
git remote add origin https://github.com/<you>/Intent.git
git push -u origin main
```

2. On GitHub: **Settings → Pages → Source: "GitHub Actions"**.

Every push to `main` now builds and deploys automatically. The app will be at
`https://<you>.github.io/Intent/`.

> GitHub Pages is free for **public** repos. If you want the repo private,
> either upgrade to GitHub Pro or deploy the `dist/` folder to Vercel/Netlify
> instead (both auto-deploy from GitHub on free tiers).

## Install on your phone

- **iPhone**: open the Pages URL in Safari → Share → **Add to Home Screen**.
- **Android**: open in Chrome → menu → **Install app**.

The app works offline and stores all data on-device (localStorage).

**Updates:** the service worker auto-updates. After you push a change, the
phone picks it up the next time you open the app (close + reopen once if it
doesn't appear immediately).

## Install as a real native app (Capacitor)

If the home-screen PWA feels finicky (iOS especially), there's a real native
app wrapper — a proper icon, no Safari chrome, splash screen — that **loads your
live hosted app**. The shell is a thin client: once it points at your deployed
URL, every `git push` updates the app with no rebuild or re-signing.

This is the **"native shell over your hosted PWA"** setup. Two pieces:

### A. Host it on your own domain (recommended)

Serve the app from a subdomain of your portfolio (e.g. `intent.yourdomain.com`).
The build uses relative paths, so it runs at any URL unchanged.

- Easiest: keep the GitHub Pages deploy, then **repo Settings → Pages → Custom
  domain → `intent.yourdomain.com`**, and add a `CNAME` DNS record at your
  domain pointing there. GitHub provisions HTTPS automatically.
- Or deploy `dist/` anywhere your portfolio already lives (Vercel/Netlify/your
  own server). Any static host works.

A domain you control also makes the iOS "Add to Home Screen" install cleaner —
and it's the URL the native shell will load.

### B. Build the native shell

Prereqs: **Android** needs [Android Studio](https://developer.android.com/studio).
**iOS** needs a Mac with Xcode (the iOS project can only be generated/built on
macOS). The native projects are generated artifacts — not committed — so you
create them locally once:

```bash
npm install

# Point the shell at your hosted app so updates are instant (see A).
# Leave this unset to bundle the local build instead (offline out of the box,
# but updates then need a rebuild).
#   PowerShell:  $env:INTENT_URL = "https://intent.yourdomain.com"
#   bash:        export INTENT_URL="https://intent.yourdomain.com"

npm run native:add:android      # scaffold android/ (run native:add:ios on a Mac)
npm run native:icons            # generate app icons + splash from assets/
npm run native:android          # build web + sync + open in Android Studio
# iOS (on a Mac):  npm run native:ios
```

In Android Studio / Xcode, press **Run** to install on a connected device.

**Getting onto your iPhone without the App Store:** open the generated `ios/`
project in Xcode, plug in your phone, set a Signing Team (a free Apple ID works),
and Run. A free account's build expires after **7 days** (just re-run to renew);
a paid **Apple Developer** account ($99/yr) builds last a year. Android installs
have no such limit — build the APK and install it directly.

**Shipping updates:** because the shell loads your hosted URL, you don't rebuild
the app to ship changes — just `git push`. Only rebuild the native app when you
change `capacitor.config.ts`, the icons, or the `INTENT_URL` it points at (then
`npm run native:sync`).

> Heads up: localStorage is per-origin, so data does **not** carry between the
> bundled build and a remote URL. Pick one mode (remote is recommended) and stay
> on it.

## Architecture — how to change things

```
src/
  App.jsx                 app shell: tabs, navigation, global modals, swipe-back layer
  main.jsx                entry + service-worker registration
  theme/tokens.js         design tokens, THEMES registry, swatch options
  components/primitives.jsx  shared UI (PillarPill, BottomSheet, charts, TabBar…)
  store/
    AppStateContext.jsx   all persisted data slices + actions (useApp hook)
    usePersistentState.js localStorage-backed state
    uiContext.js          navigation/modal actions (useUI hook)
  screens/                Today, Stats, Settings
  pillars/
    registry.js           ← the single list of pillars
    <id>/index.jsx        pillar manifest: { id, label, color, Pill, Section, StatsScreen, getStats }
    <id>/…                pillar components, data, domain logic
  lib/dates.js            date helpers
```

### Add a pillar
1. Create `src/pillars/<id>/index.jsx` exporting a manifest (copy `reflection/` as the minimal template, `coffee/` as the full-featured one).
2. Add its color to `PILLAR_COLORS` in `src/theme/tokens.js`.
3. Register it in `src/pillars/registry.js`.

It automatically appears on Today, in Stats, and in Settings (toggle + drag-reorder). New pillars default to visible; saved order/visibility for existing pillars is preserved.

### Remove a pillar
Delete its line from `registry.js` (or just toggle it off in Settings).

### Add a color theme
Append to `THEMES` in `src/theme/tokens.js`. Swatch choices live in `BG_OPTIONS` / `ACCENT_OPTIONS` in the same file.

### Add a page / API
- New screens: add to `src/screens/` and wire into the resolver in `App.jsx`.
- Data: add a persisted slice in `AppStateContext.jsx` (one `usePersistentState` line) or fetch in the component — nothing else assumes a backend.

### Data
Everything persists in localStorage under `intent.*` keys. Settings → Data → **Export data** downloads a JSON snapshot; **Erase all data** wipes everything back to a clean slate (no sample data — the app starts empty and fills in as you log).

### Icons
- `scripts/make-icons.ps1` regenerates the web/PWA icons in `public/icons/`.
- `scripts/make-native-assets.ps1` regenerates the native icon + splash sources in `assets/` (then `npm run native:icons` fans them into the iOS/Android projects).
