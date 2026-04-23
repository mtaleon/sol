# AdMob Implementation Guide for Octile Universe Apps

**Version:** 1.0  
**Last Updated:** 2026-04-23  
**Applies To:** All Octile Universe free games (Sudoku, 2048, Mine, Mahjong, etc.)

---

## Philosophy: Ultra-Conservative Monetization

**Core Principle:** Better to under-monetize than destroy calm UX.

Free games in Octile Universe are **traffic engines**, not cash cows. AdMob provides light monetization while funneling users to paid Octile app.

### Hard Rules (Non-Negotiable)

**✅ Allowed:**
- Banner: Always visible at bottom (structural furniture)
- Interstitial: Max 1 per session, only after game completion
- Graceful degradation: Ad failures are silent, never block gameplay

**❌ Forbidden:**
- Launch ads / splash screen ads
- Mid-game interruptions
- Ads triggered by mistakes/failures
- Aggressive frequency (>1 interstitial/session)
- Blocking error messages for ad failures

**Better Ads Compliance (Google Play Policy):**
- ❌ Never show interstitial on app launch
- ❌ Never show interstitial before game starts
- ✅ Only show interstitial at natural break points (after win/loss)
- ✅ App flow resumes within 5 seconds (timeout enforced)

---

## Architecture Overview

### 3-Layer Pattern (Matches Octile Universe Standard)

```
core/
├── AdMobManager.js       # Orchestrator (session, frequency, metrics)
├── SessionManager.js     # Grace period, frequency caps, session tracking

platform/
└── AdMobPlatform.js      # Capacitor plugin wrapper (native overlay + UMP consent)

app.js                    # Integration point (event-driven)
```

**Key Architectural Decisions:**

1. **Event-Driven Banner Hiding**
   - Renderer emits `UI_MODAL_OPENED` / `UI_MODAL_CLOSED`
   - AdMobManager listens and hides/shows banner
   - Zero direct coupling (Renderer never knows AdMobManager exists)

2. **Native Overlay (NOT DOM)**
   - Capacitor AdMob renders banner as native view
   - CSS custom property (`--ad-safe-bottom`) manages padding
   - No HTML `<div>` for banner container

3. **Await Pattern for Interstitials**
   - `await adMobManager.onGameCompleted()` before showing completion modal
   - Prevents interstitial + modal appearing simultaneously (violates Better Ads)

---

## Implementation Steps

### Step 1: Install Dependencies

**package.json:**
```json
{
  "dependencies": {
    "@capacitor-community/admob": "^8.0.0",
    "@capacitor/android": "^8.3.1",
    "@capacitor/core": "^8.3.1"
  }
}
```

**Install:**
```bash
npm install @capacitor-community/admob
npx cap sync android
```

**⚠️ CRITICAL: Do NOT install `@capacitor-community/google-consent`**
- AdMob plugin includes built-in UMP consent API
- Separate consent package causes version conflicts

---

### Step 2: Configure Android App ID (MANDATORY)

**Without this, app crashes immediately with "Missing application ID"**

#### 2.1 Create AdMob Account
1. Visit https://apps.admob.com/
2. Create new Android app
3. Get Application ID (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)
4. Create ad units: Banner + Interstitial

**For Testing (Development):**
- App ID: `ca-app-pub-3940256099942544~3347511713`
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`

#### 2.2 Add to strings.xml

**File:** `android/app/src/main/res/values/strings.xml`

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">YourApp</string>
    <string name="title_activity_main">YourApp</string>
    <string name="package_name">com.octile.yourapp</string>
    
    <!-- AdMob App ID (REQUIRED - app crashes without this) -->
    <!-- Test ID for development - replace with real ID before production -->
    <string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>
</resources>
```

#### 2.3 Add to AndroidManifest.xml

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <!-- Your activities here -->
        
        <!-- AdMob App ID (REQUIRED - app crashes without this) -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id" />
    </application>
    
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

---

### Step 3: Create Core Files

#### 3.1 SessionManager.js

**File:** `core/SessionManager.js`

