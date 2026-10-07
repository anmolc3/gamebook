import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  CharadesAction,
  CharadesResult,
  CharadesState,
  GameActionResult,
  GameDefinition,
} from '../../../../shared/game-types';

export const CHARADES_ROUND_DURATION_MS = 60000;

interface CharadesWord {
  word: string;
  category: string;
}

export class CharadesEngine
  implements GameEngine<CharadesState, CharadesAction, CharadesResult>
{
  readonly definition: GameDefinition;

  private static WORDS: CharadesWord[] = [
    { word: 'Moonwalk', category: 'Dance' },
    { word: 'Surfing', category: 'Sports' },
    { word: 'Kangaroo', category: 'Animals' },
    { word: 'Spiderman', category: 'Movies' },
    { word: 'Juggling', category: 'Activities' },
    { word: 'Astronaut', category: 'Professions' },
    { word: 'Penguin', category: 'Animals' },
    { word: 'Rock Climbing', category: 'Sports' },
    { word: 'Chef Cooking', category: 'Actions' },
    { word: 'T-Rex', category: 'Creatures' },
    { word: 'Fishing', category: 'Activities' },
    { word: 'Skateboarding', category: 'Sports' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('CHARADES') || {
      id: 'CHARADES',
      name: 'Charades Party',
      category: 'PARTY',
      minPlayers: 3,
      maxPlayers: 8,
      defaultPlayers: 4,
      supportsSpectators: true,
      turnTimeSeconds: 45,
      description: 'Act out words and phrases for your team to guess.',
      iconName: 'users',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): CharadesState {
    if (!players || players.length < 2) {
      throw new Error('Charades requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const scores: Record<string, number> = {};
    for (const pid of playerIds) {
      scores[pid] = 0;
    }

    const firstWord =
      settings?.word ||
      CharadesEngine.WORDS[Math.floor(Math.random() * CharadesEngine.WORDS.length)];

    return {
      players: playerIds,
      actorId: playerIds[0],
      secretWord: firstWord.word,
      category: firstWord.category,
      guesses: [],
      isSolved: false,
      scores,
      round: 1,
      winnerId: null,
      turnExpiresAt: Date.now() + CHARADES_ROUND_DURATION_MS,
    };
  }

  validateAction(
    state: CharadesState,
    playerId: string,
    action: CharadesAction
  ): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }
    if (!state.players.includes(playerId)) {
      throw new Error('Player not in game');
    }

    if (action.type === 'GUESS') {
      if (playerId === state.actorId) {
        throw new Error('Actor cannot guess their own secret word');
      }
      if (!action.guess || action.guess.trim().length === 0) {
        throw new Error('Guess cannot be empty');
      }
    } else if (action.type === 'CONFIRM_SOLVE') {
      if (playerId !== state.actorId) {
        throw new Error('Only the acting player can confirm solve');
      }
    } else {
      throw new Error(`Invalid action type: ${(action as any).type}`);
    }

    return true;
  }

  applyAction(
    state: CharadesState,
    playerId: string,
    action: CharadesAction
  ): GameActionResult<CharadesState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    if (action.type === 'GUESS') {
      const cleanGuess = action.guess!.trim();
      const isMatch = cleanGuess.toLowerCase() === state.secretWord.toLowerCase();

      const nextGuesses = [
        ...state.guesses,
        {
          userId: playerId,
          text: cleanGuess,
          timestamp: Date.now(),
        },
      ];

      if (isMatch) {
        return this.advanceRound(state, playerId, nextGuesses);
      }

      return {
        success: true,
        state: {
          ...state,
          guesses: nextGuesses,
        },
        events: [
          {
            type: 'GUESS_SUBMITTED',
            data: { playerId, guess: cleanGuess, isCorrect: false },
          },
        ],
      };
    }

    if (action.type === 'CONFIRM_SOLVE') {
      // Find the last guesser or default to first other player
      const lastGuess = state.guesses.length > 0 ? state.guesses[state.guesses.length - 1] : null;
      const guesserId = lastGuess ? lastGuess.userId : state.players.find((p) => p !== state.actorId)!;
      return this.advanceRound(state, guesserId, state.guesses);
    }

    return { success: true, state };
  }

  private advanceRound(
    state: CharadesState,
    solverId: string,
    guesses: { userId: string; text: string; timestamp: number }[]
  ): GameActionResult<CharadesState> {
    const nextScores = { ...state.scores };
    nextScores[solverId] = (nextScores[solverId] || 0) + 15;
    nextScores[state.actorId] = (nextScores[state.actorId] || 0) + 10;

    const currentActorIndex = state.players.indexOf(state.actorId);
    const nextActorIndex = (currentActorIndex + 1) % state.players.length;
    const nextRound = currentActorIndex === state.players.length - 1 ? state.round + 1 : state.round;
    const maxRounds = state.players.length * 2;

    if (nextRound > maxRounds) {
      let bestScore = -1;
      let winner: string | null = null;
      for (const pid of state.players) {
        if (nextScores[pid] > bestScore) {
          bestScore = nextScores[pid];
          winner = pid;
        }
      }

      const nextState: CharadesState = {
        ...state,
        guesses,
        isSolved: true,
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

    const availableWords = CharadesEngine.WORDS.filter(
      (w) => w.word.toLowerCase() !== state.secretWord.toLowerCase()
    );
    const nextWord =
      availableWords[Math.floor(Math.random() * availableWords.length)] ||
      CharadesEngine.WORDS[0];

    const nextState: CharadesState = {
      ...state,
      actorId: state.players[nextActorIndex],
      secretWord: nextWord.word,
      category: nextWord.category,
      guesses: [],
      isSolved: false,
      scores: nextScores,
      round: nextRound,
      turnExpiresAt: Date.now() + CHARADES_ROUND_DURATION_MS,
    };

    return {
      success: true,
      state: nextState,
      events: [
        {
          type: 'WORD_SOLVED',
          data: {
            solverId,
            actorId: state.actorId,
            word: state.secretWord,
            scores: nextScores,
            nextRound,
          },
        },
      ],
    };
  }

  checkWinner(state: CharadesState): CharadesResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      scores: state.scores,
    };
  }
}
