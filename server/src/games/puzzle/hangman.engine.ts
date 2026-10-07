import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  HangmanAction,
  HangmanResult,
  HangmanState,
} from '../../../../shared/game-types';

export const HANGMAN_TURN_DURATION_MS = 25000;

export class HangmanEngine implements GameEngine<HangmanState, HangmanAction, HangmanResult> {
  readonly definition: GameDefinition;

  private static WORD_LIST: { word: string; category: string }[] = [
    { word: 'ELEPHANT', category: 'ANIMALS' },
    { word: 'GIRAFFE', category: 'ANIMALS' },
    { word: 'KANGAROO', category: 'ANIMALS' },
    { word: 'PORTUGAL', category: 'COUNTRIES' },
    { word: 'SINGAPORE', category: 'COUNTRIES' },
    { word: 'AVOCADO', category: 'FOOD' },
    { word: 'CHOCOLATE', category: 'FOOD' },
    { word: 'ALGORITHM', category: 'TECHNOLOGY' },
    { word: 'BLUETOOTH', category: 'TECHNOLOGY' },
  ];

  constructor() {
    this.definition = GameRegistry.getGame('HANGMAN') || {
      id: 'HANGMAN',
      name: 'Hangman Duel',
      category: 'CASUAL',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Guess letters to reveal the secret word with limited lives.',
      iconName: 'gamepad',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): HangmanState {
    if (!players || players.length < 2) {
      throw new Error('Hangman requires 2 players');
    }

    const item =
      settings?.item ||
      HangmanEngine.WORD_LIST[Math.floor(Math.random() * HangmanEngine.WORD_LIST.length)];

    const p1 = players[0].userId;
    const p2 = players[1].userId;

    return {
      secretWord: item.word.toUpperCase(),
      category: item.category,
      players: [p1, p2],
      guessedLetters: [],
      wrongGuessesCount: 0,
      maxWrongGuesses: 6,
      turnPlayerId: p1,
      winnerId: null,
      isWordGuessed: false,
      turnExpiresAt: Date.now() + HANGMAN_TURN_DURATION_MS,
    };
  }

  validateAction(state: HangmanState, playerId: string, action: HangmanAction): boolean {
    if (state.winnerId || state.isWordGuessed) {
      throw new Error('Game already finished');
    }

    if (state.turnPlayerId !== playerId) {
      throw new Error(`Not your turn. Turn belongs to ${state.turnPlayerId}`);
    }

    if (action.type === 'GUESS_LETTER') {
      if (!action.letter || action.letter.trim().length !== 1) {
        throw new Error('Must provide a single letter');
      }
      const char = action.letter.trim().toUpperCase();
      if (state.guessedLetters.includes(char)) {
        throw new Error(`Letter ${char} has already been guessed`);
      }
      return true;
    }

    if (action.type === 'SOLVE_WORD') {
      if (!action.word || action.word.trim().length === 0) {
        throw new Error('Must provide word to solve');
      }
      return true;
    }

    throw new Error(`Unsupported action: ${action.type}`);
  }

  applyAction(state: HangmanState, playerId: string, action: HangmanAction): GameActionResult<HangmanState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: HangmanState = {
      ...state,
      guessedLetters: [...state.guessedLetters],
    };

    let retainTurn = false;
    if (action.type === 'GUESS_LETTER') {
      const char = action.letter!.trim().toUpperCase();
      nextState.guessedLetters.push(char);

      if (!nextState.secretWord.includes(char)) {
        nextState.wrongGuessesCount += 1;
      } else {
        retainTurn = true;
      }

      // Check if all letters in secretWord are guessed
      const allRevealed = nextState.secretWord
        .split('')
        .every((c) => nextState.guessedLetters.includes(c));

      if (allRevealed) {
        nextState.isWordGuessed = true;
        nextState.winnerId = playerId;
        return { success: true, state: nextState };
      }
    } else if (action.type === 'SOLVE_WORD') {
      const guess = action.word!.trim().toUpperCase();
      if (guess === nextState.secretWord) {
        nextState.isWordGuessed = true;
        nextState.winnerId = playerId;
        return { success: true, state: nextState };
      } else {
        nextState.wrongGuessesCount += 1;
      }
    }

    // Check lives exhausted
    const opponent = nextState.players.find((uid) => uid !== playerId) || playerId;
    if (nextState.wrongGuessesCount >= nextState.maxWrongGuesses) {
      // Game over, opponent wins
      nextState.winnerId = opponent;
      return { success: true, state: nextState };
    }

    // Toggle turn player if not retained
    if (!retainTurn) {
      nextState.turnPlayerId = opponent;
    }
    nextState.turnExpiresAt = Date.now() + HANGMAN_TURN_DURATION_MS;
    return { success: true, state: nextState };
  }

  checkWinner(state: HangmanState): HangmanResult | null {
    if (!state.winnerId && !state.isWordGuessed && state.wrongGuessesCount < state.maxWrongGuesses) {
      return null;
    }
    return {
      winnerId: state.winnerId,
      secretWord: state.secretWord,
      isWon: state.isWordGuessed,
    };
  }

  handleTurnTimeout(state: HangmanState): GameActionResult<HangmanState> {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const unpick = letters.find((l) => !state.guessedLetters.includes(l)) || 'Z';
    return this.applyAction(state, state.turnPlayerId, { type: 'GUESS_LETTER', letter: unpick });
  }
}