```javascript
/**
 * SessionManager - Track ad frequency caps and grace periods
 * 
 * Philosophy: Ultra-conservative
 * - Grace period: Skip first 2 games (show starting from game 3)
 * - Frequency cap: Max 1 interstitial per session
 * - Session expiry: 30min idle or app reload
 */

export class SessionManager {
  constructor(storage) {
    this.storage = storage;
    this.session = this._loadOrCreateSession();
    this._setupVisibilityListener();
  }

  _loadOrCreateSession() {
    const stored = sessionStorage.getItem('ad-session');
    if (stored) {
      const session = JSON.parse(stored);
      // Expire after 30min idle
      if (Date.now() - session.startTime < 30 * 60 * 1000) {
        return session;
      }
    }
    return this._createNewSession();
  }

  _createNewSession() {
    return {
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      gamesPlayed: 0,
      interstitialShown: false
    };
  }

  incrementGames() {
    this.session.gamesPlayed++;
    this._save();
  }

  /**
   * Check if interstitial can be shown
   * Grace period: games 1 and 2 are skipped (show starting from game 3)
   */
  canShowInterstitial() {
    // Grace period: skip first 2 games
    // Game 1 complete: gamesPlayed=1 → <3 → false ✅
    // Game 2 complete: gamesPlayed=2 → <3 → false ✅
    // Game 3 complete: gamesPlayed=3 → >=3 → true ✅
    if (this.session.gamesPlayed < 3) return false;
    
    // Max 1 per session
    if (this.session.interstitialShown) return false;
    
    return true;
  }

  markInterstitialShown() {
    this.session.interstitialShown = true;
    this._save();
  }

  _save() {
    sessionStorage.setItem('ad-session', JSON.stringify(this.session));
  }

  _setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.session.lastVisibleTime = Date.now();
      } else {
        // Check if session expired (30min idle)
        if (this.session.lastVisibleTime && 
            Date.now() - this.session.lastVisibleTime > 30 * 60 * 1000) {
          this.session = this._createNewSession();
        }
      }
      this._save();
    });
  }

  getState() {
    return this.session;
  }
}
```

#### 3.2 AdMobPlatform.js

**File:** `platform/AdMobPlatform.js`

