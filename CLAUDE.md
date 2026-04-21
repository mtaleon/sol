# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first Sudoku PWA with Android support, built with vanilla JavaScript and ES modules. No bundler or build tools required—just file copying and Capacitor for Android builds.

**Tech Stack:**
- Vanilla JavaScript (ES modules)
- Capacitor for Android native app
- Service Worker for PWA
- Node.js native test runner



## Octile Universe Context (Important)

This project is a **free entry game** within the Octile Universe.

Its purpose is NOT to be a fully-fledged product, but to:
- introduce logical, calm puzzle thinking
- act as a low-friction gateway to Octile
- respect player intelligence without aggressive engagement mechanics

This means:

✅ The game should feel complete enough to enjoy  
❌ but intentionally NOT as deep, long-term, or feature-rich as Octile

Any changes should reinforce Octile as the **primary destination for depth and replayability**.

Any new UI text added must be reviewed against the “Calm, restrained tone” rule.
Exclamation marks are generally discouraged across the Octile Universe.


## Explicit Non-Goals (Do NOT add)

The following are intentionally avoided in this project:

- Daily / weekly challenges
- Long-term progression systems
- Meta unlocks or collectibles
- Account systems or cross-session achievements
- Competitive or time-pressure mechanics
- Over-celebratory feedback or hype-driven UI

If a feature would make this game feel like a standalone flagship product,
it likely does NOT belong here.

## UI / Tone Alignment (Octile Universe)

All UI and copy changes must follow Octile Universe guidelines:

Tone:
- calm
- restrained
- respectful
- non-marketing
- non-judgmental

Avoid:
- exclamation-heavy copy
- praise-focused messaging ("Amazing!", "You're a genius!")
- urgency or reward-pressure language

Prefer:
- neutral statements
- reflective feedback
- subtle encouragement

## Cross-Promotion Rules (Free Game → Octile)

This game may reference Octile only in a **soft, non-intrusive way**.

Rules:
- Show at most ONE cross-promotion entry point
- Only trigger after a satisfaction moment (e.g. game completion)
- Never interrupt active gameplay
- Treat Octile as a natural next step, not a call-to-action

Example allowed phrasing:
- "Looking for a deeper challenge?"
- "Octile explores this style of puzzle further."

The goal is awareness, not conversion pressure.

## Architecture

### 3-Layer Dependency Injection Pattern

