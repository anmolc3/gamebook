import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  GuessWordAction,
  GuessWordResult,
  GuessWordState,
  TabooCard,
} from '../../../../shared/game-types';

export const GUESS_WORD_DURATION_MS = 60000;

export class GuessWordEngine
  implements GameEngine<GuessWordState, GuessWordAction, GuessWordResult>
{
  readonly definition: GameDefinition;

  private static CARDS: TabooCard[] = [
    {
      targetWord: 'Coffee',
      tabooWords: ['Tea', 'Morning', 'Cup', 'Caffeine', 'Drink', 'Bean'],
    },
    {
      targetWord: 'Airplane',
      tabooWords: ['Fly', 'Sky', 'Wings', 'Pilot', 'Airport', 'Jet'],
    },
    {
      targetWord: 'Pizza',
      tabooWords: ['Cheese', 'Crust', 'Italian', 'Slice', 'Delivery', 'Pepperoni'],
    },
    {
      targetWord: 'Guitar',
      tabooWords: ['Music', 'Strings', 'Acoustic', 'Play', 'Rock', 'Instrument'],
    },
    {
      targetWord: 'Doctor',
      tabooWords: ['Hospital', 'Medicine', 'Nurse', 'Sick', 'Patient', 'Health'],
    },
    {
      targetWord: 'Cinema',
      tabooWords: ['Movie', 'Film', 'Popcorn', 'Screen', 'Theater', 'Hollywood'],
    },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('GUESS_WORD') || {
      id: 'GUESS_WORD',
      name: 'Taboo Word Clue',
      category: 'PARTY',
      minPlayers: 4,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 45,
      description: 'Describe words to teammates without saying the forbidden taboo terms.',
      iconName: 'chat',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): GuessWordState {
    if (!players || players.length < 2) {
      throw new Error('Guess Word requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    const card =
      settings?.card ||
      GuessWordEngine.CARDS[
        Math.floor(Math.random() * GuessWordEngine.CARDS.length)
      ];

    return {
      players: playerIds,
      clueGiverId: playerIds[0],
      currentCard: card,
      cluesGiven: [],
      guesses: [],
      penaltyCount: 0,
      isGuessed: false,
      scores,
      winnerId: null,
      turnExpiresAt: Date.now() + GUESS_WORD_DURATION_MS,
    };
  }

  validateAction(
    state: GuessWordState,
    playerId: string,
    action: GuessWordAction
  ): boolean {
    if (state.winnerId || state.isGuessed) {
      throw new Error('Round already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'GIVE_CLUE') {
      if (playerId !== state.clueGiverId) {
        throw new Error('Only the designated clue giver can give clues');
      }
      if (!action.clue || action.clue.trim().length === 0) {
        throw new Error('Clue cannot be empty');
      }
    } else if (action.type === 'SUBMIT_GUESS') {
      if (playerId === state.clueGiverId) {
        throw new Error('Clue giver cannot submit a guess');
      }
      if (!action.guess || action.guess.trim().length === 0) {
        throw new Error('Guess cannot be empty');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: GuessWordState,
    playerId: string,
    action: GuessWordAction
  ): GameActionResult<GuessWordState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'GIVE_CLUE') {
      const clueText = action.clue!.trim();
      const lowerClue = clueText.toLowerCase();

      // Check for taboo or target word violation
      const targetLower = state.currentCard.targetWord.toLowerCase();
      let violatedWord: string | null = null;

      if (lowerClue.includes(targetLower)) {
        violatedWord = state.currentCard.targetWord;
      } else {
        for (const taboo of state.currentCard.tabooWords) {
          if (lowerClue.includes(taboo.toLowerCase())) {
            violatedWord = taboo;
            break;
          }
        }
      }

      if (violatedWord) {
        // Taboo violation penalty
        const nextScores = {
          ...state.scores,
          [playerId]: (state.scores[playerId] || 0) - 5,
        };
        const nextPenalties = state.penaltyCount + 1;

        const nextState: GuessWordState = {
          ...state,
          penaltyCount: nextPenalties,
          scores: nextScores,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'TABOO_VIOLATION',
              data: {
                clueGiverId: playerId,
                violatedWord,
                penaltyCount: nextPenalties,
              },
            },
          ],
        };
      }

      // Valid clue
      const nextClues = [...state.cluesGiven, clueText];
      const nextState: GuessWordState = {
        ...state,
        cluesGiven: nextClues,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'CLUE_OFFERED',
            data: { clueGiverId: playerId, clue: clueText },
          },
        ],
      };
    }

    if (action.type === 'SUBMIT_GUESS') {
      const cleanGuess = action.guess!.trim();
      const isCorrect =
        cleanGuess.toLowerCase() === state.currentCard.targetWord.toLowerCase();

      const nextGuesses = [...state.guesses, { userId: playerId, guess: cleanGuess }];

      if (isCorrect) {
        const nextScores = { ...state.scores };
        nextScores[playerId] = (nextScores[playerId] || 0) + 20;
        nextScores[state.clueGiverId] = (nextScores[state.clueGiverId] || 0) + 10;

        const nextState: GuessWordState = {
          ...state,
          guesses: nextGuesses,
          isGuessed: true,
          scores: nextScores,
          winnerId: playerId,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'WORD_GUESSED',
              data: {
                guesserId: playerId,
                word: state.currentCard.targetWord,
                scores: nextScores,
              },
            },
          ],
        };
      }

      const nextState: GuessWordState = {
        ...state,
        guesses: nextGuesses,
      };

      return {
        success: true,
        state: nextState,
        events: [
          {
            type: 'INCORRECT_GUESS',
            data: { guesserId: playerId, guess: cleanGuess },
          },
        ],
      };
    }

    return { success: true, state };
  }

  checkWinner(state: GuessWordState): GuessWordResult | null {
    if (!state.winnerId && !state.isGuessed) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
