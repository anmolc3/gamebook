# 🎲 Game Engine Subsystem Specification

## 1. Architectural Vision & Modularity
The Social Multiplayer Gaming Platform is designed around a **Modular, Game-Agnostic Engine**. Individual games are built as independent, pluggable modules utilizing shared multiplayer infrastructure:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Shared Multiplayer Infrastructure                    │
│  - Authentication & JWT Handshake      - Presence & Friend Graph       │
│  - Game-Agnostic Rooms & 6-Char Codes  - 30-Second Disconnect Grace    │
│  - Socket.IO Gateway Multiplexing      - Match History & Leaderboards  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Central Game Registry                              │
│  - Catalog of 70+ Game Definitions     - Dynamic Player Counts (2-8)   │
│  - Category Resolution                 - Turn Timing & Clock Metadata  │
└────────────────────────────────────────────────────────────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Tic-Tac-Toe     │      │   Ludo World     │      │   Chess, Cards,  │
│  Engine Plugin   │      │   Arena Plugin   │      │   Party Games... │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

Adding Game #50 uses the exact same room, matchmaking, reconnect, and chat architecture as Game #1.

---

## 2. Core Game Abstractions

Every game defines its logic conforming to the standardized TypeScript abstractions:

```typescript
export interface GameDefinition {
  id: GameType;
  name: string;
  category: GameCategory; // BOARD | CARD | CASUAL | COMPETITIVE | PUZZLE | PARTY
  minPlayers: number;
  maxPlayers: number;
  defaultPlayers: number;
  supportsSpectators: boolean;
  turnTimeSeconds: number;
  description: string;
  iconName: string;
  defaultSettings?: Record<string, any>;
}

export interface GameEngine<TState, TAction, TResult> {
  readonly definition: GameDefinition;
  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): TState;
  validateAction(state: TState, playerId: string, action: TAction): boolean;
  applyAction(state: TState, playerId: string, action: TAction): GameActionResult<TState>;
  checkWinner(state: TState): TResult | null;
  handlePlayerDisconnect?(state: TState, playerId: string): TState;
  handlePlayerReconnect?(state: TState, playerId: string): TState;
  handleTurnTimeout?(state: TState): GameActionResult<TState>;
}
```

---

## 3. Strict Server-Authoritative Logic & Anti-Cheat

### Zero-Trust Client Model
The mobile client is strictly a dumb rendering and input-forwarding terminal. The client **NEVER** calculates:
1. **Dice Rolls**: Generated exclusively on the backend using cryptographically secure random sources (`crypto.randomInt(1, 7)`).
2. **Card Draws & Shuffles**: Decks are shuffled server-side via the Fisher-Yates algorithm; players only receive their own hand data.
3. **Move Legality**: Every token step, grid placement, or card discard is validated against authoritatively tracked state.
4. **Turn Timers**: Server maintains authoritative countdown clocks and auto-skips or forfeits timing out players.
5. **Winner & Rating Decisions**: Match outcomes, statistics increments, and ELO calculations are executed entirely server-side.

### Anti-Desync Safeguards
- Every authoritative state broadcast carries a monotonically increasing `sequenceNumber`.
- If a client detects a sequence gap (e.g., missed packet during WiFi handover), it requests an authoritative snapshot sync (`game:sync`).

---

## 4. Reconnection & Disconnect Protocol
1. **30-Second Grace Window**: When a player drops their WebSocket connection during an active match, the server pauses turn timers and triggers a 30-second countdown.
2. **Lobby & Peer Notification**: Room members receive a non-blocking toast: `"Alex disconnected. Waiting 30s..."`.
3. **State Reconciliation**: When the player reconnects within 30 seconds, the server re-binds their socket and emits the latest state snapshot.
4. **Abandonment & Forfeit**: If 30 seconds expire without reconnection, the player forfeits, and the active opponent is awarded the victory.