Inspired by [octile/2048](https://github.com/octile/2048), the codebase uses a strict 3-layer architecture:

```
core/          → Pure game logic (zero DOM/platform dependencies)
platform/      → Abstract interfaces (IRenderer, IInput, IStorage)
platforms/     → Platform implementations (web-dom, console)
```

**Critical Rule:** `core/` modules NEVER import from `platform/` or `platforms/`. All communication happens via:
1. **EventBus** (pub-sub for game events)
2. **Dependency Injection** (Platform.js wires renderer/input to game)

### Core Game Flow

```javascript
// app.js wires everything together:
EventBus → Game(eventBus, storage) → Board
         ↓
    Platform(renderer, input)
         ↓
    WebRenderer, WebInput, WebStorage
```

**Events:** Game logic emits events (`GAME_STARTED`, `BOARD_CHANGED`, `HIGHLIGHT_CHANGED`), platform code renders.

### Data Models

**Enhanced Cell Model** (`core/Board.js`):
```javascript
{
  value: 0-9,              // 0 = empty
  given: boolean,          // immutable puzzle clue
  notes: Set<1..9>,        // pencil marks
  conflict: boolean,       // validation state
  source: 'given'|'user'|'hint'|'solver'
}
```

**Highlight State** (data-driven, computed once per event):
```javascript
{
  selected: cellId,        // currently selected cell
  sameNumber: Set<id>,     // cells with same value
  region: Set<id>,         // row/col/box of selected
  conflicts: Set<id>       // cells in conflict
}
```

### Key Technical Decisions

1. **Data-Driven Rendering**: Compute highlight state once → render once (no DOM thrashing)
2. **Two-Tier Validation**: 
   - Incremental O(9) for live feedback during input
   - Full scan O(81) for completion check
3. **Uniqueness Check**: `countSolutions()` with early exit at 2nd solution
4. **Auto-Save**: Every move saves to localStorage via `IStorage` interface

## Development Commands

### Daily Development
```bash
npm run dev              # Build + serve on http://localhost:8000
npm test                 # Run Node.js native tests (core/**/*.test.js)
npm run build            # Build to www/ directory
```

### Console Mode (Debugging)
```bash
npm run play             # Terminal-based Sudoku for testing core logic
```

### Android Development
```bash
npm run android:prepare  # Sync web files to Android project
npm run android:build    # Build debug APK
npm run android:open     # Open in Android Studio
npm run android:bundle   # Build release AAB for Play Store
```

**APK Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Testing Utilities
```bash
node test-generator.mjs  # Test puzzle generation
node test-solver.mjs     # Test solver algorithm
node test-save-resume.mjs # Test localStorage persistence
```

## Important Patterns

### Adding New Game Features

1. **Core logic** goes in `core/` (pure JS, no DOM)
2. **Emit event** from Game.js: `this.eventBus.emit('feature:event', data)`
3. **Add event constant** to `core/constants.js` if public event
4. **Handle in app.js**: `eventBus.on('feature:event', (data) => { renderer.update() })`
5. **Render in platform**: Add method to `platforms/web-dom/Renderer.js`

### Adding New Platform Support

To add a new platform (e.g., iOS, desktop app):

1. Create `platforms/[platform]/` directory
2. Implement interfaces:
   - `IRenderer.js` → rendering contract
   - `IInput.js` → input handling contract  
   - `IStorage.js` → persistence contract
3. Wire in entry point (like `app.js` for web)
4. Core logic requires zero changes

## Project Structure

```
app.js                   # Web entry point, wires platform + game
index.html               # Main HTML, loads app.js as module
manifest.json            # PWA manifest
sw.js                    # Service worker for offline support

core/
├── constants.js         # Events, config, demo puzzle
├── events.js            # EventBus (pub-sub)
├── Board.js             # Cell model, validation, region queries
├── Game.js              # Lifecycle, undo/redo, notes mode, save/resume
├── Solver.js            # Backtracking solver + hint system
└── Generator.js         # Puzzle generation with uniqueness check

platform/
├── IRenderer.js         # Rendering interface contract
├── IInput.js            # Input interface contract
├── IStorage.js          # Storage interface contract
└── Platform.js          # DI container

platforms/web-dom/
├── Renderer.js          # DOM rendering, highlights, modals
├── Input.js             # Mouse, touch, keyboard, long-press
├── Storage.js           # localStorage wrapper
└── styles.css           # Responsive grid, animations

platforms/console/       # Terminal-based implementation
```

## Deployment

### Automatic Deployments

**GitHub Pages**: Push to `main` → auto-deploys web app
```bash
git push origin main
```

**Android APK**: Push git tag → builds and releases APK
```bash
git tag v1.0.0
git push --tags
```

### Manual Deployments

See `DEPLOY.md` for:
- Android keystore setup for Play Store
- GitHub secrets configuration for CI
- Store listing requirements

## Testing Strategy

### Current State
- No unit test files exist yet (test command references `core/**/*.test.js`)
- Manual testing via `test-*.mjs` scripts
- Integration testing via `test-*.html` files

### When Adding Tests
- Use Node.js native test runner (`node --test`)
- Place test files alongside source: `core/Game.test.js`
- Test core logic only (pure functions, no DOM)
- Platform code tested via manual QA

## Common Gotchas

1. **Import Paths**: Always use `.js` extension in ES module imports
   ```javascript
   import { Game } from './core/Game.js';  // ✅
   import { Game } from './core/Game';     // ❌
   ```

2. **Platform Boundaries**: Never import platform code from core
   ```javascript
   // In core/Game.js:
   import { WebRenderer } from '../platforms/web-dom/Renderer.js';  // ❌
   // Use EventBus instead ✅
   ```

3. **Auto-Save**: Game auto-saves after every move to `localStorage['sudoku-save']`
   - Hydrates on page load via `game.loadSavedGame()`
   - Cleared on completion or explicit restart

4. **Notes Mode**: 
   - Toggle via button OR long-press (300ms) on any cell
   - In notes mode, number input toggles notes
   - Setting a value clears that cell's notes

5. **Dev Server**: Use `npm run dev` (not raw `python -m http.server`) to ensure build runs first

## Performance Targets

- Puzzle generation: <10ms (currently ~4ms avg)
- Uniqueness validation: Early exit at 2nd solution
- Rendering: Data-driven (single highlight computation per event)
- Mobile: Touch targets ≥48×48px

## Version Management

Before releasing:
1. Bump `android/app/build.gradle` → `versionCode` (integer) and `versionName`
2. Bump `package.json` → `"version"`
3. Create git tag: `git tag v1.2.0 && git push --tags`