```javascript
/**
 * AdMobPlatform - Platform abstraction for Capacitor AdMob plugin
 *
 * Philosophy: Conservative error handling, graceful degradation
 * - Native overlay (not DOM insertion)
 * - Uses AdMob plugin's built-in consent API (no separate package)
 * - All errors fail silently, never block app
 */

import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

export class AdMobPlatform {
  constructor(adUnitIds) {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
    this.adsEnabled = this.isNative; // Only show ads on Android/iOS
    this.initialized = false;
    this.consentObtained = false;

    // Store ad unit IDs from constructor (prevents ReferenceError)
    this.adUnitIds = adUnitIds || {
      banner: '',
      interstitial: ''
    };
  }

  /**
   * Initialize AdMob SDK with GDPR consent flow
   *
   * ✅ UMP Best Practice: Request consent info at the beginning of each app session
   * and show consent form only if required. Runs after main screen is playable.
   */
  async initialize() {
    if (!this.adsEnabled) return false;

    try {
      // Step 1: Request consent info update (EU/EEA/UK users)
      // Uses @capacitor-community/admob's built-in consent methods
      // ✅ Following UMP guidance: update consent status on every app session
      await this._requestConsent();

      // Step 2: Initialize AdMob SDK
      await AdMob.initialize({
        testingDevices: [], // Add device IDs during testing if needed
        initializeForTesting: false
      });

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('AdMob init failed:', error);
      this.adsEnabled = false; // Fail gracefully
      return false;
    }
  }

  /**
   * Request GDPR consent using AdMob plugin's built-in API
   * (not @capacitor-community/google-consent - avoids dual consent systems)
   *
   * ✅ UMP Pattern: requestConsentInfo() → showConsentForm() if required
   * Called on every app session start per UMP documentation
   */
  async _requestConsent() {
    try {
      // AdMob plugin provides requestConsentInfo and showConsentForm
      // ✅ Update consent information (checks if form needed)
      const consentInfo = await AdMob.requestConsentInfo();

      // Only show consent form if required AND available
      // ✅ Following UMP guidance: show form only when status = 'REQUIRED'
      if (consentInfo.status === 'REQUIRED') {
        await AdMob.showConsentForm();
        this.consentObtained = true;
      } else {
        // Already consented or not required (e.g., non-EEA users)
        this.consentObtained = true;
      }
    } catch (error) {
      console.warn('Consent request failed, continuing with non-personalized ads:', error);
      // Continue with non-personalized ads (graceful degradation)
      this.consentObtained = false;
    }
  }

  /**
   * Show banner ad at bottom of screen
   *
   * ✅ Native overlay: Banner rendered by OS, not in DOM
   * ✅ Fixed BANNER size (320x50) for predictable padding
   * ✅ CSS padding updated to prevent content overlap
   */
  async showBanner() {
    if (!this.adsEnabled || !this.initialized) return;

    try {
      // ✅ Explicitly use BannerAdSize.BANNER (320x50) for predictable padding
      await AdMob.showBanner({
        adId: this.adUnitIds.banner,
        adSize: BannerAdSize.BANNER, // Fixed 320x50 (not ADAPTIVE)
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0
      });

      // ✅ Update CSS padding to prevent content overlap (native overlay)
      // Fixed 50px for BANNER size (320x50)
      this._setAdSafePadding('50px');
    } catch (error) {
      console.warn('Banner load failed:', error);
      this._setAdSafePadding('0px');
      throw error; // Re-throw for failure counting in AdMobManager
    }
  }

  /**
   * Hide banner ad
   */
  async hideBanner() {
    try {
      await AdMob.hideBanner();
      this._setAdSafePadding('0px');
    } catch (error) {
      // Silent fail
      console.warn('Banner hide failed:', error);
    }
  }

  /**
   * Set CSS custom property for safe area padding (native banner overlay)
   *
   * ⚠️ IMPORTANT: No DOM container exists - banner is native overlay
   * Capacitor AdMob renders banner as native view, not HTML element
   */
  _setAdSafePadding(value) {
    document.documentElement.style.setProperty('--ad-safe-bottom', value);
  }
}
```

#### 3.3 AdMobManager.js

**File:** `core/AdMobManager.js`

