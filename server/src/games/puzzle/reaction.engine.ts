import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  ReactionAction,
  ReactionResult,
  ReactionState,
} from '../../../../shared/game-types';

export const REACTION_TURN_DURATION_MS = 6000;

export class ReactionEngine implements GameEngine<ReactionState, ReactionAction, ReactionResult> {
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('REACTION_TEST') || {
      id: 'REACTION_TEST',
      name: 'Reaction Speed Test',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 5,
      description: 'Tap as fast as humanly possible when the signal turns green.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): ReactionState {
    if (!players || players.length < 2) {
      throw new Error('Reaction Test requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const reactionTimes: Record<string, number | null> = {};
    playerIds.forEach((uid) => {
      reactionTimes[uid] = null;
    });

    // Random delay between 1500ms and 3500ms before trigger
    const delay = Math.floor(Math.random() * 2000) + 1500;
    const triggerAt = Date.now() + delay;

    return {
      players: playerIds,
      stage: 'READY',
      signalTriggerAt: triggerAt,
      reactionTimes,
      winnerId: null,
      turnExpiresAt: triggerAt + REACTION_TURN_DURATION_MS,
    };
  }

  validateAction(state: ReactionState, playerId: string, action: ReactionAction): boolean {
    if (state.winnerId || state.stage === 'FINISHED') {
      throw new Error('Match already concluded');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'TAP') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    return true;
  }

  applyAction(state: ReactionState, playerId: string, action: ReactionAction): GameActionResult<ReactionState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: ReactionState = {
      ...state,
      reactionTimes: { ...state.reactionTimes },
    };

    const now = action.timestamp || Date.now();
    const triggerAt = nextState.signalTriggerAt || now;

    if (now < triggerAt) {
      // Early false-start tap: penalized with 9999ms
      nextState.reactionTimes[playerId] = 9999;
    } else {
      // Valid reaction time
      nextState.reactionTimes[playerId] = Math.max(1, now - triggerAt);
    }

    // Check if all players have tapped
    const allTapped = nextState.players.every((uid) => nextState.reactionTimes[uid] !== null);

    if (allTapped) {
      nextState.stage = 'FINISHED';
      let fastestTime = Infinity;
      let fastestPlayer = nextState.players[0];

      nextState.players.forEach((uid) => {
        const time = nextState.reactionTimes[uid]!;
        if (time < fastestTime) {
          fastestTime = time;
          fastestPlayer = uid;
        }
      });

      nextState.winnerId = fastestPlayer;
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: ReactionState): ReactionResult | null {
    if (!state.winnerId) return null;
    const times: Record<string, number> = {};
    state.players.forEach((uid) => {
      times[uid] = state.reactionTimes[uid] || 9999;
    });

    return {
      winnerId: state.winnerId,
      reactionTimes: times,
    };
  }

  handleTurnTimeout(state: ReactionState): GameActionResult<ReactionState> {
    const untranslated = state.players.filter((uid) => state.reactionTimes[uid] === null);
    if (untranslated.length === 0) return { success: true, state };

    const nextState = { ...state, reactionTimes: { ...state.reactionTimes } };
    untranslated.forEach((uid) => {
      nextState.reactionTimes[uid] = 9999;
    });
    return this.applyAction(nextState, untranslated[0], { type: 'TAP' });
  }
}
