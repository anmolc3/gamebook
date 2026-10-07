import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  SpeedTapAction,
  SpeedTapResult,
  SpeedTapState,
  SpeedTapTarget,
} from '../../../../shared/game-types';

export const SPEED_TAP_SESSION_MS = 10000;

export class SpeedTapEngine implements GameEngine<SpeedTapState, SpeedTapAction, SpeedTapResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('SPEED_TAP') || {
      id: 'SPEED_TAP',
      name: 'Speed Tap Rush',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 10,
      description: 'Tap targets across your screen in 10 frantic seconds.',
      iconName: 'target',
    };
  }

  private generateTarget(): SpeedTapTarget {
    return {
      id: `target-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.floor(Math.random() * 70) + 15, // 15%..85% safe screen bounds
      y: Math.floor(Math.random() * 70) + 15,
    };
  }

  initialize(players: GamePlayerMeta[]): SpeedTapState {
    if (!players || players.length < 2) {
      throw new Error('Speed Tap Rush requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const tapCounts: Record<string, number> = {};
    playerIds.forEach((uid) => {
      tapCounts[uid] = 0;
    });

    return {
      players: playerIds,
      tapCounts,
      activeTarget: this.generateTarget(),
      timeRemainingSeconds: 10,
      isComplete: false,
      winnerId: null,
      turnExpiresAt: Date.now() + SPEED_TAP_SESSION_MS,
    };
  }

  validateAction(state: SpeedTapState, playerId: string, action: SpeedTapAction): boolean {
    if (state.isComplete || state.winnerId) {
      throw new Error('Game session completed');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'TAP_TARGET') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    return true;
  }

  applyAction(state: SpeedTapState, playerId: string, action: SpeedTapAction): GameActionResult<SpeedTapState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: SpeedTapState = {
      ...state,
      tapCounts: { ...state.tapCounts, [playerId]: (state.tapCounts[playerId] || 0) + 1 },
      activeTarget: this.generateTarget(),
    };

    return { success: true, state: nextState };
  }

  checkWinner(state: SpeedTapState): SpeedTapResult | null {
    if (!state.isComplete && !state.winnerId) return null;

    let topCount = -1;
    let winner = state.players[0];

    state.players.forEach((uid) => {
      const count = state.tapCounts[uid] || 0;
      if (count > topCount) {
        topCount = count;
        winner = uid;
      }
    });

    return {
      winnerId: winner,
      scores: state.tapCounts,
    };
  }

  handleTurnTimeout(state: SpeedTapState): GameActionResult<SpeedTapState> {
    const nextState: SpeedTapState = {
      ...state,
      isComplete: true,
      timeRemainingSeconds: 0,
    };

    let topCount = -1;
    let winner = state.players[0];
    state.players.forEach((uid) => {
      const count = state.tapCounts[uid] || 0;
      if (count > topCount) {
        topCount = count;
        winner = uid;
      }
    });
    nextState.winnerId = winner;

    return { success: true, state: nextState };
  }
}
