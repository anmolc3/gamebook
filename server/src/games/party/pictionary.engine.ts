import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  DrawStrokePoint,
  GameActionResult,
  GameDefinition,
  PictionaryAction,
  PictionaryResult,
  PictionaryState,
} from '../../../../shared/game-types';

export const PICTIONARY_DURATION_MS = 60000;

interface PictionaryItem {
  targetWord: string;
  category: string;
}

export class PictionaryEngine
  implements GameEngine<PictionaryState, PictionaryAction, PictionaryResult>
{
  readonly definition: GameDefinition;

  private static WORDS: PictionaryItem[] = [
    { targetWord: 'Bicycle', category: 'Vehicles' },
    { targetWord: 'Campfire', category: 'Outdoors' },
    { targetWord: 'Saxophone', category: 'Music' },
    { targetWord: 'Lighthouse', category: 'Buildings' },
    { targetWord: 'Octopus', category: 'Animals' },
    { targetWord: 'Snowman', category: 'Winter' },
    { targetWord: 'Helicopter', category: 'Vehicles' },
    { targetWord: 'Sunflower', category: 'Nature' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('PICTIONARY') || {
      id: 'PICTIONARY',
      name: 'Pictionary Duel',
      category: 'PARTY',
      minPlayers: 4,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 60,
      description: 'Team vs team quick-sketch guessing challenge.',
      iconName: 'palette',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): PictionaryState {
    if (!players || players.length < 2) {
      throw new Error('Pictionary requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    const item =
      settings?.word ||
      PictionaryEngine.WORDS[
        Math.floor(Math.random() * PictionaryEngine.WORDS.length)
      ];

    return {
      players: playerIds,
      drawerId: playerIds[0],
      targetWord: item.targetWord,
      category: item.category,
      strokes: [],
      guesses: [],
      isSolved: false,
      scores,
      turnExpiresAt: Date.now() + PICTIONARY_DURATION_MS,
      winnerId: null,
    };
  }

  validateAction(
    state: PictionaryState,
    playerId: string,
    action: PictionaryAction
  ): boolean {
    if (state.winnerId || state.isSolved) {
      throw new Error('Game already solved');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'DRAW_STROKE') {
      if (playerId !== state.drawerId) {
        throw new Error('Only the drawer can submit strokes');
      }
      if (!action.point) {
        throw new Error('Point required for DRAW_STROKE');
      }
    } else if (action.type === 'CLEAR_CANVAS') {
      if (playerId !== state.drawerId) {
        throw new Error('Only the drawer can clear canvas');
      }
    } else if (action.type === 'SUBMIT_GUESS') {
      if (playerId === state.drawerId) {
        throw new Error('Drawer cannot guess');
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
    state: PictionaryState,
    playerId: string,
    action: PictionaryAction
  ): GameActionResult<PictionaryState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'DRAW_STROKE') {
      return {
        success: true,
        state: {
          ...state,
          strokes: [...state.strokes, action.point!],
        },
        events: [{ type: 'STROKE_ADDED', data: { point: action.point } }],
      };
    }

    if (action.type === 'CLEAR_CANVAS') {
      return {
        success: true,
        state: {
          ...state,
          strokes: [],
        },
        events: [{ type: 'CANVAS_CLEARED', data: {} }],
      };
    }

    if (action.type === 'SUBMIT_GUESS') {
      const cleanGuess = action.guess!.trim();
      const isCorrect = cleanGuess.toLowerCase() === state.targetWord.toLowerCase();

      const nextGuesses = [...state.guesses, { userId: playerId, guess: cleanGuess }];

      if (isCorrect) {
        const nextScores = { ...state.scores };
        nextScores[playerId] = (nextScores[playerId] || 0) + 20;
        nextScores[state.drawerId] = (nextScores[state.drawerId] || 0) + 10;

        const nextState: PictionaryState = {
          ...state,
          guesses: nextGuesses,
          isSolved: true,
          scores: nextScores,
          winnerId: playerId,
          turnExpiresAt: 0,
        };

        return {
          success: true,
          state: nextState,
          events: [
            {
              type: 'WORD_SOLVED',
              data: {
                guesserId: playerId,
                word: state.targetWord,
                finalScores: nextScores,
              },
            },
          ],
        };
      }

      return {
        success: true,
        state: {
          ...state,
          guesses: nextGuesses,
        },
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

  checkWinner(state: PictionaryState): PictionaryResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