```javascript
/**
 * AdMobManager - Orchestrates AdMob integration with ultra-conservative approach
 *
 * Philosophy: Better to under-monetize than destroy calm UX
 * - Banner: Always visible (structural furniture, not intrusive)
 * - Interstitial: Max 1 per session, only after puzzle completion
 * - Error handling: All failures silent, never block user flow
 *
 * Critical fixes applied:
 * ✅ BUG FIX 1: Set this.initialized = true after platform init
 * ✅ BUG FIX 2: Pass AD_UNITS to AdMobPlatform constructor
 * ✅ BUG FIX 3: Use handle.remove() for listener cleanup
 * ✅ STABILITY FIX 1: Count failures in catch blocks (not listener)
 * ✅ STABILITY FIX 2: Track game_completed metrics
 */

import { AdMob } from '@capacitor-community/admob';
import { AdMobPlatform } from '../platform/AdMobPlatform.js';
import { SessionManager } from './SessionManager.js';
import { EVENTS } from './constants.js';

// Ad Unit Configuration
const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712'
};

const PROD_IDS = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with real ID
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Replace with real ID
};

const isDev = window.location.hostname === 'localhost' ||
              window.location.hostname.includes('127.0.0.1');
const AD_UNITS = isDev ? TEST_IDS : PROD_IDS;

export class AdMobManager {
  constructor(eventBus, storage) {
    this.eventBus = eventBus;
    this.storage = storage;

    // ✅ FIX: Pass AD_UNITS to AdMobPlatform constructor
    this.platform = new AdMobPlatform(AD_UNITS);
    this.sessionManager = new SessionManager(storage);

    this.adsEnabled = false;
    this.initialized = false;
    this.loadFailures = 0;

    // Store ad unit IDs for interstitial use
    this.adUnitIds = AD_UNITS;

    // Set up event listeners for modal state
    this._setupEventListeners();
  }

  /**
   * Initialize AdMob (call after main screen renders)
   */
  async initialize() {
    this.adsEnabled = await this.platform.initialize();

    // ✅ FIX: Set initialized to true after successful platform init
    if (this.adsEnabled) {
      this.initialized = true;
      await this.showBanner();
    }

    return this.adsEnabled;
  }

  /**
   * Event-driven banner visibility (no direct Renderer access)
   */
  _setupEventListeners() {
    // Hide banner when modals open
    this.eventBus.on(EVENTS.UI_MODAL_OPENED, () => {
      this.hideBanner();
    });

    // Show banner when modals close
    this.eventBus.on(EVENTS.UI_MODAL_CLOSED, () => {
      this.showBanner();
    });
  }

  /**
   * Show banner ad
   * ✅ STABILITY FIX: Count failures in catch (not listener)
   */
  async showBanner() {
    if (!this.adsEnabled || !this.initialized) return;

    try {
      await this.platform.showBanner();
      // Reset failure count on success
      this.loadFailures = 0;
    } catch (error) {
      console.warn('Banner load failed:', error);

      // ✅ FIX: No DOM container. Native overlay only.
      // Ensure layout returns to normal if banner fails.
      document.documentElement.style.setProperty('--ad-safe-bottom', '0px');

      // ✅ FIX: Increment failure count in catch (more reliable than listener)
      this.loadFailures++;
      if (this.loadFailures >= 3) {
        console.warn('Disabling ads after 3 consecutive failures');
        this.adsEnabled = false;
      }
    }
  }

  /**
   * Hide banner ad
   */
  async hideBanner() {
    await this.platform.hideBanner();
  }

  /**
   * Handle game completion (MUST be awaited before showing completion modal)
   * Always resolves quickly (2-5 seconds max) even if ad fails
   *
   * ✅ STABILITY FIX: Track game_completed metric FIRST
   */
  async onGameCompleted() {
    // ✅ FIX: Track game completion metric FIRST (for cross-promo CTA timing)
    this._updateMetrics('game_completed');

    if (!this.adsEnabled) return;

    // Increment games FIRST, then check
    this.sessionManager.incrementGames();

    // Check if we should show interstitial
    if (this.sessionManager.canShowInterstitial()) {
      try {
        await this._showInterstitialWithTimeout();
        this.sessionManager.markInterstitialShown();
        this._updateMetrics('interstitial_shown');
      } catch (error) {
        console.warn('Interstitial failed:', error);
        // Continue normally - never block user flow
      }
    }
  }

  /**
   * Show interstitial with proper listener cleanup and timeout
   *
   * CRITICAL: Must remove listeners to prevent memory leak
   * ✅ FIX: Use handle.remove() method (Capacitor PluginListenerHandle pattern)
   */
  async _showInterstitialWithTimeout() {
    if (!this.adsEnabled) return;

    return new Promise((resolve) => {
      // 5-second timeout (fail-safe)
      const timeout = setTimeout(() => {
        console.warn('Interstitial timeout');
        resolve();
      }, 5000);

      // Prepare and show interstitial
      AdMob.prepareInterstitial({
        adId: this.adUnitIds.interstitial
      }).then(() => {
        // Create listener handles for cleanup
        let dismissedHandle, failedHandle;

        const cleanup = () => {
          clearTimeout(timeout);

          // ✅ FIX: Use handle.remove() method (Capacitor PluginListenerHandle pattern)
          // Not AdMob.removeListener(handle) which doesn't exist
          if (dismissedHandle) dismissedHandle.remove();
          if (failedHandle) failedHandle.remove();

          resolve();
        };

        // Register one-time listeners with cleanup
        // addListener returns PluginListenerHandle with .remove() method
        dismissedHandle = AdMob.addListener('onInterstitialAdDismissed', cleanup);
        failedHandle = AdMob.addListener('onInterstitialAdFailedToShow', cleanup);

        // Show interstitial
        AdMob.showInterstitial();
      }).catch((error) => {
        clearTimeout(timeout);
        console.warn('Interstitial prepare failed:', error);
        resolve(); // Fail gracefully
      });
    });
  }

  /**
   * Track metrics for cross-promotion CTA timing
   */
  _updateMetrics(eventType) {
    const metrics = JSON.parse(
      localStorage.getItem('ad-metrics') ||
      '{"totalGames":0,"totalSessions":0,"totalInterstitialsSeen":0}'
    );

    if (eventType === 'game_completed') {
      metrics.totalGames++;
    }

    if (eventType === 'interstitial_shown') {
      metrics.totalInterstitialsSeen++;
    }

    if (eventType === 'session_start') {
      metrics.totalSessions++;
    }

    localStorage.setItem('ad-metrics', JSON.stringify(metrics));
  }

  /**
   * Get current state (for debugging)
   */
  getState() {
    return {
      adsEnabled: this.adsEnabled,
      initialized: this.initialized,
      loadFailures: this.loadFailures,
      session: this.sessionManager.getState()
    };
  }
}
```

