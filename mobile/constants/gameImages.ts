/**
 * Game artwork mapping — keys are gameType strings,
 * values are require() paths to mobile/assets/images WebP images.
 * Comprehensive coverage with keyword normalization and aliases.
 */

const GAME_IMAGES: Record<string, ReturnType<typeof require>> = {
  // ─── Board Games ─────────────────────────────────────────────────────────────
  TICTACTOE:          require('../assets/images/Glossy Tic-Tac-Toe Game Badge.webp'),
  TIC_TAC_TOE:        require('../assets/images/Glossy Tic-Tac-Toe Game Badge.webp'),
  LUDO:               require('../assets/images/Ludo World Arena Logo.webp'),
  LUDO_WORLD:         require('../assets/images/Ludo World Arena Logo.webp'),
  LUDO_ARENA:         require('../assets/images/Ludo World Arena Logo.webp'),
  CHESS:              require('../assets/images/Golden Chess Emblem.webp'),
  CHESS_MASTER:       require('../assets/images/Golden Chess Emblem.webp'),
  CHESS_GRANDMASTER:  require('../assets/images/Golden Chess Emblem.webp'),
  CONNECT_FOUR:       require('../assets/images/Glossy Connect Four Game Logo.webp'),
  CONNECT4:           require('../assets/images/Glossy Connect Four Game Logo.webp'),
  CHECKERS:           require('../assets/images/Glossy Checkers Crown Game Emblem.webp'),
  DRAUGHTS:           require('../assets/images/Glossy Checkers Crown Game Emblem.webp'),
  REVERSI:            require('../assets/images/Glossy Solitaire Game Emblem.webp'),
  OTHELLO:            require('../assets/images/Glossy Solitaire Game Emblem.webp'),
  SOLITAIRE:          require('../assets/images/Glossy Solitaire Game Emblem.webp'),
  GOMOKU:             require('../assets/images/Gomoku Gold Game Logo.webp'),

  // ─── Traditional Board II ───────────────────────────────────────────────────
  CARROM:             require('../assets/images/Glossy 3D Carrom Game Emblem.webp'),
  CARROM_BOARD:       require('../assets/images/Glossy 3D Carrom Game Emblem.webp'),
  SNAKES_AND_LADDERS: require('../assets/images/Colorful Snake and Ladders Game Logo.webp'),
  SNAKES_LADDERS:     require('../assets/images/Colorful Snake and Ladders Game Logo.webp'),
  BATTLESHIP:         require('../assets/images/Battleship Fleet Command Emblem.webp'),
  BATTLESHIPS:        require('../assets/images/Battleship Fleet Command Emblem.webp'),
  DOMINOES:           require('../assets/images/Glossy Dominoes Duel Game Badge.webp'),
  DOMINO:             require('../assets/images/Glossy Dominoes Duel Game Badge.webp'),
  BACKGAMMON:         require('../assets/images/Glossy Backgammon Board Emblem.webp'),
  MANCALA:            require('../assets/images/Gomoku Gold Game Logo.webp'),
  CHINESE_CHECKERS:   require('../assets/images/Glossy Chinese Checkers Game Logo.webp'),

  // ─── Casual / Arcade ─────────────────────────────────────────────────────────
  POOL_8_BALL:        require('../assets/images/Glossy 8 Ball Pool Crown Emblem.webp'),
  POOL:               require('../assets/images/Glossy 8 Ball Pool Crown Emblem.webp'),
  EIGHT_BALL_POOL:    require('../assets/images/Glossy 8 Ball Pool Crown Emblem.webp'),
  MINI_GOLF:          require('../assets/images/Glossy Mini Golf Battle Emblem.webp'),
  GOLF:               require('../assets/images/Glossy Mini Golf Battle Emblem.webp'),
  AIR_HOCKEY:         require('../assets/images/Glossy Air Hockey Game Emblem.webp'),
  DARTS:              require('../assets/images/Regal Darts 501 Bullseye Crest.webp'),
  DARTS_501:          require('../assets/images/Regal Darts 501 Bullseye Crest.webp'),
  BOWLING:            require('../assets/images/Dynamic Bowling Strike Emblem.webp'),
  BOWLING_STRIKE:     require('../assets/images/Dynamic Bowling Strike Emblem.webp'),
  TABLE_TENNIS:       require('../assets/images/Glossy Card Games Casino Emblem.webp'),
  PING_PONG:          require('../assets/images/Glossy Card Games Casino Emblem.webp'),

  // ─── Card Games ─────────────────────────────────────────────────────────────
  UNO_STYLE:          require('../assets/images/Color Match Clash Card Game Logo.webp'),
  UNO:                require('../assets/images/Glossy 3D UNO Card Emblem.webp'),
  COLOR_MATCH_CLASH:  require('../assets/images/Color Match Clash Card Game Logo.webp'),
  HEARTS:             require('../assets/images/Glossy Hearts Card Game Emblem.webp'),
  SPADES:             require('../assets/images/Golden Spades Card Game Emblem.webp'),
  RUMMY:              require('../assets/images/Indian Rummy Golden Card Emblem.webp'),
  INDIAN_RUMMY:       require('../assets/images/Indian Rummy Golden Card Emblem.webp'),
  GIN_RUMMY:          require('../assets/images/Classic Gin Rummy Card Game Emblem.webp'),
  CRAZY_EIGHTS:       require('../assets/images/Crazy Eights Royal Card Emblem.webp'),
  GO_FISH:            require('../assets/images/Go Fish Splashy Card Game Logo.webp'),
  WAR:                require('../assets/images/War Card Duel Emblem.webp'),
  WAR_CARD:           require('../assets/images/War Card Duel Emblem.webp'),
  DURAK:              require('../assets/images/DURAK Regal Card Game Emblem.webp'),
  PRESIDENT:          require('../assets/images/Glossy President Casino Game Emblem.webp'),
  BLACKJACK:          require('../assets/images/Glossy Blackjack Casino Emblem.webp'),
  POKER:              require('../assets/images/Gilded Casino Poker Emblem.webp'),
  TEXAS_HOLDEM:       require('../assets/images/Glossy Poker Casino Emblem.webp'),

  // ─── Puzzle / Reflex ─────────────────────────────────────────────────────────
  ROCK_PAPER_SCISSORS: require('../assets/images/Glossy Rock Paper Scissors Battle Badge.webp'),
  RPS:                require('../assets/images/Glossy Rock Paper Scissors Battle Badge.webp'),
  REACTION_TEST:      require('../assets/images/Reaction Speed Test Emblem.webp'),
  NUMBER_GUESS:       require('../assets/images/Number Guessing Duel Emblem.webp'),
  SPEED_TAP:          require('../assets/images/Speed Tap Rush Game Badge.webp'),
  COLOR_MATCH:        require('../assets/images/Color Match Reflex Game Badge.webp'),
  MATH_BATTLE:        require('../assets/images/Speed Math Duel Game Emblem.webp'),
  QUICK_DRAW:         require('../assets/images/Western Quick Draw Duel Emblem.webp'),
  WORDLE_DUEL:        require('../assets/images/Glossy Word Scramble Battle Logo.webp'),
  WORDLE:             require('../assets/images/Glossy Word Scramble Battle Logo.webp'),
  WORD_BATTLE:        require('../assets/images/Glossy Word Scramble Battle Logo.webp'),
  WORD_GUESS:         require('../assets/images/Word Guess Duel Badge.webp'),
  HANGMAN:            require('../assets/images/HANGMAN DUEL Game Emblem.webp'),
  MEMORY_MATCH:       require('../assets/images/Glossy Corgi Memory Match Logo.webp'),
  QUIZ_BATTLE:        require('../assets/images/Quiz Battle Arena Logo.webp'),
  QUIZ:               require('../assets/images/Quiz Battle Arena Logo.webp'),
  TRIVIA:             require('../assets/images/Trivia Duel Showdown.webp'),
  TRIVIA_DUEL:        require('../assets/images/Trivia Duel Showdown.webp'),
  '2048_MULTIPLAYER': require('../assets/images/2048 Versus Race Showdown.webp'),
  '2048':             require('../assets/images/2048 Versus Race Showdown.webp'),
  MINESWEEPER_DUEL:   require('../assets/images/Number Guessing Duel Emblem.webp'),
  MINESWEEPER:        require('../assets/images/Number Guessing Duel Emblem.webp'),
  SUDOKU_BATTLE:      require('../assets/images/Sudoku Duel_ Neon Puzzle Showdown.webp'),
  SUDOKU:             require('../assets/images/Sudoku Duel_ Neon Puzzle Showdown.webp'),
  CROSSWORD_BATTLE:   require('../assets/images/Word Search Race Game Badge.webp'),
  CROSSWORD:          require('../assets/images/Word Search Race Game Badge.webp'),
  MINI_CROSSWORD:     require('../assets/images/Word Search Race Game Badge.webp'),
  SEQUENCE:           require('../assets/images/Glossy Card Games Casino Emblem.webp'),
  CARD_SEQUENCE:      require('../assets/images/Glossy Card Games Casino Emblem.webp'),
  PATTERN_MATCH:      require('../assets/images/Colorful Pattern Memory Matrix Game Logo.webp'),
  MASTERMIND:         require('../assets/images/Glossy Mastermind Puzzle Board.webp'),
  WORD_SCRAMBLE:      require('../assets/images/Anagram Scramble Game Logo.webp'),
  ANAGRAM:            require('../assets/images/Anagram Scramble Game Logo.webp'),
  TYPING_RACE:        require('../assets/images/Mobile Typing Race_ Neon Speed Challenge.webp'),
  PUZZLE_DUEL:        require('../assets/images/Jigsaw Puzzle Race Logo.webp'),
  JIGSAW:             require('../assets/images/Jigsaw Puzzle Race Logo.webp'),

  // ─── Party / Social ──────────────────────────────────────────────────────────
  WOULD_YOU_RATHER:   require('../assets/images/Would You Rather_ Party Game.webp'),
  WYR:                require('../assets/images/Would You Rather_ Party Game.webp'),
  TRUTH_OR_DARE:      require('../assets/images/Truth or Dare Social Game Logo.webp'),
  TOD:                require('../assets/images/Truth or Dare Social Game Logo.webp'),
  CHARADES:           require('../assets/images/Glossy Charades Party Game Badge.webp'),
  GUESS_PICTURE:      require('../assets/images/Pixel Reveal Guess_ Happy Dog Puzzle.webp'),
  PIXEL_REVEAL:       require('../assets/images/Pixel Reveal Guess_ Happy Dog Puzzle.webp'),
  GUESS_WORD:         require('../assets/images/Word Guess Duel Badge.webp'),
  TABOO:              require('../assets/images/Word Guess Duel Badge.webp'),
  GUESS_SONG:         require('../assets/images/Name That Tune_ Neon Sound Splash.webp'),
  NAME_THAT_TUNE:     require('../assets/images/Name That Tune_ Neon Sound Splash.webp'),
  WHO_AM_I:           require('../assets/images/Trivia Duel Showdown.webp'),
  STICKY_NOTE:        require('../assets/images/Trivia Duel Showdown.webp'),
  IMPOSTER:           require('../assets/images/The Imposter Secret Crew.webp'),
  THE_IMPOSTER:       require('../assets/images/The Imposter Secret Crew.webp'),
  MAFIA:              require('../assets/images/Mafia vs Werewolf_ Moonlit Showdown.webp'),
  WEREWOLF:           require('../assets/images/Mafia vs Werewolf_ Moonlit Showdown.webp'),
  DRAW_AND_GUESS:     require('../assets/images/Draw & Guess Live Game Logo.webp'),
  PICTIONARY:         require('../assets/images/Pictionary Duel_ Colorful Sketch Showdown.webp'),
  NEVER_HAVE_I_EVER:  require('../assets/images/Never Have I Ever Party.webp'),
  NHIE:               require('../assets/images/Never Have I Ever Party.webp'),
  THIS_OR_THAT:       require('../assets/images/Beach or Mountains_ This or That.webp'),
  TWO_TRUTHS_AND_A_LIE: require('../assets/images/2 Truths and a Lie Game Badge.webp'),
  WORD_SEARCH:        require('../assets/images/Word Search Race Game Badge.webp'),
  RPS_TOURNAMENT:     require('../assets/images/RPS Tournament Trophy Emblem.webp'),
};

