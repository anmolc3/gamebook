import { GameAI, AiDifficulty } from '../ai.interface';
import {
  ChessAction,
  ChessCell,
  ChessPieceColor,
  ChessPieceType,
  ChessState,
} from '../../../../shared/game-types';
import { ChessEngine, CHESS_SIZE } from '../../games/board/chess.engine';

const PIECE_VALUES: Record<ChessPieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Positional bonuses (encouraging center control & piece activity)
const PAWN_TABLE_WHITE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

export class ChessAI implements GameAI<ChessState, ChessAction> {
  private engine = new ChessEngine();

  getMove(state: ChessState, aiPlayerId: string, difficulty: AiDifficulty): ChessAction {
    const aiColor: ChessPieceColor = state.players.W === aiPlayerId ? 'W' : 'B';
    const oppColor: ChessPieceColor = aiColor === 'W' ? 'B' : 'W';

    const legalMoves = this.engine.getLegalMoves(state.board, aiColor);
    if (!legalMoves || legalMoves.length === 0) {
      return { from: [0, 0], to: [0, 0] };
    }

    // Easy mode: 40% blunder / random move
    if (difficulty === 'EASY') {
      if (Math.random() < 0.4) {
        const rand = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return { from: rand.from, to: rand.to };
      }
    }

    // Move ordering: sort captures first
    const sortedMoves = [...legalMoves].sort((a, b) => {
      const targetA = state.board[a.to[0]][a.to[1]];
      const targetB = state.board[b.to[0]][b.to[1]];
      const valA = targetA ? PIECE_VALUES[targetA.type] : 0;
      const valB = targetB ? PIECE_VALUES[targetB.type] : 0;
      return valB - valA;
    });

    // Check for immediate checkmate or high-value capture on Easy/Medium
    if (difficulty === 'EASY' || difficulty === 'MEDIUM') {
      let bestMove = sortedMoves[0];
      let bestScore = -Infinity;

      for (const m of sortedMoves) {
        const sim = this.makeMove(state.board, m.from, m.to);
        const evalScore = this.evaluateBoard(sim, aiColor, oppColor);
        // Add random small variance for human-like play
        const score = evalScore + (Math.random() * 20 - 10);
        if (score > bestScore) {
          bestScore = score;
          bestMove = m;
        }
      }
      return { from: bestMove.from, to: bestMove.to };
    }

    // Hard / Expert: Minimax with alpha-beta
    const depth = difficulty === 'HARD' ? 2 : 3;
    let bestMove = sortedMoves[0];
    let bestScore = -Infinity;

    for (const m of sortedMoves) {
      const sim = this.makeMove(state.board, m.from, m.to);
      const score = this.minimax(sim, depth - 1, false, aiColor, oppColor, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return { from: bestMove.from, to: bestMove.to };
  }

  private makeMove(
    board: ChessCell[][],
    from: [number, number],
    to: [number, number]
  ): ChessCell[][] {
    const copy: ChessCell[][] = board.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null))
    );
    const piece = copy[from[0]][from[1]];
    copy[from[0]][from[1]] = null;

    if (piece) {
      // Pawn promotion to Queen
      if (piece.type === 'P' && (to[0] === 0 || to[0] === CHESS_SIZE - 1)) {
        copy[to[0]][to[1]] = { type: 'Q', color: piece.color, hasMoved: true };
      } else {
        copy[to[0]][to[1]] = { ...piece, hasMoved: true };
      }
    }

    return copy;
  }

  private minimax(
    board: ChessCell[][],
    depth: number,
    isMaximizing: boolean,
    aiColor: ChessPieceColor,
    oppColor: ChessPieceColor,
    alpha: number,
    beta: number
  ): number {
    const turnColor = isMaximizing ? aiColor : oppColor;
    const moves = this.engine.getLegalMoves(board, turnColor);

    if (moves.length === 0) {
      // Check if King is in check -> checkmate, else stalemate
      const inCheck = this.engine.isKingInCheck(board, turnColor);
      if (inCheck) {
        return isMaximizing ? -20000 : 20000;
      }
      return 0; // Stalemate
    }

    if (depth === 0) {
      return this.evaluateBoard(board, aiColor, oppColor);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nextBoard = this.makeMove(board, m.from, m.to);
        const evaluation = this.minimax(nextBoard, depth - 1, false, aiColor, oppColor, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const nextBoard = this.makeMove(board, m.from, m.to);
        const evaluation = this.minimax(nextBoard, depth - 1, true, aiColor, oppColor, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(
    board: ChessCell[][],
    aiColor: ChessPieceColor,
    oppColor: ChessPieceColor
  ): number {
    let aiScore = 0;
    let oppScore = 0;

    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = PIECE_VALUES[piece.type];

        // Positional bonus
        if (piece.type === 'P') {
          val += piece.color === 'W' ? PAWN_TABLE_WHITE[r][c] : PAWN_TABLE_WHITE[7 - r][c];
        } else if (piece.type === 'N') {
          val += KNIGHT_TABLE[r][c];
        }

        if (piece.color === aiColor) {
          aiScore += val;
        } else {
          oppScore += val;
        }
      }
    }

    return aiScore - oppScore;
  }
}
