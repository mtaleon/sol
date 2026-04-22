# PLAN.md — Sudoku Feature Improvement Roadmap

## Foundational Rules (cross-cutting specs)

### R1. Game Outcome Classification

| Player action | Outcome | Recorded in stats? |
|---------------|---------|---------------------|
| All cells correct, matches solution | **Win** | Yes (won: true) |
| Hit mistake limit | **Loss** | Yes (won: false) |
| Restart same puzzle | **Abandoned** | No |
| Quit / New Game mid-game | **Abandoned** | No |
| Use Solve (auto-solve) | **Assisted** | No |

Win detection: `GAME_COMPLETED` fires when all 81 cells non-zero AND match `this.solution`.

### R2. Hint Rules

- Hints fill correct value from pre-computed `this.solution`
- Hints **still count as a win** (not assisted)
- Hints affect: `hintsUsed` counter, `no_hints` achievement, stats `totalHints`
- Hints do NOT affect: win/loss classification, best/average time
- Only `Solve` (auto-solve all cells) is Assisted — not recorded
- Hint cells: `cell.source = 'hint'`

### R3. Mistake Limit Serialization

| Display | Internal | Stored |
|---------|----------|--------|
| Off | 0 | `0` |
| 3 (default) | 3 | `3` |
| ∞ | -1 | `-1` |

Game over: `if (mistakeLimit > 0 && mistakes >= mistakeLimit)`

### R4. Difficulty Enum

`EASY` (45 clues) / `MEDIUM` (38) / `HARD` (32) / `CUSTOM` (imported).
Daily = always MEDIUM. CUSTOM in "All" stats tab only.

### R5. Daily Replay Policy

After completion: show result + "Replay (practice)" button.
Practice: no streak update, no stat recording, `isPractice: true`.

### R6. Number Exhaustion

Digit at 9 instances → fully disabled (no value, no note). Re-count on every board change.

### R7. Undo/Redo Stack

Max 200 top-level actions. Compound counts as 1. Shift oldest on overflow.

### R8. Redo Discoverability

Long-press Undo (300ms) = Redo. One-time toast on first undo. `title` attribute for web.

---

## Phase 1 — Complete Product Baseline

### 1.1 Undo/Redo Rewrite
- Discriminated union: `value` / `note` / `compound` action types
- 200-action cap with FIFO eviction
- Long-press Undo = Redo

### 1.2 Save Format v1 → v2
- Add: difficulty, mistakes, hintsUsed, solution, puzzleHash, pausedDuration, undoStack, redoStack
- Migration: detect v1, solve for solution, fill defaults

### 1.3 Settings System (`core/Settings.js`)
- Keys: mistakeLimit (0/3/-1), showTimer, autoRemoveNotes, highlightRegion, highlightSameNumber, showConflicts
- localStorage key: `sudoku-settings`

### 1.4 Mistakes + Game Completion + Game Over
- Pre-compute solution on `startGame()`
- Mistake check in `setCell()` against solution
- Enriched `GAME_COMPLETED` payload: `{elapsed, moves, mistakes, hintsUsed, difficulty, isDaily}`
- New events: `MISTAKE_MADE`, `GAME_OVER`, `GAME_PAUSED`, `GAME_RESUMED`, `SETTINGS_CHANGED`

### 1.5 Pause + Resume
- `pausedDuration` accumulator, persisted in save
- Timer: `elapsed = (now - startTime - pausedDuration) / 1000`
- Guard all input methods when paused
- Overlay: covers board, shows Resume / Restart / New Game / Settings

### 1.6 Notes Strengthening
- Clear split: short-press = clear value, long-press = clear notes
- Auto-remove: place value → remove that digit from peer notes → compound undo
- New: `Board.getPeerCells(row, col)`

### 1.7 Improved Hints
- Hint selected cell (or first empty as fallback)
- Use pre-computed `this.solution[cellId]`
- Increment `hintsUsed`, mark `cell.source = 'hint'`

### 1.8 Highlight CSS Cleanup
- Strip radial gradients, stripes, blur/glow
- Flat rgba tints: region 6%, same-number 4%, conflict 6%
- Selected = border only, given = same bg + weight 700

### 1.9 Four-Layer Layout
- Header: Pause | Difficulty | Timer | Mistakes
- Keypad: 1-9 only
- Tools: Undo | Notes | Hint | Clear
- Remove: New Game button (→ pause menu), standalone Redo button

### 1.10 Number Pad Exhaustion
- Count digits on BOARD_CHANGED, disable at 9 (value + note)
- CSS: `.exhausted { opacity: 0.25; pointer-events: none }`

### 1.11 Game Over Modal
- Calm tone, stats display, "Try again" + "New game"

### 1.12 Settings Modal
- Toggles for all Settings keys
- Mistake limit: Off / 3 / ∞ selector

---

## Phase 2 — Retention

### 2.1 Statistics (`core/Statistics.js`)
- Per-difficulty: played, won, bestTime, totalTime, zeroMistakes, totalHints
- Streaks: win streak, daily streak
- Last 50 game summaries
- Tabs: All / Easy / Medium / Hard (CUSTOM in All only)

### 2.2 Daily Puzzle + Streak
- `core/Random.js`: Mulberry32 seeded PRNG
- Seed: `parseInt('YYYYMMDD')`, always MEDIUM
- Practice replay after completion (no stat/streak impact)

### 2.3 Achievements (12 starter)
- `core/Achievements.js`
- first/5/20 wins, perfect x1/x5, no-hints, streak 3/7/14, marathon 1h/5h, daily streak 7
- Calm toast on unlock

---

## Phase 3 — Polish

### 3.1 Import/Export
- 81-char string, validate uniqueness, CUSTOM difficulty

### 3.2 Number Focus Mode
- Long-press keypad number → lock digit, quick-fill

### 3.3 Touch Feedback + Safe Area
- `:active` states, iOS safe-area padding
