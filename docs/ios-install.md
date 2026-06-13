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

This gives you a "real" app in the App Library. The catch: a **free Apple ID
signature expires every 7 days**, so you re-sign weekly (AltStore automates it).

### Step 1 — Get the .ipa (built on a free cloud Mac)

1. GitHub → your **Intent** repo → **Actions** tab.
2. Pick **"Build iOS .ipa (unsigned)"** → **Run workflow** → run on `main`.
3. Wait ~5–10 min. Open the finished run → **Artifacts** → download
   **`Intent-unsigned-ipa`** → unzip to get `Intent-unsigned.ipa`.

(No Apple account is needed for this step — it's an unsigned build.)

### Step 2 — Sign + install from Windows with a free Apple ID

Pick ONE tool. Both run on Windows and sign with a free Apple ID (no paid program):

**AltStore (recommended — auto-refreshes over WiFi):**
1. Install **AltServer** on your PC from <https://altstore.io>.
2. Plug in your iPhone via USB, trust the computer.
3. AltServer tray icon → **Install AltStore** → pick your device → sign in with
   your **free Apple ID**.
4. On the iPhone: **Settings → General → VPN & Device Management** → trust your
   Apple ID developer profile.
5. In **AltStore** on the iPhone: **My Apps → +** → choose `Intent-unsigned.ipa`.
6. Keep AltServer running on your PC + iPhone on the same WiFi → it auto-refreshes
   the 7-day signature in the background.

**Sideloadly (simpler, but manual weekly re-sign):**
1. Install **Sideloadly** on your PC from <https://sideloadly.io>.
2. Plug in your iPhone via USB.
3. Drag `Intent-unsigned.ipa` into Sideloadly, enter your **free Apple ID**, click
   **Start**.
4. Trust the profile (step 4 above). Re-run this every ~7 days before it expires.

### Free Apple ID limits (good to know)
- Signature valid **7 days**, then the app won't launch until re-signed.
- Max **3 sideloaded apps** at once per free account.
- First install needs **USB**; AltStore refreshes after that over WiFi.

Because the native shell just loads the live site, it still needs internet on first
launch (same as the PWA) and updates instantly on every `git push` — no rebuild.

---

### Which should you use?
- **Just want it on your phone, hassle-free** → Option 1 (PWA).
- **Want a real App-Library app and don't mind the weekly refresh** → Option 2.
