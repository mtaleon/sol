# Play Store Release Guide

Quick reference for releasing Sudoku by Octile to Google Play Store.

---

## Pre-Release Checklist

### 1. Version Management
- [ ] Update `versionCode` in `android/app/build.gradle` (must increment)
- [ ] Update `versionName` in `android/app/build.gradle` (e.g., "1.0.1")
- [ ] Update `version` in `package.json` to match versionName
- [ ] Update `CHANGELOG.md` with changes for this version
- [ ] Update "What's New" text in `PLAY_STORE_LISTING.txt`

### 2. Code Quality
- [ ] All tests passing: `npm test`
- [ ] No console errors in browser
- [ ] No Android lint errors
- [ ] Privacy policy up to date

### 3. Functionality Testing
- [ ] New game works (all difficulties)
- [ ] Notes mode toggles correctly
- [ ] Undo/Redo works
- [ ] Hints work
- [ ] Game completion detected
- [ ] Game over on mistake limit works
- [ ] Settings persist
- [ ] Auto-save and resume works
- [ ] Language switching works
- [ ] Help and About pages display correctly
- [ ] AdMob loads (if applicable)
- [ ] Offline mode works

### 4. Visual Testing
- [ ] No layout issues on small screens (iPhone SE size)
- [ ] No layout issues on tablets
- [ ] All text readable
- [ ] Icons display correctly
- [ ] Highlights work properly
- [ ] Modals display correctly

### 5. Build Assets
- [ ] Signing keystore configured (`keystore.properties`)
- [ ] App icon finalized (512x512 PNG)
- [ ] Feature graphic ready (1024x500 PNG)
- [ ] Screenshots taken (minimum 2 for phone)
- [ ] Privacy policy accessible at public URL

---

## Build Commands

### Build Release AAB (for Play Store)
```bash
# 1. Sync web files to Android
npm run android:prepare

# 2. Build release bundle
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Build Release APK (for testing before upload)
```bash
npm run android:release

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Test Release Build Locally
```bash
# Install release APK to connected device/emulator
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## Play Store Console Steps

### First-Time Setup (v1.0.0)

1. **Create App**
   - Go to Google Play Console
   - Create app
   - Fill in app details (name, default language)

2. **Store Listing**
   - Copy text from `PLAY_STORE_LISTING.txt`
   - App name: "Sudoku — Octile Universe"
   - Short description (80 chars)
   - Full description (up to 4000 chars)
   - Upload app icon (512x512)
   - Upload feature graphic (1024x500)
   - Upload screenshots (min 2)
   - Select category: Games > Puzzle
   - Add contact email: octile.team@gmail.com
   - Set privacy policy URL

3. **Content Rating**
   - Complete questionnaire
   - Expected: PEGI 3 / ESRB Everyone
   - Submit for rating

4. **App Content**
   - Privacy policy: Link to hosted privacy.html
   - Ads declaration: Yes, contains ads (AdMob)
   - Target audience: 13+ (or 18+ to be safe)
   - Declare permissions (INTERNET, ACCESS_NETWORK_STATE)
   - App access: All features available

5. **Pricing & Distribution**
   - Free app
   - Select countries
   - Content guidelines: Accept
   - US export laws: Accept

6. **Production Release**
   - Upload AAB file
   - Add release notes (copy from "What's New")
   - Set rollout percentage (start with 20% for safety)
   - Review and publish

### Subsequent Updates (v1.0.1+)

1. **Production Track**
   - Create new release
   - Upload new AAB (with incremented versionCode)
   - Add release notes (What's New text)
   - Review changes
   - Submit for review

2. **Rollout**
   - Start with 20% rollout
   - Monitor crash reports and ratings
   - Increase to 50% after 24-48 hours if stable
   - Roll out to 100% after monitoring

---

## Git Release Process

### Create Release Tag
```bash
# Ensure all changes committed
git status

# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag to trigger GitHub Actions
git push origin main --tags
```

### GitHub Release Notes
After GitHub Actions builds APK:
1. Go to repository releases page
2. Edit the auto-created release
3. Add release notes from CHANGELOG.md
4. Attach any additional files if needed
5. Publish release

---

## Post-Release Monitoring

### First 24 Hours
- [ ] Check Play Console for crash reports
- [ ] Monitor user reviews
- [ ] Check app install success rate
- [ ] Verify AdMob impressions (if ads enabled)
- [ ] Test download and install on clean device

### First Week
- [ ] Review analytics (installs, uninstalls, retention)
- [ ] Respond to user reviews
- [ ] Monitor crash-free rate (should be >99%)
- [ ] Check ANR (Application Not Responding) rate
- [ ] Review performance metrics

### Action Items if Issues Found
- Critical bugs: Prepare hotfix (versionCode +1, patch version)
- Minor issues: Add to next planned release
- User feedback: Track in GitHub Issues

---

## Signing Configuration

Required file: `android/keystore.properties`
```properties
storeFile=path/to/keystore.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=YOUR_KEY_ALIAS
keyPassword=YOUR_KEY_PASSWORD
```

**NEVER commit keystore.properties or keystore files to git!**

Store securely:
- Local: Encrypted vault (1Password, LastPass, etc.)
- CI/CD: GitHub Secrets or secure environment variables

---

## Rollback Plan

If critical issue found after release:

1. **Play Console Rollback**
   - Go to Production track
   - Click "Halt rollout"
   - Optionally roll back to previous version

2. **Fix Forward**
   - Identify and fix issue
   - Increment versionCode
   - Create hotfix release (e.g., v1.0.1)
   - Follow normal release process with urgency flag

---

## Common Issues & Solutions

### Issue: "Upload failed: Version code X has already been used"
**Solution:** Increment `versionCode` in build.gradle

### Issue: "You need to use a different package name"
**Solution:** Package name must be unique. Verify `com.octile.sudoku` is available.

### Issue: "App not showing in Play Store after publish"
**Solution:** Can take 2-24 hours to appear. Check status in Play Console.

### Issue: "Signing error during build"
**Solution:** Verify keystore.properties exists and paths are correct

### Issue: "APK/AAB size too large"
**Solution:** 
- Check for unused assets
- Enable code shrinking (minifyEnabled true)
- Use AAB instead of APK for smaller downloads

---

## Quick Reference: Version Numbering

- **versionCode**: Integer, must always increment (1, 2, 3, ...)
- **versionName**: String, semantic versioning (1.0.0, 1.0.1, 1.1.0, ...)

Example progression:
```
v1.0.0 → versionCode 1
v1.0.1 → versionCode 2
v1.1.0 → versionCode 3
v2.0.0 → versionCode 4
```

---

## Resources

- [Play Console](https://play.google.com/console/)
- [Android Publishing Guide](https://developer.android.com/studio/publish)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)
- [Release Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)

---

## Support

For questions about the release process:
- Check Play Console Help Center
- Review Android Developer documentation
- Contact: octile.team@gmail.com
