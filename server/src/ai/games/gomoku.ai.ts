import { GameAI, AiDifficulty } from '../ai.interface';
import { GomokuAction, GomokuCell, GomokuState } from '../../../../shared/game-types';
import { GOMOKU_SIZE } from '../../games/board/gomoku.engine';

export class GomokuAI implements GameAI<GomokuState, GomokuAction> {
  getMove(state: GomokuState, aiPlayerId: string, difficulty: AiDifficulty): GomokuAction {
    const aiColor: GomokuCell = state.players.B === aiPlayerId ? 'B' : 'W';
    const oppColor: GomokuCell = aiColor === 'B' ? 'W' : 'B';

    // Find candidate empty spots near existing stones
    const candidates = this.getCandidates(state.board);

    if (candidates.length === 0) {
      // First move on empty board: center (7, 7)
      return { row: 7, col: 7 };
    }

    if (difficulty === 'EASY') {
      if (Math.random() < 0.4) {
        const rand = candidates[Math.floor(Math.random() * candidates.length)];
        return { row: rand[0], col: rand[1] };
      }
    }

    // 1. Can AI win immediately? (5 in a row)
    for (const [r, c] of candidates) {
      if (this.evalConsecutive(state.board, r, c, aiColor) >= 5) {
        return { row: r, col: c };
      }
    }

    // 2. Must AI block opponent immediate win?
    for (const [r, c] of candidates) {
      if (this.evalConsecutive(state.board, r, c, oppColor) >= 5) {
        return { row: r, col: c };
      }
    }

    // 3. Check for 4-in-a-row threats
    for (const [r, c] of candidates) {
      if (this.evalConsecutive(state.board, r, c, aiColor) === 4) {
        return { row: r, col: c };
      }
    }
    for (const [r, c] of candidates) {
      if (this.evalConsecutive(state.board, r, c, oppColor) === 4) {
        return { row: r, col: c };
      }
    }

    // Heuristic scoring across all candidates
    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const [r, c] of candidates) {
      const attackScore = this.evaluateSpot(state.board, r, c, aiColor);
      const defenseScore = this.evaluateSpot(state.board, r, c, oppColor);
      const score = attackScore * 1.1 + defenseScore + (Math.random() * 5);

      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }

    return { row: bestMove[0], col: bestMove[1] };
  }

  private getCandidates(board: GomokuCell[][]): [number, number][] {
    const occupied: [number, number][] = [];
    for (let r = 0; r < GOMOKU_SIZE; r++) {
      for (let c = 0; c < GOMOKU_SIZE; c++) {
        if (board[r][c] !== null) occupied.push([r, c]);
      }
    }

    if (occupied.length === 0) return [];

    const candidateSet = new Set<string>();
    const candidates: [number, number][] = [];

    for (const [or, oc] of occupied) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = or + dr;
          const nc = oc + dc;
          if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE) {
            if (board[nr][nc] === null) {
              const key = `${nr},${nc}`;
              if (!candidateSet.has(key)) {
                candidateSet.add(key);
                candidates.push([nr, nc]);
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  private evalConsecutive(board: GomokuCell[][], r: number, c: number, color: GomokuCell): number {
    const dirs: [number, number][] = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1], // Diagonal /
    ];

    let maxLine = 1;
    for (const [dr, dc] of dirs) {
      let count = 1;
      // forward
      for (let s = 1; s < 5; s++) {
        const nr = r + dr * s;
        const nc = c + dc * s;
        if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && board[nr][nc] === color) {
          count++;
        } else break;
      }
      // backward
      for (let s = 1; s < 5; s++) {
        const nr = r - dr * s;
        const nc = c - dc * s;
        if (nr >= 0 && nr < GOMOKU_SIZE && nc >= 0 && nc < GOMOKU_SIZE && board[nr][nc] === color) {
          count++;
        } else break;
      }
      maxLine = Math.max(maxLine, count);
    }
    return maxLine;
  }

  private evaluateSpot(board: GomokuCell[][], r: number, c: number, color: GomokuCell): number {
    const line = this.evalConsecutive(board, r, c, color);
    if (line >= 5) return 10000;
    if (line === 4) return 1000;
    if (line === 3) return 100;
    if (line === 2) return 10;
    return 1;
  }
}
