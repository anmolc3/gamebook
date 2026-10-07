import { GameAI, AiDifficulty } from '../ai.interface';
import { BackgammonAction, BackgammonState } from '../../../../shared/game-types';

export class BackgammonAI implements GameAI<BackgammonState, BackgammonAction> {
  getMove(state: BackgammonState, aiPlayerId: string, difficulty: AiDifficulty): BackgammonAction {
    // If no dice remaining, must roll
    if (!state.diceRemaining || state.diceRemaining.length === 0) {
      return { type: 'ROLL_DICE' };
    }

    const isWhite = state.players.WHITE === aiPlayerId;
    const color = isWhite ? 'WHITE' : 'BLACK';
    const die = state.diceRemaining[0];

    // Check bar first
    const barCount = isWhite ? state.bar.white : state.bar.black;
    if (barCount > 0) {
      const targetPt = isWhite ? 24 - die : die - 1;
      const oppCount = isWhite ? state.points[targetPt].black : state.points[targetPt].white;
      if (oppCount < 2) {
        return { type: 'MOVE_CHECKER', from: 'BAR', die };
      }
    }

    // Find any legal point move for the first die
    for (let pt = 0; pt < 24; pt++) {
      const myCount = isWhite ? state.points[pt].white : state.points[pt].black;
      if (myCount > 0) {
        const targetPt = isWhite ? pt - die : pt + die;

        // Bearing off check
        if ((isWhite && targetPt < 0) || (!isWhite && targetPt > 23)) {
          const outsideHome = isWhite
            ? state.points.slice(6).some((p) => p.white > 0) || state.bar.white > 0
            : state.points.slice(0, 18).some((p) => p.black > 0) || state.bar.black > 0;
          if (!outsideHome) {
            return { type: 'MOVE_CHECKER', from: pt, die };
          }
        } else if (targetPt >= 0 && targetPt < 24) {
          const oppCount = isWhite ? state.points[targetPt].black : state.points[targetPt].white;
          if (oppCount < 2) {
            return { type: 'MOVE_CHECKER', from: pt, die };
          }
        }
      }
    }

    // Fallback: roll dice or default
    return { type: 'ROLL_DICE' };
  }
}