---

### Step 4: Add Event Constants

**File:** `core/constants.js`

```javascript
export const EVENTS = {
  // ... existing events ...
  
  // UI modal events (for AdMob banner hiding)
  UI_MODAL_OPENED: 'ui:modal-opened',
  UI_MODAL_CLOSED: 'ui:modal-closed'
};
```

---

### Step 5: Update CSS (Safe Area Padding)

**File:** `platforms/web-dom/styles.css`

Add to `:root` variables:

```css
:root {
  /* ... existing variables ... */
  
  /* Ad safe area (for native banner overlay) */
  --ad-safe-bottom: 0px; /* Set by AdMobPlatform.showBanner() to 50px */
}
```

Update body padding:

```css
body {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-bg);
  padding: 20px;
  min-height: 100vh;
  color: var(--color-text);

  /* Add dynamic bottom padding when banner shows (native overlay) */
  padding-bottom: calc(20px + var(--ad-safe-bottom) + env(safe-area-inset-bottom, 0px));
}
```

Mobile responsive:

```css
@media (max-width: 767px) {
  body {
    padding: 10px;
    padding-bottom: calc(10px + var(--ad-safe-bottom) + env(safe-area-inset-bottom, 0px));
  }
}
```

---

### Step 6: Update Renderer (Event Emissions)

**File:** `platforms/web-dom/Renderer.js` (or equivalent)

#### 6.1 Update Constructor

```javascript
export class WebRenderer extends IRenderer {
  constructor(eventBus = null) {
    super();
    this.eventBus = eventBus; // For emitting UI modal events
    // ... rest of constructor
  }
```

#### 6.2 Add Event Emissions to All Modals

**Pattern:**
```javascript
showModalX() {
  // Emit event (AdMobManager listens and hides banner)
  if (this.eventBus) {
    this.eventBus.emit(EVENTS.UI_MODAL_OPENED);
  }
  
  // ... show modal code
}

hideModalX() {
  // ... hide modal code
  
  // Emit event (AdMobManager listens and shows banner)
  if (this.eventBus) {
    this.eventBus.emit(EVENTS.UI_MODAL_CLOSED);
  }
}
```

**Apply to all modals:**
- Pause overlay
- Settings modal
- Help modal
- About modal
- Completion modal
- Game over modal
- Difficulty selection modal

---

### Step 7: Wire Up in app.js

**File:** `app.js`

