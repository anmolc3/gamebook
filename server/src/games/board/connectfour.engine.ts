import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ConnectFourAction,
  ConnectFourCell,
  ConnectFourResult,
  ConnectFourState,
} from '../../../../shared/game-types';

export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLS = 7;
export const TURN_DURATION_MS = 20000;

export class ConnectFourEngine
  implements GameEngine<ConnectFourState, ConnectFourAction, ConnectFourResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CONNECT_FOUR') || {
      id: 'CONNECT_FOUR',
      name: 'Connect Four',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Vertical disc-dropping gravity grid with 4-in-a-row detection across all angles.',
      iconName: 'target',
    };
  }

  initialize(
    players: GamePlayerMeta[],
    settings?: { startingMark?: 'R' | 'Y'; firstPlayerId?: string }
  ): ConnectFourState {
    if (!players || players.length < 2) {
      throw new Error('Connect Four requires exactly 2 players');
    }

    const playerR = players[0].userId; // Red drops first
    const playerY = players[1].userId; // Yellow
    const firstPlayer = settings?.firstPlayerId || playerR;

    const board: ConnectFourCell[][] = Array(CONNECT_FOUR_ROWS)
      .fill(null)
      .map(() => Array(CONNECT_FOUR_COLS).fill(null));

    return {
      board,
      turnPlayerId: firstPlayer,
      players: {
        R: playerR,
        Y: playerY,
      },
      winnerId: null,
      isDraw: false,
      winningLine: null,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  validateAction(state: ConnectFourState, playerId: string, action: ConnectFourAction): boolean {
    if (!action || typeof action.column !== 'number') {
      throw new Error('Invalid action: column is required');
    }

    if (state.winnerId || state.isDraw) {
      throw new Error('Game has already concluded');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const { column } = action;
    if (column < 0 || column >= CONNECT_FOUR_COLS) {
      throw new Error(`Invalid column ${column}: must be between 0 and ${CONNECT_FOUR_COLS - 1}`);
    }

    // Check if column is full (top row is occupied)
    if (state.board[0][column] !== null) {
      throw new Error(`Column ${column} is completely full`);
    }

    return true;
  }

  applyAction(
    state: ConnectFourState,
    playerId: string,
    action: ConnectFourAction
  ): GameActionResult<ConnectFourState> {
    this.validateAction(state, playerId, action);

    const mark: 'R' | 'Y' = playerId === state.players.R ? 'R' : 'Y';
    const nextPlayerId = playerId === state.players.R ? state.players.Y : state.players.R;
    const col = action.column;

    // Deep clone board
    const newBoard: ConnectFourCell[][] = state.board.map((row) => [...row]);

    // Find lowest available row in column
    let landingRow = -1;
    for (let r = CONNECT_FOUR_ROWS - 1; r >= 0; r--) {
      if (newBoard[r][col] === null) {
        landingRow = r;
        break;
      }
    }

    newBoard[landingRow][col] = mark;

    // Check win condition
    const winLine = this.checkWinAt(newBoard, landingRow, col, mark);
    let winnerId: string | null = null;
    let isDraw = false;

    if (winLine) {
      winnerId = playerId;
    } else {
      // Check draw: top row completely filled
      const isFull = newBoard[0].every((cell) => cell !== null);
      if (isFull) {
        isDraw = true;
      }
    }

    const nextState: ConnectFourState = {
      ...state,
      board: newBoard,
      turnPlayerId: winnerId || isDraw ? state.turnPlayerId : nextPlayerId,
      winnerId,
      isDraw,
      winningLine: winLine,
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'connectfour:disc_dropped',
          data: {
            playerId,
            mark,
            column: col,
            row: landingRow,
            winnerId,
            isDraw,
            winningLine: winLine,
          },
        },
      ],
    };
  }

  private checkWinAt(
    board: ConnectFourCell[][],
    r: number,
    c: number,
    mark: 'R' | 'Y'
  ): [number, number][] | null {
    const directions: [number, number][] = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1], // Diagonal /
    ];

    for (const [dr, dc] of directions) {
      const line: [number, number][] = [[r, c]];

      // Forward in direction
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (
          nr >= 0 &&
          nr < CONNECT_FOUR_ROWS &&
          nc >= 0 &&
          nc < CONNECT_FOUR_COLS &&
          board[nr][nc] === mark
        ) {
          line.push([nr, nc]);
          step++;
        } else {
          break;
        }
      }

      // Backward in direction
      step = 1;
      while (true) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (
          nr >= 0 &&
          nr < CONNECT_FOUR_ROWS &&
          nc >= 0 &&
          nc < CONNECT_FOUR_COLS &&
          board[nr][nc] === mark
        ) {
          line.unshift([nr, nc]);
          step++;
        } else {
          break;
        }
      }

      if (line.length >= 4) {
        return line.slice(0, 4);
      }
    }

    return null;
  }

  checkWinner(state: ConnectFourState): ConnectFourResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        winningLine: state.winningLine,
      };
    }
    return null;
  }

  handleTurnTimeout(state: ConnectFourState): GameActionResult<ConnectFourState> {
    // Pick the center-most available column
    const colOrder = [3, 2, 4, 1, 5, 0, 6];
    let selectedCol = 0;
    for (const c of colOrder) {
      if (state.board[0][c] === null) {
        selectedCol = c;
        break;
      }
    }

    return this.applyAction(state, state.turnPlayerId, { column: selectedCol });
  }
}
