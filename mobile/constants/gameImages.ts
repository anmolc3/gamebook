/**
 * Game artwork mapping — keys are gameType strings,
 * values are require() paths to mobile/assets/images PNGs.
 * All 77 images from /images are covered.
 */

const GAME_IMAGES: Record<string, ReturnType<typeof require>> = {
  // Board
  TICTACTOE:         require('../assets/images/Glossy Tic-Tac-Toe Game Badge.webp'),
  LUDO:              require('../assets/images/Ludo World Arena Logo.webp'),
  CHESS:             require('../assets/images/Golden Chess Emblem.webp'),
  CONNECT_FOUR:      require('../assets/images/Glossy Connect Four Game Logo.webp'),
  CHECKERS:          require('../assets/images/Glossy Checkers Crown Game Emblem.webp'),
  REVERSI:           require('../assets/images/Glossy Solitaire Game Emblem.webp'),
  GOMOKU:            require('../assets/images/Gomoku Gold Game Logo.webp'),

  // Traditional Board II
  CARROM:            require('../assets/images/Glossy 3D Carrom Game Emblem.webp'),
  SNAKES_AND_LADDERS:require('../assets/images/Colorful Snake and Ladders Game Logo.webp'),
  BATTLESHIP:        require('../assets/images/Battleship Fleet Command Emblem.webp'),
  DOMINOES:          require('../assets/images/Glossy Dominoes Duel Game Badge.webp'),
  BACKGAMMON:        require('../assets/images/Glossy Backgammon Board Emblem.webp'),
  MANCALA:           require('../assets/images/Jigsaw Puzzle Race Logo.webp'),
  CHINESE_CHECKERS:  require('../assets/images/Glossy Chinese Checkers Game Logo.webp'),

  // Casual / Arcade
  POOL_8_BALL:       require('../assets/images/Glossy 8 Ball Pool Crown Emblem.webp'),
  MINI_GOLF:         require('../assets/images/Glossy Mini Golf Battle Emblem.webp'),
  AIR_HOCKEY:        require('../assets/images/Glossy Air Hockey Game Emblem.webp'),
  DARTS:             require('../assets/images/Regal Darts 501 Bullseye Crest.webp'),
  BOWLING:           require('../assets/images/Dynamic Bowling Strike Emblem.webp'),
  TABLE_TENNIS:      require('../assets/images/Glossy Card Games Casino Emblem.webp'),

  // Card Games
  UNO_STYLE:         require('../assets/images/Color Match Clash Card Game Logo.webp'),
  HEARTS:            require('../assets/images/Glossy Hearts Card Game Emblem.webp'),
  SPADES:            require('../assets/images/Golden Spades Card Game Emblem.webp'),
  RUMMY:             require('../assets/images/Indian Rummy Golden Card Emblem.webp'),
  GIN_RUMMY:         require('../assets/images/Classic Gin Rummy Card Game Emblem.webp'),
  CRAZY_EIGHTS:      require('../assets/images/Crazy Eights Royal Card Emblem.webp'),
  GO_FISH:           require('../assets/images/Go Fish Splashy Card Game Logo.webp'),
  WAR:               require('../assets/images/War Card Duel Emblem.webp'),
  DURAK:             require('../assets/images/DURAK Regal Card Game Emblem.webp'),
  PRESIDENT:         require('../assets/images/Glossy President Casino Game Emblem.webp'),
  BLACKJACK:         require('../assets/images/Glossy Blackjack Casino Emblem.webp'),
  POKER:             require('../assets/images/Gilded Casino Poker Emblem.webp'),

  // Puzzle / Reflex
  ROCK_PAPER_SCISSORS: require('../assets/images/Glossy Rock Paper Scissors Battle Badge.webp'),
  REACTION_TEST:     require('../assets/images/Reaction Speed Test Emblem.webp'),
  NUMBER_GUESS:      require('../assets/images/Number Guessing Duel Emblem.webp'),
  SPEED_TAP:         require('../assets/images/Speed Tap Rush Game Badge.webp'),
  COLOR_MATCH:       require('../assets/images/Color Match Reflex Game Badge.webp'),
  MATH_BATTLE:       require('../assets/images/Speed Math Duel Game Emblem.webp'),
  QUICK_DRAW:        require('../assets/images/Western Quick Draw Duel Emblem.webp'),
  WORDLE_DUEL:       require('../assets/images/Glossy Word Scramble Battle Logo.webp'),
  HANGMAN:           require('../assets/images/HANGMAN DUEL Game Emblem.webp'),
  MEMORY_MATCH:      require('../assets/images/Glossy Corgi Memory Match Logo.webp'),
  QUIZ_BATTLE:       require('../assets/images/Quiz Battle Arena Logo.webp'),
  '2048_MULTIPLAYER':require('../assets/images/2048 Versus Race Showdown.webp'),
  MINESWEEPER_DUEL:  require('../assets/images/Sudoku Duel_ Neon Puzzle Showdown.webp'),
  PATTERN_MATCH:     require('../assets/images/Colorful Pattern Memory Matrix Game Logo.webp'),
  MASTERMIND:        require('../assets/images/Glossy Mastermind Puzzle Board.webp'),
  WORD_SCRAMBLE:     require('../assets/images/Anagram Scramble Game Logo.webp'),
  TYPING_RACE:       require('../assets/images/Mobile Typing Race_ Neon Speed Challenge.webp'),

  // Party / Social
  WOULD_YOU_RATHER:  require('../assets/images/Would You Rather_ Party Game.webp'),
  TRUTH_OR_DARE:     require('../assets/images/Truth or Dare Social Game Logo.webp'),
  CHARADES:          require('../assets/images/Glossy Charades Party Game Badge.webp'),
  GUESS_PICTURE:     require('../assets/images/Pixel Reveal Guess_ Happy Dog Puzzle.webp'),
  GUESS_WORD:        require('../assets/images/Word Guess Duel Badge.webp'),
  GUESS_SONG:        require('../assets/images/Name That Tune_ Neon Sound Splash.webp'),
  WHO_AM_I:          require('../assets/images/Trivia Duel Showdown.webp'),
  IMPOSTER:          require('../assets/images/The Imposter Secret Crew.webp'),
  MAFIA:             require('../assets/images/Mafia vs Werewolf_ Moonlit Showdown.webp'),
  DRAW_AND_GUESS:    require('../assets/images/Draw & Guess Live Game Logo.webp'),
  PICTIONARY:        require('../assets/images/Pictionary Duel_ Colorful Sketch Showdown.webp'),
  NEVER_HAVE_I_EVER: require('../assets/images/Never Have I Ever Party.webp'),
  THIS_OR_THAT:      require('../assets/images/Beach or Mountains_ This or That.webp'),
  TWO_TRUTHS_AND_A_LIE: require('../assets/images/2 Truths and a Lie Game Badge.webp'),
  WORD_SEARCH:       require('../assets/images/Word Search Race Game Badge.webp'),
  RPS_TOURNAMENT:    require('../assets/images/RPS Tournament Trophy Emblem.webp'),
};

export function getGameImage(gameType: string): ReturnType<typeof require> | null {
  return GAME_IMAGES[gameType] ?? null;
}

export default GAME_IMAGES;
