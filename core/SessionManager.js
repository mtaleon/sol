/**
 * SessionManager - Tracks ad session state and enforces frequency caps
 *
 * Philosophy: Ultra-conservative ad frequency
 * - Grace period: Skip first 2 games (show starting from game 3)
 * - Frequency cap: Max 1 interstitial per session
 * - Session boundaries: App reload, 30min idle, visibility change
 */

export class SessionManager {
  constructor(storage) {
    this.storage = storage;
    this.session = this._loadOrCreateSession();
    this._setupVisibilityListener();
  }

  /**
   * Load existing session or create new one
   * Session expires after 30min idle
   */
  _loadOrCreateSession() {
    const stored = sessionStorage.getItem('sudoku-ad-session');
    if (stored) {
      const session = JSON.parse(stored);
      // Expire after 30min idle
      if (Date.now() - session.startTime < 30 * 60 * 1000) {
        return session;
      }
    }
    return this._createNewSession();
  }

  /**
   * Create new session with fresh state
   */
  _createNewSession() {
    return {
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      gamesPlayed: 0,
      interstitialShown: false,
      lastVisibleTime: null
    };
  }

  /**
   * Increment games played counter
   */
  incrementGames() {
    this.session.gamesPlayed++;
    this._save();
  }

  /**
   * Check if interstitial can be shown
   *
   * Grace period logic (CORRECTED):
   * - Game 1 complete: gamesPlayed=1 → <3 → false ✅
   * - Game 2 complete: gamesPlayed=2 → <3 → false ✅
   * - Game 3 complete: gamesPlayed=3 → >=3 → true ✅
   */
  canShowInterstitial() {
    // Grace period: skip first 2 games (gamesPlayed < 3)
    if (this.session.gamesPlayed < 3) {
      return false;
    }

    // Max 1 per session
    if (this.session.interstitialShown) {
      return false;
    }

    return true;
  }

  /**
   * Mark that interstitial was shown this session
   */
  markInterstitialShown() {
    this.session.interstitialShown = true;
    this.session.lastInterstitialTime = Date.now();
    this._save();
  }

  /**
   * Persist session to sessionStorage
   */
  _save() {
    sessionStorage.setItem('sudoku-ad-session', JSON.stringify(this.session));
  }

  /**
   * Set up visibility change listener for session expiry
   */
  _setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User switched tabs/apps, record time
        this.session.lastVisibleTime = Date.now();
        this._save();
      } else {
        // User returned, check if session expired (30min idle)
        if (this.session.lastVisibleTime &&
            Date.now() - this.session.lastVisibleTime > 30 * 60 * 1000) {
          // Session expired, create new one
          this.session = this._createNewSession();
          this._save();
        }
      }
    });
  }

  /**
   * Get current session state (for debugging)
   */
  getState() {
    return {
      sessionId: this.session.sessionId,
      gamesPlayed: this.session.gamesPlayed,
      interstitialShown: this.session.interstitialShown,
      canShowNow: this.canShowInterstitial()
    };
  }
}
