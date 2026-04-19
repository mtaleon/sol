# Sudoku Game - Mobile-First PWA

A clean, modern Sudoku game built with vanilla JavaScript, featuring:
- ✅ **Sprint 1**: Core gameplay with data-driven highlighting
- ✅ **Sprint 2**: Puzzle generation with uniqueness validation + hints
- ✅ **Sprint 2.5**: Pencil marks/notes mode with long-press
- ✅ **Sprint 3**: PWA + Android build pipeline

## Features

### Core Gameplay
- **9×9 Sudoku grid** with validation
- **3 difficulty levels**: Easy (45 clues), Medium (38 clues), Hard (32 clues)
- **Real-time conflict detection** with visual feedback
- **Multi-layer highlighting**:
  - Selected cell (strong blue border)
  - Same numbers (medium blue background)
  - Row/col/box regions (light blue background)
  - Conflicts (red overlay)
- **Undo/redo** with move tracking
- **Timer** and move counter
- **Hint system** (fills one correct cell)

### Pencil Marks (Notes Mode)
- **Toggle notes mode** via button or **long-press** (300ms) on any cell
- **Visual feedback**: Notes displayed in 3×3 grid inside cells
- **Smart entry**: In notes mode, number input toggles notes; in regular mode, sets value

### PWA Features
- **Installable** from browser
- **Offline capable** with service worker
- **Responsive design** (iPhone SE → iPad)
- **Touch-optimized** controls

### Android
- **Native Android app** via Capacitor
- **Adaptive icons** support
- **Auto-build** on git tags via GitHub Actions

---

## Architecture

### 3-Layer Design (from 2048 reference)
```
core/               # Pure game logic (no DOM dependencies)
├── constants.js    # Config, events, demo puzzle
├── events.js       # Event bus (pub-sub)
├── Board.js        # Enhanced cell model + validation
├── Game.js         # Lifecycle, undo/redo, notes mode
├── Solver.js       # Backtracking solver with uniqueness check
└── Generator.js    # Puzzle generation

platform/           # Abstract interfaces
├── IRenderer.js    # Rendering contract
├── IInput.js       # Input contract
└── Platform.js     # DI container

platforms/web-dom/  # Web implementation
├── Renderer.js     # DOM rendering, highlights
├── Input.js        # Click, touch, keyboard, long-press
└── styles.css      # Responsive grid, animations
```

### Key Technical Decisions

**Data-Driven Highlighting** (Decision C):
- Compute state once → render once (no DOM thrashing)
- Highlight state: `{selected, sameNumber, region, conflicts}`

**Enhanced Cell Model** (Decision A):
```javascript
{
  value: 0-9,
  given: boolean,           // immutable puzzle cell
  notes: Set<1..9>,         // pencil marks
  conflict: boolean,        // derived from validation
  source: 'given'|'user'|'hint'
}
```

**Two-Tier Validation** (Decision B):
- Incremental: O(9) for live feedback
- Full scan: O(81) for completion check

**Uniqueness Validation** (Decision D):
```javascript
countSolutions(board, limit=2) {
  // Early exit at second solution
  // Returns: 0, 1, or 2 (>=2)
}
```

---

## Development

### Setup
```bash
npm install
```

### Run dev server
```bash
npm run dev
# Opens http://localhost:8000
```

### Build for production
```bash
npm run build
# Output: www/
```

### Test
```bash
npm test
# Runs Node.js native test runner
```

### Android

**Prepare Android build**:
```bash
npm run android:prepare
```

**Build debug APK**:
```bash
npm run android:build
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

**Build release APK** (requires signing):
```bash
npm run android:release
```

**Open in Android Studio**:
```bash
npm run android:open
```

---

## Deployment

### GitHub Pages (Automatic)
Push to `main` branch → GitHub Actions deploys to GitHub Pages

### Android APK (Automatic)
```bash
git tag v1.0.0
git push --tags
```
→ GitHub Actions builds APK and creates GitHub Release

---

## Testing Checklist

### Sprint 1 ✅
- [x] Load hardcoded puzzle
- [x] Click cells (highlights row/col/box)
- [x] Enter numbers 1-9
- [x] Clear with backspace/delete/clear button
- [x] Same numbers highlighted
- [x] Conflicts shown in red
- [x] Multi-layer highlights work simultaneously
- [x] Undo/redo working
- [x] Timer counts up
- [x] Completion modal shows

### Sprint 2 ✅
- [x] Generate Easy puzzle (45 clues, unique solution)
- [x] Generate Medium puzzle (38 clues, unique solution)
- [x] Generate Hard puzzle (32 clues, unique solution)
- [x] Generation time <2s (avg: 4ms!)
- [x] Difficulty selector modal
- [x] Hint button fills correct cell

### Sprint 2.5 ✅
- [x] Notes button toggles notes mode
- [x] Long-press (300ms) toggles notes mode
- [x] Notes displayed in 3×3 grid
- [x] Notes toggle on/off per cell
- [x] Visual feedback (green button, crosshair cursor)
- [x] Entering value clears notes

### Sprint 3 ✅
- [x] PWA manifest configured
- [x] Service worker caches assets
- [x] Installable from browser
- [x] Works offline
- [x] Android platform added
- [x] APK builds successfully
- [x] GitHub Actions deploy to Pages
- [x] GitHub Actions build Android APK

---

## Performance

- **Puzzle generation**: <10ms (avg: 4ms)
- **Uniqueness validation**: Early exit at 2nd solution
- **Rendering**: Data-driven (no DOM thrashing)
- **Mobile**: Touch-optimized, 48×48px minimum targets

---

## Future Enhancements

- [ ] Notes conflict highlighting (gray out invalid notes)
- [ ] Save/resume game (localStorage)
- [ ] Daily puzzle mode
- [ ] Statistics tracking
- [ ] Dark mode
- [ ] Sound effects
- [ ] Animations polish
- [ ] Sharing puzzles
- [ ] Leaderboards

### Potential Game Expansions (Same Architecture)
- Killer Sudoku
- Kakuro
- Nonograms
- Other logic puzzles

---

## License

MIT

---

## Credits

Architecture patterns inspired by [octile/2048](https://github.com/octile/2048)
