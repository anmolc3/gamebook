# Phase 8: Game Engine — Tic-Tac-Toe

## Objective
Implement the server-authoritative Tic-Tac-Toe game module utilizing the standardized `GameEngine` architecture. Serves as the benchmark implementation for turn timers, move validation, win/draw condition evaluations, reconnect reconciliation, and instant rematches.

---

## Technical Scope & Requirements
- **Server Engine Module (`server/src/games/tictactoe/`)**:
  - Implements `GameEngine<TicTacToeState, TicTacToeAction, TicTacToeResult>`.
  - Authoritative validation: turn check, out-of-bounds check, occupied cell prevention.
  - Line checks: 3 rows, 3 columns, 2 diagonals with winning line index return (`winningLine: number[]`).
  - Monotonically increasing `sequenceNumber` on `game:state` socket broadcasts.
  - Turn clocks with 15-second countdowns and timeout auto-play handling.
- **Match Manager (`server/src/games/match.manager.ts`)**:
  - Central match registry managing active matches across game types.
  - Handles move dispatches, turn timers, forfeit handling on disconnect/leave, and database persistence.
  - Rematch handshake coordination (`game:rematch_request`, `game:rematch_response`) with mark swap and round increment.
- **Rematch Protocol**:
  - `game:rematch_request` and `game:rematch_response`.
  - Inverts marks (Player O becomes Player X) and increments round counter.
- **Match History & Persistence**:
  - Stores finished game records in `GameResult` table.
  - Updates lifetime stats in `GameStatistics` table (wins, losses, draws, win rate, current streak, best streak).
- **REST Endpoints (`server/src/games/game.routes.ts`)**:
  - `GET /api/v1/games/catalog`: Returns registry of all supported games with player capacities and categories.
  - `GET /api/v1/games/active/:roomCode`: Returns live game state for the active room.
  - `GET /api/v1/games/stats/:gameType`: Returns user's lifetime stats for specified game.
  - `GET /api/v1/games/history/:gameType`: Returns user's match history for specified game.
- **Mobile Client Screen (`mobile/screens/games/TicTacToeScreen.tsx`)**:
  - Pure SVG X and O markers (`CrossMarkIcon`, `CircleMarkIcon` with Zero emojis).
  - 3x3 interactive grid styled with Marvie design tokens (`#2A3C44`, `#30444E`, `#3ED598`, `#FFC542`).
  - Glowing winning line highlight on victory.
  - Player scoreboard with active turn indicator, 15-second countdown bar, and avatar displays.
  - Instant rematch modal with rematch request status and "Play Again" / "Exit to Lobby" controls.
  - Seamless integration with `RoomLobbyScreen` upon `game:start`.

---

## Completion Checklist
- [x] Server Tic-Tac-Toe engine module adhering to `GameEngine` contract (`server/src/games/tictactoe/tictactoe.engine.ts`)
- [x] Authoritative turn validation and winning line computation (8 line checks)
- [x] 15-second turn timer enforcer with timeout handling
- [x] Real-time Socket.IO event synchronization (`game:action`, `game:state`, `game:over`)
- [x] Rematch request/response handshake with mark inversion
- [x] Match history persistence in `GameResult` and lifetime stats aggregation in `GameStatistics`
- [x] Mobile TicTacToeScreen rendered with Marvie design tokens, pure SVG icons, and zero emojis
- [x] Full automated test suite passing (52/52 assertions in `server/test-tictactoe.js`)
- [x] Mobile TypeScript check clean (`tsc --noEmit` 0 errors) and Hermes bundle compiled cleanly (`expo export -p android`)

---

## Current Status
**COMPLETED (100%)**
