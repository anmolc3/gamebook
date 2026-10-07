import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  WordleAction,
  WordleGuess,
  WordleLetterStatus,
  WordleResult,
  WordleState,
} from '../../../../shared/game-types';

export const WORDLE_TURN_DURATION_MS = 60000;

export class WordleEngine implements GameEngine<WordleState, WordleAction, WordleResult> {
  readonly definition: GameDefinition;

  private static WORD_BANK = [
    'CRANE', 'GHOST', 'PLANT', 'SPARK', 'BRAVE',
    'CLOUD', 'FLAME', 'LIGHT', 'OCEAN', 'STORM',
    'WATER', 'EARTH', 'SPACE', 'DREAM', 'MAGIC',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('WORDLE_DUEL') || {
      id: 'WORDLE_DUEL',
      name: 'Word Guess Duel',
      category: 'PUZZLE',
      minPlayers: 2,
      maxPlayers: 2,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 60,
      description: 'Guess 5-letter hidden words in 6 tries with colored feedback.',
      iconName: 'target',
    };
  }

  initialize(players: GamePlayerMeta[], settings?: any): WordleState {
    if (!players || players.length < 2) {
      throw new Error('Wordle requires 2 players');
    }

    const p1 = players[0].userId;
    const p2 = players[1].userId;
    const targetWord =
      settings?.targetWord ||
      WordleEngine.WORD_BANK[Math.floor(Math.random() * WordleEngine.WORD_BANK.length)];

    return {
      targetWord: targetWord.toUpperCase(),
      players: [p1, p2],
      guesses: { [p1]: [], [p2]: [] },
      isFinished: { [p1]: false, [p2]: false },
      winnerId: null,
      turnExpiresAt: Date.now() + WORDLE_TURN_DURATION_MS,
    };
  }

  private evaluateGuess(guess: string, target: string): WordleLetterStatus[] {
    const feedback: WordleLetterStatus[] = new Array(5).fill('ABSENT');
    const targetLetters = target.split('');
    const guessLetters = guess.split('');

    // First pass: CORRECT
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        feedback[i] = 'CORRECT';
        targetLetters[i] = '#'; // Mark used
      }
    }

    // Second pass: PRESENT
    for (let i = 0; i < 5; i++) {
      if (feedback[i] !== 'CORRECT') {
        const foundIdx = targetLetters.indexOf(guessLetters[i]);
        if (foundIdx !== -1) {
          feedback[i] = 'PRESENT';
          targetLetters[foundIdx] = '#';
        }
      }
    }

    return feedback;
  }

  validateAction(state: WordleState, playerId: string, action: WordleAction): boolean {
    if (state.winnerId) {
      throw new Error('Match already concluded');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (state.isFinished[playerId]) {
      throw new Error('Player has already completed their attempts');
    }

    if (action.type !== 'GUESS_WORD') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!action.word || action.word.trim().length !== 5) {
      throw new Error('Guess must be exactly 5 letters');
    }

    return true;
  }

  applyAction(state: WordleState, playerId: string, action: WordleAction): GameActionResult<WordleState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: WordleState = {
      ...state,
      guesses: {
        [state.players[0]]: [...state.guesses[state.players[0]]],
        [state.players[1]]: [...state.guesses[state.players[1]]],
      },
      isFinished: { ...state.isFinished },
    };

    const word = action.word.trim().toUpperCase();
    const feedback = this.evaluateGuess(word, nextState.targetWord);
    const guessObj: WordleGuess = { word, feedback };

    nextState.guesses[playerId].push(guessObj);

    if (word === nextState.targetWord) {
      nextState.isFinished[playerId] = true;
      nextState.winnerId = playerId;
      return { success: true, state: nextState };
    }

    if (nextState.guesses[playerId].length >= 6) {
      nextState.isFinished[playerId] = true;
    }

    // If both finished without exact match
    const bothFinished = nextState.players.every((uid) => nextState.isFinished[uid]);
    if (bothFinished && !nextState.winnerId) {
      nextState.winnerId = nextState.players[0]; // Draw resolved
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: WordleState): WordleResult | null {
    if (!state.winnerId) return null;
    const attemptsUsed: Record<string, number> = {};
    state.players.forEach((uid) => {
      attemptsUsed[uid] = state.guesses[uid].length;
    });

    return {
      winnerId: state.winnerId,
      targetWord: state.targetWord,
      attemptsUsed,
    };
  }

  handleTurnTimeout(state: WordleState): GameActionResult<WordleState> {
    const unfin = state.players.find((uid) => !state.isFinished[uid]);
    if (!unfin) return { success: true, state };
    return this.applyAction(state, unfin, { type: 'GUESS_WORD', word: 'ZZZZZ' });
  }
}
