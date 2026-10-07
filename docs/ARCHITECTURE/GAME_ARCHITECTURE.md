# 🎯 Game Engine Architecture (Server-Authoritative)

## 1. Absolute Anti-Cheat Principle
The client is strictly an input-gathering and rendering display. The client **NEVER** calculates:
- Whose turn it is
- Whether a move or action is legally permissible
- Randomness (dice values, card shuffling, tile selection)
- Who won or lost a match
- What rating points, trophies, or stats are awarded

```
Mobile React Native Client                     Authoritative Node.js Server
       │                                                      │
       │─── 1. Emits action (e.g. { cellIndex: 4 }) ─────────▶│
       │                                                      │── 2. Verifies player turn & permissions
       │                                                      │── 3. Validates move constraints
       │                                                      │── 4. Applies state transition
       │                                                      │── 5. Checks victory/draw conditions
       │                                                      │
       │◀── 6. Broadcasts authoritative state snapshot ───────│
       │    (`game:state` with sequenceNumber)                │
       ▼                                                      ▼
  Renders UI Animations                               Updates Match Persistence
```

---

## 2. Pluggable Game Engine Contract
Every game module in `server/src/games/` implements the standard lifecycle:

```typescript
export interface BaseGameEngine<TState, TAction, TResult> {
  readonly definition: GameDefinition;
  initialize(players: GamePlayerMeta[], config?: any): TState;
  validateAction(state: TState, playerId: string, action: TAction): boolean;
  applyAction(state: TState, playerId: string, action: TAction): GameActionResult<TState>;
  checkWinner(state: TState): TResult | null;
  handlePlayerDisconnect?(state: TState, playerId: string): TState;
  handlePlayerReconnect?(state: TState, playerId: string): TState;
  handleTurnTimeout?(state: TState): GameActionResult<TState>;
}
```

---

## 3. Central Game Registry (`GameRegistry`)
The server dynamically discovers and validates game sessions through `GameRegistry`:
- Maps `gameType` string to its `GameDefinition` (min/max players, category, turn time, supported settings).
- Binds pluggable engines to the room lifecycle.
- Enables the Game Room system to remain 100% **game-agnostic**.

---

## 4. Turn Clocks & Forfeit Enforcer
- Authoritative timers run on the server for each turn.
- If the countdown expires without an authoritative action:
  - Turn is skipped or auto-played (if forced move exists).
  - Repeated timeouts trigger match forfeit.
