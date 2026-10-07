import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ReversiAction,
  ReversiCell,
  ReversiResult,
  ReversiState,
} from '../../../../shared/game-types';

export const REVERSI_SIZE = 8;
export const TURN_DURATION_MS = 25000;

const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export class ReversiEngine
  implements GameEngine<ReversiState, ReversiAction, ReversiResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('REVERSI') || {
      id: 'REVERSI',
      name: 'Reversi / Othello',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 25,
      description: 'Trap opponent discs between your pieces to flip colors across an 8x8 grid.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): ReversiState {
    if (!players || players.length < 2) {
      throw new Error('Reversi requires exactly 2 players');
    }

    const playerB = players[0].userId; // Black moves first
    const playerW = players[1].userId; // White

    const board: ReversiCell[][] = Array(REVERSI_SIZE)
      .fill(null)
      .map(() => Array(REVERSI_SIZE).fill(null));

    // Standard Othello 4 center pieces
    board[3][3] = 'W';
    board[3][4] = 'B';
    board[4][3] = 'B';
    board[4][4] = 'W';

    const validMoves = this.calculateValidMoves(board, 'B');

    return {
      board,
      turnPlayerId: playerB,
      players: {
        B: playerB,
        W: playerW,
      },
      counts: { B: 2, W: 2 },
      validMoves,
      consecutivePasses: 0,
      winnerId: null,
      isDraw: false,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  validateAction(state: ReversiState, playerId: string, action: ReversiAction): boolean {
    if (!action || typeof action.row !== 'number' || typeof action.col !== 'number') {
      throw new Error('Invalid action: row and col are required');
    }

    if (state.winnerId || state.isDraw) {
      throw new Error('Game has already concluded');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const { row, col } = action;
    if (row < 0 || row >= REVERSI_SIZE || col < 0 || col >= REVERSI_SIZE) {
      throw new Error(`Invalid coordinate [${row}, ${col}]: out of bounds`);
    }

    const isValid = state.validMoves.some(([r, c]) => r === row && c === col);
    if (!isValid) {
      throw new Error(`Illegal move at [${row}, ${col}]: move does not outflank any opponent pieces`);
    }

    return true;
  }

  applyAction(
    state: ReversiState,
    playerId: string,
    action: ReversiAction
  ): GameActionResult<ReversiState> {
    this.validateAction(state, playerId, action);

    const currentMark: 'B' | 'W' = playerId === state.players.B ? 'B' : 'W';
    const opponentMark: 'B' | 'W' = currentMark === 'B' ? 'W' : 'B';
    const opponentPlayerId = currentMark === 'B' ? state.players.W : state.players.B;

    const { row, col } = action;
    const newBoard: ReversiCell[][] = state.board.map((r) => [...r]);

    // Apply move and flip discs
    const flipped = this.getFlippedDiscs(newBoard, row, col, currentMark);
    newBoard[row][col] = currentMark;
    flipped.forEach(([fr, fc]) => {
      newBoard[fr][fc] = currentMark;
    });

    // Recalculate counts
    let countB = 0;
    let countW = 0;
    for (let r = 0; r < REVERSI_SIZE; r++) {
      for (let c = 0; c < REVERSI_SIZE; c++) {
        if (newBoard[r][c] === 'B') countB++;
        else if (newBoard[r][c] === 'W') countW++;
      }
    }

    // Check opponent's valid moves
    const oppMoves = this.calculateValidMoves(newBoard, opponentMark);

    let nextTurnPlayerId = opponentPlayerId;
    let nextValidMoves = oppMoves;
    let winnerId: string | null = null;
    let isDraw = false;

    if (oppMoves.length === 0) {
      // Opponent must pass! Check if current player can move again
      const myNextMoves = this.calculateValidMoves(newBoard, currentMark);
      if (myNextMoves.length === 0) {
        // Neither player can move -> Game Over!
        if (countB > countW) {
          winnerId = state.players.B;
        } else if (countW > countB) {
          winnerId = state.players.W;
        } else {
          isDraw = true;
        }
      } else {
        // Turn stays with current player (opponent passes)
        nextTurnPlayerId = playerId;
        nextValidMoves = myNextMoves;
      }
    }

    // Also check if board full
    if (countB + countW === REVERSI_SIZE * REVERSI_SIZE && !winnerId && !isDraw) {
      if (countB > countW) winnerId = state.players.B;
      else if (countW > countB) winnerId = state.players.W;
      else isDraw = true;
    }

    const nextState: ReversiState = {
      ...state,
      board: newBoard,
      counts: { B: countB, W: countW },
      turnPlayerId: winnerId || isDraw ? state.turnPlayerId : nextTurnPlayerId,
      validMoves: winnerId || isDraw ? [] : nextValidMoves,
      consecutivePasses: oppMoves.length === 0 ? state.consecutivePasses + 1 : 0,
      winnerId,
      isDraw,
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'reversi:disc_placed',
          data: {
            playerId,
            mark: currentMark,
            row,
            col,
            flippedCount: flipped.length,
            counts: { B: countB, W: countW },
            passed: oppMoves.length === 0 && !winnerId && !isDraw,
          },
        },
      ],
    };
  }

  calculateValidMoves(board: ReversiCell[][], mark: 'B' | 'W'): [number, number][] {
    const valid: [number, number][] = [];
    for (let r = 0; r < REVERSI_SIZE; r++) {
      for (let c = 0; c < REVERSI_SIZE; c++) {
        if (board[r][c] === null) {
          const flipped = this.getFlippedDiscs(board, r, c, mark);
          if (flipped.length > 0) {
            valid.push([r, c]);
          }
        }
      }
    }
    return valid;
  }

  private getFlippedDiscs(
    board: ReversiCell[][],
    r: number,
    c: number,
    mark: 'B' | 'W'
  ): [number, number][] {
    const oppMark: 'B' | 'W' = mark === 'B' ? 'W' : 'B';
    const allFlipped: [number, number][] = [];

    for (const [dr, dc] of DIRECTIONS) {
      const line: [number, number][] = [];
      let step = 1;

      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;

        if (nr < 0 || nr >= REVERSI_SIZE || nc < 0 || nc >= REVERSI_SIZE) {
          break;
        }

        const cell = board[nr][nc];
        if (cell === oppMark) {
          line.push([nr, nc]);
          step++;
        } else if (cell === mark) {
          // Outflanked! Add all accumulated opponent pieces in this direction
          if (line.length > 0) {
            allFlipped.push(...line);
          }
          break;
        } else {
          // Empty cell: no bracket
          break;
        }
      }
    }

    return allFlipped;
  }

  checkWinner(state: ReversiState): ReversiResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        counts: state.counts,
      };
    }
    return null;
  }

  handleTurnTimeout(state: ReversiState): GameActionResult<ReversiState> {
    if (state.validMoves.length === 0) {
      // Auto-pass if no moves
      return { success: true, state };
    }

    // Pick move that flips the most opponent discs (greedy)
    const currentMark: 'B' | 'W' = state.turnPlayerId === state.players.B ? 'B' : 'W';
    let bestMove = state.validMoves[0];
    let maxFlips = -1;

    for (const [r, c] of state.validMoves) {
      const flips = this.getFlippedDiscs(state.board, r, c, currentMark).length;
      if (flips > maxFlips) {
        maxFlips = flips;
        bestMove = [r, c];
      }
    }

    return this.applyAction(state, state.turnPlayerId, {
      row: bestMove[0],
      col: bestMove[1],
    });
  }
}
