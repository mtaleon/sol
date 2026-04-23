#!/usr/bin/env node

/**
 * AdMob Integration Test Script
 *
 * Validates AdMob implementation before building APK.
 * Run: node test-admob.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const { reset, bright, green, red, yellow, blue, cyan } = colors;

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) {
  console.log(`${green}✓${reset} ${msg}`);
  passCount++;
}

function fail(msg, fix = '') {
  console.log(`${red}✗${reset} ${msg}`);
  if (fix) console.log(`  ${yellow}Fix:${reset} ${fix}`);
  failCount++;
}

function warn(msg) {
  console.log(`${yellow}⚠${reset} ${msg}`);
  warnCount++;
}

function section(title) {
  console.log(`\n${cyan}${bright}━━━ ${title} ━━━${reset}\n`);
}

function checkFile(path, description) {
  if (existsSync(join(__dirname, path))) {
    pass(`${description}: ${path}`);
    return true;
  } else {
    fail(`Missing: ${description}`, `Create file: ${path}`);
    return false;
  }
}

function checkFileContent(path, patterns, description) {
  const fullPath = join(__dirname, path);
  if (!existsSync(fullPath)) {
    fail(`File not found: ${path}`);
    return false;
  }

  const content = readFileSync(fullPath, 'utf-8');
  let allFound = true;

  for (const [pattern, fixMsg] of patterns) {
    const found = typeof pattern === 'string'
      ? content.includes(pattern)
      : pattern.test(content);

    if (found) {
      pass(`${description}: Found pattern`);
    } else {
      fail(`${description}: Missing pattern`, fixMsg);
      allFound = false;
    }
  }

  return allFound;
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log(`${bright}${blue}`);
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       AdMob Integration Test Suite                        ║');
console.log('║       Octile Universe - Pre-Build Validation              ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(reset);

// ----------------------------------------------------------------------------
section('1. Core Files Existence');
// ----------------------------------------------------------------------------

checkFile('core/AdMobManager.js', 'AdMob orchestrator');
checkFile('core/SessionManager.js', 'Session tracking');
checkFile('platform/AdMobPlatform.js', 'Platform wrapper');

// ----------------------------------------------------------------------------
section('2. Android Configuration (CRITICAL)');
// ----------------------------------------------------------------------------

// Check strings.xml
const stringsXmlPath = 'android/app/src/main/res/values/strings.xml';
if (checkFile(stringsXmlPath, 'Android strings.xml')) {
  checkFileContent(stringsXmlPath, [
    ['<string name="admob_app_id">', 'Add: <string name="admob_app_id">ca-app-pub-...</string>']
  ], 'AdMob App ID in strings.xml');
}

// Check AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (checkFile(manifestPath, 'AndroidManifest.xml')) {
  checkFileContent(manifestPath, [
    ['com.google.android.gms.ads.APPLICATION_ID', 'Add: <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />']
  ], 'AdMob App ID meta-data');
}

// ----------------------------------------------------------------------------
section('3. Package Dependencies');
// ----------------------------------------------------------------------------

const packageJsonPath = 'package.json';
if (checkFile(packageJsonPath, 'package.json')) {
  const packageJson = JSON.parse(readFileSync(join(__dirname, packageJsonPath), 'utf-8'));

  if (packageJson.dependencies?.['@capacitor-community/admob']) {
    pass('AdMob plugin installed');
  } else {
    fail('AdMob plugin not installed', 'Run: npm install @capacitor-community/admob');
  }

  if (packageJson.dependencies?.['@capacitor-community/google-consent']) {
    fail('Dual consent system detected', 'Remove @capacitor-community/google-consent from package.json');
  } else {
    pass('No dual consent conflict');
  }
}

// ----------------------------------------------------------------------------
section('4. Event Constants');
// ----------------------------------------------------------------------------

const constantsPath = 'core/constants.js';
if (checkFile(constantsPath, 'Constants file')) {
  checkFileContent(constantsPath, [
    ['UI_MODAL_OPENED', 'Add: UI_MODAL_OPENED: \'ui:modal-opened\''],
    ['UI_MODAL_CLOSED', 'Add: UI_MODAL_CLOSED: \'ui:modal-closed\'']
  ], 'Modal events in constants.js');
}

// ----------------------------------------------------------------------------
section('5. CSS Safe Area Padding');
// ----------------------------------------------------------------------------

const stylesPath = 'platforms/web-dom/styles.css';
if (checkFile(stylesPath, 'Styles file')) {
  checkFileContent(stylesPath, [
    ['--ad-safe-bottom', 'Add: --ad-safe-bottom: 0px; in :root'],
    [/padding-bottom:.*calc.*--ad-safe-bottom/, 'Add: padding-bottom: calc(20px + var(--ad-safe-bottom) + env(safe-area-inset-bottom, 0px));']
  ], 'CSS safe area padding');
}

// ----------------------------------------------------------------------------
section('6. Renderer Event Emissions');
// ----------------------------------------------------------------------------

const rendererPath = 'platforms/web-dom/Renderer.js';
if (checkFile(rendererPath, 'Renderer file')) {
  const rendererContent = readFileSync(join(__dirname, rendererPath), 'utf-8');

  // Check constructor accepts eventBus
  if (/constructor\s*\(\s*eventBus/.test(rendererContent)) {
    pass('Renderer constructor accepts eventBus');
  } else {
    fail('Renderer constructor missing eventBus', 'Add: constructor(eventBus = null)');
  }

  // Check event emissions
  const modalOpenCount = (rendererContent.match(/UI_MODAL_OPENED/g) || []).length;
  const modalCloseCount = (rendererContent.match(/UI_MODAL_CLOSED/g) || []).length;

  if (modalOpenCount >= 4) {
    pass(`UI_MODAL_OPENED emitted in ${modalOpenCount} places`);
  } else {
    warn(`UI_MODAL_OPENED found ${modalOpenCount} times (expected 4+: pause, settings, help, about, completion)`);
  }

  if (modalCloseCount >= 4) {
    pass(`UI_MODAL_CLOSED emitted in ${modalCloseCount} places`);
  } else {
    warn(`UI_MODAL_CLOSED found ${modalCloseCount} times (expected 4+)`);
  }
}

// ----------------------------------------------------------------------------
section('7. app.js Integration');
// ----------------------------------------------------------------------------

const appJsPath = 'app.js';
if (checkFile(appJsPath, 'app.js')) {
  const appContent = readFileSync(join(__dirname, appJsPath), 'utf-8');

  // Check AdMobManager import
  if (/import.*AdMobManager.*from.*AdMobManager\.js/.test(appContent)) {
    pass('AdMobManager imported');
  } else {
    fail('AdMobManager not imported', 'Add: import { AdMobManager } from \'./core/AdMobManager.js\'');
  }

  // Check eventBus passed to Renderer
  if (/new\s+WebRenderer\s*\(\s*eventBus\s*\)/.test(appContent)) {
    pass('EventBus passed to Renderer');
  } else {
    fail('EventBus not passed to Renderer', 'Change: new WebRenderer(eventBus)');
  }

  // Check AdMobManager initialization
  if (/new\s+AdMobManager/.test(appContent)) {
    pass('AdMobManager instantiated');
  } else {
    fail('AdMobManager not instantiated', 'Add: const adMobManager = new AdMobManager(eventBus, storage)');
  }

  // Check await pattern in GAME_COMPLETED
  if (/GAME_COMPLETED.*async.*await.*onGameCompleted/s.test(appContent)) {
    pass('GAME_COMPLETED uses await pattern');
  } else {
    fail('GAME_COMPLETED missing await', 'Add: eventBus.on(EVENTS.GAME_COMPLETED, async (data) => { await adMobManager.onGameCompleted(); ... })');
  }
}

// ----------------------------------------------------------------------------
section('8. Critical Bug Fixes Verification');
// ----------------------------------------------------------------------------

// Bug Fix #1: initialized flag
const managerPath = 'core/AdMobManager.js';
if (existsSync(join(__dirname, managerPath))) {
  const managerContent = readFileSync(join(__dirname, managerPath), 'utf-8');

  if (/this\.initialized\s*=\s*true/.test(managerContent)) {
    pass('Bug Fix #1: initialized flag is set');
  } else {
    fail('Bug Fix #1: Missing initialized = true', 'Add: this.initialized = true after platform.initialize()');
  }

  // Bug Fix #2: AD_UNITS passed to platform
  if (/new\s+AdMobPlatform\s*\(\s*AD_UNITS/.test(managerContent)) {
    pass('Bug Fix #2: AD_UNITS passed to AdMobPlatform');
  } else {
    fail('Bug Fix #2: AD_UNITS not passed', 'Add: this.platform = new AdMobPlatform(AD_UNITS)');
  }

  // Bug Fix #3: handle.remove() cleanup
  if (/dismissedHandle\.remove\(\)/.test(managerContent) && /failedHandle\.remove\(\)/.test(managerContent)) {
    pass('Bug Fix #3: Listener cleanup uses handle.remove()');
  } else {
    fail('Bug Fix #3: Wrong listener cleanup', 'Use: dismissedHandle.remove() and failedHandle.remove()');
  }

  // Stability Fix #1: Failure counting in catch
  const catchBlocks = (managerContent.match(/catch\s*\([^)]*\)\s*\{[^}]*loadFailures\+\+/g) || []).length;
  if (catchBlocks >= 1) {
    pass('Stability Fix #1: Failures counted in catch blocks');
  } else {
    warn('Stability Fix #1: loadFailures++ should be in catch blocks');
  }

  // Stability Fix #2: Track game_completed
  if (/_updateMetrics\s*\(\s*['"]game_completed['"]/.test(managerContent)) {
    pass('Stability Fix #2: game_completed metrics tracked');
  } else {
    warn('Stability Fix #2: Missing _updateMetrics(\'game_completed\')');
  }
}

// Bug Fix: Grace period logic
const sessionPath = 'core/SessionManager.js';
if (existsSync(join(__dirname, sessionPath))) {
  const sessionContent = readFileSync(join(__dirname, sessionPath), 'utf-8');

  if (/gamesPlayed\s*<\s*3/.test(sessionContent)) {
    pass('Grace period: Correct logic (gamesPlayed < 3)');
  } else if (/gamesPlayed\s*<\s*2/.test(sessionContent)) {
    fail('Grace period: Off-by-one bug', 'Change: gamesPlayed < 3 (not < 2)');
  } else {
    warn('Grace period: Could not verify logic');
  }
}

// ----------------------------------------------------------------------------
section('9. Manual Testing Preparation');
// ----------------------------------------------------------------------------

console.log(`${bright}Manual testing checklist:${reset}`);
console.log('  1. Build APK: npm run android:build');
console.log('  2. Install: adb install -r android/app/build/outputs/apk/debug/app-debug.apk');
console.log('  3. Watch logs: adb logcat | grep -E "(AdMob|Banner|Interstitial)"');
console.log('  4. Test scenarios:');
console.log('     • App launches without crash');
console.log('     • Banner shows at bottom (native overlay)');
console.log('     • Banner hides during modals (pause/settings)');
console.log('     • Games 1-2: NO interstitial');
console.log('     • Game 3: Interstitial shows FIRST, then completion modal');
console.log('     • Airplane mode: App works, no errors');
console.log('');

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------

console.log(`${cyan}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`);
console.log(`${bright}Test Results:${reset}`);
console.log(`  ${green}✓ Pass:${reset} ${passCount}`);
console.log(`  ${red}✗ Fail:${reset} ${failCount}`);
console.log(`  ${yellow}⚠ Warn:${reset} ${warnCount}`);
console.log('');

if (failCount === 0 && warnCount === 0) {
  console.log(`${green}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`);
  console.log(`${green}${bright}   ✓ ALL CHECKS PASSED - READY TO BUILD APK   ${reset}`);
  console.log(`${green}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`);
  process.exit(0);
} else if (failCount === 0) {
  console.log(`${yellow}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`);
  console.log(`${yellow}${bright}   ⚠ WARNINGS PRESENT - REVIEW BEFORE BUILD   ${reset}`);
  console.log(`${yellow}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`);
  process.exit(0);
} else {
  console.log(`${red}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`);
  console.log(`${red}${bright}   ✗ FAILURES DETECTED - FIX BEFORE BUILDING   ${reset}`);
  console.log(`${red}${bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}\n`);
  console.log(`${bright}Next steps:${reset}`);
  console.log(`  1. Review failures above (marked with ${red}✗${reset})`);
  console.log(`  2. Apply suggested fixes`);
  console.log(`  3. Re-run: node test-admob.js`);
  console.log('');
  process.exit(1);
}
