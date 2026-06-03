# TWA Play Store Deploy Guide — SCANSMART KiP

**Date:** 8 May 2026
**Goal:** Submit the SCANSMART KiP PWA to Google Play Store as a Trusted Web Activity (TWA), claiming Play Store presence and creating the redirect surface for Android users searching the store for the brand.

**Why TWA, not native:** The PWA at `app.scansmart.uk` is the actual product. A TWA is Google's official wrapper that runs the live PWA full-screen with no browser chrome. Approved as a real Play Store listing. No code duplication, no store-version drift, no separate codebase to maintain. Bug fixes deploy to the PWA → live in the store app on next launch.

**Cost:** £25 one-time Play Store developer registration. Annual recurring fee none.

**Total time:** ~2-4 hours of your time across two sessions (initial setup + Play Console submission), then 3-7 days waiting for Google review.

---

## Prerequisites — verify before starting

| Item | What you need | How to check |
|---|---|---|
| 1 | Google Play Console account | Sign up at `play.google.com/console` — £25 one-off, ID verification |
| 2 | PWA fully functional at `app.scansmart.uk` | Visit on Chrome desktop. Run Lighthouse PWA audit — must score installable |
| 3 | Manifest file at `app.scansmart.uk/manifest.webmanifest` | Curl it: `curl https://app.scansmart.uk/manifest.webmanifest` — must have `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, icons array with 192x192 AND 512x512 entries |
| 4 | HTTPS valid certificate | Already done via Cloudflare Pages |
| 5 | Cloudflare account access for `app.scansmart.uk` | You'll need to upload `.well-known/assetlinks.json` |
| 6 | A domain you control for the privacy policy URL | `scansmart.uk/privacy` already exists ✓ |
| 7 | Brand assets (icons, feature graphic) | See "Asset prep" section below |
| 8 | macOS or Linux dev machine | Bubblewrap CLI is Node-based |
| 9 | Node.js 18+ installed | `node --version` should return v18+ |
| 10 | Java JDK 17+ installed | `java --version`. Install via Homebrew: `brew install openjdk@17` |
| 11 | Android SDK Command-Line Tools | Bubblewrap installs these on first run |

---

## Step 1 — Asset preparation (~30 min)

Play Store requires a specific asset set. Most you already have; flag what's missing.

| Asset | Size | Status |
|---|---|---|
| App icon (transparent PNG) | 512×512 | Exists at `scansmart-site/assets/icon-512.png` ✓ |
| Adaptive icon (foreground) | 512×512 with 264×264 safe zone | **Missing** — needs creating |
| Feature graphic | 1024×500 | **Missing** — needs creating |
| Phone screenshots | At least 2, 16:9 or 9:16, between 320px and 3840px on each side | **Missing** — capture from PWA on phone |
| 7-inch tablet screenshots (optional) | At least 2 if supporting tablets | Optional |
| 10-inch tablet screenshots (optional) | At least 2 if supporting tablets | Optional |
| Short description | Max 80 chars | Draft below |
| Full description | Max 4,000 chars | Draft below |
| Categorisation | Apps → Health & Fitness, or Food & Drink | Apps → Food & Drink (or Health & Fitness) |
| Privacy policy URL | Live URL | `https://scansmart.uk/privacy` ✓ |
| Content rating | Questionnaire on Play Console | None of the sensitive categories apply — should rate Everyone / 3+ |

### Draft store listing copy

**App name** (max 30 chars): `SCANSMART KiP — Label Decoded`
*(or shorter: `SCANSMART KiP`)*

**Short description** (max 80 chars):
`Scan a barcode. See what's really in it. Free. Open. No paywall.`

**Full description** (under 4,000 chars):
```
SCANSMART KiP is the free food-label scanner from The School of Label Literacy.

Scan any UK food barcode and see, in plain English, what's actually in the product. Salt, sugar, fat, additives, allergens — decoded into the units the moment of decision uses. Teaspoons of sugar. Sachets of salt. Traffic lights at a glance. The same evidence and decode engine the SCANSMART platform serves to NHS commissioners, academic researchers, and retail intelligence partners — given free to everyone in their pocket.

WHAT IT DOES
• Scan any UK food barcode at home or in store
• Get instant traffic-light verdict on salt, sugar, saturated fat
• See teaspoons of sugar and sachets of salt per portion
• Decode hidden ingredient names with our open Knowledge Library
• Find alternatives via the SaK alternative-finder
• Works offline once installed

THE I500 CATALOGUE
SCANSMART maintains the Independent 500 — products from local independent shops the major databases miss. Halal, Caribbean, South Asian, kosher, cultural-specific groceries verified by community audit. 84% of independent-shop products are absent from Open Food Facts; the I500 fills that gap.

WHY IT'S FREE
Per our Belongs-to-Everyone Rule. Food literacy is class-blind, language-blind, app-blind, condition-blind. The free tier is the food-literacy backbone. Institutional revenue (NHS, academic, retail intelligence) funds the public substrate.

WHAT IT IS NOT
SCANSMART is a food literacy and decision-support platform. It is not a medical device. It does not diagnose, prescribe, or treat. For tailored dietary guidance, consult a GP or registered dietitian.

NO ADS · NO TRACKING · NO PAYWALL
We do not run ads, sell user data, or take ad revenue. Per-individual scan data stays on your device. The B2B data product is aggregate non-personal data. Anti-advertising, anti-tracking, anti-freemium-cripple — six principles that never bend.

POWER IS KNOWLEDGE DECODED.
```

