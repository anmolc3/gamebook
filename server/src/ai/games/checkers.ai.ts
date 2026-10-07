import { GameAI, AiDifficulty } from '../ai.interface';
import {
  CheckersAction,
  CheckersPiece,
  CheckersState,
  CheckersValidMove,
} from '../../../../shared/game-types';
import { CHECKERS_SIZE } from '../../games/board/checkers.engine';

export class CheckersAI implements GameAI<CheckersState, CheckersAction> {
  getMove(state: CheckersState, aiPlayerId: string, difficulty: AiDifficulty): CheckersAction {
    const validMoves = state.validMoves;
    if (!validMoves || validMoves.length === 0) {
      return { from: [0, 0], to: [0, 0] };
    }

    const aiColor = state.players.R === aiPlayerId ? 'R' : 'B';
    const oppColor = aiColor === 'R' ? 'B' : 'R';

    // Easy: randomly choose among valid moves
    if (difficulty === 'EASY') {
      const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { from: rand.from, to: rand.to };
    }

    // Medium: 1-ply heuristic (favors jumps, kinging, center control)
    if (difficulty === 'MEDIUM') {
      let bestMove = validMoves[0];
      let bestScore = -Infinity;

      for (const move of validMoves) {
        let score = 0;
        if (move.captured) score += 50;

        // Kinging bonus
        const targetRow = move.to[0];
        if ((aiColor === 'R' && targetRow === 0) || (aiColor === 'B' && targetRow === CHECKERS_SIZE - 1)) {
          score += 40;
        }

        // Center squares bonus (columns 2..5, rows 2..5)
        if (move.to[1] >= 2 && move.to[1] <= 5) score += 5;

        // Slight jitter to keep it natural
        score += Math.random() * 4;

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return { from: bestMove.from, to: bestMove.to };
    }

    // Hard / Expert: Minimax with alpha-beta
    const depth = difficulty === 'HARD' ? 3 : 4;
    let bestScore = -Infinity;
    let bestMove = validMoves[0];

    for (const move of validMoves) {
      const simBoard = this.applyMove(state.board, move, aiColor);
      const score = this.minimax(simBoard, depth - 1, false, aiColor, oppColor, -Infinity, Infinity);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { from: bestMove.from, to: bestMove.to };
  }

  private applyMove(
    board: CheckersPiece[][],
    move: CheckersValidMove,
    color: 'R' | 'B'
  ): CheckersPiece[][] {
    const copy = board.map((row) => [...row]);
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    let piece = copy[fr][fc];
    copy[fr][fc] = null;

    if (move.captured) {
      copy[move.captured[0]][move.captured[1]] = null;
    }

    // Check kinging
    if (color === 'R' && tr === 0 && piece === 'R') piece = 'RK';
    if (color === 'B' && tr === CHECKERS_SIZE - 1 && piece === 'B') piece = 'BK';

    copy[tr][tc] = piece;
    return copy;
  }

  private minimax(
    board: CheckersPiece[][],
    depth: number,
    isMaximizing: boolean,
    aiColor: 'R' | 'B',
    oppColor: 'R' | 'B',
    alpha: number,
    beta: number
  ): number {
    if (depth === 0) {
      return this.evaluateBoard(board, aiColor, oppColor);
    }

    const turnColor = isMaximizing ? aiColor : oppColor;
    const moves = this.calculateMoves(board, turnColor);

    if (moves.length === 0) {
      // Current player has no moves -> lost
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nextBoard = this.applyMove(board, m, aiColor);
        const evaluation = this.minimax(nextBoard, depth - 1, false, aiColor, oppColor, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const nextBoard = this.applyMove(board, m, oppColor);
        const evaluation = this.minimax(nextBoard, depth - 1, true, aiColor, oppColor, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(board: CheckersPiece[][], aiColor: 'R' | 'B', oppColor: 'R' | 'B'): number {
    let aiScore = 0;
    let oppScore = 0;

    for (let r = 0; r < CHECKERS_SIZE; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        const p = board[r][c];
        if (!p) continue;

        const isAi = p.startsWith(aiColor);
        const isKing = p.endsWith('K');
        const val = isKing ? 15 : 10;
        const advanceBonus = p === 'R' ? 7 - r : p === 'B' ? r : 0;

        if (isAi) {
          aiScore += val + advanceBonus;
        } else {
          oppScore += val + advanceBonus;
        }
      }
    }

    return aiScore - oppScore;
  }

  private calculateMoves(board: CheckersPiece[][], color: 'R' | 'B'): CheckersValidMove[] {
    const jumps: CheckersValidMove[] = [];
    const regular: CheckersValidMove[] = [];

    const dirs: [number, number][] =
      color === 'R' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    const kingDirs: [number, number][] = [
      [-1, -1], [-1, 1],
      [1, -1],  [1, 1],
    ];

    for (let r = 0; r < CHECKERS_SIZE; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        const piece = board[r][c];
        if (!piece || !piece.startsWith(color)) continue;

        const isKing = piece.endsWith('K');
        const directions = isKing ? kingDirs : dirs;

        for (const [dr, dc] of directions) {
          // Regular step
          const tr = r + dr;
          const tc = c + dc;
          if (tr >= 0 && tr < CHECKERS_SIZE && tc >= 0 && tc < CHECKERS_SIZE) {
            if (board[tr][tc] === null) {
              regular.push({ from: [r, c], to: [tr, tc] });
            }
          }

          // Jump
          const jr = r + dr * 2;
          const jc = c + dc * 2;
          if (jr >= 0 && jr < CHECKERS_SIZE && jc >= 0 && jc < CHECKERS_SIZE) {
            const mid = board[tr][tc];
            if (mid && !mid.startsWith(color) && board[jr][jc] === null) {
              jumps.push({ from: [r, c], to: [jr, jc], captured: [tr, tc] });
            }
          }
        }
      }
    }

    // Checkers mandatory capture rule: if any jumps exist, only jumps are valid
    return jumps.length > 0 ? jumps : regular;
  }
}
