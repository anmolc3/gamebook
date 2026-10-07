import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  PatternMatchAction,
  PatternMatchResult,
  PatternMatchState,
} from '../../../../shared/game-types';

export const PATTERN_TURN_DURATION_MS = 15000;

export class PatternMatchEngine
  implements GameEngine<PatternMatchState, PatternMatchAction, PatternMatchResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('PATTERN_MATCH') || {
      id: 'PATTERN_MATCH',
      name: 'Pattern Memory Matrix',
      category: 'PUZZLE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Repeat increasingly long glowing sequences.',
      iconName: 'palette',
    };
  }

  private generatePattern(length: number): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < length; i++) {
      pattern.push(Math.floor(Math.random() * 9)); // 0..8 pads on 3x3
    }
    return pattern;
  }

  initialize(players: GamePlayerMeta[]): PatternMatchState {
    if (!players || players.length < 2) {
      throw new Error('Pattern Match requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);

    return {
      pattern: this.generatePattern(3),
      currentStep: 0,
      players: playerIds,
      turnPlayerId: playerIds[0],
      playerInputs: [],
      round: 1,
      winnerId: null,
      turnExpiresAt: Date.now() + PATTERN_TURN_DURATION_MS,
    };
  }

  validateAction(state: PatternMatchState, playerId: string, action: PatternMatchAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type !== 'PRESS_PAD') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (action.index < 0 || action.index > 8) {
      throw new Error('Pad index must be between 0 and 8');
    }

    return true;
  }

  applyAction(state: PatternMatchState, playerId: string, action: PatternMatchAction): GameActionResult<PatternMatchState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: PatternMatchState = {
      ...state,
      playerInputs: [...state.playerInputs, action.index],
    };

    const stepIdx = nextState.playerInputs.length - 1;
    const expectedPad = nextState.pattern[stepIdx];

    if (action.index !== expectedPad) {
      // Mistake! Player fails, next player or opponent wins
      const otherPlayer = state.players.find((uid) => uid !== playerId) || state.players[0];
      nextState.winnerId = otherPlayer;
      return { success: true, state: nextState };
    }

    // Correct pad pressed!
    if (nextState.playerInputs.length === nextState.pattern.length) {
      // Completed current pattern!
      if (nextState.round >= 5) {
        // Max round completed: current player wins!
        nextState.winnerId = playerId;
      } else {
        // Advance round with +1 length
        nextState.round += 1;
        nextState.pattern = this.generatePattern(nextState.pattern.length + 1);
        nextState.playerInputs = [];

        // Pass turn to next player
        const currIdx = nextState.players.indexOf(playerId);
        nextState.turnPlayerId = nextState.players[(currIdx + 1) % nextState.players.length];
      }
    }

    nextState.turnExpiresAt = Date.now() + PATTERN_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: PatternMatchState): PatternMatchResult | null {
    if (!state.winnerId) return null;
    const maxRounds: Record<string, number> = {};
    state.players.forEach((uid) => {
      maxRounds[uid] = state.round;
    });

    return {
      winnerId: state.winnerId,
      maxRounds,
    };
  }

  handleTurnTimeout(state: PatternMatchState): GameActionResult<PatternMatchState> {
    return this.applyAction(state, state.turnPlayerId, { type: 'PRESS_PAD', index: 99 });
  }
}
