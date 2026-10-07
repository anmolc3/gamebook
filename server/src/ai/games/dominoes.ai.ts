import { GameAI, AiDifficulty } from '../ai.interface';
import { DominoesAction, DominoesState } from '../../../../shared/game-types';

export class DominoesAI implements GameAI<DominoesState, DominoesAction> {
  getMove(state: DominoesState, aiPlayerId: string, difficulty: AiDifficulty): DominoesAction {
    const hand = state.playerHands[aiPlayerId] || [];
    const [leftEnd, rightEnd] = state.openEnds;

    // Find all playable tiles and sides
    const playableMoves: { tile: any; end: 'LEFT' | 'RIGHT'; pipSum: number }[] = [];

    hand.forEach((tile) => {
      if (tile[0] === leftEnd || tile[1] === leftEnd) {
        playableMoves.push({ tile, end: 'LEFT', pipSum: tile[0] + tile[1] });
      }
      if (tile[0] === rightEnd || tile[1] === rightEnd) {
        playableMoves.push({ tile, end: 'RIGHT', pipSum: tile[0] + tile[1] });
      }
    });

    if (playableMoves.length > 0) {
      if (difficulty === 'EASY') {
        const rand = playableMoves[Math.floor(Math.random() * playableMoves.length)];
        return { type: 'PLAY_TILE', tile: rand.tile, end: rand.end };
      }

      // Shed highest pip sum first to minimize penalty if game gets blocked
      playableMoves.sort((a, b) => b.pipSum - a.pipSum);
      const chosen = playableMoves[0];
      return { type: 'PLAY_TILE', tile: chosen.tile, end: chosen.end };
    }

    // If can't play and boneyard has tiles, draw
    if (state.boneyard && state.boneyard.length > 0) {
      return { type: 'DRAW_TILE' };
    }

    // Otherwise pass
    return { type: 'PASS' };
  }
}
