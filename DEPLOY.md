# Deployment Guide

## Android Play Store Release

### 1. Generate Keystore (One-time setup)

```bash
keytool -genkey -v -keystore sudoku-release.keystore -alias sudoku -keyalg RSA -keysize 2048 -validity 10000
```

**Save these values securely:**
- Keystore password
- Key alias: `sudoku`
- Key password

**⚠️ CRITICAL**: Never commit the keystore to git! Keep it secure offline.

---

### 2. Configure Gradle Signing (Local Development)

Create `android/keystore.properties` (gitignored):
```properties
storeFile=/absolute/path/to/sudoku-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=sudoku
keyPassword=YOUR_KEY_PASSWORD
```

Update `android/app/build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### 3. GitHub Actions CI Signing

**Setup GitHub Secrets** (Settings → Secrets and variables → Actions):

1. **ANDROID_KEYSTORE_B64**
   ```bash
   base64 -i sudoku-release.keystore | pbcopy
   ```
   Paste the base64 string as secret value

2. **ANDROID_KEYSTORE_PASSWORD** - Your keystore password
3. **ANDROID_KEY_ALIAS** - `sudoku`
4. **ANDROID_KEY_PASSWORD** - Your key password

**Update `.github/workflows/android-build.yml`**:
```yaml
- name: Decode Keystore
  env:
    ANDROID_KEYSTORE_B64: ${{ secrets.ANDROID_KEYSTORE_B64 }}
  run: |
    echo "$ANDROID_KEYSTORE_B64" | base64 -d > android/app/release.keystore

- name: Create keystore properties
  env:
    KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: |
    cat > android/keystore.properties <<EOF
    storeFile=release.keystore
    storePassword=$KEYSTORE_PASSWORD
    keyAlias=$KEY_ALIAS
    keyPassword=$KEY_PASSWORD
    EOF

- name: Build signed AAB
  run: cd android && ./gradlew bundleRelease
```

---

### 4. Build AAB for Play Store

**Local build** (after keystore setup):
```bash
npm run android:bundle
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**CI build** (push git tag):
```bash
git tag v1.0.0
git push --tags
```

---

### 5. Play Store Submission Checklist

#### App Content
- [x] Target audience: Everyone
- [x] Content rating: Everyone
- [x] Category: Puzzle

#### Data Safety
- [x] **Does not collect data**
- [x] No user accounts
- [x] No analytics tracking
- [x] No third-party libraries that collect data

#### Privacy Policy
Not required if you don't collect data. If you add analytics later, you'll need one.

#### Store Listing
- App name: **Sudoku**
- Short description: Classic Sudoku puzzle game
- Full description: See below
- Screenshots: 2 phone + 1 tablet (required)
- Feature graphic: 1024×500px
- App icon: 512×512px (already have)

**Description Template**:
```
Classic Sudoku puzzle game with clean, modern interface.

FEATURES:
• Three difficulty levels (Easy, Medium, Hard)
• Pencil marks/notes mode for solving strategies
• Undo/redo moves
• Timer and move counter
• Hint system when you're stuck
• Multi-layer highlighting for better visibility
• Offline play - no internet required
• Clean, ad-free experience

Perfect for Sudoku enthusiasts and beginners alike!
```

#### Testing Track
1. Internal testing → Upload AAB, add testers
2. Closed testing (optional) → Beta testers
3. Open testing (optional) → Public beta
4. Production → Full release

#### Review Timeline
- Internal: Instant
- Production: 1-7 days (typically 2-3 days)

---

### 6. Version Bumping

Before each release:

1. Update `android/app/build.gradle`:
   ```gradle
   versionCode 2      // Increment integer
   versionName "1.1"  // Semantic version
   ```

2. Update `package.json`:
   ```json
   "version": "1.1.0"
   ```

3. Create git tag:
   ```bash
   git tag v1.1.0
   git push --tags
   ```

---

### 7. Common Issues

**Issue**: `Execution failed for task ':app:validateSigningRelease'`
**Fix**: Check keystore path and passwords in `keystore.properties`

**Issue**: `No keystore found`
**Fix**: Ensure `keystore.properties` exists and paths are absolute

**Issue**: AAB rejected by Play Store
**Fix**: Check target SDK version (should be 34+ for 2026)

---

### 8. APK vs AAB

**APK** (Android Package):
- Single file for all devices
- Larger download size
- Good for sideloading, testing
- Build: `npm run android:release`

**AAB** (Android App Bundle):
- Play Store optimizes per device
- Smaller user downloads (~30% reduction)
- **Required** for Play Store (2021+)
- Build: `npm run android:bundle`

For production: **Always use AAB** for Play Store.
For testing/sideload: APK is fine.

---

## GitHub Pages Deployment

**Automatic** on push to `main`:
```bash
git push origin main
```

GitHub Actions deploys to: `https://[username].github.io/sol/`

**Manual** via gh-pages:
```bash
npm run build
npx gh-pages -d www
```

---

## PWA Installation

**Desktop**:
1. Visit site in Chrome/Edge
2. Click install icon in address bar
3. App opens in standalone window

**Mobile** (Chrome Android):
1. Visit site
2. Tap "Add to Home Screen"
3. App opens fullscreen

**iOS** (Safari):
1. Visit site
2. Tap Share → Add to Home Screen
3. Limited PWA features (iOS restrictions)

---

## Monitoring

### Play Console Metrics
- Installs / Uninstalls
- Crashes (ANR reports)
- User reviews / ratings
- Store listing experiments

### Web Analytics (Optional)
Add Google Analytics or Plausible if needed:
- Remember to update Privacy Policy
- Update Data Safety declaration
- Add opt-out mechanism

---

## Troubleshooting

### Keystore Lost/Forgotten
⚠️ **Critical**: If you lose the keystore or password, you **cannot update the app**. You must:
1. Create new app listing (new package name)
2. Migrate users manually

**Prevention**: Back up keystore to secure location (password manager, encrypted drive).

### Gradle Build Fails
```bash
cd android
./gradlew clean
./gradlew bundleRelease --stacktrace
```

### Capacitor Sync Issues
```bash
npx cap sync android --force
```

---

## Security Best Practices

1. ✅ Keystore encrypted and backed up
2. ✅ Never commit keystore to git
3. ✅ GitHub secrets for CI/CD only
4. ✅ Rotate keys if compromised
5. ✅ Use separate keystores for debug/release

---

## Next Steps After v1.0

- [ ] Add analytics (optional)
- [ ] A/B test store listing
- [ ] Monitor crash reports
- [ ] Gather user feedback
- [ ] Plan feature updates
- [ ] Consider monetization (ads/IAP)
