import { GameAI, AiDifficulty } from '../ai.interface';
import { TicTacToeAction, TicTacToeCell, TicTacToeState } from '../../../../shared/game-types';
import { WINNING_COMBINATIONS } from '../../games/tictactoe/tictactoe.engine';

export class TicTacToeAI implements GameAI<TicTacToeState, TicTacToeAction> {
  getMove(state: TicTacToeState, aiPlayerId: string, difficulty: AiDifficulty): TicTacToeAction {
    const board = state.board;
    const aiMark: TicTacToeCell = state.players.X === aiPlayerId ? 'X' : 'O';
    const oppMark: TicTacToeCell = aiMark === 'X' ? 'O' : 'X';

    // Find all empty cells
    const emptyCells: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        emptyCells.push(i);
      }
    }

    if (emptyCells.length === 0) {
      return { cellIndex: 0 };
    }

    // EASY: 40% random move, otherwise 1-step tactical
    if (difficulty === 'EASY') {
      if (Math.random() < 0.4) {
        const randIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        return { cellIndex: randIndex };
      }
    }

    // MEDIUM: 15% random blunder, otherwise minimax
    if (difficulty === 'MEDIUM') {
      if (Math.random() < 0.15) {
        const randIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        return { cellIndex: randIndex };
      }
    }

    // Instant Win or Block check (fast heuristic)
    for (const cell of emptyCells) {
      if (this.wouldWin(board, cell, aiMark)) {
        return { cellIndex: cell };
      }
    }
    for (const cell of emptyCells) {
      if (this.wouldWin(board, cell, oppMark)) {
        return { cellIndex: cell };
      }
    }

    // Full Minimax for Hard / Expert
    let bestScore = -Infinity;
    let bestMove = emptyCells[0];

    for (const cell of emptyCells) {
      board[cell] = aiMark;
      const score = this.minimax(board, 0, false, aiMark, oppMark, -Infinity, Infinity);
      board[cell] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = cell;
      }
    }

    return { cellIndex: bestMove };
  }

  private wouldWin(board: (TicTacToeCell | null)[], cell: number, mark: TicTacToeCell): boolean {
    board[cell] = mark;
    let won = false;
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (board[a] === mark && board[b] === mark && board[c] === mark) {
        won = true;
        break;
      }
    }
    board[cell] = null;
    return won;
  }

  private minimax(
    board: (TicTacToeCell | null)[],
    depth: number,
    isMaximizing: boolean,
    aiMark: TicTacToeCell,
    oppMark: TicTacToeCell,
    alpha: number,
    beta: number
  ): number {
    // Check terminal
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === aiMark ? 10 - depth : depth - 10;
      }
    }

    const available: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) available.push(i);
    }

    if (available.length === 0) return 0; // Draw

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const cell of available) {
        board[cell] = aiMark;
        const evaluation = this.minimax(board, depth + 1, false, aiMark, oppMark, alpha, beta);
        board[cell] = null;
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const cell of available) {
        board[cell] = oppMark;
        const evaluation = this.minimax(board, depth + 1, true, aiMark, oppMark, alpha, beta);
        board[cell] = null;
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
