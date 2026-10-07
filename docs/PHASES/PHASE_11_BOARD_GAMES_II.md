# Phase 11: Board Game Expansion II

## Objective
Implement seven additional rich traditional board games on the modular `GameEngine` architecture: Carrom, Snakes & Ladders, Battleship, Dominoes, Backgammon, Mancala, and Chinese Checkers.

---

## Game Modules
1. **Carrom Board (`CARROM`)**:
   - 2-4 player board with physics-based striker aiming, power charging, carrom men pocketing, and queen cover mechanics.
2. **Snakes & Ladders (`SNAKES_AND_LADDERS`)**:
   - 2-4 player 100-square grid with server dice rolls, ladder jumps, and snake slides.
3. **Battleship Fleet Command (`BATTLESHIP`)**:
   - Dual 10x10 hidden grids: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
   - Secret setup phase, alternating coordinate firing, Hit/Miss/Sunk feedback.
4. **Dominoes Duel (`DOMINOES`)**:
   - Double-six 28-tile set with hand distribution, bone yard drawing, and chain end matching.
5. **Backgammon (`BACKGAMMON`)**:
   - 24 points/triangles, dual dice rolls, bar captures, and bearing off.
6. **Mancala (`MANCALA`)**:
   - 12 pits and 2 stores; sowing pebbles counterclockwise, free turns on store finish, and capture rules.
7. **Chinese Checkers (`CHINESE_CHECKERS`)**:
   - 2-6 players on a hexagram star board with single steps and multi-hop jumps.

---

## Current Status
COMPLETED

---

## Architectural Implementation Summary

### 1. Game Engines (`server/src/games/board2/`)
- **Carrom Board (`carrom.engine.ts`)**:
  - Implemented 19 carrom men (1 Queen, 6 inner circle, 12 outer circle) with polar coordinate physics simulation.
  - Baseline striker placement bounded between 15% and 85%.
  - Angle targeting (-85° to +85°) and power charge (10% to 100%).
  - Queen pocketing with requirement to cover with another piece within the same or following turn.
  - Striker foul penalty returning a pocketed piece to center circle.
- **Snakes & Ladders (`snakesandladders.engine.ts`)**:
  - 100-cell grid with exact landing rule on cell 100.
  - 8 classical Ladders: (4->14, 9->31, 20->38, 28->84, 40->59, 51->67, 63->81, 71->91).
  - 8 classical Snakes: (17->7, 54->34, 62->18, 64->60, 87->24, 93->73, 95->75, 99->78).
  - Bonus roll awarded on rolling a 6; automatic consecutive roll handling.
- **Battleship Fleet Command (`battleship.engine.ts`)**:
  - 10x10 hidden tactical grids for both Commander fleets.
  - 5 naval ships per player: Carrier (size 5), Battleship (size 4), Cruiser (size 3), Submarine (size 3), Destroyer (size 2).
  - Secret deployment setup phase with orthogonal overlap validation.
  - Authoritative fog-of-war masking hiding opponent ship locations until fired upon.
  - Hit/Miss detection, individual ship sinking detection, and total fleet destruction win evaluation.
- **Dominoes Duel (`dominoes.engine.ts`)**:
  - Double-Six 28 tile set (`[0,0]` to `[6,6]`) shuffled via CSPRNG.
  - 7 tiles distributed to each player; remaining tiles sent to boneyard.
  - Left/right matching placement logic with tile flipping.
  - Draw tile action when no legal plays exist.
  - Winner detected either when hand emptied (Domino!) or lower pip count in blocked/exhausted hands.
- **Backgammon (`backgammon.engine.ts`)**:
  - Standard 24 points FIDE setup: White checkers at points 24 (2), 13 (5), 8 (3), 6 (5); Black checkers at points 1 (2), 12 (5), 17 (3), 19 (5).
  - Dual dice rolls with double bonus (4 move allocations).
  - Blot hitting: Single opponent checker hit sent to the bar.
  - Mandatory bar re-entry before standard point movements.
  - Home board bearing off phase once all 15 checkers reach inner quadrant.
- **Mancala Kalah (`mancala.engine.ts`)**:
  - 12 playing pits (6 per player) initialized with 4 stones each, and 2 Kalah stores.
  - Counterclockwise sowing skipping opponent's store.
  - Free turn awarded if last stone lands in player's own Kalah store.
  - Capture mechanic: Landing last stone in an empty pit on player's side captures all stones in opposite pit into store.
  - Endgame sweep of remaining stones to owner's store.
- **Chinese Checkers (`chinesecheckers.engine.ts`)**:
  - Hexagram star board geometry mapped to coordinate space.
  - 10 marbles per player (Red vs Blue).
  - Single-step adjacent movements to any neighboring empty node.
  - Multi-hop jump mechanics jumping over adjacent marbles into empty collinear spaces.
  - Win condition verified when all 10 marbles occupy opponent's origin star triangle.

### 2. Client Interface (`mobile/screens/games/BoardGame2Screen.tsx`)
- High-fidelity Marvie iOS UI Kit styled board screen:
  - Custom SVG graphics for all 7 game engines:
    - Carrom wooden board with center circular mandalas, baseline stripes, and corner pockets.
    - Snakes & Ladders 10x10 boustrophedon zigzag number grid with ladder green markers and snake red coils.
    - Battleship radar screen with dual tactical grids (own fleet layout + enemy firing radar).
    - Dominoes table with chain layout, open end highlights, and interactive hand tray.
    - Backgammon board with felt playing surface, alternating triangle points, bar division, and dice tray.
    - Mancala wooden trough with hollow circular pits and side store basins.
    - Chinese Checkers hexagram star with colored marbles and valid landing destination highlights.
  - Standardized HUD with player avatars, turn countdown indicator, current score, and game action logs.
  - Rematch handshake modal and real-time Socket.IO synchronization.

### 3. Automated Test Verification
- Server Test Suite (`server/test-board-games-2.js`): **36 Passed, 0 Failed (100% Pass Rate)**.
- Full System Regressions:
  - `test-board-games-1.js`: 57 Passed, 0 Failed.
  - `test-ludo.js`: 47 Passed, 0 Failed.
  - `test-tictactoe.js`: 52 Passed, 0 Failed.
  - Mobile TypeScript Compilation (`npm run ts:check`): 0 Errors.
  - Expo Android Production Bundle (`npx expo export -p android`): Successfully bundled 771 modules (2.1MB bytecode).

