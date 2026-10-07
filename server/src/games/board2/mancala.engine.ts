import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  MancalaAction,
  MancalaResult,
  MancalaState,
} from '../../../../shared/game-types';

export const MANCALA_TURN_DURATION_MS = 20000;

export class MancalaEngine
  implements GameEngine<MancalaState, MancalaAction, MancalaResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('MANCALA') || {
      id: 'MANCALA',
      name: 'Mancala Kalah',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: '12 pits and 2 stores; sowing pebbles counterclockwise with free store turns and capture rules.',
      iconName: 'dice',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): MancalaState {
    if (!players || players.length < 2) {
      throw new Error('Mancala requires exactly 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];

    // 14 slots: 4 in each pit (0..5, 7..12), 0 in stores (6, 13)
    const board = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];

    return {
      board,
      turnPlayerId: p1.userId,
      players: [p1.userId, p2.userId],
      winnerId: null,
      isDraw: false,
      freeTurnAwarded: false,
      turnExpiresAt: Date.now() + MANCALA_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: MancalaState,
    playerId: string,
    action: MancalaAction
  ): boolean {
    if (state.winnerId || state.isDraw) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to sow');
    }
    if (action.type !== 'SOW_PIT') {
      throw new Error('Invalid action type');
    }

    const isP1 = state.players[0] === playerId;
    const pit = action.pitIndex;

    if (isP1) {
      if (pit < 0 || pit > 5) {
        throw new Error('Player 1 must select pits 0..5');
      }
    } else {
      if (pit < 7 || pit > 12) {
        throw new Error('Player 2 must select pits 7..12');
      }
    }

    if (state.board[pit] === 0) {
      throw new Error('Cannot sow from an empty pit');
    }

    return true;
  }

  applyAction(
    state: MancalaState,
    playerId: string,
    action: MancalaAction
  ): GameActionResult<MancalaState> {
    this.validateAction(state, playerId, action);

    const isP1 = state.players[0] === playerId;
    const opponentId = isP1 ? state.players[1] : state.players[0];
    const board = [...state.board];

    let stones = board[action.pitIndex];
    board[action.pitIndex] = 0;

    let curr = action.pitIndex;
    const myStore = isP1 ? 6 : 13;
    const oppStore = isP1 ? 13 : 6;

    while (stones > 0) {
      curr = (curr + 1) % 14;
      if (curr === oppStore) {
        continue;
      }
      board[curr] += 1;
      stones -= 1;
    }

    let freeTurnAwarded = false;
    if (curr === myStore) {
      freeTurnAwarded = true;
    }

    const isOwnPit = isP1 ? curr >= 0 && curr <= 5 : curr >= 7 && curr <= 12;
    if (isOwnPit && board[curr] === 1) {
      const oppositePit = 12 - curr;
      if (board[oppositePit] > 0) {
        board[myStore] += board[oppositePit] + 1;
        board[oppositePit] = 0;
        board[curr] = 0;
      }
    }

    const p1PitsEmpty = board.slice(0, 6).every((s) => s === 0);
    const p2PitsEmpty = board.slice(7, 13).every((s) => s === 0);

    let winnerId: string | null = null;
    let isDraw = false;

    if (p1PitsEmpty || p2PitsEmpty) {
      for (let i = 0; i <= 5; i++) {
        board[6] += board[i];
        board[i] = 0;
      }
      for (let i = 7; i <= 12; i++) {
        board[13] += board[i];
        board[i] = 0;
      }

      if (board[6] > board[13]) {
        winnerId = state.players[0];
      } else if (board[13] > board[6]) {
        winnerId = state.players[1];
      } else {
        isDraw = true;
      }
    }

    const nextTurnPlayerId =
      freeTurnAwarded && !winnerId && !isDraw ? playerId : opponentId;

    const nextState: MancalaState = {
      ...state,
      board,
      turnPlayerId: nextTurnPlayerId,
      winnerId,
      isDraw,
      freeTurnAwarded,
      turnExpiresAt: winnerId || isDraw ? 0 : Date.now() + MANCALA_TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'mancala:pit_sown',
          data: {
            playerId,
            pitIndex: action.pitIndex,
            freeTurnAwarded,
            winnerId,
          },
        },
      ],
    };
  }

  checkWinner(state: MancalaState): MancalaResult | null {
    if (state.winnerId || state.isDraw) {
      return {
        winnerId: state.winnerId,
        isDraw: state.isDraw,
        finalStores: [state.board[6], state.board[13]],
      };
    }
    return null;
  }

  handleTurnTimeout(state: MancalaState): GameActionResult<MancalaState> {
    const isP1 = state.players[0] === state.turnPlayerId;
    const minPit = isP1 ? 0 : 7;
    const maxPit = isP1 ? 5 : 12;

    for (let p = minPit; p <= maxPit; p++) {
      if (state.board[p] > 0) {
        return this.applyAction(
          state,
          state.turnPlayerId,
          { type: 'SOW_PIT', pitIndex: p }
        );
      }
    }
    return { success: true, state };
  }
}
