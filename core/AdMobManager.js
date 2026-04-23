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
      // ✅ FIX: Use this.adUnitIds.interstitial (not AD_UNITS)
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
      localStorage.getItem('sudoku-ad-metrics') ||
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

    localStorage.setItem('sudoku-ad-metrics', JSON.stringify(metrics));
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
