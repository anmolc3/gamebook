# Phase 9: Game Engine — Ludo World Arena

## Objective
Implement the server-authoritative 2-to-4 player Ludo World Arena module adhering to the standardized `GameEngine` architecture, featuring server-generated dice, complex token navigation, captures, safe zones, and multi-player placement rankings.

---

## Technical Scope & Requirements
- **Server Engine Module (`server/src/games/ludo/ludo.engine.ts`)**:
  - Implements `GameEngine<LudoState, LudoAction, LudoResult>`.
  - Cryptographically secure server-side dice roll generation (`crypto.randomInt(1, 7)`).
  - 4 quadrants (Red, Green, Yellow, Blue) with 4 tokens each (16 tokens total).
  - Yard exit validation (requires roll of 6 to exit to `step: 0`).
  - 52-cell circuit track navigation with color-specific home corridors (5 cells: `step: 51..55`) and center finish (`step: 56`).
  - Token capture mechanics: landing on an opponent token on non-safe track cells sends opponent token to yard (`step: -1`) and awards bonus turn.
  - 8 designated safe cells (4 color starts [0, 13, 26, 39] + 4 stars [8, 21, 34, 47]) preventing captures.
  - 3-consecutive-sixes penalty rule: rolling three 6s in a row voids turn and auto-advances to next player.
  - 20-second authoritative turn clocks with auto-advance and intelligent auto-move fallback.
- **Match Manager Integration (`server/src/games/match.manager.ts`)**:
  - Registered `LUDO` engine in central match coordinator.
  - Rotates player colors and first turn in rematches for fairness.
  - Dispatches `game:state` and `game:over` with order-of-finish placement tracking (1st through 4th).
- **Match Persistence**:
  - Records match outcomes, players data, and final board state in `GameResult`.
  - Updates lifetime stats across all participating users in `GameStatistics`.
- **Mobile Client Screen (`mobile/screens/games/LudoScreen.tsx`)**:
  - Themed SVG Ludo board rendering with 15x15 vector layout, 4 home yards, 52 circuit cells, safe star markers, home corridors, and finish triangles.
  - Interactive clickable token touch overlays with glowing rings for legal moves.
  - 3D/vector SVG dice roller displaying 1 to 6 pips with roll animation.
  - Player corner HUDs with turn indicators, 20s progress bar, and token progress counts (`X/4 Home`).
  - Modal with podium rankings and instant rematch controls ("Play Again", "Exit to Lobby").
  - Adheres strictly to Marvie iOS UI Kit tokens (`#2A3C44`, `#30444E`, `#3ED598`, `#FFC542`, `#FF575F`, `#0062FF`, 25px radius) and Zero emojis.

---

## Completion Checklist
- [x] Server Ludo engine module adhering to `GameEngine` contract (`server/src/games/ludo/ludo.engine.ts`)
- [x] Authoritative dice rolls with 3-consecutive-sixes penalty rule
- [x] Token pathing, yard exit, circuit track, and home corridor navigation
- [x] Capture mechanics and safe cell immunity logic (8 safe zones)
- [x] Order-of-finish placement tracking (1st through 4th)
- [x] Mobile Ludo board view with token movement animations (`mobile/screens/games/LudoScreen.tsx`)
- [x] Full automated test suite passing (67/67 assertions in `server/test-ludo.js`)
- [x] Mobile TypeScript check clean (`tsc --noEmit` 0 errors) and Hermes bundle compiled cleanly (`expo export -p android`)

---

## Current Status
**COMPLETED (100%)**
