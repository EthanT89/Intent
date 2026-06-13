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

**Already connected and live:** the repo is at
[`EthanT89/Intent`](https://github.com/EthanT89/Intent) and auto-deploys to
GitHub Pages on every push. The app is hosted at:

### 👉 https://ethant89.github.io/Intent/

Every `git push origin main` rebuilds and redeploys it automatically (~1 min).

> GitHub Pages is free for **public** repos. If you ever make the repo private,
> either upgrade to GitHub Pro or deploy the `dist/` folder to Vercel/Netlify
> instead (both auto-deploy from GitHub on free tiers).

## Install on your phone

Open **https://ethant89.github.io/Intent/** on your phone:

- **iPhone**: in Safari → Share → **Add to Home Screen**.
- **Android**: in Chrome → menu → **Install app**.

The app works offline and stores all data on-device (localStorage). For a more
native feel (no browser chrome), see the Capacitor section below. To back that
data up to your own server and sync across devices, see **Cloud backup** below.

## Cloud backup & sync (optional)

By default all data lives only on the device. To automatically back it up to a
server you control (and sync across devices), stand up the tiny reusable store
API — one endpoint that can serve every app you build, namespaced by `app`:

1. Follow [`backend/README.md`](backend/README.md) to deploy `backend/store.js`
   to your portfolio (Vercel `api/store.js`) with a free Upstash Redis DB.
2. Set `VITE_SYNC_URL` + `VITE_SYNC_TOKEN` (see [`.env.example`](.env.example)).

Then **Settings → Backup & sync** shows live status and a manual "Sync now".
Syncing is automatic and debounced; last-write-wins across devices. Leave the
env vars unset and the app stays happily local-only. For quick local testing
without deploying, run `node scripts/dev-sync-server.mjs` and point
`VITE_SYNC_URL` at `http://localhost:8787/api/store`.

**Updates:** the service worker auto-updates. After you push a change, the
phone picks it up the next time you open the app (close + reopen once if it
doesn't appear immediately).

## Install as a real native app (Capacitor)

If the home-screen PWA feels finicky (iOS especially), there's a real native
app wrapper — a proper icon, no Safari chrome, splash screen — that **loads your
live hosted app**. The shell is a thin client: once it points at your deployed
URL, every `git push` updates the app with no rebuild or re-signing.

It's already wired to load the live deploy
(**https://ethant89.github.io/Intent/**) by default, so the native app updates
the instant you push — no rebuild. Build it once:

### Build the native shell

Prereqs: **Android** needs [Android Studio](https://developer.android.com/studio).
**iOS** needs a Mac with Xcode (the iOS project can only be generated/built on
macOS). The native projects are generated artifacts — not committed — so you
create them locally once (`android/` is already generated on this machine):

```bash
npm install
npm run native:add:android      # scaffold android/ (run native:add:ios on a Mac)
npm run native:icons            # generate app icons + splash from assets/
npm run native:android          # build web + sync + open in Android Studio
# iOS (on a Mac):  npm run native:ios
```

**Where it loads from** — by default the live GitHub Pages URL above. To change
it, set `INTENT_URL` before `npm run native:sync`:

```bash
# Custom domain (Option A — e.g. a subdomain of your portfolio):
#   PowerShell:  $env:INTENT_URL = "https://intent.yourdomain.com"
#   bash:        export INTENT_URL="https://intent.yourdomain.com"
# Bundle the local build for offline-first instead (updates need a rebuild):
#   PowerShell:  $env:INTENT_URL = ""
```

To put it on your own domain later: **repo Settings → Pages → Custom domain →
`intent.yourdomain.com`**, add a matching `CNAME` DNS record, then point
`INTENT_URL` at it. The build uses relative paths, so it runs at any URL.

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
