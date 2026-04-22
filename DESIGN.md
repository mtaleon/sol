# DESIGN.md — Octile Universe Sudoku Design Tokens

## Color Palette

### Base Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#ffffff` | Page background |
| `--color-surface` | `#f5f8fa` | Cards, modals, tool bar bg |
| `--color-grid` | `#41566f` | Grid borders, primary text |
| `--color-text` | `#333333` | Body text |
| `--color-text-muted` | `#666666` | Secondary text, labels |
| `--color-text-subtle` | `#999999` | Inactive notes, placeholders |

### Interactive Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#7986b8` | Selected border, active Notes btn |
| `--color-warning` | `#dc3545` | Conflict only (never decorative) |
| `--color-hint` | `#5a9a7a` | Hint accent (single allowed accent) |

### Highlight Opacities (critical — keeps board clean)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-region-bg` | `rgba(52, 72, 97, 0.06)` | Row/col/block tint (6%) |
| `--color-same-number-bg` | `rgba(121, 134, 184, 0.04)` | Same digit tint (4%) |
| `--color-conflict-bg` | `rgba(220, 53, 69, 0.06)` | Conflict cell bg (6%) |
| `--color-selected-border` | `#7986b8` | Selected cell border |
| `--color-conflict-border` | `#dc3545` | Conflict cell border |

### Hard Rules
- No radial gradients on highlights
- No repeating-linear-gradient stripes
- No blur / glow / backdrop-filter on game board
- Conflict styling only on the incorrect cell(s), never entire row/col/box

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page title | System stack | 1.5rem | 700 |
| Cell value | System stack | 50% of cell | 500 |
| Cell value (given) | System stack | 50% of cell | 700 |
| Note digit | System stack | 20% of cell | 600 (active), 400 (inactive) |
| Header stats | System stack | 0.875rem | 400 |
| Tool label | System stack | 0.625rem | 500 |
| Modal title | System stack | 1.25rem | 600 |
| Stat card number | System stack | 1.5rem | 700 |
| Stat card label | System stack | 0.75rem | 400 |
| Toast | System stack | 0.875rem | 500 |

System stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Inner cell padding, icon gaps |
| `--space-sm` | 8px | Button gaps, small margins |
| `--space-md` | 12px | Section gaps, card padding |
| `--space-lg` | 16px | Modal padding, row gaps |
| `--space-xl` | 24px | Section spacing |

## Grid Sizing

| Token | Value |
|-------|-------|
| `--grid-size` | `clamp(300px, 90vw, 500px)` |
| `--cell-size` | Computed: `grid-size / 9` |
| `--gap` | `1px` (inner cell borders) |
| `--box-border` | `2px` (3x3 box borders) |

## Button Specs

### Number Pad (Keypad Layer)
- Height: 48px (desktop), 44px (mobile)
- Min touch target: 48x48px
- Background: `--color-surface`
- Border-radius: 8px
- Gap between buttons: `--space-sm`
- Font size: 1.125rem, weight 600
- Exhausted state: `opacity: 0.25; pointer-events: none`

### Tool Bar (Tools Layer)
- Layout: icon (20px) above label (small text)
- Height: 56px total
- Background: transparent (or `--color-surface` if separated)
- Gap: `--space-md`
- Default state: `--color-text-muted`
- Active state (Notes only): `--color-primary` icon + label
- No button gets color except Notes when active

### Header Buttons
- Pause button: 32x32px, icon-only, `--color-text-muted`
- Difficulty label: tappable, `--color-text`, weight 500

## Modal Specs

- Overlay: `rgba(0, 0, 0, 0.5)`
- Content: `--color-bg`, border-radius 16px, padding `--space-lg`
- Mobile: slides up from bottom, border-radius 16px 16px 0 0
- Max width: 400px (desktop)
- Animation: 300ms fade-in (overlay) + slide-up (content)

## Stat Cards

- Background: `--color-surface` (light, not dark blocks)
- Border-radius: 12px
- Padding: `--space-md`
- Layout: large number top, small label bottom
- Grid: 2 columns, `--space-sm` gap
- No heavy borders or shadows — keep flat

## Toast Notifications

- Position: top center, below header
- Width: auto, max 320px
- Background by type:
  - info: `#e8f0fe` (light blue)
  - success: `#e6f4ea` (light green)
  - warning: `#fef7e0` (light yellow)
  - error: `#fce8e6` (light red)
- Text color: `--color-text`
- Border-radius: 8px
- Auto-dismiss: 3 seconds
- Animation: slide in from top, fade out

## Safe Area

- iOS bottom: `padding-bottom: env(safe-area-inset-bottom)`
- Apply to: Tools layer (bottom-most interactive element)
- Fallback: 0px for non-notch devices

## Touch Feedback

- All interactive elements need `:active` state
- Buttons: scale(0.97) + slightly darker bg on `:active`
- Cells: no transform, just highlight change
- `touch-action: manipulation` on interactive elements (prevent 300ms delay)
