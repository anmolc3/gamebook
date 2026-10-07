import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GomokuAction,
  GomokuCell,
  GomokuResult,
  GomokuState,
} from '../../../../shared/game-types';

export const GOMOKU_SIZE = 15;
export const TURN_DURATION_MS = 20000;

export class GomokuEngine
  implements GameEngine<GomokuState, GomokuAction, GomokuResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('GOMOKU') || {
      id: 'GOMOKU',
      name: 'Gomoku',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Five-in-a-row placement duel on a 15x15 Go board without captures.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): GomokuState {
    if (!players || players.length < 2) {
      throw new Error('Gomoku requires exactly 2 players');
    }

    const playerB = players[0].userId; // Black plays first
    const playerW = players[1].userId; // White

    const board: GomokuCell[][] = Array(GOMOKU_SIZE)
      .fill(null)
      .map(() => Array(GOMOKU_SIZE).fill(null));

    return {
      board,
      turnPlayerId: playerB,
      players: {
        B: playerB,
        W: playerW,
      },
      winnerId: null,
      isDraw: false,
      winningLine: null,
      lastMove: null,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  validateAction(state: GomokuState, playerId: string, action: GomokuAction): boolean {
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
    if (row < 0 || row >= GOMOKU_SIZE || col < 0 || col >= GOMOKU_SIZE) {
      throw new Error(`Coordinate [${row}, ${col}] is out of bounds (0..${GOMOKU_SIZE - 1})`);
    }

    if (state.board[row][col] !== null) {
      throw new Error(`Cell [${row}, ${col}] is already occupied`);
    }

    return true;
  }

  applyAction(
    state: GomokuState,
    playerId: string,
    action: GomokuAction
  ): GameActionResult<GomokuState> {
    this.validateAction(state, playerId, action);

    const mark: 'B' | 'W' = playerId === state.players.B ? 'B' : 'W';
    const nextPlayerId = playerId === state.players.B ? state.players.W : state.players.B;
    const { row, col } = action;

    const newBoard: GomokuCell[][] = state.board.map((r) => [...r]);
    newBoard[row][col] = mark;

    // Check 5-in-a-row
    const winLine = this.checkWinAt(newBoard, row, col, mark);
    let winnerId: string | null = null;
    let isDraw = false;

    if (winLine) {
      winnerId = playerId;
    } else {
      // Check draw: all 225 cells filled
      const isFull = newBoard.every((r) => r.every((c) => c !== null));
      if (isFull) {
        isDraw = true;
      }
    }

    const nextState: GomokuState = {
      ...state,
      board: newBoard,
      turnPlayerId: winnerId || isDraw ? state.turnPlayerId : nextPlayerId,
      winnerId,
      isDraw,
      winningLine: winLine,
      lastMove: [row, col],
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'gomoku:stone_placed',
          data: {
            playerId,
            mark,
            row,
            col,
            winnerId,
            isDraw,
            winningLine: winLine,
          },
        },
      ],
    };
  }

  private checkWinAt(
    board: GomokuCell[][],
    r: number,
    c: number,
    mark: 'B' | 'W'
  ): [number, number][] | null {
    const directions: [number, number][] = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1], // Diagonal /
    ];

    for (const [dr, dc] of directions) {
      const line: [number, number][] = [[r, c]];

      // Forward
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (
          nr >= 0 &&
          nr < GOMOKU_SIZE &&
          nc >= 0 &&
          nc < GOMOKU_SIZE &&
          board[nr][nc] === mark
        ) {
          line.push([nr, nc]);
          step++;
        } else {
          break;
        }
      }

      // Backward
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (
          nr >= 0 &&
          nr < GOMOKU_SIZE &&
          nc >= 0 &&
          nc < GOMOKU_SIZE &&
          board[nr][nc] === mark
        ) {
          line.unshift([nr, nc]);
          step++;
        } else {
          break;
        }
      }

      if (line.length >= 5) {
        return line.slice(0, 5);
      }
    }

    return null;
  }

  checkWinner(state: GomokuState): GomokuResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        winningLine: state.winningLine,
      };
    }
    return null;
  }

  handleTurnTimeout(state: GomokuState): GameActionResult<GomokuState> {
    // Pick center cell or closest empty cell around center
    const center = Math.floor(GOMOKU_SIZE / 2); // 7
    if (state.board[center][center] === null) {
      return this.applyAction(state, state.turnPlayerId, { row: center, col: center });
    }

    // Spiral search outward
    for (let dist = 1; dist < GOMOKU_SIZE; dist++) {
      for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
          const r = center + dr;
          const c = center + dc;
          if (
            r >= 0 &&
            r < GOMOKU_SIZE &&
            c >= 0 &&
            c < GOMOKU_SIZE &&
            state.board[r][c] === null
          ) {
            return this.applyAction(state, state.turnPlayerId, { row: r, col: c });
          }
        }
      }
    }

    return { success: false, error: 'Board completely full' };
  }
}
