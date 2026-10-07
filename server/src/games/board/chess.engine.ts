import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ChessAction,
  ChessCell,
  ChessPiece,
  ChessPieceColor,
  ChessPieceType,
  ChessResult,
  ChessState,
} from '../../../../shared/game-types';

export const CHESS_SIZE = 8;
export const TURN_DURATION_MS = 60000;

export class ChessEngine
  implements GameEngine<ChessState, ChessAction, ChessResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CHESS') || {
      id: 'CHESS',
      name: 'Chess Grandmaster',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 60,
      description: 'Standard FIDE chess rules with move timers, checkmate detection, and draw offers.',
      iconName: 'crown',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): ChessState {
    if (!players || players.length < 2) {
      throw new Error('Chess requires exactly 2 players');
    }

    const playerW = players[0].userId; // White moves first
    const playerB = players[1].userId; // Black

    const board: ChessCell[][] = Array(CHESS_SIZE)
      .fill(null)
      .map(() => Array(CHESS_SIZE).fill(null));

    // Setup Black pieces (rows 0 and 1)
    const backRankBlack: ChessPieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < CHESS_SIZE; c++) {
      board[0][c] = { type: backRankBlack[c], color: 'B', hasMoved: false };
      board[1][c] = { type: 'P', color: 'B', hasMoved: false };
    }

    // Setup White pieces (rows 6 and 7)
    const backRankWhite: ChessPieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < CHESS_SIZE; c++) {
      board[6][c] = { type: 'P', color: 'W', hasMoved: false };
      board[7][c] = { type: backRankWhite[c], color: 'W', hasMoved: false };
    }

    return {
      board,
      turnPlayerId: playerW,
      turnColor: 'W',
      players: {
        W: playerW,
        B: playerB,
      },
      inCheck: false,
      winnerId: null,
      isDraw: false,
      turnExpiresAt: Date.now() + TURN_DURATION_MS,
    };
  }

  validateAction(state: ChessState, playerId: string, action: ChessAction): boolean {
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

    if (
      fr < 0 || fr >= CHESS_SIZE || fc < 0 || fc >= CHESS_SIZE ||
      tr < 0 || tr >= CHESS_SIZE || tc < 0 || tc >= CHESS_SIZE
    ) {
      throw new Error('Coordinates out of bounds');
    }

    const piece = state.board[fr][fc];
    if (!piece) {
      throw new Error(`No piece at source square [${fr}, ${fc}]`);
    }

    if (piece.color !== state.turnColor) {
      throw new Error(`Cannot move opponent's piece`);
    }

    const legalMoves = this.getLegalMoves(state.board, state.turnColor);
    const isLegal = legalMoves.some(
      (m) => m.from[0] === fr && m.from[1] === fc && m.to[0] === tr && m.to[1] === tc
    );

    if (!isLegal) {
      throw new Error(`Illegal chess move from [${fr}, ${fc}] to [${tr}, ${tc}]`);
    }

    return true;
  }

  applyAction(state: ChessState, playerId: string, action: ChessAction): GameActionResult<ChessState> {
    this.validateAction(state, playerId, action);

    const currentColor = state.turnColor;
    const nextColor: ChessPieceColor = currentColor === 'W' ? 'B' : 'W';
    const nextPlayerId = currentColor === 'W' ? state.players.B : state.players.W;

    const [fr, fc] = action.from;
    const [tr, tc] = action.to;

    const newBoard: ChessCell[][] = state.board.map((r) =>
      r.map((c) => (c ? { ...c } : null))
    );

    let piece = newBoard[fr][fc]!;
    newBoard[fr][fc] = null;
    piece.hasMoved = true;

    // Pawn Promotion
    if (piece.type === 'P') {
      if ((piece.color === 'W' && tr === 0) || (piece.color === 'B' && tr === 7)) {
        piece.type = action.promotion || 'Q';
      }
    }

    newBoard[tr][tc] = piece;

    // Check if next player is in check
    const isNextInCheck = this.isKingInCheck(newBoard, nextColor);
    const nextLegalMoves = this.getLegalMoves(newBoard, nextColor);

    let winnerId: string | null = null;
    let isDraw = false;
    let drawReason: string | undefined;

    if (nextLegalMoves.length === 0) {
      if (isNextInCheck) {
        // Checkmate! Current player wins
        winnerId = playerId;
      } else {
        // Stalemate! Draw
        isDraw = true;
        drawReason = 'Stalemate';
      }
    }

    const nextState: ChessState = {
      ...state,
      board: newBoard,
      turnPlayerId: winnerId || isDraw ? state.turnPlayerId : nextPlayerId,
      turnColor: winnerId || isDraw ? currentColor : nextColor,
      inCheck: isNextInCheck,
      winnerId,
      isDraw,
      drawReason,
      lastMove: { from: [fr, fc], to: [tr, tc] },
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'chess:move_applied',
          data: {
            playerId,
            from: [fr, fc],
            to: [tr, tc],
            piece: piece.type,
            color: piece.color,
            inCheck: isNextInCheck,
            winnerId,
            isDraw,
            drawReason,
          },
        },
      ],
    };
  }

  getLegalMoves(board: ChessCell[][], color: ChessPieceColor): { from: [number, number]; to: [number, number] }[] {
    const legal: { from: [number, number]; to: [number, number] }[] = [];

    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;

        const candidateMoves = this.getPseudoLegalMoves(board, r, c, piece);

        for (const [tr, tc] of candidateMoves) {
          // Simulate move and verify King is not in check
          const simBoard: ChessCell[][] = board.map((row) =>
            row.map((cell) => (cell ? { ...cell } : null))
          );
          simBoard[tr][tc] = { ...piece, hasMoved: true };
          simBoard[r][c] = null;

          if (!this.isKingInCheck(simBoard, color)) {
            legal.push({ from: [r, c], to: [tr, tc] });
          }
        }
      }
    }

    return legal;
  }

  private getPseudoLegalMoves(board: ChessCell[][], r: number, c: number, piece: ChessPiece): [number, number][] {
    const moves: [number, number][] = [];
    const color = piece.color;
    const oppColor: ChessPieceColor = color === 'W' ? 'B' : 'W';

    const addIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr >= CHESS_SIZE || nc < 0 || nc >= CHESS_SIZE) return false;
      const target = board[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
        return true; // continue ray
      } else if (target.color === oppColor) {
        moves.push([nr, nc]);
        return false; // hit opponent, stop ray
      }
      return false; // hit friend, stop ray
    };

    if (piece.type === 'P') {
      const dir = color === 'W' ? -1 : 1;
      const startRow = color === 'W' ? 6 : 1;

      // 1 step forward
      const f1 = r + dir;
      if (f1 >= 0 && f1 < CHESS_SIZE && board[f1][c] === null) {
        moves.push([f1, c]);
        // 2 steps forward from start
        const f2 = r + dir * 2;
        if (r === startRow && board[f2][c] === null) {
          moves.push([f2, c]);
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (f1 >= 0 && f1 < CHESS_SIZE && nc >= 0 && nc < CHESS_SIZE) {
          const target = board[f1][nc];
          if (target && target.color === oppColor) {
            moves.push([f1, nc]);
          }
        }
      }
    } else if (piece.type === 'N') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightOffsets) {
        addIfValid(r + dr, c + dc);
      }
    } else if (piece.type === 'B' || piece.type === 'Q') {
      const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of diagonals) {
        let step = 1;
        while (addIfValid(r + dr * step, c + dc * step)) {
          step++;
        }
      }
    }

    if (piece.type === 'R' || piece.type === 'Q') {
      const orthogonals = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of orthogonals) {
        let step = 1;
        while (addIfValid(r + dr * step, c + dc * step)) {
          step++;
        }
      }
    } else if (piece.type === 'K') {
      const kingDirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      for (const [dr, dc] of kingDirs) {
        addIfValid(r + dr, c + dc);
      }
    }

    return moves;
  }

  isKingInCheck(board: ChessCell[][], color: ChessPieceColor): boolean {
    // 1. Find King position
    let kr = -1;
    let kc = -1;
    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'K' && piece.color === color) {
          kr = r;
          kc = c;
          break;
        }
      }
      if (kr !== -1) break;
    }

    if (kr === -1) return false;

    // 2. Check if any opponent piece can attack [kr, kc]
    const oppColor: ChessPieceColor = color === 'W' ? 'B' : 'W';
    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const piece = board[r][c];
        if (piece && piece.color === oppColor) {
          const pseudoMoves = this.getPseudoLegalMoves(board, r, c, piece);
          if (pseudoMoves.some(([tr, tc]) => tr === kr && tc === kc)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  checkWinner(state: ChessState): ChessResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        drawReason: state.drawReason,
      };
    }
    return null;
  }

  handleTurnTimeout(state: ChessState): GameActionResult<ChessState> {
    const legalMoves = this.getLegalMoves(state.board, state.turnColor);
    if (legalMoves.length === 0) {
      return { success: false, error: 'No legal moves' };
    }

    const firstMove = legalMoves[0];
    return this.applyAction(state, state.turnPlayerId, {
      from: firstMove.from,
      to: firstMove.to,
    });
  }
}
