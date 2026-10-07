import crypto from 'crypto';
import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  DominoTile,
  DominoesAction,
  DominoesResult,
  DominoesState,
} from '../../../../shared/game-types';

export const DOMINOES_TURN_DURATION_MS = 25000;

export class DominoesEngine
  implements GameEngine<DominoesState, DominoesAction, DominoesResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('DOMINOES') || {
      id: 'DOMINOES',
      name: 'Dominoes Duel',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 25,
      description: 'Double-six 28-tile domino duel with boneyard drawing and open chain matching.',
      iconName: 'dice',
    };
  }

  static generateTiles(): DominoTile[] {
    const tiles: DominoTile[] = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        tiles.push([i, j]);
      }
    }
    return tiles;
  }

  static shuffleTiles(tiles: DominoTile[]): DominoTile[] {
    const list = [...tiles];
    for (let i = list.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  initialize(players: GamePlayerMeta[], settings?: any): DominoesState {
    if (!players || players.length < 2) {
      throw new Error('Dominoes requires at least 2 players');
    }

    const p1 = players[0];
    const p2 = players[1];
    const deck = DominoesEngine.shuffleTiles(DominoesEngine.generateTiles());

    const hand1 = deck.slice(0, 7);
    const hand2 = deck.slice(7, 14);
    const boneyard = deck.slice(14);

    const openingTile = hand1[0];
    const remainingHand1 = hand1.slice(1);

    return {
      boardChain: [openingTile],
      openEnds: [openingTile[0], openingTile[1]],
      playerHands: {
        [p1.userId]: remainingHand1,
        [p2.userId]: hand2,
      },
      boneyard,
      players: [p1.userId, p2.userId],
      turnPlayerId: p2.userId,
      consecutivePasses: 0,
      winnerId: null,
      isBlocked: false,
      turnExpiresAt: Date.now() + DOMINOES_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: DominoesState,
    playerId: string,
    action: DominoesAction
  ): boolean {
    if (state.winnerId || state.isBlocked) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to play');
    }

    const hand = state.playerHands[playerId] || [];

    if (action.type === 'PLAY_TILE') {
      if (!action.tile) {
        throw new Error('Must select a tile to play');
      }
      const hasTile = hand.some(
        (t) =>
          (t[0] === action.tile![0] && t[1] === action.tile![1]) ||
          (t[0] === action.tile![1] && t[1] === action.tile![0])
      );
      if (!hasTile) {
        throw new Error('Tile is not in your hand');
      }

      const end = action.end || 'RIGHT';
      const targetEndVal = end === 'LEFT' ? state.openEnds[0] : state.openEnds[1];
      const matches =
        action.tile[0] === targetEndVal || action.tile[1] === targetEndVal;

      if (!matches) {
        throw new Error(`Tile does not match open end (${targetEndVal})`);
      }
      return true;
    }

    if (action.type === 'DRAW_TILE') {
      if (state.boneyard.length === 0) {
        throw new Error('Boneyard is empty');
      }
      return true;
    }

    if (action.type === 'PASS') {
      if (state.boneyard.length > 0) {
        throw new Error('Must draw from boneyard before passing');
      }
      return true;
    }

    throw new Error('Invalid action type');
  }

  applyAction(
    state: DominoesState,
    playerId: string,
    action: DominoesAction
  ): GameActionResult<DominoesState> {
    this.validateAction(state, playerId, action);

    const opponentId = state.players.find((id) => id !== playerId)!;
    const hand = [...state.playerHands[playerId]];

    if (action.type === 'PLAY_TILE') {
      const tile = action.tile!;
      const end = action.end || 'RIGHT';
      const tileIdx = hand.findIndex(
        (t) =>
          (t[0] === tile[0] && t[1] === tile[1]) ||
          (t[0] === tile[1] && t[1] === tile[0])
      );
      hand.splice(tileIdx, 1);

      const boardChain = [...state.boardChain];
      const openEnds: [number, number] = [...state.openEnds];

      if (end === 'LEFT') {
        const matchingVal = openEnds[0];
        const newLeftEnd = tile[0] === matchingVal ? tile[1] : tile[0];
        openEnds[0] = newLeftEnd;
        boardChain.unshift(tile);
      } else {
        const matchingVal = openEnds[1];
        const newRightEnd = tile[0] === matchingVal ? tile[1] : tile[0];
        openEnds[1] = newRightEnd;
        boardChain.push(tile);
      }

      let winnerId = state.winnerId;
      if (hand.length === 0) {
        winnerId = playerId;
      }

      const nextState: DominoesState = {
        ...state,
        boardChain,
        openEnds,
        playerHands: {
          ...state.playerHands,
          [playerId]: hand,
        },
        turnPlayerId: winnerId ? playerId : opponentId,
        consecutivePasses: 0,
        winnerId,
        turnExpiresAt: winnerId ? 0 : Date.now() + DOMINOES_TURN_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'dominoes:tile_played',
            data: {
              playerId,
              tile,
              end,
              winnerId,
            },
          },
        ],
      };
    }

    if (action.type === 'DRAW_TILE') {
      const boneyard = [...state.boneyard];
      const drawnTile = boneyard.pop()!;
      hand.push(drawnTile);

      const nextState: DominoesState = {
        ...state,
        playerHands: {
          ...state.playerHands,
          [playerId]: hand,
        },
        boneyard,
        turnPlayerId: playerId,
        turnExpiresAt: Date.now() + DOMINOES_TURN_DURATION_MS,
      };

      return { success: true, state: nextState };
    }

    if (action.type === 'PASS') {
      const consecutivePasses = state.consecutivePasses + 1;
      let isBlocked = false;
      let winnerId = null;

      if (consecutivePasses >= 2) {
        isBlocked = true;
        const p1Pips = (state.playerHands[state.players[0]] || []).reduce(
          (sum, t) => sum + t[0] + t[1],
          0
        );
        const p2Pips = (state.playerHands[state.players[1]] || []).reduce(
          (sum, t) => sum + t[0] + t[1],
          0
        );
        if (p1Pips < p2Pips) winnerId = state.players[0];
        else if (p2Pips < p1Pips) winnerId = state.players[1];
        else winnerId = null;
      }

      const nextState: DominoesState = {
        ...state,
        turnPlayerId: opponentId,
        consecutivePasses,
        isBlocked,
        winnerId,
        turnExpiresAt: isBlocked ? 0 : Date.now() + DOMINOES_TURN_DURATION_MS,
      };

      return { success: true, state: nextState };
    }

    return { success: true, state };
  }

  checkWinner(state: DominoesState): DominoesResult | null {
    if (state.winnerId || state.isBlocked) {
      const finalHandPips: Record<string, number> = {};
      state.players.forEach((id) => {
        finalHandPips[id] = (state.playerHands[id] || []).reduce(
          (sum, t) => sum + t[0] + t[1],
          0
        );
      });
      return {
        winnerId: state.winnerId,
        isBlocked: state.isBlocked,
        finalHandPips,
      };
    }
    return null;
  }

  handleTurnTimeout(state: DominoesState): GameActionResult<DominoesState> {
    const hand = state.playerHands[state.turnPlayerId] || [];
    for (const tile of hand) {
      if (tile[0] === state.openEnds[0] || tile[1] === state.openEnds[0]) {
        return this.applyAction(
          state,
          state.turnPlayerId,
          { type: 'PLAY_TILE', tile, end: 'LEFT' }
        );
      }
      if (tile[0] === state.openEnds[1] || tile[1] === state.openEnds[1]) {
        return this.applyAction(
          state,
          state.turnPlayerId,
          { type: 'PLAY_TILE', tile, end: 'RIGHT' }
        );
      }
    }

    if (state.boneyard.length > 0) {
      return this.applyAction(state, state.turnPlayerId, { type: 'DRAW_TILE' });
    }

    return this.applyAction(state, state.turnPlayerId, { type: 'PASS' });
  }
}