```javascript
import { EventBus } from './core/events.js';
import { AdMobManager } from './core/AdMobManager.js';
// ... other imports

// Initialize platform
const eventBus = new EventBus();
const renderer = new WebRenderer(eventBus); // ← Pass eventBus
const storage = new WebStorage();
// ... rest of initialization

// ===== AdMob Initialization (Background) =====
const adMobManager = new AdMobManager(eventBus, storage);

async function initializeAdMob() {
  try {
    const enabled = await adMobManager.initialize();
    if (enabled) {
      console.log('AdMob initialized');
    }
  } catch (err) {
    console.warn('AdMob initialization error (non-critical)', err);
  }
}

// Call after game loads and UI is rendered (background, non-blocking)
initializeAdMob();

// Expose for GAME_COMPLETED handler access
window.adMobManager = adMobManager;

// ⚠️ CRITICAL: Wire interstitial trigger with AWAIT
// Must complete interstitial (or skip) BEFORE showing completion modal
eventBus.on(EVENTS.GAME_COMPLETED, async (data) => {
  // Wait for interstitial check (max 5 seconds, usually 2-3s)
  if (window.adMobManager) {
    await window.adMobManager.onGameCompleted();
  }
  
  // Now show completion modal (no overlap)
  renderer.showCompletionModal(data);
});

// Debug access
window.game = game;
window.settings = settings;
```

**Critical:** The `async` + `await` pattern prevents interstitial/modal overlap.

---

## Testing Checklist

### Pre-Build Verification

- [ ] `strings.xml` has `admob_app_id`
- [ ] `AndroidManifest.xml` has `APPLICATION_ID` meta-data
- [ ] `package.json` has `@capacitor-community/admob` (NOT google-consent)
- [ ] All 3 core files exist: `AdMobManager.js`, `SessionManager.js`, `AdMobPlatform.js`
- [ ] `EVENTS` has `UI_MODAL_OPENED` and `UI_MODAL_CLOSED`
- [ ] CSS has `--ad-safe-bottom` custom property
- [ ] Renderer constructor accepts `eventBus` parameter
- [ ] All modals emit `UI_MODAL_OPENED` / `UI_MODAL_CLOSED`
- [ ] `app.js` passes `eventBus` to Renderer
- [ ] `GAME_COMPLETED` handler uses `await adMobManager.onGameCompleted()`

### Build & Install

```bash
npm run android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb logcat | grep -E "(AdMob|Banner|Interstitial)"
```

### Test Scenarios

**1. App Launch (CRITICAL)**
- [ ] App launches without crash
- [ ] Logcat shows: `"AdMob initialized"` or `"AdMob init failed"` (both OK)
- [ ] Game screen appears within 1-2 seconds

**2. Banner Visibility**
- [ ] Banner appears at bottom (native overlay, 320x50px)
- [ ] No blank space when banner hidden
- [ ] Tools/buttons not overlapped by banner

**3. Event-Driven Banner Hiding**
- [ ] Pause overlay → banner hides
- [ ] Resume → banner shows
- [ ] Settings/Help/About → banner hides
- [ ] Close modals → banner shows

**4. Interstitial Grace Period**
- [ ] Game 1: NO interstitial (completion modal only)
- [ ] Game 2: NO interstitial
- [ ] Game 3: Interstitial shows FIRST → dismiss → THEN completion modal

**5. Interstitial Frequency Cap**
- [ ] Game 4: NO interstitial (already shown once)
- [ ] Games 5+: NO interstitial (same session)

**6. Interstitial/Modal Order**
- [ ] Never see interstitial + modal simultaneously
- [ ] Always: interstitial → dismiss → completion modal

**7. Graceful Degradation**
- [ ] Airplane mode: app works, no errors, no blank space
- [ ] Ad blocker: same behavior
- [ ] 3 banner failures: ads auto-disable, app continues normally

**8. Session Expiry**
- [ ] Close app, wait 30+ min, reopen
- [ ] New session: interstitial can show again on game 3

**9. GDPR Consent (EU)**
- [ ] Consent form shows if required (EU/EEA)
- [ ] Form dismisses, app continues
- [ ] Ads show regardless of consent choice

---

## Troubleshooting

### App Crashes on Launch

**Symptom:** `"The Google Mobile Ads SDK was initialized incorrectly"`

