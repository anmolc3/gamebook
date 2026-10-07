/**
 * Game Capabilities Configuration
 * Explicitly defines supported game modes for each game in the platform.
 * 
 * Modes:
 * - 'SOLO': Single player against intelligent AI opponent or genuine solo puzzle.
 * - 'PRIVATE': Private room duel with friends via room code / invite.
 * - 'MATCHMAKING': Global online multiplayer matchmaking.
 */

export type SupportedGameMode = 'SOLO' | 'PRIVATE' | 'MATCHMAKING';

export interface GameCapabilityConfig {
  id: string;
  name: string;
  supportedModes: SupportedGameMode[];
  hasAiOpponent?: boolean;
  isSoloPuzzle?: boolean;
}

export const GAME_CAPABILITIES: Record<string, GameCapabilityConfig> = {
  // =========================================================================
  // BOARD / STRATEGY (Solo AI + Friends + Online)
  // =========================================================================
  TICTACTOE: {
    id: 'TICTACTOE',
    name: 'Tic-Tac-Toe',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  CHESS: {
    id: 'CHESS',
    name: 'Chess Grandmaster',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  CHECKERS: {
    id: 'CHECKERS',
    name: 'Checkers / Draughts',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  CONNECT_FOUR: {
    id: 'CONNECT_FOUR',
    name: 'Connect Four',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  GOMOKU: {
    id: 'GOMOKU',
    name: 'Gomoku',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  REVERSI: {
    id: 'REVERSI',
    name: 'Reversi / Othello',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  MANCALA: {
    id: 'MANCALA',
    name: 'Mancala Kalah',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  BACKGAMMON: {
    id: 'BACKGAMMON',
    name: 'Backgammon',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  BATTLESHIP: {
    id: 'BATTLESHIP',
    name: 'Battleship',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  LUDO: {
    id: 'LUDO',
    name: 'Ludo World Arena',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  DOMINOES: {
    id: 'DOMINOES',
    name: 'Dominoes',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },

  // =========================================================================
  // CASUAL / SPORTS (Selected Solo AI)
  // =========================================================================
  POOL_8_BALL: {
    id: 'POOL_8_BALL',
    name: '8 Ball Pool',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  CARROM: {
    id: 'CARROM',
    name: 'Carrom 3D',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  MINI_GOLF: {
    id: 'MINI_GOLF',
    name: 'Mini Golf Battle',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  AIR_HOCKEY: {
    id: 'AIR_HOCKEY',
    name: 'Air Hockey',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  DARTS: {
    id: 'DARTS',
    name: 'Regal Darts 501',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  BOWLING: {
    id: 'BOWLING',
    name: 'Dynamic Bowling',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  TABLE_TENNIS: {
    id: 'TABLE_TENNIS',
    name: 'Table Tennis',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },

  // =========================================================================
  // CARD GAMES (Solo AI + Friends + Online)
  // =========================================================================
  BLACKJACK: {
    id: 'BLACKJACK',
    name: 'Blackjack',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  POKER: {
    id: 'POKER',
    name: 'Texas Hold\'em Poker',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  HEARTS: {
    id: 'HEARTS',
    name: 'Hearts',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  SPADES: {
    id: 'SPADES',
    name: 'Spades',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  RUMMY: {
    id: 'RUMMY',
    name: 'Rummy',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  GIN_RUMMY: {
    id: 'GIN_RUMMY',
    name: 'Gin Rummy',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  CRAZY_EIGHTS: {
    id: 'CRAZY_EIGHTS',
    name: 'Crazy Eights',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  GO_FISH: {
    id: 'GO_FISH',
    name: 'Go Fish',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  WAR: {
    id: 'WAR',
    name: 'War Card Duel',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  DURAK: {
    id: 'DURAK',
    name: 'Durak',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  PRESIDENT: {
    id: 'PRESIDENT',
    name: 'President / Scum',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  UNO_STYLE: {
    id: 'UNO_STYLE',
    name: 'Color Match Clash (UNO)',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },

  // =========================================================================
  // FAST / COMPETITIVE (Solo AI + Friends + Online)
  // =========================================================================
  ROCK_PAPER_SCISSORS: {
    id: 'ROCK_PAPER_SCISSORS',
    name: 'Rock Paper Scissors',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  NUMBER_GUESS: {
    id: 'NUMBER_GUESS',
    name: 'Number Guessing Duel',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },
  QUICK_DRAW: {
    id: 'QUICK_DRAW',
    name: 'Western Quick Draw',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    hasAiOpponent: true,
  },

  // =========================================================================
  // PUZZLE / GENUINE SINGLE PLAYER (Solo Puzzle + Friends + Online)
  // =========================================================================
  SUDOKU_BATTLE: {
    id: 'SUDOKU_BATTLE',
    name: 'Sudoku Challenge',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  '2048_MULTIPLAYER': {
    id: '2048_MULTIPLAYER',
    name: '2048 Solo Tile Race',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  MINESWEEPER_DUEL: {
    id: 'MINESWEEPER_DUEL',
    name: 'Minesweeper Challenge',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  WORD_SEARCH: {
    id: 'WORD_SEARCH',
    name: 'Word Search Race',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  HANGMAN: {
    id: 'HANGMAN',
    name: 'Hangman Duel',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  MEMORY_MATCH: {
    id: 'MEMORY_MATCH',
    name: 'Memory Match',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  CROSSWORD_BATTLE: {
    id: 'CROSSWORD_BATTLE',
    name: 'Crossword Puzzle',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  WORD_SCRAMBLE: {
    id: 'WORD_SCRAMBLE',
    name: 'Anagram Word Scramble',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  WORDLE_DUEL: {
    id: 'WORDLE_DUEL',
    name: 'Wordle Guess Duel',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  MASTERMIND: {
    id: 'MASTERMIND',
    name: 'Mastermind Codebreaker',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  PATTERN_MATCH: {
    id: 'PATTERN_MATCH',
    name: 'Pattern Memory Matrix',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  PUZZLE_DUEL: {
    id: 'PUZZLE_DUEL',
    name: 'Jigsaw Puzzle Race',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  REACTION_TEST: {
    id: 'REACTION_TEST',
    name: 'Reaction Reflex Test',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  SPEED_TAP: {
    id: 'SPEED_TAP',
    name: 'Speed Tap Rush',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  COLOR_MATCH: {
    id: 'COLOR_MATCH',
    name: 'Color Stroop Test',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  MATH_BATTLE: {
    id: 'MATH_BATTLE',
    name: 'Speed Math Duel',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  TRIVIA: {
    id: 'TRIVIA',
    name: 'Trivia Master',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },
  QUIZ_BATTLE: {
    id: 'QUIZ_BATTLE',
    name: 'Quiz Battle Arena',
    supportedModes: ['SOLO', 'PRIVATE', 'MATCHMAKING'],
    isSoloPuzzle: true,
  },

  // =========================================================================
  // MULTIPLAYER-ONLY GAMES (Social / Party - NO SOLO MODE)
  // =========================================================================
  WOULD_YOU_RATHER: {
    id: 'WOULD_YOU_RATHER',
    name: 'Would You Rather?',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  TRUTH_OR_DARE: {
    id: 'TRUTH_OR_DARE',
    name: 'Truth or Dare',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  CHARADES: {
    id: 'CHARADES',
    name: 'Charades Party',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  NEVER_HAVE_I_EVER: {
    id: 'NEVER_HAVE_I_EVER',
    name: 'Never Have I Ever',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  THIS_OR_THAT: {
    id: 'THIS_OR_THAT',
    name: 'This or That',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  TWO_TRUTHS_AND_A_LIE: {
    id: 'TWO_TRUTHS_AND_A_LIE',
    name: 'Two Truths and a Lie',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  PICTIONARY: {
    id: 'PICTIONARY',
    name: 'Pictionary Duel',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  DRAW_AND_GUESS: {
    id: 'DRAW_AND_GUESS',
    name: 'Draw & Guess Live',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  MAFIA: {
    id: 'MAFIA',
    name: 'Mafia vs Werewolf',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  IMPOSTER: {
    id: 'IMPOSTER',
    name: 'The Imposter Crew',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  WHO_AM_I: {
    id: 'WHO_AM_I',
    name: 'Who Am I?',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  GUESS_PICTURE: {
    id: 'GUESS_PICTURE',
    name: 'Pixel Reveal Guess',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  GUESS_WORD: {
    id: 'GUESS_WORD',
    name: 'Word Guess Duel',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
  GUESS_SONG: {
    id: 'GUESS_SONG',
    name: 'Name That Tune',
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  },
};

/**
 * Returns the capability configuration for a game ID.
 */
export function getGameCapabilities(gameId: string): GameCapabilityConfig {
  const normalized = gameId.toUpperCase();
  if (GAME_CAPABILITIES[normalized]) {
    return GAME_CAPABILITIES[normalized];
  }
  // Default fallback for unlisted games: multiplayer only
  return {
    id: normalized,
    name: gameId,
    supportedModes: ['PRIVATE', 'MATCHMAKING'],
  };
}

/**
 * Checks whether a game supports Solo Mode.
 * Returns true ONLY if explicitly configured with 'SOLO'.
 */
export function supportsSoloMode(gameId: string): boolean {
  const caps = getGameCapabilities(gameId);
  return caps.supportedModes.includes('SOLO');
}

/**
 * Returns the supported modes list for a game.
 */
export function getSupportedModes(gameId: string): SupportedGameMode[] {
  return getGameCapabilities(gameId).supportedModes;
}
