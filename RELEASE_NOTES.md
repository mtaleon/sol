# Sudoku by Octile — Release Notes

## Version 1.0.0

### Overview
A focused Sudoku experience for mobile. Clean interface, thoughtful controls, no distractions.

---

## Core Features

### Puzzle Generation
- Three difficulty levels: Easy (45 clues), Medium (38 clues), Hard (32 clues)
- All puzzles guaranteed to have exactly one solution
- Fast generation (typically under 10ms)

### Game Controls
- Tap cell to select, tap number to place
- Notes mode for pencil marks (toggle button or long-press any cell)
- Number pad automatically disables digits when all 9 instances are placed
- Clear button removes values (long-press to clear notes only)

### Navigation & Undo
- Undo reverses your last action
- Long-press Undo to redo (one-time tip shown)
- Up to 200 actions tracked
- Arrow keys supported on physical keyboards

### Visual Feedback
- Selected cell highlighted with border
- Same numbers highlighted across the grid
- Row, column, and 3×3 box regions subtly marked
- Conflicts shown immediately with red indicator
- Given (initial) cells clearly distinguished from user input

### Assistance
- Hint system fills selected cell with correct value
- Auto-solve available for stuck puzzles
- Hints tracked but do not prevent completion credit

### Progress Tracking
- Timer (can be hidden in settings)
- Mistakes counter with configurable limits: Off / 3 / Unlimited
- Game over triggers when mistake limit reached
- Auto-save: resume after closing app or switching tasks
- Pause/Resume with overlay

### Settings
- Mistake limit control
- Toggle timer visibility
- Auto-remove notes when placing values
- Highlight region (row/col/box)
- Highlight same numbers
- Show/hide conflict indicators
- Language selection

### Languages
- English
- Traditional Chinese (繁體中文)

### Platform
- Native Android app
- Works offline after first launch
- Lightweight (<5MB installed)
- Runs smoothly on older devices

---

## Design Philosophy

Part of the Octile Universe. Calm, focused interface designed for extended play sessions. No unnecessary animations, no pressure mechanics, no aggressive monetization.

---

## Help & Support

### How to Play
- In-app help accessible from pause menu
- Rule explanation and control guide
- Privacy policy included

### Contact
For feedback or issues: octile.team@gmail.com

---

## Technical Notes

### Architecture
- Pure JavaScript core logic
- Modular, testable codebase
- Service worker for offline support
- Capacitor for native Android features

### Privacy
- No personal data collection by app
- Game progress stored locally on device
- Optional ad serving via Google AdMob (see Privacy Policy)
- Anonymous gameplay statistics for puzzle difficulty tuning

---

## What's Not Included (By Design)

- No daily puzzle or streak mechanics
- No statistics or achievement system
- No account/login requirement
- No forced tutorial or onboarding flow
- No social features or leaderboards

These may be considered for future versions based on user feedback.

---

## Play Store Short Description (80 char limit)

Clean Sudoku for focused play. Three difficulties, notes, hints, offline.

---

## Play Store Full Description (4000 char limit)

A thoughtful Sudoku experience for mobile.

**Features**
• Three difficulty levels with guaranteed unique solutions
• Notes (pencil marks) with quick toggle
• Undo/Redo system
• Hint and auto-solve when needed
• Configurable mistake limits
• Timer (can be hidden)
• Auto-save and resume
• Works completely offline
• English and Traditional Chinese

**Design**
Clean interface optimized for extended sessions. No clutter, no pressure. Part of the Octile Universe of focused puzzle games.

**Privacy**
All game data is stored locally on your device. No account required. Ads are served by Google AdMob and may appear after puzzle completion. See in-app Privacy Policy for details.

**Support**
Questions or feedback: octile.team@gmail.com

---

## Play Store "What's New" (500 char limit)

**Version 1.0.0**

Initial release.

Core Sudoku with three difficulties. Notes mode for pencil marks. Undo/redo. Hints. Configurable mistake limits. Timer. Auto-save. Offline support. English and Traditional Chinese.

No daily puzzles, stats, or achievements in this version—focused on core gameplay quality first.

Feedback welcome: octile.team@gmail.com

---

## Changelog Format (for version updates)

### v1.0.1 (example for future)
- Fixed: [specific bug]
- Improved: [specific enhancement]
- Changed: [specific behavior change]

### v1.0.0
- Initial release

---

## Feature Highlights (for marketing/screenshots)

1. **Three Difficulties** — Easy, Medium, Hard with guaranteed unique solutions
2. **Smart Notes** — Pencil marks with long-press toggle and auto-removal
3. **Undo/Redo** — Up to 200 actions, long-press to redo
4. **Visual Clarity** — Clean highlights, conflict detection, number exhaustion
5. **Flexible Settings** — Control mistakes, timer, highlights, language
6. **Offline First** — Full functionality without internet
7. **Pause Anytime** — Auto-save preserves your progress
8. **Bilingual** — English and Traditional Chinese

---

## ASO Keywords (for Play Store search)

sudoku, puzzle, logic, brain, offline, pencil marks, notes, hints, number game, classic sudoku, sudoku free, no ads pressure, calm puzzle, zen game, octile

---

## Rating Prompts (when implemented)

**After 3 completed games:**
"Enjoying Sudoku? A rating helps others find a calm puzzle experience."
[Rate now] [Later] [No thanks]

**Never show again if dismissed twice.**

---

## Notes for Developer

- Version code in `android/app/build.gradle`: `versionCode` (increment for each release)
- Version name in `android/app/build.gradle` and `package.json`: `versionName` / `version`
- Tag releases: `git tag v1.0.0 && git push --tags`
- GitHub Actions will auto-build APK on tag push
- Update this file's "What's New" section for each release