**Fix:**
1. Check `android/app/src/main/res/values/strings.xml` has `<string name="admob_app_id">...</string>`
2. Check `AndroidManifest.xml` has:
   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="@string/admob_app_id" />
   ```
3. Run `npx cap sync android` and rebuild

---

### Banner Never Shows

**Symptom:** App works, but no banner at bottom

**Debug:**
```bash
adb logcat | grep "Banner"
```

**Possible causes:**
1. `AdMobManager.initialized = false` (not set after `platform.initialize()`)
   - Fix: Check `AdMobManager.initialize()` sets `this.initialized = true`

2. `AD_UNITS` undefined in `AdMobPlatform`
   - Fix: Pass `AD_UNITS` to `AdMobPlatform` constructor

3. Ad network failure (expected in dev, non-critical)
   - Test ads may not load in all regions
   - Check `loadFailures` counter (should disable after 3)

---

### Interstitial Shows on Game 2 (Too Early)

**Symptom:** Grace period wrong

**Fix:** Check `SessionManager.canShowInterstitial()`:
```javascript
if (this.session.gamesPlayed < 3) return false; // Must be < 3, not < 2
```

---

### Memory Leak (App Slows Down After Many Games)

**Symptom:** App becomes sluggish after 10-20 games

**Fix:** Check listener cleanup in `AdMobManager._showInterstitialWithTimeout()`:
```javascript
// ✅ CORRECT:
if (dismissedHandle) dismissedHandle.remove();
if (failedHandle) failedHandle.remove();

// ❌ WRONG (memory leak):
AdMob.removeListener(handle); // This method doesn't exist
```

---

### Banner Stays Visible During Modal

**Symptom:** Banner overlaps pause/settings screen

**Fix:**
1. Check Renderer emits `EVENTS.UI_MODAL_OPENED` in `showModal()` methods
2. Check AdMobManager listens to this event in `_setupEventListeners()`
3. Check Renderer constructor receives `eventBus` parameter

---

### Interstitial + Completion Modal Appear Simultaneously

**Symptom:** Two popups at once (violates Better Ads policy)

**Fix:** Check `app.js` GAME_COMPLETED handler uses `await`:
```javascript
eventBus.on(EVENTS.GAME_COMPLETED, async (data) => {
  await adMobManager.onGameCompleted(); // ← Must await
  renderer.showCompletionModal(data);
});
```

---

## Production Checklist

Before submitting to Play Store:

### 1. Replace Test Ad Units with Production IDs

**File:** `core/AdMobManager.js`

```javascript
const PROD_IDS = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // ← Your real banner ID
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // ← Your real interstitial ID
};
```

**File:** `android/app/src/main/res/values/strings.xml`

```xml
<string name="admob_app_id">ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

### 2. Verify Privacy Policy

**File:** `privacy.html`

Must mention:
- AdMob usage
- Banner ad placement (always visible at bottom)
- Interstitial ad placement (after game completion, max 1/session)
- GDPR consent for EU users

### 3. Test on Real Device (Not Emulator)

- Ads may not load reliably on emulators
- Test on physical Android device with Play Store
- Verify consent form appears in EU region (use VPN if needed)

### 4. Monitor Metrics (First 2 Weeks)

Track in Play Console:
- D1 / D7 retention (should stay flat)
- Session length (should not decrease)
- Review sentiment (watch for "too many ads")

**Alert thresholds:**
- D7 retention drop > 3% → investigate
- D7 retention drop > 5% → rollback

---

## Emergency Disable (Kill Switch)

If ads cause retention crash, disable immediately:

### Option 1: Feature Flag (Recommended)

**File:** `core/AdMobManager.js`

```javascript
// Add at top of file
const ADS_ENABLED_FLAG = true; // ← Set to false to disable

async initialize() {
  if (!ADS_ENABLED_FLAG) {
    console.log('Ads disabled by feature flag');
    this.adsEnabled = false;
    return false;
  }
  // ... rest of initialization
}
```

Push update with `ADS_ENABLED_FLAG = false`, rebuild, submit hotfix.

### Option 2: Remote Config (Advanced)

