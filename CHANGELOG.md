# Changelog

All notable changes to Sudoku by Octile will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Statistics tracking (wins, best times, streaks)
- Daily puzzle with streak counter
- Achievement system (starter set)
- Import/Export puzzle feature
- Number Focus Mode (long-press number for quick-fill)

---

## [1.0.0] - 2026-04-24

### Added
- Initial release
- Core Sudoku gameplay with 9×9 grid
- Three difficulty levels: Easy (45 clues), Medium (38 clues), Hard (32 clues)
- Puzzle generation with uniqueness validation
- Notes/Pencil marks mode
- Toggle notes via button or long-press any cell (300ms)
- Undo/Redo system (up to 200 actions)
- Long-press Undo to redo
- Clear button (long-press to clear notes only)
- Timer with toggle in settings
- Mistakes tracking with configurable limits (Off / 3 / Unlimited)
- Game over when mistake limit reached
- Hint system (fills selected cell or first empty cell)
- Auto-solve feature for stuck puzzles
- Pause/Resume with overlay
- Auto-save and resume on app restart
- Multi-layer highlighting:
  - Selected cell (border)
  - Same numbers
  - Row/column/3×3 box regions
  - Conflicts (red indicator)
- Number pad exhaustion (auto-disable at 9 instances)
- Settings panel:
  - Mistake limit control
  - Timer visibility
  - Auto-remove notes on value placement
  - Highlight region toggle
  - Highlight same numbers toggle
  - Show conflicts toggle
  - Language selection
- Completion modal with statistics
- Game over modal
- Help/How to Play section
- About section with version info
- Privacy policy
- Bilingual support: English and Traditional Chinese (繁體中文)
- Keyboard support (arrow keys, digits, shortcuts)
- PWA support (installable, offline-capable)
- Native Android app via Capacitor
- AdMob integration (interstitial ads after completion)
- Anonymous score submission for difficulty tuning
- OTA update support

### Design Principles
- Calm, focused interface (Octile Universe style)
- No unnecessary animations or distractions
- No forced tutorials or onboarding
- No account/login requirement
- No daily pressure mechanics
- Respects player focus and time

---

## Release Notes Format for Future Versions

### [X.Y.Z] - YYYY-MM-DD

#### Added
- New features or capabilities

#### Changed
- Changes to existing functionality

#### Fixed
- Bug fixes

#### Removed
- Removed features or deprecations

#### Performance
- Performance improvements

#### Security
- Security patches or improvements

---

## Version Numbering Guide

- **Major (X.0.0)**: Breaking changes, major redesigns, fundamental feature additions
- **Minor (0.X.0)**: New features, enhancements, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, small tweaks, performance improvements

Examples:
- `1.0.0` → `1.0.1`: Bug fix
- `1.0.1` → `1.1.0`: Added statistics feature
- `1.1.0` → `2.0.0`: Major redesign or breaking change

---

## Play Store "What's New" Template

Keep under 500 characters. Focus on user-facing changes.

### Version X.Y.Z

[Brief description of main changes]

• [Feature 1]
• [Feature 2]
• [Bug fix or improvement]

Feedback: octile.team@gmail.com

---

## Internal Version Tracking

- `versionCode` (integer in build.gradle): Increment for every Play Store upload
- `versionName` (string in build.gradle): User-facing version (X.Y.Z)
- `package.json version`: Keep in sync with versionName
- Git tags: `v1.0.0` format

**Before each release:**
1. Update CHANGELOG.md
2. Update versionCode and versionName in `android/app/build.gradle`
3. Update version in `package.json`
4. Commit changes
5. Create git tag: `git tag vX.Y.Z`
6. Push with tags: `git push origin main --tags`

---

## Notes

- All versions follow Octile Universe design principles
- Tone in all user-facing text: calm, respectful, factual
- No marketing language or hype
- Changes should enhance focus, not distraction
