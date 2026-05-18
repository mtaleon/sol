# AdMob Verification Guide

## Current Status
✅ All automated checks pass (`node test-admob.js`)
✅ Using Google test ad unit IDs
✅ Integration complete

## Why Debug Builds Don't Show Ads

**Google AdMob Policy:**
- Test ads require release-signed builds OR registered test devices
- Debug builds use unsigned keystores that ad servers may reject
- Ads may load but not display, or fail silently

---

## Verification Methods

### Method 1: Release APK (Recommended)

```bash
# Build release APK
npm run android:build

# Install on physical device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Watch logs for ad events
adb logcat | grep -E "(AdMob|Ads:|Banner|Interstitial)"
```

**Expected Logs:**
```
I/Ads: Ad request successful.
I/Ads: Ad loaded.
I/Ads: onAdLoaded
W/Ads: Not retrying to fetch app settings
```

**Banner Test:**
- Launch app → should see banner at bottom (yellow test banner)
- Open pause/settings → banner hides
- Close modal → banner reappears

**Interstitial Test:**
1. Complete puzzle #1 → No interstitial (grace period)
2. Complete puzzle #2 → No interstitial (grace period)
3. Complete puzzle #3 → **Interstitial shows** (test fullscreen ad)
4. Complete puzzle #4+ → No more interstitials (max 1 per session)

---

### Method 2: Register Test Device

1. **Get Device ID from logcat:**
```bash
adb logcat | grep "device ID"
```

Look for:
```
I/Ads: Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("33BE2250B43518CCDA7DE426D04EE231"))
```

2. **Add to AdMobManager.js:**
```javascript
// In AdMobPlatform.initialize() method
await AdMob.initialize({
  testingDevices: ['33BE2250B43518CCDA7DE426D04EE231'], // Your device ID
  initializeForTesting: true
});
```

3. **Rebuild and test**

---

### Method 3: Check Implementation Without Ads

Even if ads don't show, you can verify the implementation:

**1. Check logs for initialization:**
```bash
adb logcat | grep -i admob
```

Expected:
```
D/CapacitorCommunity.AdMob: Initializing AdMob
I/AdMob: AdMob SDK initialized
```

**2. Verify banner space is reserved:**
- Open Chrome DevTools → `chrome://inspect`
- Check CSS: `--ad-safe-bottom` should be `0px` (native overlay, not web element)

**3. Verify modal interactions:**
- Banner should hide when pause/settings modal opens
- Check console for events: `UI_MODAL_OPENED`, `UI_MODAL_CLOSED`

**4. Verify session tracking:**
```javascript
// In Chrome DevTools console
localStorage.getItem('sudoku-ad-metrics')
// Should show: {"totalGames":X,"totalSessions":1,"totalInterstitialsSeen":Y}
```

---

## Common Issues & Solutions

### Issue: "App crashes on launch"
**Fix:** Check AdMob App ID in `strings.xml` is present (it is ✅)

### Issue: Banner space shows but no ad
**Cause:** Debug build + unsigned APK
**Fix:** Use release build or register test device

### Issue: Interstitial never shows
**Check:**
1. Logs show: `prepareInterstitial` called
2. Session metrics: `localStorage.getItem('sudoku-session')`
3. Grace period respected (needs 3+ completed games)

### Issue: Ads work in release but not in production
**Action needed:**
1. Replace test IDs with real AdMob unit IDs in `core/AdMobManager.js`:
```javascript
const PROD_IDS = {
  banner: 'ca-app-pub-YOUR_PUBLISHER_ID/YOUR_BANNER_ID',
  interstitial: 'ca-app-pub-YOUR_PUBLISHER_ID/YOUR_INTERSTITIAL_ID'
};
```

2. Update `strings.xml` with production App ID:
```xml
<string name="admob_app_id">ca-app-pub-YOUR_PUBLISHER_ID~YOUR_APP_ID</string>
```

---

## Production Checklist

Before releasing to Play Store:

- [ ] Replace test ad unit IDs with production IDs
- [ ] Update `admob_app_id` in `strings.xml`
- [ ] Test with real ads on release build
- [ ] Verify 3-game grace period works
- [ ] Confirm max 1 interstitial per session
- [ ] Test airplane mode (app should work without ads)
- [ ] Verify banner hides during modals
- [ ] Check ad load failure handling (should fail silently)

---

## Logs to Monitor

```bash
# Comprehensive ad monitoring
adb logcat -v time | grep -E "(AdMob|Ads:|com.google.android.gms.ads|CapacitorCommunity.AdMob|Banner|Interstitial)"
```

**Success indicators:**
- `AdMob SDK initialized`
- `Ad request successful`
- `onAdLoaded`
- `showBanner: success`
- `prepareInterstitial: success`

**Failure indicators (acceptable in debug):**
- `Ad failed to load` → Normal in debug builds
- `No fill` → Ad server has no test ad available (retry)
- `Invalid request` → Check test device registration

---

## Quick Test Script

Save as `test-admob-manual.sh`:

```bash
#!/bin/bash
echo "Building APK..."
npm run android:build

echo "Installing APK..."
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "Clearing app data..."
adb shell pm clear com.octile.sudoku

echo "Starting app..."
adb shell am start -n com.octile.sudoku/.MainActivity

echo "Monitoring logs (Ctrl+C to stop)..."
adb logcat | grep -E "(AdMob|Banner|Interstitial|Ads:)"
```

Run: `bash test-admob-manual.sh`

---

## Expected Behavior Summary

| Event | Expected AdMob Behavior |
|-------|------------------------|
| App launch | Banner loads at bottom (native overlay) |
| Open modal | Banner hides |
| Close modal | Banner reappears |
| Complete game 1 | No interstitial (grace period) |
| Complete game 2 | No interstitial (grace period) |
| Complete game 3 | Interstitial shows before completion modal |
| Complete game 4 | No interstitial (session limit reached) |
| Airplane mode | App works, ads fail silently |
| Ad load failure | App continues normally, banner space removed |

---

## Debug Console Commands

```javascript
// Check AdMob state
window.adMobManager?.getState()

// Check session state
JSON.parse(localStorage.getItem('sudoku-session'))

// Check metrics
JSON.parse(localStorage.getItem('sudoku-ad-metrics'))

// Force clear session (for testing)
localStorage.removeItem('sudoku-session')
```

---

## Contact & Support

If ads still don't show after following this guide:
1. Check `adb logcat` output for specific error codes
2. Verify device has internet connection
3. Confirm Google Play Services is installed
4. Try different test device or emulator with Play Store

Current test ad IDs are valid Google-provided IDs for development.