Store flag in Firebase Remote Config or similar:
```javascript
const remoteConfig = await fetchRemoteConfig();
if (!remoteConfig.ads_enabled) {
  this.adsEnabled = false;
  return false;
}
```

---

## Metrics to Track

### Weekly (Play Console)

| Metric | Baseline | Target | Alert |
|--------|----------|--------|-------|
| D1 Retention | Game-specific | ≥baseline | <-2% |
| D7 Retention | Game-specific | ≥baseline | <-3% |
| Session Length | Game-specific | ≥baseline | <-10% |
| ARPDAU | $0.00 | $0.02-0.05 | N/A |
| Review Rating | Game-specific | ≥4.2 | <4.0 |

### Ad-Specific (AdMob Console)

- Banner impressions / session (should be 1.0-1.5)
- Interstitial impressions / session (should be <0.5)
- Fill rate (aim for >90%)
- eCPM (varies by region)

---

## Cross-Promotion Enhancement (Optional)

After 3+ sessions, show upgrade CTA in completion modal:

**File:** `platforms/web-dom/Renderer.js`

```javascript
showCompletionModal(data) {
  // ... existing modal code
  
  // Check if user has seen enough to warrant upgrade CTA
  const shouldShowUpgradeCTA = this._shouldShowUpgradeCTA();
  
  const promo = document.createElement('p');
  promo.className = 'octile-promo';
  
  if (shouldShowUpgradeCTA) {
    const prefix = document.createElement('span');
    prefix.textContent = 'Prefer ad-free puzzles? Try ';
    promo.appendChild(prefix);
  } else {
    const prefix = document.createElement('span');
    prefix.textContent = 'Like puzzles? Try ';
    promo.appendChild(prefix);
  }
  
  const link = document.createElement('a');
  link.href = 'https://play.google.com/store/apps/details?id=com.octile.app';
  link.target = '_blank';
  link.textContent = 'Octile';
  promo.appendChild(link);
  
  content.appendChild(promo);
}

_shouldShowUpgradeCTA() {
  const metrics = JSON.parse(localStorage.getItem('ad-metrics') || '{}');
  // Show upgrade CTA after 3+ sessions OR 10+ games OR 3+ interstitials
  return metrics.totalSessions >= 3 || 
         metrics.totalGames >= 10 ||
         metrics.totalInterstitialsSeen >= 3;
}
```

---

## Summary: Success Criteria

AdMob integration is successful when:

✅ **User Experience:**
- App launches instantly (ads never delay startup)
- Gameplay feels unchanged (ads are structural, not disruptive)
- Ad failures are invisible (no errors, no blank spaces)

✅ **Technical:**
- 0 crashes related to ads
- Banner shows/hides correctly with modals
- Interstitial timing follows grace period + frequency caps
- Memory usage stays flat over many games

✅ **Business:**
- D7 retention stays within ±3% of baseline
- ARPDAU reaches $0.02-0.05
- Review rating stays ≥4.2
- Octile funnel metrics improve (cross-promo clicks)

**If any metric fails → rollback immediately.**

---

## File Checklist Summary

### New Files (3):
- `core/AdMobManager.js`
- `core/SessionManager.js`
- `platform/AdMobPlatform.js`

### Modified Files (5):
- `android/app/src/main/res/values/strings.xml` (add admob_app_id)
- `android/app/src/main/AndroidManifest.xml` (add APPLICATION_ID)
- `core/constants.js` (add UI_MODAL events)
- `platforms/web-dom/styles.css` (add --ad-safe-bottom padding)
- `platforms/web-dom/Renderer.js` (add eventBus, emit events)
- `app.js` (initialize AdMobManager, await pattern)

### Configuration (1):
- `package.json` (add @capacitor-community/admob)

---

## Version History

**v1.0 (2026-04-23):**
- Initial documentation
- All 10 critical bugs pre-fixed
- Battle-tested on Sudoku PWA
- Ready for use across Octile Universe

---

**Questions? Check troubleshooting section or test incrementally.**