(Tune the wording before submission; this is a draft.)

---

## Step 2 — Install Bubblewrap CLI (~15 min)

Bubblewrap is Google's official TWA generator. Open Source. Apache 2.0.

```bash
# Install globally
npm install -g @bubblewrap/cli

# Verify
bubblewrap --version

# First-run setup — installs JDK paths, Android SDK CLI tools, build tools
bubblewrap doctor
```

The `doctor` command walks you through any missing dependencies — typically Android SDK download (~1 GB) and accepting Android licences.

---

## Step 3 — Generate the TWA project (~15 min)

```bash
# Create a working directory outside scansmart-site
mkdir -p ~/Documents/SCANSMART/PlayStore/twa
cd ~/Documents/SCANSMART/PlayStore/twa

# Initialise from your PWA manifest
bubblewrap init --manifest=https://app.scansmart.uk/manifest.webmanifest
```

Bubblewrap will prompt for:

| Prompt | Suggested answer |
|---|---|
| **Domain** | `app.scansmart.uk` |
| **URL path** | `/` |
| **App name** | `SCANSMART KiP` |
| **Short name** | `SCANSMART` |
| **Application ID** | `uk.scansmart.kip` |
| **Display mode** | `standalone` |
| **Status bar colour** | `#0A1628` (brand navy) |
| **Splash screen background** | `#F5F0E8` (brand cream) — match `theme_color` in manifest |
| **Icon URL** | `https://app.scansmart.uk/assets/icon-512.png` |
| **Maskable icon URL** | If you have one, otherwise leave blank |
| **Notification icon** | Same as app icon for now |
| **Signing key path** | Default path is fine; **back this `.keystore` file up to a secure location — losing it locks you out of future updates of the same Play Store app** |
| **Signing key password** | Choose a strong password and **save it in a password manager** |

The init creates an Android project under `~/Documents/SCANSMART/PlayStore/twa/`.

---

## Step 4 — Digital Asset Links (~15 min) — CRITICAL

This is the trust bridge between the Play Store app and the website. Without it, the TWA falls back to showing the browser address bar (looks like a hosted website, not a real app). With it, the TWA runs full-screen.

```bash
# Bubblewrap generates the assetlinks.json and prints its content
bubblewrap fingerprint
```

Copy the JSON output. It looks like this (with your actual SHA-256 fingerprint):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "uk.scansmart.kip",
    "sha256_cert_fingerprints": ["XX:XX:XX:..."]
  }
}]
```

Save this as `.well-known/assetlinks.json` in the **`app.scansmart.uk`** PWA project (NOT the marketing site `scansmart.uk`):

- File path on the PWA project: `/.well-known/assetlinks.json`
- Live URL must resolve at: `https://app.scansmart.uk/.well-known/assetlinks.json`
- Content type must be: `application/json`

Verify after deploy:

```bash
curl -I https://app.scansmart.uk/.well-known/assetlinks.json
# Expect: 200 OK + Content-Type: application/json
```

If Cloudflare Pages serves it as `text/plain`, add a `_headers` file to the PWA project with:

```
/.well-known/assetlinks.json
  Content-Type: application/json
```

---

## Step 5 — Build the App Bundle (~10 min)

```bash
cd ~/Documents/SCANSMART/PlayStore/twa
bubblewrap build
```

