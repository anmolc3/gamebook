import { GameAI, AiDifficulty } from '../ai.interface';
import { ConnectFourAction, ConnectFourCell, ConnectFourState } from '../../../../shared/game-types';
import { CONNECT_FOUR_COLS, CONNECT_FOUR_ROWS } from '../../games/board/connectfour.engine';

export class ConnectFourAI implements GameAI<ConnectFourState, ConnectFourAction> {
  getMove(state: ConnectFourState, aiPlayerId: string, difficulty: AiDifficulty): ConnectFourAction {
    const aiMark: ConnectFourCell = state.players.R === aiPlayerId ? 'R' : 'Y';
    const oppMark: ConnectFourCell = aiMark === 'R' ? 'Y' : 'R';

    // Get valid columns (column where row 0 is null)
    const validCols: number[] = [];
    for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
      if (state.board[0][c] === null) {
        validCols.push(c);
      }
    }

    if (validCols.length === 0) {
      return { column: 0 };
    }

    if (difficulty === 'EASY') {
      // 50% random, 50% basic 1-step tactical check
      if (Math.random() < 0.5) {
        const randCol = validCols[Math.floor(Math.random() * validCols.length)];
        return { column: randCol };
      }
    }

    // 1-step win or block check
    for (const c of validCols) {
      const sim = this.dropPiece(state.board, c, aiMark);
      if (sim && this.checkWin(sim.board, aiMark)) {
        return { column: c };
      }
    }
    for (const c of validCols) {
      const sim = this.dropPiece(state.board, c, oppMark);
      if (sim && this.checkWin(sim.board, oppMark)) {
        return { column: c };
      }
    }

    if (difficulty === 'EASY') {
      return { column: validCols[Math.floor(Math.random() * validCols.length)] };
    }

    const depth = difficulty === 'MEDIUM' ? 3 : difficulty === 'HARD' ? 5 : 6;

    let bestScore = -Infinity;
    let bestCol = validCols[0];

    // Center-first column ordering for faster alpha-beta cutoffs
    const orderedCols = [...validCols].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

    for (const c of orderedCols) {
      const sim = this.dropPiece(state.board, c, aiMark);
      if (!sim) continue;

      const score = this.minimax(sim.board, depth - 1, false, aiMark, oppMark, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestCol = c;
      }
    }

    return { column: bestCol };
  }

  private dropPiece(
    board: ConnectFourCell[][],
    col: number,
    mark: ConnectFourCell
  ): { board: ConnectFourCell[][]; row: number } | null {
    if (board[0][col] !== null) return null;

    const copy = board.map((row) => [...row]);
    for (let r = CONNECT_FOUR_ROWS - 1; r >= 0; r--) {
      if (copy[r][col] === null) {
        copy[r][col] = mark;
        return { board: copy, row: r };
      }
    }
    return null;
  }

  private minimax(
    board: ConnectFourCell[][],
    depth: number,
    isMaximizing: boolean,
    aiMark: ConnectFourCell,
    oppMark: ConnectFourCell,
    alpha: number,
    beta: number
  ): number {
    if (this.checkWin(board, aiMark)) return 100000 + depth;
    if (this.checkWin(board, oppMark)) return -100000 - depth;

    const validCols: number[] = [];
    for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
      if (board[0][c] === null) validCols.push(c);
    }

    if (validCols.length === 0 || depth === 0) {
      return this.evaluateBoard(board, aiMark, oppMark);
    }

    const orderedCols = [...validCols].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const c of orderedCols) {
        const sim = this.dropPiece(board, c, aiMark);
        if (!sim) continue;
        const evaluation = this.minimax(sim.board, depth - 1, false, aiMark, oppMark, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const c of orderedCols) {
        const sim = this.dropPiece(board, c, oppMark);
        if (!sim) continue;
        const evaluation = this.minimax(sim.board, depth - 1, true, aiMark, oppMark, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(
    board: ConnectFourCell[][],
    aiMark: ConnectFourCell,
    oppMark: ConnectFourCell
  ): number {
    let score = 0;

    // Center column preference
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
      if (board[r][3] === aiMark) score += 4;
      else if (board[r][3] === oppMark) score -= 4;
    }

    // Windows of 4 evaluation
    // Horizontal
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        score += this.evalWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], aiMark, oppMark);
      }
    }

    // Vertical
    for (let r = 0; r < CONNECT_FOUR_ROWS - 3; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
        score += this.evalWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], aiMark, oppMark);
      }
    }

    // Diagonal Positive
    for (let r = 0; r < CONNECT_FOUR_ROWS - 3; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        score += this.evalWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], aiMark, oppMark);
      }
    }

    // Diagonal Negative
    for (let r = 3; r < CONNECT_FOUR_ROWS; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        score += this.evalWindow([board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]], aiMark, oppMark);
      }
    }

    return score;
  }

  private evalWindow(window: ConnectFourCell[], aiMark: ConnectFourCell, oppMark: ConnectFourCell): number {
    let aiCount = 0;
    let oppCount = 0;
    let emptyCount = 0;

    for (const cell of window) {
      if (cell === aiMark) aiCount++;
      else if (cell === oppMark) oppCount++;
      else emptyCount++;
    }

    if (aiCount === 4) return 10000;
    if (aiCount === 3 && emptyCount === 1) return 100;
    if (aiCount === 2 && emptyCount === 2) return 10;
    if (oppCount === 3 && emptyCount === 1) return -90;
    if (oppCount === 2 && emptyCount === 2) return -8;
    return 0;
  }

  private checkWin(board: ConnectFourCell[][], mark: ConnectFourCell): boolean {
    // Horizontal
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        if (
          board[r][c] === mark &&
          board[r][c + 1] === mark &&
          board[r][c + 2] === mark &&
          board[r][c + 3] === mark
        ) return true;
      }
    }
    // Vertical
    for (let r = 0; r < CONNECT_FOUR_ROWS - 3; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
        if (
          board[r][c] === mark &&
          board[r + 1][c] === mark &&
          board[r + 2][c] === mark &&
          board[r + 3][c] === mark
        ) return true;
      }
    }
    // Diagonal \
    for (let r = 0; r < CONNECT_FOUR_ROWS - 3; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        if (
          board[r][c] === mark &&
          board[r + 1][c + 1] === mark &&
          board[r + 2][c + 2] === mark &&
          board[r + 3][c + 3] === mark
        ) return true;
      }
    }
    // Diagonal /
    for (let r = 3; r < CONNECT_FOUR_ROWS; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS - 3; c++) {
        if (
          board[r][c] === mark &&
          board[r - 1][c + 1] === mark &&
          board[r - 2][c + 2] === mark &&
          board[r - 3][c + 3] === mark
        ) return true;
      }
    }
    return false;
  }
}
