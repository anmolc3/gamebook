export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface SoloGameInfo {
  id: string;
  name: string;
  category: 'BOARD' | 'CARD' | 'PUZZLE' | 'CASUAL' | 'COMPETITIVE';
  type: 'AI_OPPONENT' | 'SOLO_PUZZLE';
  difficulties: AiDifficulty[];
  defaultDifficulty: AiDifficulty;
  description: string;
  iconName: string;
}

export const SOLO_SUPPORTED_GAMES: Record<string, SoloGameInfo> = {
  // Board Games with AI
  TICTACTOE: {
    id: 'TICTACTOE',
    name: 'Tic-Tac-Toe',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Classic 3x3 duel against an intelligent Minimax solver.',
    iconName: 'gamepad',
  },
  CONNECT_FOUR: {
    id: 'CONNECT_FOUR',
    name: 'Connect Four',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: '4-in-a-row gravity disc battle with heuristic evaluation.',
    iconName: 'target',
  },
  CHECKERS: {
    id: 'CHECKERS',
    name: 'Checkers',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Diagonal jumping and mandatory capture strategy.',
    iconName: 'target',
  },
  CHESS: {
    id: 'CHESS',
    name: 'Chess Grandmaster',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'FIDE standard rules with piece-square position evaluation.',
    iconName: 'crown',
  },
  REVERSI: {
    id: 'REVERSI',
    name: 'Reversi / Othello',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Corner trapping and disc flipping strategy.',
    iconName: 'target',
  },
  GOMOKU: {
    id: 'GOMOKU',
    name: 'Gomoku',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Five-in-a-row stone alignment on a 15x15 board.',
    iconName: 'target',
  },
  MANCALA: {
    id: 'MANCALA',
    name: 'Mancala Kalah',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Pebble sowing with free store turns and capture rules.',
    iconName: 'dice',
  },
  BATTLESHIP: {
    id: 'BATTLESHIP',
    name: 'Battleship',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    defaultDifficulty: 'MEDIUM',
    description: 'Hunt and target naval strategy with hidden fleet command.',
    iconName: 'shield',
  },
  LUDO: {
    id: 'LUDO',
    name: 'Ludo World Arena',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Token race with safe zones, captures, and home run play.',
    iconName: 'dice',
  },
  DOMINOES: {
    id: 'DOMINOES',
    name: 'Dominoes',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Open-end matching and pip shedding duel.',
    iconName: 'dice',
  },
  BACKGAMMON: {
    id: 'BACKGAMMON',
    name: 'Backgammon',
    category: 'BOARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Checker racing, bar captures, and bearing off.',
    iconName: 'dice',
  },
  ROCK_PAPER_SCISSORS: {
    id: 'ROCK_PAPER_SCISSORS',
    name: 'Rock Paper Scissors',
    category: 'COMPETITIVE',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Simultaneous hand sign mind games and pattern counters.',
    iconName: 'gamepad',
  },

  // Card Games with AI
  BLACKJACK: {
    id: 'BLACKJACK',
    name: 'Blackjack (Play Money)',
    category: 'CARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Hit, stand, and double down with virtual chips.',
    iconName: 'gamepad',
  },
  UNO_STYLE: {
    id: 'UNO_STYLE',
    name: 'Color Match Clash (UNO)',
    category: 'CARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Fast color/number matching with skips and wild cards.',
    iconName: 'palette',
  },
  WAR: {
    id: 'WAR',
    name: 'War Card Game',
    category: 'CARD',
    type: 'AI_OPPONENT',
    difficulties: ['EASY', 'MEDIUM'],
    defaultDifficulty: 'MEDIUM',
    description: 'Card battles with instant flip comparisons.',
    iconName: 'gamepad',
  },

  // Genuine Puzzle & Single-Player Games
  '2048_MULTIPLAYER': {
    id: '2048_MULTIPLAYER',
    name: '2048 Solo Challenge',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Slide numbers to reach the legendary 2048 tile.',
    iconName: 'grid',
  },
  MINESWEEPER_DUEL: {
    id: 'MINESWEEPER_DUEL',
    name: 'Minesweeper Solo',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Logic-based minefield clearance duel against the clock.',
    iconName: 'target',
  },
  WORDLE_DUEL: {
    id: 'WORDLE_DUEL',
    name: 'Wordle Solo Guess',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Deduce the secret 5-letter word in 6 attempts.',
    iconName: 'edit',
  },
  HANGMAN: {
    id: 'HANGMAN',
    name: 'Hangman Challenge',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Guess letters to uncover the hidden word.',
    iconName: 'edit',
  },
  MEMORY_MATCH: {
    id: 'MEMORY_MATCH',
    name: 'Memory Match',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Flip and match card pairs with minimum moves.',
    iconName: 'eye',
  },
  QUIZ_BATTLE: {
    id: 'QUIZ_BATTLE',
    name: 'Trivia Solo Quiz',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Answer fast trivia questions across multiple categories.',
    iconName: 'award',
  },
  REACTION_TEST: {
    id: 'REACTION_TEST',
    name: 'Reaction Time Test',
    category: 'COMPETITIVE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Measure your lightning-fast reaction reflexes in milliseconds.',
    iconName: 'clock',
  },
  SPEED_TAP: {
    id: 'SPEED_TAP',
    name: 'Speed Tap Challenge',
    category: 'COMPETITIVE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Tap targets as fast as possible before timer expires.',
    iconName: 'flame',
  },
  COLOR_MATCH: {
    id: 'COLOR_MATCH',
    name: 'Color Stroop Test',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Match ink colors with word labels in fast Stroop puzzles.',
    iconName: 'palette',
  },
  MATH_BATTLE: {
    id: 'MATH_BATTLE',
    name: 'Speed Math Solo',
    category: 'PUZZLE',
    type: 'SOLO_PUZZLE',
    difficulties: ['EASY', 'MEDIUM', 'HARD'],
    defaultDifficulty: 'MEDIUM',
    description: 'Solve arithmetic calculations rapidly under pressure.',
    iconName: 'target',
  },
};

export const BOT_AVATARS: Record<string, { name: string; title: string; personality: string }> = {
  BOT_NOVA: {
    name: 'Nova',
    title: 'Tactical Strategist',
    personality: 'Balanced and methodical. Calculates thoughtful moves.',
  },
  BOT_ACE: {
    name: 'Ace',
    title: 'Aggressive Master',
    personality: 'Sharp and opportunistic. Capitalizes quickly on errors.',
  },
  BOT_ATLAS: {
    name: 'Atlas',
    title: 'Grandmaster Solver',
    personality: 'Deep calculation with long-term positional foresight.',
  },
  BOT_PIXEL: {
    name: 'Pixel',
    title: 'Casual Companion',
    personality: 'Friendly, playful, and great for newcomers to learn against.',
  },
  BOT_SCOUT: {
    name: 'Scout',
    title: 'Agile Competitor',
    personality: 'Quick reflex decisions and dynamic counterplay.',
  },
};

export function isSoloGameSupported(gameId: string): boolean {
  return gameId.toUpperCase() in SOLO_SUPPORTED_GAMES;
}

export function getSoloGameInfo(gameId: string): SoloGameInfo | undefined {
  return SOLO_SUPPORTED_GAMES[gameId.toUpperCase()];
}
