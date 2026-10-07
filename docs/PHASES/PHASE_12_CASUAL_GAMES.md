# Phase 12: Casual & Arcade Games

## Objective
Implement six casual arcade and sports titles on the platform: 8 Ball Pool, Mini Golf, Air Hockey, Darts, Bowling, and Table Tennis.

---

## Game Modules
1. **8 Ball Pool Arena (`POOL_8_BALL`)**:
   - Server-validated cue ball impulse, ball-to-ball collisions, solid/stripe designation, and 8-ball pocketing rules.
2. **Mini Golf Battle (`MINI_GOLF`)**:
   - 9-hole course progression with stroke counters, obstacle bouncers, and water hazard resets.
3. **Air Hockey (`AIR_HOCKEY`)**:
   - Mallet boundary clamping, puck physics, goal triggers, and first-to-7 score victory.
4. **Darts 501 (`DARTS`)**:
   - Dartboard sectors (single, double, triple, bullseye) with score subtraction and double-out checkout rule.
5. **Bowling Strike (`BOWLING`)**:
   - 10 frames, strike and spare scoring bonuses, gutter detection, and final frame bonus rolls.
6. **Table Tennis Duel (`TABLE_TENNIS`)**:
   - Alternating service rules, rally point scoring, deuce advantage, and match points.

---

## Current Status
COMPLETED

---

## Architectural Implementation Summary

### 1. Game Engines (`server/src/games/casual/`)
- **8 Ball Pool Arena (`pool8ball.engine.ts`)**:
  - Standardized 16-ball setup: Cue ball in kitchen (headstring), 1..7 Solids, 8 Black Eight-Ball in center, 9..15 Stripes in triangle rack.
  - Server-validated cue ball impulse with angle (-85° to +85°) and power (1% to 100%).
  - Authoritative suit designation: Shooter is assigned `SOLIDS` or `STRIPES` on first legal object ball pocketed.
  - Scratch foul handling: Cue ball pocketed triggers scratch, resets cue ball to kitchen, grants opponent `ballInHand: true`.
  - 8-Ball pocketing victory conditions: Sinking 8-ball after clearing suit awards win; sinking 8-ball early or on scratch triggers instant loss.
- **Mini Golf Battle (`minigolf.engine.ts`)**:
  - 3-hole course progression with distinct geometry, tee positions, cup capture radii, and par scores.
  - Obstacle physics: Wall bumpers, sand bunker friction drag, and water hazard stroke penalties with ball resets.
  - Cup capture within radius <= 35 units marks hole completed.
  - Tournament stroke counting: Lowest cumulative strokes across all holes wins.
- **Air Hockey (`airhockey.engine.ts`)**:
  - 800x1200 neon table with center dividing red line, center face-off circle, and 320px top & bottom goal slots.
  - Strict mallet boundary clamping: Player 1 restricted to bottom half (600..1200), Player 2 to top half (0..600).
  - Multi-step physics simulation for puck trajectory, cushion wall bounces, and goal line triggers.
  - First-to-7 score victory condition with automatic center puck resets and conceding player service.
- **Darts 501 (`darts.engine.ts`)**:
  - Standard London clock 20-sector order with geometric angle & radius mapping.
  - Concentric wire rings: Inner Bullseye (50 pts, double), Outer Bullseye (25 pts), Triple ring (3x), Double ring (2x), and Single sectors.
  - 3 darts per turn countdown with score subtraction.
  - Traditional Bust rule: Dropping below 0, reaching 1, or reaching 0 on non-double reverts all points in current turn.
  - Double-out checkout rule: Must reach exactly 0 on a double or double bullseye to win.
- **Bowling Strike (`bowling.engine.ts`)**:
  - Full 10-frame bowling game with 10-pin triangle rack simulation.
  - Roll physics: Lane position (-50..50), angle (-25..25), speed (1..100), and spin (-10..10).
  - Gutter ball detection (|impactX| >= 45) and pocket strike detection (|impactX| <= 6).
  - Traditional Ten-Pin Bowling scoring with lookahead bonus tallies (Strike: 10 + next 2 rolls; Spare: 10 + next 1 roll).
  - 10th frame bonus rolls (up to 3 rolls on strike or spare in frame 10).
- **Table Tennis Duel (`tabletennis.engine.ts`)**:
  - Blue table surface with center dividing line, net mesh barrier, and boundary zones.
  - Serve and rally lifecycle: Serve starts point, returns alternate turns and increment rally counters.
  - Shot dynamics with topspin, backspin, flat, smash, drop shot types.
  - Out-of-bounds shots award points to opponent.
  - 11-point games with 2-point lead deuce advantage to win.
  - Service rotation every 2 points (and every 1 point during deuce).

### 2. Client Interface (`mobile/screens/games/CasualGameScreen.tsx`)
- Handcrafted pure vector SVG boards for all 6 arcade titles:
  - 8 Ball Pool: Green felt baize table with wooden rails, 6 pockets, colored balls with numerals, and cue aiming ray.
  - Mini Golf: Putting green fairway with water pond ripples, sand bunker, red flag pin, and cup.
  - Air Hockey: Overhead neon table with cyan boundary glow, red center line, blue/red mallets, and glowing puck.
  - Darts: 20-sector London clock dartboard with concentric triple/double wire rings, number labels, and green aim reticle.
  - Bowling: Parquet wood bowling lane with planks, approach arrows, side gutters, 10 pins, and 3-hole bowling ball.
  - Table Tennis: Blue table with white boundary lines, center stripe, net barrier, red/black paddles, and ball bounce trails.
- Marvie iOS UI Kit aesthetic:
  - Dark Slate foundation (`#1F2C34`, `#263843`, `#30444E`), Mint primary (`#3ED598`), 25px card radius, 54px buttons.
  - Player Versus HUD, turn countdown timer, interactive aiming dials, power gauges, and spin selectors.
  - Rematch handshake modal and lobby return navigation.

### 3. Automated Test Verification
- Server Test Suite (`server/test-casual-games.js`): **35 Passed, 0 Failed (100% Pass Rate)**.
- System Regressions:
  - `test-board-games-2.js`: 36 Passed, 0 Failed.
  - `test-board-games-1.js`: 57 Passed, 0 Failed.
  - `test-tictactoe.js`: 52 Passed, 0 Failed.
  - `test-ludo.js`: 47 Passed, 0 Failed.
  - Total automated assertions passing: **313+ tests across all phases, 0 regressions**.
  - Mobile TypeScript Check (`npm run ts:check`): **0 errors**.
  - Expo Android Bytecode Bundle (`npx expo export -p android`): **772 modules bundled cleanly (2.1 MB bytecode)**.

