# Intent — context for future sessions

This file is auto-loaded each session. Read it first. It's the orientation for
working on **Intent**, Ethan's personal life-tracker PWA.

## What this is, and who it's for

Intent is a **single-user app — it's just for Ethan.** There are no other users,
no accounts, no multi-tenant concerns. Because of that, Ethan has explicitly said
he is **not worried about security or secret exposure** ("nothing to lose"): the
sync token is baked into the client on purpose so things work with zero config.
Don't add auth ceremony or treat the token as sensitive — keep things simple.

The point of the app, in his words: **live with intention.** Concretely that means:

- Make it **as easy as possible to keep persistence/consistency** with what matters.
- **See everything that matters in one calm place.**
- **Designed exactly how he wants it** — he iterates on it constantly.
- **Evolving, with updates flowing to his phone automatically** (push to GitHub → Pages → installed PWA updates).

## How Ethan wants it built

- **Calm, intentional, minimal** aesthetic. Lora (serif) for headings, DM Sans for
  body; parchment palette; muted tones. Match the surrounding code's feel — no loud UI.
- **Modular & expandable.** New features should flow through the existing extension
  points, not bolt on: the **pillar registry** (`src/pillars/registry.js`) and the
  **calendar source registry** (`src/pillars/calendar/sources.js`) are the contracts.
- **Practical, daily-use first.** Think from his perspective as the only user actually
  living with this. Reduce taps, surface what's next, keep the home screen glanceable.
- **High standards, act autonomously.** He often says "find the most impactful things
  and just go for it." Build it, verify it in the preview, commit it. Don't over-ask.
- **Always verify before claiming done.** Use the preview tools to exercise real flows
  (see `<preview_tools>` / the `verify` skill). Report honestly if something's unverified.

## His goals (what the app is in service of)

- **Health & movement** — he wants Claude to help manage his **full workout routine**
  and overall health: workouts/exercises, alternating-week splits (e.g. Legs A/B),
  logging, weigh-ins, PRs/volume trends.
- **Reading** — sustained reading habit; books across shelves, ratings, saved
  quotes/notes, pace + recommendations.
- **Routines & reflection** — morning/nighttime routines, daily intent + evening recap,
  consistency streaks (the momentum engine, `src/lib/momentum.js`).
- **Calendar as the hub** — plan + see everything in one timeline (events, tasks,
  workouts, routines, bills), with reminders.
- **Bills & money-out** — recurring payments incl. day-of-month and variable amounts
  (credit cards), autopay vs manual, paid tracking, reminders.

## Architecture map

- **State:** `src/store/AppStateContext.jsx` — every slice (`settings`, `coffee`,
  `books`, `routines`, `movement`, `reflection`, `calendar`, `bills`, `deepwork`)
  is `usePersistentState` (localStorage) and rides cloud sync. Add a slice here.
- **Pillars:** `src/pillars/<id>/` each export a manifest via `registry.js`
  (`Pill`, `Section`, `StatsScreen`, `getDaily`, `getStats`, `fullScreen`/`FullScreenApp`).
- **Navigation/UI actions:** `src/store/uiContext.js` + the `ui` object in `App.jsx`
  (`navigateToPillar`, `goToTab`, `openSettings`, `openBills`, …).
- **Tabs:** Today · Calendar · Stats (bottom bar in `src/components/primitives.jsx`).
- **Calendar:** `src/pillars/calendar/` (model, sources registry, screen, composer,
  bills, ICS parse/sync). Views: Day (drag/resize), Week, Month, Agenda.
- **Theme tokens:** `src/theme/tokens.js` (`T`, `applyTheme`, palettes).
- **Sync / push / ICS clients:** `src/lib/cloudSync.js`, `src/lib/push.js`,
  `src/lib/icsSync.js`. Sync is **disabled in dev** so the preview never touches
  prod data — seed/test freely in the preview.

## Managing Ethan's live data (he wants this)

Ethan wants Claude to **read and modify his real data** — add/edit workouts,
exercises, routines, books + notes, calendar events, reminders, bills. This works
over the same KV the app syncs to. **Full protocol + data shapes:
[`docs/managing-my-data.md`](docs/managing-my-data.md).** The essentials:

- `GET/PUT https://ethanthornberg.dev/api/store?app=intent&key=state` with
  `Authorization: Bearer <sync token>` (baked into `src/lib/cloudSync.js`).
- **Read-modify-write the whole `data` document** (preserve every slice), PUT back
  `{ data, updatedAt: new Date().toISOString() }`.
- **Clobber caveat (important):** sync is last-write-wins and the *open* app pushes
  its snapshot periodically. An API write made while the app is open gets overwritten.
  **Protocol: Ethan fully closes the app → write → he reopens (it hydrates).** Always
  verify by re-GETting and checking `updatedAt` matches your write.

## Deploy reality (read before promising anything ships)

- **Intent (this repo) auto-deploys** on push to `main` → GitHub Pages
  (`ethant89.github.io/Intent`). Frontend changes ship for real.
- **The backend lives in a SEPARATE repo:** `C:\Users\ethan\Personal\portfolio`
  (Next.js, `EthanT89/portfolio`, Vercel, `ethanthornberg.dev`). It holds
  `/api/store` (sync), `/api/push/*` (Web Push), `/api/ics` (calendar proxy).
  - Its **Vercel git auto-deploy is BROKEN** — pushes create no deployment; the live
    site runs an old commit. Ethan must reconnect Git or manually deploy latest `main`.
  - **Always `npm run build` in portfolio before pushing** — Vercel fails the build on
    ESLint `no-explicit-any` (error, not warning) and on type errors. To build clean
    around Ethan's uncommitted theme WIP: `git stash -u` → build/fix → commit → push →
    `git stash pop`. **Only commit your own files there** (never his WIP).
  - Vercel is **Hobby = once-per-day cron only.** `vercel.json` cron is daily; timely
    reminders need an external pinger (e.g. cron-job.org) hitting `/api/push/send`.

## Working conventions

- Verify UI changes in the preview; don't ask Ethan to test manually.
- Commit when work is done; end commit messages with the Co-Authored-By trailer.
- There's a persistent memory file with deeper running context — but this file is the
  in-repo source of truth Ethan can see and version.
