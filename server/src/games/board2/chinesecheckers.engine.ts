import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ChineseCheckersAction,
  ChineseCheckersMarble,
  ChineseCheckersResult,
  ChineseCheckersState,
} from '../../../../shared/game-types';

export const CHINESE_CHECKERS_TURN_DURATION_MS = 30000;

export class ChineseCheckersEngine
  implements
    GameEngine<
      ChineseCheckersState,
      ChineseCheckersAction,
      ChineseCheckersResult
    >
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('CHINESE_CHECKERS') || {
      id: 'CHINESE_CHECKERS',
      name: 'Chinese Checkers',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 6,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Hexagram star board with single steps and multi-hop jumps.',
      iconName: 'target',
    };
  }

  static DIRECTIONS: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [-1, -1],
  ];

  initialize(players: GamePlayerMeta[], settings?: any): ChineseCheckersState {
    if (!players || players.length < 2) {
      throw new Error('Chinese Checkers requires at least 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];

    const marbles: ChineseCheckersMarble[] = [];

    const topCoords: [number, number][] = [
      [0, 6],
      [1, 5], [1, 6],
      [2, 5], [2, 6], [2, 7],
      [3, 4], [3, 5], [3, 6], [3, 7],
    ];

    topCoords.forEach((coord, i) => {
      marbles.push({
        id: `red-${i}`,
        ownerId: p1.userId,
        color: 'RED',
        coord,
      });
    });

    const bottomCoords: [number, number][] = [
      [16, 6],
      [15, 5], [15, 6],
      [14, 5], [14, 6], [14, 7],
      [13, 4], [13, 5], [13, 6], [13, 7],
    ];

    bottomCoords.forEach((coord, i) => {
      marbles.push({
        id: `blue-${i}`,
        ownerId: p2.userId,
        color: 'BLUE',
        coord,
      });
    });

    return {
      marbles,
      players: [
        { userId: p1.userId, color: 'RED' },
        { userId: p2.userId, color: 'BLUE' },
      ],
      turnPlayerId: p1.userId,
      winnerId: null,
      turnExpiresAt: Date.now() + CHINESE_CHECKERS_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: ChineseCheckersState,
    playerId: string,
    action: ChineseCheckersAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to move marble');
    }
    if (action.type !== 'MOVE_MARBLE') {
      throw new Error('Invalid action type');
    }

    const marble = state.marbles.find((m) => m.id === action.marbleId);
    if (!marble || marble.ownerId !== playerId) {
      throw new Error('You do not own this marble');
    }

    const [toR, toC] = action.to;
    if (toR < 0 || toR > 16 || toC < 0 || toC > 12) {
      throw new Error('Target coordinates are outside board bounds');
    }

    const occupied = state.marbles.some(
      (m) => m.coord[0] === toR && m.coord[1] === toC
    );
    if (occupied) {
      throw new Error('Target position is already occupied');
    }

    const [fromR, fromC] = marble.coord;
    const dr = toR - fromR;
    const dc = toC - fromC;

    const isSingleStep = ChineseCheckersEngine.DIRECTIONS.some(
      ([dRow, dCol]) => dRow === dr && dCol === dc
    );
    if (isSingleStep) {
      return true;
    }

    const isJump = ChineseCheckersEngine.DIRECTIONS.some(([dRow, dCol]) => {
      if (dRow * 2 === dr && dCol * 2 === dc) {
        const midR = fromR + dRow;
        const midC = fromC + dCol;
        return state.marbles.some(
          (m) => m.coord[0] === midR && m.coord[1] === midC
        );
      }
      return false;
    });

    if (isJump) {
      return true;
    }

    throw new Error('Illegal move: must be single step or jump over a marble');
  }

  applyAction(
    state: ChineseCheckersState,
    playerId: string,
    action: ChineseCheckersAction
  ): GameActionResult<ChineseCheckersState> {
    this.validateAction(state, playerId, action);
    const opponent = state.players.find((p) => p.userId !== playerId)!;

    const marbles = state.marbles.map((m) => {
      if (m.id === action.marbleId) {
        return {
          ...m,
          coord: action.to,
        };
      }
      return m;
    });

    const playerRecord = state.players.find((p) => p.userId === playerId)!;
    const playerMarbles = marbles.filter((m) => m.ownerId === playerId);

    let winnerId: string | null = null;
    if (playerRecord.color === 'RED') {
      const reached = playerMarbles.every((m) => m.coord[0] >= 13);
      if (reached) winnerId = playerId;
    } else {
      const reached = playerMarbles.every((m) => m.coord[0] <= 3);
      if (reached) winnerId = playerId;
    }

    const nextState: ChineseCheckersState = {
      ...state,
      marbles,
      turnPlayerId: winnerId ? playerId : opponent.userId,
      winnerId,
      lastMove: {
        from: state.marbles.find((m) => m.id === action.marbleId)!.coord,
        to: action.to,
      },
      turnExpiresAt: winnerId ? 0 : Date.now() + CHINESE_CHECKERS_TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'chinesecheckers:moved',
          data: {
            playerId,
            marbleId: action.marbleId,
            to: action.to,
            winnerId,
          },
        },
      ],
    };
  }

  checkWinner(state: ChineseCheckersState): ChineseCheckersResult | null {
    if (state.winnerId) {
      const rankings = state.players.map((p) => ({
        userId: p.userId,
        rank: p.userId === state.winnerId ? 1 : 2,
      }));
      return {
        winnerId: state.winnerId,
        rankings,
      };
    }
    return null;
  }

  handleTurnTimeout(
    state: ChineseCheckersState
  ): GameActionResult<ChineseCheckersState> {
    const myMarbles = state.marbles.filter(
      (m) => m.ownerId === state.turnPlayerId
    );
    for (const marble of myMarbles) {
      for (const [dr, dc] of ChineseCheckersEngine.DIRECTIONS) {
        const to: [number, number] = [marble.coord[0] + dr, marble.coord[1] + dc];
        try {
          if (
            this.validateAction(
              state,
              state.turnPlayerId,
              { type: 'MOVE_MARBLE', marbleId: marble.id, to }
            )
          ) {
            return this.applyAction(
              state,
              state.turnPlayerId,
              { type: 'MOVE_MARBLE', marbleId: marble.id, to }
            );
          }
        } catch {
          // Continue searching
        }
      }
    }
    return { success: true, state };
  }
}