Output: `app-release-bundle.aab` (Android App Bundle — Play Store's preferred format).

Verify the build locally on a connected Android device or emulator:

```bash
bubblewrap install
```

Test that the TWA opens full-screen with no browser address bar visible. If you see the address bar, the assetlinks.json file isn't being served correctly — fix that before submitting to Play Store.

---

## Step 6 — Play Console submission (~30-60 min)

1. **Sign in** to `play.google.com/console`
2. **Create app:**
   - App name: `SCANSMART KiP`
   - Default language: English (United Kingdom)
   - App or game: App
   - Free or paid: Free
   - Declarations: tick the boxes (Developer Programme Policies, US export laws)
3. **Set up app:**
   - Privacy policy URL: `https://scansmart.uk/privacy`
   - App access: All functionality available without restrictions
   - Ads: This app does NOT contain ads
   - Content rating: Run the questionnaire — answer truthfully. Should rate **Everyone / 3+**
   - Target audience: Age 13 and over (food-literacy app; under-13 needs parent supervision per our §17 Family Hub safeguarding)
   - News app: No
   - COVID-19 contact tracing: No
   - Data safety: Complete the form. KiP's data posture per the Six Principles That Never Bend:
     - Per-individual scan data stays on device (no upload)
     - Aggregate non-personal data sent to SCANSMART backend
     - No ads, no third-party data sharing, no tracking
     - Forms collect contact info for human follow-up only (declared)
   - Government apps: No
4. **Set up your store listing:**
   - App name, short description, full description (per Step 1 drafts)
   - App icon (512×512 PNG)
   - Feature graphic (1024×500 — needs creating; canva.com or similar)
   - Phone screenshots (at least 2, 16:9 or 9:16)
   - Application category: Apps → **Food & Drink** (alternatively Health & Fitness)
   - Tags: optional; pick 3-5 from the Play list (e.g., "Nutrition", "Health", "Food", "Tools", "Reference")
   - Contact details: courtneyclive84@gmail.com (or contact@scansmart.uk if you set up the custom email forward)
   - External marketing: scansmart.uk
5. **Production release** → **Create new release:**
   - Upload `app-release-bundle.aab` from Step 5
   - Release name: `1.0.0` (or follow Bubblewrap's default version)
   - Release notes (2,500 chars max):
     ```
     Launch release.

     SCANSMART KiP scans UK food barcodes and decodes the label in plain English. Salt, sugar, fat, additives, allergens — translated into the units the moment of decision uses. Free, open, no paywall.

     Built for shopping in independent grocers (the I500 fills the data gap mainstream apps miss for halal, Caribbean, South Asian, kosher, and culturally-specific products).

     Power is Knowledge Decoded.
     ```
6. **Send for review** — Google reviews TWAs typically within 3-7 days. Some same-day; some longer if there's an audit.

---

## Step 7 — Update workflow

When the PWA at `app.scansmart.uk` updates, the TWA shows the new version automatically on next launch — no Play Store re-submission needed. The TWA is just a thin wrapper.

**Re-submit only when:**
- Updating the app icon, name, screenshots, or store listing
- Updating Bubblewrap to a newer version
- Adding new manifest features that need TWA-side support (push notifications, etc.)

For each Play Store update:
```bash
cd ~/Documents/SCANSMART/PlayStore/twa
bubblewrap update          # if Bubblewrap has an update
bubblewrap build           # generate new .aab
# Upload to Play Console as a new release
```

---

## Common rejection reasons (avoid)

| Reason | Fix |
|---|---|
| "App is functionally identical to the website" | Add `display: "standalone"` and `theme_color` to manifest. TWA must run full-screen with no browser chrome. The assetlinks.json file MUST be live and correctly served before submission. |
| "Privacy policy URL doesn't load" | Verify `https://scansmart.uk/privacy` returns 200. Already verified ✓ |
| "Crashes on launch" | Test with `bubblewrap install` on a real Android device first |
| "Inappropriate content rating" | Be accurate in the questionnaire; food-literacy doesn't trigger any sensitive categories |
| "Misleading description" | Don't claim medical-device functionality; the description draft already keeps clear of this |

---

## Open follow-ups

- **Custom email**: when `contact@scansmart.uk` is set up via Cloudflare Email Routing, swap the courtneyclive84@gmail.com listing in Play Console for the custom address.
- **Screenshots**: capture 3-5 high-quality screenshots of KiP scanning real products in independent shops (with shop owner consent if showing identifiable shopfront).
- **Feature graphic**: 1024×500 brand-aligned graphic — could lift the Hero v16 or Marque v2 elements; needs a designer pass to look store-front-quality.
- **Adaptive icon**: 512×512 with the foreground sized for the 264×264 safe zone (Android crops icons into circles, squircles, etc. depending on the launcher).
- **iOS App Store**: separate workstream. Apple is stricter on PWA wrappers — PWABuilder.com or a Capacitor wrapper are the candidate paths. £79/year Apple developer fee. Tackle after Play Store is live.
- **Smart App Banner**: once iOS app is in the App Store, add `<meta name="apple-itunes-app" content="app-id=...">` to scansmart.uk for the iOS install banner.

---

## Checklist before submission

- [ ] Play Console account created and verified (£25 paid)
- [ ] PWA Lighthouse score "installable"
- [ ] manifest.webmanifest verified at app.scansmart.uk
- [ ] Bubblewrap installed and `bubblewrap doctor` passes
- [ ] TWA project initialised; signing key backed up to password manager
- [ ] `assetlinks.json` deployed and verified at `https://app.scansmart.uk/.well-known/assetlinks.json` with `Content-Type: application/json`
- [ ] `bubblewrap install` tested on real Android device — TWA opens full-screen with no address bar
- [ ] Asset set ready: 512×512 icon, 1024×500 feature graphic, 2+ phone screenshots
- [ ] Store listing copy drafted and reviewed
- [ ] Privacy policy live at scansmart.uk/privacy
- [ ] Data safety form filled in line with Six Principles That Never Bend
- [ ] Content rating questionnaire complete (rating: Everyone / 3+)
- [ ] App-release-bundle.aab uploaded to Production track
- [ ] Sent for review

---

*Banked 8 May 2026. Internal deploy reference. Not for public deployment.*
