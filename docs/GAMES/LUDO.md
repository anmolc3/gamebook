# 🎲 Ludo World Arena Specification (Phase 09)

## 1. Engine Architecture & Integration
Ludo implements `GameEngine<LudoState, LudoAction, LudoResult>` for 2 to 4 players across Red, Green, Yellow, and Blue quadrants.

```typescript
export type LudoColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export interface LudoToken {
  id: number; // 0..3
  color: LudoColor;
  step: number; // -1: home yard, 0..50: circuit track, 51..55: home corridor, 56: finished
}

export interface LudoState {
  players: {
    userId: string;
    color: LudoColor;
    tokens: LudoToken[];
  }[];
  turnColor: LudoColor;
  turnPlayerId: string;
  currentDiceRoll: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  winnerIds: string[]; // Order of finishing
  turnExpiresAt: number;
}
```

---

## 2. Server-Authoritative Logic & Rules Engine
1. **Authoritative Dice Generation**:
   - Dice is generated on the server (`crypto.randomInt(1, 7)`).
   - Rolling a 6 awards an extra roll.
   - Three consecutive 6s forfeits the turn and passes to the next player.
2. **Token Movement Validation**:
   - A token can leave the yard (`step: -1` $\rightarrow$ `step: 0`) only on a roll of 6.
   - Step advancement validated against the 52-cell outer track and color-specific 5-cell home corridor.
   - Exact roll required to enter center home triangle (`step: 56`).
3. **Captures & Safe Zones**:
   - 8 designated safe cells (4 color start positions + 4 star coordinates) prevent captures.
   - Landing on an opponent token on non-safe cells returns their token to home yard and awards a bonus dice roll.
4. **Turn Clocks**:
   - 20-second turn timer per roll/move phase. Auto-moves if only 1 valid move exists; otherwise passes turn.
