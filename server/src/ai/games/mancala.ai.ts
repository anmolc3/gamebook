import { GameAI, AiDifficulty } from '../ai.interface';
import { MancalaAction, MancalaState } from '../../../../shared/game-types';

export class MancalaAI implements GameAI<MancalaState, MancalaAction> {
  getMove(state: MancalaState, aiPlayerId: string, difficulty: AiDifficulty): MancalaAction {
    const isPlayer0 = state.players[0] === aiPlayerId;
    const pitStart = isPlayer0 ? 0 : 7;
    const pitEnd = isPlayer0 ? 5 : 12;
    const ownStore = isPlayer0 ? 6 : 13;

    // Get non-empty pits
    const legalPits: number[] = [];
    for (let i = pitStart; i <= pitEnd; i++) {
      if (state.board[i] > 0) {
        legalPits.push(i);
      }
    }

    if (legalPits.length === 0) {
      return { type: 'SOW_PIT', pitIndex: pitStart };
    }

    // Easy: random legal pit
    if (difficulty === 'EASY') {
      const rand = legalPits[Math.floor(Math.random() * legalPits.length)];
      return { type: 'SOW_PIT', pitIndex: rand };
    }

    // Priority 1: Free turn move (last stone lands exactly in own store)
    for (const pit of legalPits) {
      const count = state.board[pit];
      // Distance to own store
      const dist = (ownStore - pit + 14) % 14;
      if (count === dist) {
        return { type: 'SOW_PIT', pitIndex: pit };
      }
    }

    // Priority 2: Capture move
    for (const pit of legalPits) {
      const sim = this.simulateSow(state.board, pit, isPlayer0);
      if (sim.capturedCount > 0) {
        return { type: 'SOW_PIT', pitIndex: pit };
      }
    }

    // Priority 3: Max store increase / positional heuristic
    let bestPit = legalPits[0];
    let bestScore = -Infinity;

    for (const pit of legalPits) {
      const sim = this.simulateSow(state.board, pit, isPlayer0);
      const score = sim.storeDiff * 3 + sim.capturedCount * 4 + (Math.random() * 2);
      if (score > bestScore) {
        bestScore = score;
        bestPit = pit;
      }
    }

    return { type: 'SOW_PIT', pitIndex: bestPit };
  }

  private simulateSow(
    board: number[],
    pit: number,
    isPlayer0: boolean
  ): { storeDiff: number; capturedCount: number } {
    const copy = [...board];
    let stones = copy[pit];
    copy[pit] = 0;

    const ownStore = isPlayer0 ? 6 : 13;
    const oppStore = isPlayer0 ? 13 : 6;
    const pitStart = isPlayer0 ? 0 : 7;
    const pitEnd = isPlayer0 ? 5 : 12;

    let curr = pit;
    while (stones > 0) {
      curr = (curr + 1) % 14;
      if (curr === oppStore) continue;
      copy[curr]++;
      stones--;
    }

    let capturedCount = 0;
    // Capture check
    if (curr >= pitStart && curr <= pitEnd && copy[curr] === 1) {
      const oppIndex = 12 - curr;
      if (copy[oppIndex] > 0) {
        capturedCount = copy[oppIndex] + 1;
      }
    }

    const storeDiff = copy[ownStore] - board[ownStore];
    return { storeDiff, capturedCount };
  }
}
