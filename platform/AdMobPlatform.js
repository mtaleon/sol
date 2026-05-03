/**
 * AdMobPlatform - Platform abstraction for Capacitor AdMob plugin
 *
 * Philosophy: Conservative error handling, graceful degradation
 * - Native overlay (not DOM insertion)
 * - Uses AdMob plugin's built-in consent API (no separate package)
 * - All errors fail silently, never block app
 */

// Browser fallback: Use window.Capacitor if available (native), otherwise mock for web
const Capacitor = window.Capacitor || {
  isNativePlatform: () => false,
  getPlatform: () => 'web'
};

// Dynamic import: AdMob modules only loaded in native environment
let AdMob, BannerAdSize, BannerAdPosition;

export class AdMobPlatform {
  constructor(adUnitIds) {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
    this.adsEnabled = this.isNative; // Only show ads on Android/iOS
    this.initialized = false;
    this.consentObtained = false;

    // ✅ FIX: Store ad unit IDs from constructor (prevents ReferenceError)
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
      // Dynamically import AdMob modules (only in native environment)
      const admobModule = await import('@capacitor-community/admob');
      AdMob = admobModule.AdMob;
      BannerAdSize = admobModule.BannerAdSize;
      BannerAdPosition = admobModule.BannerAdPosition;

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
      // ✅ FIX: Use this.adUnitIds.banner (passed from constructor)
      // ✅ FIX: Explicitly use BannerAdSize.BANNER (320x50) for predictable padding
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
