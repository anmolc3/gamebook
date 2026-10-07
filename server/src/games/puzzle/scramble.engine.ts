import { GameEngine, GamePlayerMeta } from '../game.definition';
import { GameRegistry } from '../game.registry';
import {
  GameActionResult,
  GameDefinition,
  WordScrambleAction,
  WordScrambleResult,
  WordScrambleState,
} from '../../../../shared/game-types';

export const SCRAMBLE_TIMEOUT_MS = 30000;

export class WordScrambleEngine
  implements GameEngine<WordScrambleState, WordScrambleAction, WordScrambleResult>
{
  readonly definition: GameDefinition;

  private static WORDS = [
    'PLANET', 'ROCKET', 'FOREST', 'CASTLE', 'BRIDGE',
    'SILVER', 'GOLDEN', 'WIZARD', 'DRAGON', 'PIRATE',
  ];

  constructor() {
    this.definition = GameRegistry.getGame('WORD_SCRAMBLE') || {
      id: 'WORD_SCRAMBLE',
      name: 'Anagram Scramble',
      category: 'COMPETITIVE',
      minPlayers: 2,
      maxPlayers: 4,
      defaultPlayers: 2,
      supportsSpectators: true,
      turnTimeSeconds: 20,
      description: 'Unscramble jumbled letters into dictionary words.',
      iconName: 'gamepad',
    };
  }

  private scramble(word: string): string {
    let scrambled = word;
    while (scrambled === word) {
      scrambled = word
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
    }
    return scrambled;
  }

  initialize(players: GamePlayerMeta[], settings?: any): WordScrambleState {
    if (!players || players.length < 2) {
      throw new Error('Word Scramble requires at least 2 players');
    }

    const playerIds = players.map((p) => p.userId);
    const word =
      settings?.word ||
      WordScrambleEngine.WORDS[Math.floor(Math.random() * WordScrambleEngine.WORDS.length)];

    return {
      originalWord: word.toUpperCase(),
      scrambledWord: this.scramble(word.toUpperCase()),
      players: playerIds,
      solvedBy: null,
      winnerId: null,
      turnExpiresAt: Date.now() + SCRAMBLE_TIMEOUT_MS,
    };
  }

  validateAction(state: WordScrambleState, playerId: string, action: WordScrambleAction): boolean {
    if (state.winnerId) {
      throw new Error('Game already finished');
    }

    if (!state.players.includes(playerId)) {
      throw new Error('Player not in match');
    }

    if (action.type !== 'SUBMIT_WORD') {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (!action.word || action.word.trim().length === 0) {
      throw new Error('Must submit a non-empty word');
    }

    return true;
  }

  applyAction(state: WordScrambleState, playerId: string, action: WordScrambleAction): GameActionResult<WordScrambleState> {
    try {
      this.validateAction(state, playerId, action);
    } catch (err: any) {
      return { success: false, state, error: err.message };
    }

    const nextState: WordScrambleState = { ...state };
    const submission = action.word.trim().toUpperCase();

    if (submission === nextState.originalWord) {
      nextState.solvedBy = playerId;
      nextState.winnerId = playerId;
    }

    return { success: true, state: nextState };
  }

  checkWinner(state: WordScrambleState): WordScrambleResult | null {
    if (!state.winnerId) return null;
    return {
      winnerId: state.winnerId,
      originalWord: state.originalWord,
    };
  }

  handleTurnTimeout(state: WordScrambleState): GameActionResult<WordScrambleState> {
    return {
      success: true,
      state: { ...state, winnerId: state.players[0] },
    };
  }
}
