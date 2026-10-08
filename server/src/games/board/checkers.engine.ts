import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  CheckersAction,
  CheckersPiece,
  CheckersResult,
  CheckersState,
  CheckersValidMove,
} from '../../../../shared/game-types';

export const CHECKERS_SIZE = 8;
export const TURN_DURATION_MS = 30000;

export class CheckersEngine
  implements GameEngine<CheckersState, CheckersAction, CheckersResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CHECKERS') || {
      id: 'CHECKERS',
      name: 'Checkers / Draughts',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Diagonal jumping, mandatory captures, and kinging board mechanics.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): CheckersState {
    if (!players || players.length < 2) {
      throw new Error('Checkers requires exactly 2 players');
    }

    const playerR = players[0].userId; // Red (bottom, moves first)
    const playerB = players[1].userId; // Black (top)

    const board: CheckersPiece[][] = Array(CHECKERS_SIZE)
      .fill(null)
      .map(() => Array(CHECKERS_SIZE).fill(null));

    // Place initial pieces on dark squares ((r + c) % 2 === 1)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = 'B';
        }
      }
    }

    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = 'R';
        }
      }
    }

    const validMoves = this.calculateValidMoves(board, 'R');

    return {
      board,
      turnPlayerId: playerR,
      turnColor: 'R',
      players: {
        R: playerR,
        B: playerB,
      },
      counts: { R: 12, B: 12 },
      validMoves,
      winnerId: null,
      isDraw: false,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  validateAction(state: CheckersState, playerId: string, action: CheckersAction): boolean {
    if ((action as any)?.type === 'RESIGN') {
      if (state.winnerId || state.isDraw) {
        throw new Error('Game has already concluded');
      }
      return true;
    }

    if (!action || !action.from || !action.to) {
      throw new Error('Invalid action: from [r, c] and to [r, c] are required');
    }

    if (state.winnerId || state.isDraw) {
      throw new Error('Game has already concluded');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const [fr, fc] = action.from;
    const [tr, tc] = action.to;

    const isValid = state.validMoves.some(
      (m) => m.from[0] === fr && m.from[1] === fc && m.to[0] === tr && m.to[1] === tc
    );

    if (!isValid) {
      throw new Error(`Illegal checkers move from [${fr}, ${fc}] to [${tr}, ${tc}]`);
    }

    return true;
  }

  applyAction(
    state: CheckersState,
    playerId: string,
    action: CheckersAction
  ): GameActionResult<CheckersState> {
    this.validateAction(state, playerId, action);

    if ((action as any)?.type === 'RESIGN') {
      const opponentId = state.players.R === playerId ? state.players.B : state.players.R;
      return {
        success: true,
        state: {
          ...state,
          winnerId: opponentId,
        },
        events: [
          {
            type: 'game:ended',
            data: {
              winnerId: opponentId,
              resignedBy: playerId,
              reason: 'resignation',
            },
          },
        ],
      };
    }

    const currentColor: 'R' | 'B' = state.turnColor;
    const nextColor: 'R' | 'B' = currentColor === 'R' ? 'B' : 'R';
    const nextPlayerId = currentColor === 'R' ? state.players.B : state.players.R;

    const [fr, fc] = action.from;
    const [tr, tc] = action.to;

    const matchedMove = state.validMoves.find(
      (m) => m.from[0] === fr && m.from[1] === fc && m.to[0] === tr && m.to[1] === tc
    )!;

    const newBoard: CheckersPiece[][] = state.board.map((r) => [...r]);
    let piece = newBoard[fr][fc]!;
    newBoard[fr][fc] = null;

    // Promotion check: reaching opposite side
    if (currentColor === 'R' && tr === 0 && piece === 'R') {
      piece = 'RK';
    } else if (currentColor === 'B' && tr === 7 && piece === 'B') {
      piece = 'BK';
    }

    newBoard[tr][tc] = piece;

    // Capture removal
    if (matchedMove.captured) {
      const [cr, cc] = matchedMove.captured;
      newBoard[cr][cc] = null;
    }

    // Tally pieces
    let countR = 0;
    let countB = 0;
    for (let r = 0; r < CHECKERS_SIZE; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        const p = newBoard[r][c];
        if (p === 'R' || p === 'RK') countR++;
        else if (p === 'B' || p === 'BK') countB++;
      }
    }

    // Check next player's moves
    const nextMoves = this.calculateValidMoves(newBoard, nextColor);
    let winnerId: string | null = null;
    let isDraw = false;

    if (countB === 0 || (nextColor === 'B' && nextMoves.length === 0)) {
      winnerId = state.players.R;
    } else if (countR === 0 || (nextColor === 'R' && nextMoves.length === 0)) {
      winnerId = state.players.B;
    }

    const nextState: CheckersState = {
      ...state,
      board: newBoard,
      turnPlayerId: winnerId ? state.turnPlayerId : nextPlayerId,
      turnColor: winnerId ? currentColor : nextColor,
      counts: { R: countR, B: countB },
      validMoves: winnerId ? [] : nextMoves,
      winnerId,
      isDraw,
      turnExpiresAt: winnerId ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'checkers:piece_moved',
          data: {
            playerId,
            from: [fr, fc],
            to: [tr, tc],
            captured: matchedMove.captured,
            isKing: piece === 'RK' || piece === 'BK',
            winnerId,
          },
        },
      ],
    };
  }

  calculateValidMoves(board: CheckersPiece[][], color: 'R' | 'B'): CheckersValidMove[] {
    const regularMoves: CheckersValidMove[] = [];
    const captureMoves: CheckersValidMove[] = [];

    const isMine = (p: CheckersPiece) =>
      color === 'R' ? p === 'R' || p === 'RK' : p === 'B' || p === 'BK';
    const isOpponent = (p: CheckersPiece) =>
      color === 'R' ? p === 'B' || p === 'BK' : p === 'R' || p === 'RK';

    for (let r = 0; r < CHECKERS_SIZE; r++) {
      for (let c = 0; c < CHECKERS_SIZE; c++) {
        const piece = board[r][c];
        if (!piece || !isMine(piece)) continue;

        const isKing = piece === 'RK' || piece === 'BK';
        const forwardDirections = color === 'R' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        const directions = isKing
          ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : forwardDirections;

        for (const [dr, dc] of directions) {
          // Regular 1-step move
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < CHECKERS_SIZE && nc >= 0 && nc < CHECKERS_SIZE && board[nr][nc] === null) {
            regularMoves.push({ from: [r, c], to: [nr, nc] });
          }

          // Jump capture (2-step move)
          const jr = r + dr * 2;
          const jc = c + dc * 2;
          if (
            jr >= 0 &&
            jr < CHECKERS_SIZE &&
            jc >= 0 &&
            jc < CHECKERS_SIZE &&
            board[jr][jc] === null &&
            board[nr][nc] !== null &&
            isOpponent(board[nr][nc])
          ) {
            captureMoves.push({
              from: [r, c],
              to: [jr, jc],
              captured: [nr, nc],
            });
          }
        }
      }
    }

    // Mandatory jump rule: if captures exist, only captures are allowed!
    return captureMoves.length > 0 ? captureMoves : regularMoves;
  }

  checkWinner(state: CheckersState): CheckersResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
      };
    }
    return null;
  }

  handleTurnTimeout(state: CheckersState): GameActionResult<CheckersState> {
    if (state.validMoves.length === 0) {
      return { success: false, error: 'No valid moves available' };
    }

    // Auto-play the first valid move (captures prioritized by calculateValidMoves)
    const move = state.validMoves[0];
    return this.applyAction(state, state.turnPlayerId, {
      from: move.from,
      to: move.to,
    });
  }
}