export function getGameImage(gameType: string): ReturnType<typeof require> | null {
  if (!gameType) return null;
  const raw = gameType.trim();

  // 1. Direct match
  if (GAME_IMAGES[raw]) return GAME_IMAGES[raw];

  // 2. Normalized uppercase with underscores
  const norm1 = raw.toUpperCase().replace(/[\s\-]+/g, '_');
  if (GAME_IMAGES[norm1]) return GAME_IMAGES[norm1];

  // 3. Alphanumeric stripped match
  const norm2 = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const [key, val] of Object.entries(GAME_IMAGES)) {
    if (key.replace(/[^A-Z0-9]/g, '') === norm2) return val;
  }

  // 4. Keyword-based fuzzy fallback so NO game ever lacks a badge
  const upper = raw.toUpperCase();
  if (upper.includes('CHESS')) return GAME_IMAGES.CHESS;
  if (upper.includes('LUDO')) return GAME_IMAGES.LUDO;
  if (upper.includes('TICTAC')) return GAME_IMAGES.TICTACTOE;
  if (upper.includes('CARROM')) return GAME_IMAGES.CARROM;
  if (upper.includes('SNAKE')) return GAME_IMAGES.SNAKES_AND_LADDERS;
  if (upper.includes('POOL')) return GAME_IMAGES.POOL_8_BALL;
  if (upper.includes('UNO')) return GAME_IMAGES.UNO_STYLE;
  if (upper.includes('POKER')) return GAME_IMAGES.POKER;
  if (upper.includes('BLACKJACK')) return GAME_IMAGES.BLACKJACK;
  if (upper.includes('RUMMY')) return GAME_IMAGES.RUMMY;
  if (upper.includes('WORDLE')) return GAME_IMAGES.WORDLE_DUEL;
  if (upper.includes('CROSSWORD')) return GAME_IMAGES.CROSSWORD_BATTLE;
  if (upper.includes('SUDOKU')) return GAME_IMAGES.SUDOKU_BATTLE;
  if (upper.includes('MAFIA')) return GAME_IMAGES.MAFIA;
  if (upper.includes('QUIZ') || upper.includes('TRIVIA')) return GAME_IMAGES.QUIZ_BATTLE;
  if (upper.includes('DRAW') || upper.includes('PICTIONARY')) return GAME_IMAGES.DRAW_AND_GUESS;
  if (upper.includes('GOLF')) return GAME_IMAGES.MINI_GOLF;
  if (upper.includes('DART')) return GAME_IMAGES.DARTS;
  if (upper.includes('BOWL')) return GAME_IMAGES.BOWLING;
  if (upper.includes('HOCKEY')) return GAME_IMAGES.AIR_HOCKEY;
  if (upper.includes('CHECKER')) return GAME_IMAGES.CHECKERS;
  if (upper.includes('REVERSI') || upper.includes('OTHELLO')) return GAME_IMAGES.REVERSI;
  if (upper.includes('BATTLESHIP')) return GAME_IMAGES.BATTLESHIP;
  if (upper.includes('DOMINO')) return GAME_IMAGES.DOMINOES;
  if (upper.includes('BACKGAMMON')) return GAME_IMAGES.BACKGAMMON;
  if (upper.includes('PUZZLE') || upper.includes('JIGSAW')) return GAME_IMAGES.PUZZLE_DUEL;
  if (upper.includes('SEQUENCE')) return GAME_IMAGES.SEQUENCE;
  if (upper.includes('2048')) return GAME_IMAGES['2048_MULTIPLAYER'];
  if (upper.includes('TYPE') || upper.includes('TYPING')) return GAME_IMAGES.TYPING_RACE;
  if (upper.includes('MEMORY')) return GAME_IMAGES.MEMORY_MATCH;
  if (upper.includes('HANGMAN')) return GAME_IMAGES.HANGMAN;

  // Ultimate fallback to default board emblem
  return GAME_IMAGES.TICTACTOE;
}

export default GAME_IMAGES;
