import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  TruthOrDareAction,
  TruthOrDareItem,
  TruthOrDareResult,
  TruthOrDareState,
} from '../../../../shared/game-types';

export const TOD_TURN_DURATION_MS = 45000;

export class TruthOrDareEngine
  implements GameEngine<TruthOrDareState, TruthOrDareAction, TruthOrDareResult>
{
  readonly definition: GameDefinition;

  private static TRUTHS: string[] = [
    'What is the most embarrassing thing you have ever done in public?',
    'What is a secret talent that almost nobody knows you have?',
    'If you could swap lives with anyone in this room for a day, who would it be?',
    'What was the weirdest food combination you secretly enjoyed?',
    'What is the biggest lie you ever told that you never got caught for?',
    'Who was your first celebrity crush?',
    'What is your guilty pleasure TV show or guilty pleasure movie?',
    'If you found $10,000 cash on the sidewalk, what is the very first thing you would buy?',
    'What is a fashion trend you followed that you now regret deeply?',
    'What is your most irrational fear?',
  ];

  private static DARES: string[] = [
    'Speak in a dramatic Shakespearean accent for your next two turns.',
    'Do your best impression of a famous celebrity or movie character right now.',
    'Send an amusing emoji-only message to your most recent chat contact.',
    'Do 10 jumping jacks while humming the theme song of your favorite game.',
    'Balance a spoon or pen on your nose for 10 seconds without dropping it.',
    'Invent a short 15-second commercial for an invisible product.',
    'Sing the chorus of your favorite song loudly in opera style.',
    'Show the 3rd most recent photo in your gallery to the group.',
    'Pretend you are an enthusiastic cooking show host explaining how to boil water.',
    'Do a 20-second robotic dance.',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('TRUTH_OR_DARE') || {
      id: 'TRUTH_OR_DARE',
      name: 'Truth or Dare Social',
      category: 'PARTY',
      minPlayers: 2,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 30,
      description: 'Interactive party questions with photo proof integration.',
      iconName: 'bell',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): TruthOrDareState {
    if (!players || players.length < 2) {
      throw new Error('Truth or Dare requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    return {
      players: playerIds,
      turnPlayerId: playerIds[0],
      selectedType: null,
      currentPrompt: null,
      isCompleted: null,
      scores,
      round: 1,
      winnerId: null,
      turnExpiresAt: Date.now() + TOD_TURN_DURATION_MS,
    };
  }

  validateAction(
    state: TruthOrDareState,
    playerId: string,
    action: TruthOrDareAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already concluded');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'CHOOSE_CATEGORY') {
      if (playerId !== state.turnPlayerId) {
        throw new Error('Not your turn to choose category');
      }
      if (state.selectedType !== null && state.isCompleted === null) {
        throw new Error('Category already chosen for this turn');
      }
      if (!action.category || (action.category !== 'TRUTH' && action.category !== 'DARE')) {
        throw new Error('Must specify category TRUTH or DARE');
      }
    } else if (action.type === 'VERIFY_COMPLETION') {
      if (!state.currentPrompt) {
        throw new Error('No active prompt to verify');
      }
      if (typeof action.completed !== 'boolean') {
        throw new Error('Completed status must be boolean');
      }
    } else {
      throw new Error(`Unknown action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: TruthOrDareState,
    playerId: string,
    action: TruthOrDareAction
  ): GameActionResult<TruthOrDareState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'CHOOSE_CATEGORY') {
      const bank =
        action.category === 'TRUTH'
          ? TruthOrDareEngine.TRUTHS
          : TruthOrDareEngine.DARES;
      const prompt = bank[Math.floor(Math.random() * bank.length)];

      const nextState: TruthOrDareState = {
        ...state,
        selectedType: action.category!,
        currentPrompt: prompt,
        isCompleted: null,
        turnExpiresAt: Date.now() + TOD_TURN_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'CATEGORY_CHOSEN',
            data: {
              playerId,
              category: action.category,
              prompt,
            },
          },
        ],
      };
    }

    if (action.type === 'VERIFY_COMPLETION') {
      const isCompleted = !!action.completed;
      const nextScores = { ...state.scores };

      if (isCompleted) {
        const bonus = state.selectedType === 'DARE' ? 20 : 10;
        nextScores[state.turnPlayerId] = (nextScores[state.turnPlayerId] || 0) + bonus;
      }

      const currentIndex = state.players.indexOf(state.turnPlayerId);
      const nextRound = currentIndex === state.players.length - 1 ? state.round + 1 : state.round;
      const nextPlayerIndex = (currentIndex + 1) % state.players.length;
      const nextPlayerId = state.players[nextPlayerIndex];

      const maxRounds = 4;
      if (nextRound > maxRounds) {
        let bestScore = -1;
        let winner: string | null = null;
        for (const pid of state.players) {
          if (nextScores[pid] > bestScore) {
            bestScore = nextScores[pid];
            winner = pid;
          }
        }

        const nextState: TruthOrDareState = {
          ...state,
          isCompleted,
          scores: nextScores,
          winnerId: winner,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'GAME_OVER',
              data: { winnerId: winner, finalScores: nextScores },
            },
          ],
        };
      }

      const nextState: TruthOrDareState = {
        ...state,
        turnPlayerId: nextPlayerId,
        selectedType: null,
        currentPrompt: null,
        isCompleted,
        scores: nextScores,
        round: nextRound,
        turnExpiresAt: Date.now() + TOD_TURN_DURATION_MS,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'PROMPT_RESOLVED',
            data: {
              completed: isCompleted,
              scores: nextScores,
              nextPlayerId,
              nextRound,
            },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: TruthOrDareState): TruthOrDareResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
