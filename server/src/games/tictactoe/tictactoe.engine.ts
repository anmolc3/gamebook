import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  TicTacToeAction,
  TicTacToeCell,
  TicTacToeState,
} from '../../../../shared/game-types';

export interface TicTacToeResult {
  winnerId: string | null;
  isDraw: boolean;
  winningLine: number[] | null;
}

export const WINNING_COMBINATIONS: number[][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export const TURN_DURATION_MS = 15000; // 15-second authoritative turn clock

export class TicTacToeEngine
  implements GameEngine<TicTacToeState, TicTacToeAction, TicTacToeResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('TICTACTOE') || {
      id: 'TICTACTOE',
      name: 'Tic-Tac-Toe',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: false,
      turnTimeSeconds: 15,
      description: 'Classic 3x3 turn-based grid duel with instant server validation.',
      iconName: 'gamepad',
    };
  }

  /**
   * Initializes state when match starts in a room.
   * Player 0 is 'X' and takes the first turn. Player 1 is 'O'.
   */
  initialize(
    players: GamePlayerMeta[],
    settings?: { startingMark?: 'X' | 'O'; firstPlayerId?: string }
  ): TicTacToeState {
    if (!players || players.length < 2) {
      throw new Error('Tic-Tac-Toe requires exactly 2 players');
    }

    const playerX = players[0].userId;
    const playerO = players[1].userId;

    const firstPlayer = settings?.firstPlayerId || playerX;

    return {
      board: Array(9).fill(null),
      turnPlayerId: firstPlayer,
      players: {
        X: playerX,
        O: playerO,
      },
      winnerId: null,
      isDraw: false,
      winningLine: null,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  /**
   * Pure validation: returns true or throws an informative error
   */
  validateAction(state: TicTacToeState, playerId: string, action: TicTacToeAction): boolean {
    if (state.winnerId !== null || state.isDraw) {
      throw new Error('Match is already finished');
    }

    if (playerId !== state.turnPlayerId) {
      throw new Error('It is not your turn');
    }

    if (typeof action.cellIndex !== 'number') {
      throw new Error('Cell index must be a number');
    }

    if (action.cellIndex < 0 || action.cellIndex > 8 || !Number.isInteger(action.cellIndex)) {
      throw new Error('Cell index out of bounds (must be an integer between 0 and 8)');
    }

    if (state.board[action.cellIndex] !== null) {
      throw new Error(`Cell ${action.cellIndex} is already occupied by "${state.board[action.cellIndex]}"`);
    }

    return true;
  }

  /**
   * Applies validated player action to state, evaluates winning lines or draw,
   * and toggles the active turn.
   */
  applyAction(
    state: TicTacToeState,
    playerId: string,
    action: TicTacToeAction
  ): GameActionResult<TicTacToeState> {
    this.validateAction(state, playerId, action);

    const mark: TicTacToeCell = state.players.X === playerId ? 'X' : 'O';
    const nextBoard = [...state.board];
    nextBoard[action.cellIndex] = mark;

    // Check for winning combination
    let winningLine: number[] | null = null;
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (
        nextBoard[a] === mark &&
        nextBoard[b] === mark &&
        nextBoard[c] === mark
      ) {
        winningLine = combo;
        break;
      }
    }

    const isWinner = winningLine !== null;
    const isDraw = !isWinner && nextBoard.every((cell) => cell !== null);

    const opponentId =
      state.players.X === playerId ? state.players.O : state.players.X;

    const nextState: TicTacToeState = {
      ...state,
      board: nextBoard,
      winningLine: winningLine,
      winnerId: isWinner ? playerId : null,
      isDraw: isDraw,
      turnPlayerId: isWinner || isDraw ? state.turnPlayerId : opponentId,
      turnExpiresAt: isWinner || isDraw ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: isWinner
        ? [
            {
              type: 'game:winner_detected',
              data: { winnerId: playerId, winningLine, mark },
              target: 'ALL',
            },
          ]
        : isDraw
        ? [
            {
              type: 'game:draw_detected',
              data: { isDraw: true },
              target: 'ALL',
            },
          ]
        : [
            {
              type: 'game:turn_changed',
              data: {
                turnPlayerId: opponentId,
                turnExpiresAt: nextState.turnExpiresAt,
              },
              target: 'ALL',
            },
          ],
    };
  }

  /**
   * Returns outcome if game has ended
   */
  checkWinner(state: TicTacToeState): TicTacToeResult | null {
    if (state.winnerId !== null || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        winningLine: state.winningLine,
      };
    }
    return null;
  }

  /**
   * Handles 15-second turn timeout:
   * Auto-selects the first available empty cell to ensure match continuity
   */
  handleTurnTimeout(state: TicTacToeState): GameActionResult<TicTacToeState> {
    if (state.winnerId !== null || state.isDraw) {
      return { success: false, error: 'Match already finished', state };
    }

    const emptyIndices: number[] = [];
    state.board.forEach((cell, idx) => {
      if (cell === null) emptyIndices.push(idx);
    });

    if (emptyIndices.length === 0) {
      return { success: false, error: 'No empty cells available', state };
    }

    // Auto-play the first empty cell on timeout
    const autoIndex = emptyIndices[0];
    return this.applyAction(state, state.turnPlayerId, { cellIndex: autoIndex });
  }

  /**
   * Disconnect handling: pauses turn timer
   */
  handlePlayerDisconnect(state: TicTacToeState, playerId: string): TicTacToeState {
    return {
      ...state,
      turnExpiresAt: 0, // Pauses clock during disconnect grace period
    };
  }

  /**
   * Reconnection handling: resumes turn timer with fresh 15s window
   */
  handlePlayerReconnect(state: TicTacToeState, playerId: string): TicTacToeState {
    return {
      ...state,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }
}
