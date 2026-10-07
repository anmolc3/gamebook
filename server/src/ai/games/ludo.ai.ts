import { GameAI, AiDifficulty } from '../ai.interface';
import { LudoAction, LudoState } from '../../../../shared/game-types';
import {
  COLOR_OFFSETS,
  HOME_FINISH_STEP,
  SAFE_CELLS,
} from '../../games/ludo/ludo.engine';

export class LudoAI implements GameAI<LudoState, LudoAction> {
  getMove(state: LudoState, aiPlayerId: string, difficulty: AiDifficulty): LudoAction {
    // Phase 1: Must roll dice if not rolled yet
    if (!state.hasRolled) {
      return { type: 'ROLL_DICE' };
    }

    // Phase 2: Pick best token among valid moves
    const validMoves = state.validMoves || [];
    if (validMoves.length === 0) {
      // No legal moves available
      return { type: 'MOVE_TOKEN', tokenId: 0 };
    }

    if (validMoves.length === 1) {
      return { type: 'MOVE_TOKEN', tokenId: validMoves[0] };
    }

    if (difficulty === 'EASY') {
      const randToken = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { type: 'MOVE_TOKEN', tokenId: randToken };
    }

    const aiPlayer = state.players.find((p) => p.userId === aiPlayerId);
    if (!aiPlayer) {
      return { type: 'MOVE_TOKEN', tokenId: validMoves[0] };
    }

    const roll = state.currentDiceRoll || 0;
    const aiColor = aiPlayer.color;
    const aiOffset = COLOR_OFFSETS[aiColor];

    let bestTokenId = validMoves[0];
    let bestScore = -Infinity;

    for (const tokenId of validMoves) {
      const token = aiPlayer.tokens.find((t) => t.id === tokenId);
      if (!token) continue;

      let score = 0;

      // 1. Unlocking from yard
      if (token.step === -1 && roll === 6) {
        score += 65;
      } else {
        const nextStep = token.step + roll;

        // 2. Finishing token
        if (nextStep === HOME_FINISH_STEP) {
          score += 100;
        }

        // 3. Entering home stretch (safe from captures)
        if (token.step < 51 && nextStep >= 51) {
          score += 50;
        }

        // 4. Capture check on main circuit
        if (nextStep < 51) {
          const nextGlobalCell = (aiOffset + nextStep) % 52;

          if (!SAFE_CELLS.has(nextGlobalCell)) {
            // Check if any opponent token sits on this cell
            for (const opp of state.players) {
              if (opp.userId === aiPlayerId) continue;
              const oppOffset = COLOR_OFFSETS[opp.color];
              for (const oppTok of opp.tokens) {
                if (oppTok.step >= 0 && oppTok.step < 51) {
                  const oppGlobalCell = (oppOffset + oppTok.step) % 52;
                  if (oppGlobalCell === nextGlobalCell) {
                    score += 90; // Big capture bonus!
                  }
                }
              }
            }
          } else {
            // Safe zone landing bonus
            score += 40;
          }
        }

        // 5. Advancement incentive (prefer moving tokens closer to home)
        score += token.step * 0.5;
      }

      // Small jitter for personality
      score += Math.random() * 5;

      if (score > bestScore) {
        bestScore = score;
        bestTokenId = tokenId;
      }
    }

    return { type: 'MOVE_TOKEN', tokenId: bestTokenId };
  }
}
