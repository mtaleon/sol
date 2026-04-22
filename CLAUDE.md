# CLAUDE.md — Octile Universe Sudoku (PWA + Capacitor)

## Product Positioning

This project is a **standalone, high-quality, mobile-first Sudoku PWA** (web + Android via Capacitor) within the **Octile Universe**.

- Goal: feel like a complete Sudoku app on its own merit (not a minimal gateway).
- Octile promotion exists, but only as a **soft, post-satisfaction** extension.

## Tech Stack

- Vanilla JavaScript (ES modules) — no bundler or build tools required
- Capacitor for Android native app
- Service Worker for PWA
- Node.js native test runner

## Core Product Goals (Must-Haves)

The app must not feel half-finished. These are baseline expectations:

- Notes (candidates) + strong ergonomics
- Undo/Redo that covers values + notes + compound operations
- Mistakes tracking (configurable) + optional game-over
- Pause/Resume + reliable auto-save + resume after reload/app switch
- Settings toggles for highlight/notes/timer/mistakes
- Statistics (by difficulty/mode)
- Daily puzzle + streak
- Achievements (starter set)

## Explicit Non-Goals (Still Not Doing)

We avoid features that harm calm focus or create bloat without value:

- Aggressive monetization (forced ads, popups, urgency-driven funnels)
- Over-celebratory / noisy feedback (confetti, flashing, loud animations)
- Pressure mechanics beyond player choice (timer forced, unavoidable penalties)
- Mandatory accounts / login requirements
- Feature bloat without clear player value or UX justification

## Octile Universe UI / Tone DNA

Design philosophy: **calm, minimal, respectful**.
Minimal does NOT mean featureless.

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

Default feedback is subtle, not loud.
Any promotional content must be optional, non-blocking, and only after success moments.

## UI Architecture — Four Fixed Layers

Every gameplay screen follows this skeleton. Status and tools never share a row.

1. **HEADER** (status): Pause | Difficulty | Timer | Mistakes
2. **BOARD** (focus): Grid + lightweight highlights only
3. **KEYPAD** (input): 1–9 + Clear (long-press = clear notes)
4. **TOOLS** (operations): Undo | Notes | Hint

## Highlight System (Octile Rules)

Only **1 primary + 2 auxiliary** highlights at a time. Everything else is silent.

- Selected cell: border (primary accent), 1.5–2px solid
- Row/Col/Block: flat tint, ~6% opacity
- Same number: flat tint, ~3–4% opacity
- Conflict: red border + red tint (only the wrong cell), ~6% + 2px border
- Given cells: same background as editable, deeper text, uneditable (font-weight 700)

Hard rules:
- No radial gradients, no repeating stripes, no blur/glow effects.
- Errors are **precise**, not loud: only mark the incorrect cell(s).

## Interaction Rules (Mobile-first)

- Tap cell: select
- Tap number: place value (or toggle candidate if Notes active)
- Long-press Clear (>=300ms): clear notes in selected cell
- Hint works with or without selection:
  - If selected empty cell: hint that cell
  - Else: hint first empty cell (fallback)

Optional (polish):
- Long-press keypad number: Number Focus Mode (lock digit, quick fill)

## Cross-Promotion Rules (Octile)

Promotion must be **soft** and **post-satisfaction** only:
- Allowed moments: after puzzle completion, in stats screen footer, or settings "More from Octile"
- Not allowed: interrupting gameplay, blocking input, or penalizing refusal

Example allowed phrasing:
- "Looking for a deeper challenge?"
- "Octile explores this style of puzzle further."

The goal is awareness, not conversion pressure.

## Architecture

### 3-Layer Dependency Injection Pattern

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
EventBus → Game(eventBus, storage) → Board
         ↓
    Platform(renderer, input)
         ↓
    WebRenderer, WebInput, WebStorage
```

**Events:** Game logic emits events (`GAME_STARTED`, `BOARD_CHANGED`, `HIGHLIGHT_CHANGED`), platform code renders.

### Adding New Game Features

1. **Core logic** goes in `core/` (pure JS, no DOM)
2. **Emit event** from Game.js: `this.eventBus.emit('feature:event', data)`
3. **Add event constant** to `core/constants.js` if public event
4. **Handle in app.js**: `eventBus.on('feature:event', (data) => { renderer.update() })`
5. **Render in platform**: Add method to `platforms/web-dom/Renderer.js`

## Engineering Principles

- Preserve 3-layer architecture.
- All user-visible behavior must be deterministic, testable, and persisted.
- Auto-save must capture: grid, notes, timer state, mistakes, difficulty, undo/redo stacks.
- Always use `.js` extension in ES module imports.
- Never import platform code from core — use EventBus instead.

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
├── Generator.js         # Puzzle generation with uniqueness check
└── Settings.js          # User preferences (persisted)

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
```

## Source of Truth

- Roadmap and phases live in `PLAN.md`.
- Design tokens and UI specs live in `DESIGN.md`.
- CLAUDE.md is the stable behavioral spec: positioning, non-goals, UI rules, interaction rules.

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
