# ⭕ Tic-Tac-Toe Game Module Specification (Phase 08)

## 1. Engine Architecture & Integration
Tic-Tac-Toe implements the standardized `GameEngine<TicTacToeState, TicTacToeAction, TicTacToeResult>` contract. It acts as the benchmark turn-based module validating server-authoritative state transitions, clock enforcements, and statistics tracking.

```typescript
export interface TicTacToeState {
  board: ('X' | 'O' | null)[]; // 9 cells (indices 0..8)
  turnPlayerId: string;
  players: {
    X: string; // userId
    O: string; // userId
  };
  winnerId: string | null;
  isDraw: boolean;
  winningLine: number[] | null; // e.g. [0, 1, 2]
  turnExpiresAt: number; // Unix timestamp ms
}

export interface TicTacToeAction {
  cellIndex: number; // 0..8
}
```

---

## 2. Server-Authoritative State Engine
1. **Action Validation (`validateAction`)**:
   - `playerId === state.turnPlayerId` (enforces strict turn order).
   - `action.cellIndex >= 0 && action.cellIndex <= 8` (bounds validation).
   - `state.board[action.cellIndex] === null` (prevents cell overwrite).
   - `!state.winnerId && !state.isDraw` (game must be active).
2. **State Transition (`applyAction`)**:
   - Marks cell with `'X'` or `'O'`.
   - Checks winning combinations:
     - Rows: `[0,1,2]`, `[3,4,5]`, `[6,7,8]`
     - Columns: `[0,3,6]`, `[1,4,7]`, `[2,5,8]`
     - Diagonals: `[0,4,8]`, `[2,4,6]`
   - If winning line detected: sets `winnerId = playerId`, marks `winningLine`.
   - If board full and no winner: sets `isDraw = true`.
   - Otherwise: switches `turnPlayerId` to the other player and resets `turnExpiresAt` to `now + 15000`.
3. **Turn Timeout Enforcer**:
   - If `turnExpiresAt` elapses without input, server auto-places a move or forfeits the active player.

---

## 3. Instant Rematch Protocol
- Either player can emit `game:rematch_request`.
- Opponent has 15 seconds to accept via `game:rematch_response`.
- Upon acceptance: marks swap (Player O becomes Player X to ensure fairness), board resets, and match round increments.
