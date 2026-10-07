import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  NumberGuessAction,
  NumberGuessResult,
  NumberGuessState,
} from '../../../../shared/game-types';

export const NUMBER_GUESS_TURN_DURATION_MS = 15000;

export class NumberGuessEngine
  implements GameEngine<NumberGuessState, NumberGuessAction, NumberGuessResult>
{
  readonly definition: GameDefinition;

  constructor() {
    this.definition = GameRegistry.getGame('NUMBER_GUESS') || {
      id: 'NUMBER_GUESS',
      name: 'Number Guessing Duel',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 15,
      description: 'Guess the hidden secret number with higher/lower hints.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): NumberGuessState {
    if (!players || players.length < 2) {
      throw new Error('Number Guessing Duel requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const targetNumber = settings?.targetNumber || Math.floor(Math.random() * 100) + 1;

    return {
      targetNumber,
      players: [p1, p2],
      turnPlayerId: p1,
      attempts: { [p1]: [], [p2]: [] },
      winnerId: null,
      turnExpiresAt: Date.now() + NUMBER_GUESS_TURN_DURATION_MS,
    };
  }

  validateAction(state: NumberGuessState, playerId: string, action: NumberGuessAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type !== 'GUESS') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (typeof action.number !== 'number' || action.number < 1 || action.number > 100) {
      throw new Error('Guess must be an integer between 1 and 100');
    }

    return true;
  }

  applyAction(state: NumberGuessState, playerId: string, action: NumberGuessAction): GameActionResult<NumberGuessState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: NumberGuessState = {
      ...state,
      attempts: {
        [state.players[0]]: [...state.attempts[state.players[0]]],
        [state.players[1]]: [...state.attempts[state.players[1]]],
      },
    };

    const guess = Math.floor(action.number);
    let hint: 'HIGHER' | 'LOWER' | 'CORRECT';

    if (guess === nextState.targetNumber) {
      hint = 'CORRECT';
      nextState.winnerId = playerId;
    } else if (guess < nextState.targetNumber) {
      hint = 'HIGHER';
    } else {
      hint = 'LOWER';
    }

    nextState.attempts[playerId].push({ guess, hint });

    if (!nextState.winnerId) {
      const nextPlayerId = state.players.find((uid) => uid !== playerId)!;
      nextState.turnPlayerId = nextPlayerId;
    }

    nextState.turnExpiresAt = Date.now() + NUMBER_GUESS_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: NumberGuessState): NumberGuessResult | null {
    if (!state.winnerId) return null;
    const totals: Record<string, number> = {};
    state.players.forEach((uid) => {
      totals[uid] = state.attempts[uid].length;
    });

    return {
      winnerId: state.winnerId,
      targetNumber: state.targetNumber,
      totalGuesses: totals,
    };
  }

  handleTurnTimeout(state: NumberGuessState): GameActionResult<NumberGuessState> {
    const randomGuess = Math.floor(Math.random() * 100) + 1;
    return this.applyAction(state, state.turnPlayerId, { type: 'GUESS', number: randomGuess });
  }
}
