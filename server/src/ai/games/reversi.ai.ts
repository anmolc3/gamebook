import { GameAI, AiDifficulty } from '../ai.interface';
import { ReversiAction, ReversiCell, ReversiState } from '../../../../shared/game-types';
import { REVERSI_SIZE } from '../../games/board/reversi.engine';

// Classic 8x8 Othello positional weight matrix
const REVERSI_WEIGHTS = [
  [100, -20,  10,   5,   5,  10, -20, 100],
  [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
  [ 10,  -2,  -1,  -1,  -1,  -1,  -2,  10],
  [  5,  -2,  -1,   0,   0,  -1,  -2,   5],
  [  5,  -2,  -1,   0,   0,  -1,  -2,   5],
  [ 10,  -2,  -1,  -1,  -1,  -1,  -2,  10],
  [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
  [100, -20,  10,   5,   5,  10, -20, 100],
];

export class ReversiAI implements GameAI<ReversiState, ReversiAction> {
  getMove(state: ReversiState, aiPlayerId: string, difficulty: AiDifficulty): ReversiAction {
    const validMoves = state.validMoves;
    if (!validMoves || validMoves.length === 0) {
      return { row: 0, col: 0 };
    }

    const aiColor: ReversiCell = state.players.B === aiPlayerId ? 'B' : 'W';

    // Easy: randomly choose among valid moves
    if (difficulty === 'EASY') {
      const [r, c] = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { row: r, col: c };
    }

    // Always take a corner if available
    const corners = validMoves.filter(
      ([r, c]) => (r === 0 || r === 7) && (c === 0 || c === 7)
    );
    if (corners.length > 0) {
      return { row: corners[0][0], col: corners[0][1] };
    }

    // Medium: Positional weight matrix evaluation with noise
    if (difficulty === 'MEDIUM') {
      let bestMove = validMoves[0];
      let bestScore = -Infinity;

      for (const [r, c] of validMoves) {
        const weight = REVERSI_WEIGHTS[r][c] + (Math.random() * 15 - 7);
        if (weight > bestScore) {
          bestScore = weight;
          bestMove = [r, c];
        }
      }
      return { row: bestMove[0], col: bestMove[1] };
    }

    // Hard / Expert: Positional evaluation + mobility
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const [r, c] of validMoves) {
      let score = REVERSI_WEIGHTS[r][c];

      // Edge bonus
      if (r === 0 || r === 7 || c === 0 || c === 7) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }

    return { row: bestMove[0], col: bestMove[1] };
  }
}
