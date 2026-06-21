# Installing Intent on iPhone — for free, no Mac

You have **two** ways to get Intent onto your iPhone. Both are free.

---

## Option 1 — PWA (easiest, recommended)

No build, no expiry, ~20 seconds:

1. Open **Safari** on your iPhone (must be Safari).
2. Go to **https://ethant89.github.io/Intent/**
3. **Share** button → **Add to Home Screen** → **Add**.

You get a home-screen icon, fullscreen (no browser bars), offline support, and it
auto-updates whenever you `git push`. For most people this is the better choice —
there's nothing to maintain.

The only downside: it's technically a web app, not in the App Library, and iOS can
evict its local data if the device is very low on storage. Use the in-app
**Settings → Data → Export** as a backup.

---

## Option 2 — Native .ipa (no Mac, no $99, but re-sign weekly)

This gives you a "real" app in the App Library **and** unlocks the native
**Device Calendar** (your Roblox work cal — see the last section). The catch: a
**free Apple ID signature expires every 7 days**, so the app stops opening until
re-signed (AltStore automates this over WiFi).

> **Do you need this?** The PWA (Option 1) already does everything *except* the
> native Device Calendar — push notifications work in the PWA too. Only sideload
> if you want your work calendar inside Intent enough to manage the weekly refresh.

### Step 1 — Get the .ipa (built free in the cloud)
1. GitHub → **Intent** repo → **Actions** → **"Build iOS .ipa (unsigned)"** →
   **Run workflow** on `main`. Wait ~5–10 min for the green check.
2. Open the finished run → **Artifacts** → download **`Intent-unsigned-ipa`** →
   unzip to get `Intent-unsigned.ipa`. (No Apple account needed for this step.)

### Step 2 — One-time Windows setup
1. Install **iTunes** and **iCloud** from **apple.com directly** — *not* the
   Microsoft Store versions. (Sideloadly/AltStore need the real Apple Mobile
   Device drivers, which the Store builds don't include. This is the #1 cause of
   "device not detected.")
2. Make a **secondary/throwaway Apple ID** just for sideloading — it consumes
   app-signing limits, so don't use your main account.

### Step 3 — Install (pick ONE tool)

**AltStore — recommended (auto-refreshes, so no weekly chore):**
1. Install **AltServer** from <https://altstore.io>; run it (lives in the Windows
   system tray by the clock).
2. Plug the iPhone in via **USB**; unlock → **Trust This Computer** → passcode.
3. AltServer tray icon → **Install AltStore → [your iPhone]** → sign in with your
   sideloading Apple ID.
4. On the iPhone: **Settings → General → VPN & Device Management** → tap your
   Apple ID → **Trust**.
5. **Settings → Privacy & Security → Developer Mode → ON** → restart when asked.
   (This toggle only appears after step 3.)
6. Get `Intent-unsigned.ipa` onto the phone: put it in **iCloud Drive** or email
   it to yourself so the **Files** app can see it.
7. Open the **AltStore** app on the phone → **My Apps → "+"** → choose the .ipa.
8. **Keep AltServer running** with the laptop on the **same WiFi** as the phone —
   it silently re-signs within the 7-day window. (If it ever expires: AltStore →
   My Apps → **Refresh**.)

**Sideloadly — simpler one-shot (manual weekly re-sign):**
1. Install **Sideloadly** from <https://sideloadly.io>.
2. Plug in the iPhone via USB (trust it).
3. Drag `Intent-unsigned.ipa` into Sideloadly → enter your Apple ID → **Start**
   (enter the 2FA code if prompted).
4. Do the **Trust** + **Developer Mode** steps (4–5 above), then launch Intent.
5. Re-run Sideloadly every ~7 days before it expires.

### Free Apple ID limits (good to know)
- Signature valid **7 days**, then the app won't launch until re-signed.
- Max **3 sideloaded apps** at once per free account.
- First install needs **USB**; AltStore refreshes after that over WiFi.
- **No data loss** on re-sign/reinstall — Intent loads the live hosted app and
  syncs to the cloud, so your workouts/books/calendar are safe regardless.

### On a Mac (optional — e.g. a work MacBook)
- **Sideloadly** runs on macOS too (same steps, no driver setup).
- Or full **Xcode**: `git clone` → `npm install` → `npm run build` →
  `npx cap add ios --packagemanager CocoaPods` → `npx cap sync ios` → open
  `ios/App/App.xcworkspace`, set **Signing Team** to your Apple ID, plug in the
  iPhone, press **Run**.
- ⚠️ On a *work* MacBook, use a **personal** Apple ID and be mindful of MDM
  policies — don't sign in with work credentials.

The native shell just loads the live site, so it needs internet on first launch
(like the PWA) and updates instantly on every `git push` — no rebuild needed for
web changes (only re-sign when the signature expires).

---

### Which should you use?
- **Hassle-free, everything-but-work-calendar** → Option 1 (PWA).
- **Want the Roblox work calendar in-app** (and don't mind the refresh) → Option 2.

---

## Device calendar (full work-calendar details)

Web/ICS calendar sharing can't see a work calendar's event **details** when the
org restricts external sharing to free/busy (e.g. Roblox Workspace). The native
build gets around this by reading the **phone's own calendars** via EventKit —
the OS is already logged in, so it has full access.

Requirements & steps:
1. The Roblox (or any) account must be added to the **iOS system Calendar**
   (Settings → Calendar → Accounts → Add Account → Google) so events show in the
   stock Apple Calendar app. (The Google Calendar app's own sandbox is *not*
   readable — it must be a system account.)
2. Use **Option 2** (the native .ipa) — this only works in the installed native
   app, not the Safari PWA. Rebuilding via the GitHub Action injects the calendar
   permission strings automatically.
3. In Intent: **Calendar → ⋯ → Device calendar → Connect**, approve the calendar
   access prompt, then pick which device calendars to show. Events appear as a
   read-only "Phone" layer. Refresh re-reads them.
