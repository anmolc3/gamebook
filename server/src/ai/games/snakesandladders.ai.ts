import { GameAI, AiDifficulty } from '../ai.interface';
import { SnakesAndLaddersAction, SnakesAndLaddersState } from '../../../../shared/game-types';
import { LADDERS, SNAKES } from '../../games/board2/snakesandladders.engine';

export interface SnakesAndLaddersBoardEvaluation {
  currentPosition: number;
  distanceToWin: number;
  immediateLadders: { from: number; to: number; diceNeeded: number }[];
  immediateSnakes: { from: number; to: number; diceNeeded: number }[];
  leadingPlayerId: string | null;
  isAiLeading: boolean;
}

export class SnakesAndLaddersAI implements GameAI<SnakesAndLaddersState, SnakesAndLaddersAction> {
  /**
   * Evaluates the board position and probabilities for the AI
   */
  evaluateBoard(state: SnakesAndLaddersState, aiPlayerId: string): SnakesAndLaddersBoardEvaluation {
    const aiPlayer = state.players.find((p) => p.userId === aiPlayerId);
    const aiPos = aiPlayer ? aiPlayer.position : 1;

    const immediateLadders: { from: number; to: number; diceNeeded: number }[] = [];
    const immediateSnakes: { from: number; to: number; diceNeeded: number }[] = [];

    for (let roll = 1; roll <= 6; roll++) {
      const target = aiPos + roll;
      if (LADDERS[target]) {
        immediateLadders.push({ from: target, to: LADDERS[target], diceNeeded: roll });
      }
      if (SNAKES[target]) {
        immediateSnakes.push({ from: target, to: SNAKES[target], diceNeeded: roll });
      }
    }

    let leadingPlayerId: string | null = null;
    let maxPos = -1;
    for (const p of state.players) {
      if (p.position > maxPos) {
        maxPos = p.position;
        leadingPlayerId = p.userId;
      }
    }

    return {
      currentPosition: aiPos,
      distanceToWin: Math.max(0, 100 - aiPos),
      immediateLadders,
      immediateSnakes,
      leadingPlayerId,
      isAiLeading: leadingPlayerId === aiPlayerId,
    };
  }

  /**
   * Returns the authoritative AI action for Snakes & Ladders
   */
  getMove(
    state: SnakesAndLaddersState,
    aiPlayerId: string,
    _difficulty: AiDifficulty
  ): SnakesAndLaddersAction {
    return { type: 'ROLL_DICE' };
  }
}
