import crypto from 'crypto';
import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  SnakesAndLaddersAction,
  SnakesAndLaddersPlayerState,
  SnakesAndLaddersResult,
  SnakesAndLaddersState,
} from '../../../../shared/game-types';

export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

export const SNAKES_TURN_DURATION_MS = 20000;

export class SnakesAndLaddersEngine
  implements
    GameEngine<
      SnakesAndLaddersState,
      SnakesAndLaddersAction,
      SnakesAndLaddersResult
    >
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('SNAKES_AND_LADDERS') || {
      id: 'SNAKES_AND_LADDERS',
      name: 'Snakes & Ladders',
      category: 'BOARD',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: '100-square grid with server-authoritative dice rolls, ladder jumps, and snake slides.',
      iconName: 'dice',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): SnakesAndLaddersState {
    if (!players || players.length < 2) {
      throw new Error('Snakes & Ladders requires at least 2 players');
    }

    const playerStates: SnakesAndLaddersPlayerState[] = players.map((p) => ({
      userId: p.userId,
      position: 1,
    }));

    return {
      players: playerStates,
      turnPlayerId: players[0].userId,
      currentDiceRoll: null,
      lastMoveType: null,
      winnerId: null,
      winnerIds: [],
      isComplete: false,
      turnExpiresAt: Date.now() + SNAKES_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: SnakesAndLaddersState,
    playerId: string,
    action: SnakesAndLaddersAction
  ): boolean {
    if (state.isComplete || state.winnerId) {
      throw new Error('Match is already finished');
    }
    if (state.turnPlayerId !== playerId) {
      throw new Error('Not your turn to roll');
    }
    if (action.type !== 'ROLL_DICE') {
      throw new Error('Invalid action type');
    }
    return true;
  }

  applyAction(
    state: SnakesAndLaddersState,
    playerId: string,
    action: SnakesAndLaddersAction
  ): GameActionResult<SnakesAndLaddersState> {
    this.validateAction(state, playerId, action);

    const playerIndex = state.players.findIndex((p) => p.userId === playerId);
    const player = state.players[playerIndex];

    const roll = crypto.randomInt(1, 7);
    let target = player.position + roll;
    let moveType: 'NORMAL' | 'LADDER' | 'SNAKE' | null = 'NORMAL';

    if (target > 100) {
      target = player.position;
      moveType = null;
    } else {
      if (LADDERS[target]) {
        target = LADDERS[target];
        moveType = 'LADDER';
      } else if (SNAKES[target]) {
        target = SNAKES[target];
        moveType = 'SNAKE';
      }
    }

    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === playerIndex) {
        return {
          ...p,
          position: target,
          rank: target === 100 ? 1 : p.rank,
        };
      }
      return p;
    });

    let winnerId = state.winnerId;
    const winnerIds = [...state.winnerIds];
    let isComplete = state.isComplete;

    if (target === 100) {
      winnerId = playerId;
      winnerIds.push(playerId);
      isComplete = true;
    }

    const awardsBonusRoll = roll === 6 && !isComplete;
    let nextTurnPlayerId = playerId;

    if (!awardsBonusRoll && !isComplete) {
      const nextIndex = (playerIndex + 1) % state.players.length;
      nextTurnPlayerId = state.players[nextIndex].userId;
    }

    const nextState: SnakesAndLaddersState = {
      players: updatedPlayers,
      turnPlayerId: nextTurnPlayerId,
      currentDiceRoll: roll,
      lastMoveType: moveType,
      winnerId,
      winnerIds,
      isComplete,
      turnExpiresAt: isComplete ? 0 : Date.now() + SNAKES_TURN_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'snakes:rolled',
          data: {
            playerId,
            roll,
            target,
            moveType,
            winnerId,
          },
        },
      ],
    };
  }

  checkWinner(state: SnakesAndLaddersState): SnakesAndLaddersResult | null {
    if (state.winnerId || state.isComplete) {
      const rankings = state.players.map((p) => ({
        userId: p.userId,
        rank: p.rank || 2,
      }));
      return {
        winnerId: state.winnerId,
        rankings,
        isComplete: true,
      };
    }
    return null;
  }

  handleTurnTimeout(
    state: SnakesAndLaddersState
  ): GameActionResult<SnakesAndLaddersState> {
    return this.applyAction(state, state.turnPlayerId, { type: 'ROLL_DICE' });
  }
}
