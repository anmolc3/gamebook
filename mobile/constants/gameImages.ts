/**
 * Game artwork mapping — keys are gameType strings,
 * values are require() paths to mobile/assets/images PNGs.
 * All 77 images from /images are covered.
 */

const GAME_IMAGES: Record<string, ReturnType<typeof require>> = {
  // Board
  TICTACTOE:         require('../assets/images/Glossy Tic-Tac-Toe Game Badge.png'),
  LUDO:              require('../assets/images/Ludo World Arena Logo.png'),
  CHESS:             require('../assets/images/Golden Chess Emblem.png'),
  CONNECT_FOUR:      require('../assets/images/Glossy Connect Four Game Logo.png'),
  CHECKERS:          require('../assets/images/Glossy Checkers Crown Game Emblem.png'),
  REVERSI:           require('../assets/images/Glossy Solitaire Game Emblem.png'),
  GOMOKU:            require('../assets/images/Gomoku Gold Game Logo.png'),

  // Traditional Board II
  CARROM:            require('../assets/images/Glossy 3D Carrom Game Emblem.png'),
  SNAKES_AND_LADDERS:require('../assets/images/Colorful Snake and Ladders Game Logo.png'),
  BATTLESHIP:        require('../assets/images/Battleship Fleet Command Emblem.png'),
  DOMINOES:          require('../assets/images/Glossy Dominoes Duel Game Badge.png'),
  BACKGAMMON:        require('../assets/images/Glossy Backgammon Board Emblem.png'),
  MANCALA:           require('../assets/images/Jigsaw Puzzle Race Logo.png'),
  CHINESE_CHECKERS:  require('../assets/images/Glossy Chinese Checkers Game Logo.png'),

  // Casual / Arcade
  POOL_8_BALL:       require('../assets/images/Glossy 8 Ball Pool Crown Emblem.png'),
  MINI_GOLF:         require('../assets/images/Glossy Mini Golf Battle Emblem.png'),
  AIR_HOCKEY:        require('../assets/images/Glossy Air Hockey Game Emblem.png'),
  DARTS:             require('../assets/images/Regal Darts 501 Bullseye Crest.png'),
  BOWLING:           require('../assets/images/Dynamic Bowling Strike Emblem.png'),
  TABLE_TENNIS:      require('../assets/images/Glossy Card Games Casino Emblem.png'),

  // Card Games
  UNO_STYLE:         require('../assets/images/Color Match Clash Card Game Logo.png'),
  HEARTS:            require('../assets/images/Glossy Hearts Card Game Emblem.png'),
  SPADES:            require('../assets/images/Golden Spades Card Game Emblem.png'),
  RUMMY:             require('../assets/images/Indian Rummy Golden Card Emblem.png'),
  GIN_RUMMY:         require('../assets/images/Classic Gin Rummy Card Game Emblem.png'),
  CRAZY_EIGHTS:      require('../assets/images/Crazy Eights Royal Card Emblem.png'),
  GO_FISH:           require('../assets/images/Go Fish Splashy Card Game Logo.png'),
  WAR:               require('../assets/images/War Card Duel Emblem.png'),
  DURAK:             require('../assets/images/DURAK Regal Card Game Emblem.png'),
  PRESIDENT:         require('../assets/images/Glossy President Casino Game Emblem.png'),
  BLACKJACK:         require('../assets/images/Glossy Blackjack Casino Emblem.png'),
  POKER:             require('../assets/images/Gilded Casino Poker Emblem.png'),

  // Puzzle / Reflex
  ROCK_PAPER_SCISSORS: require('../assets/images/Glossy Rock Paper Scissors Battle Badge.png'),
  REACTION_TEST:     require('../assets/images/Reaction Speed Test Emblem.png'),
  NUMBER_GUESS:      require('../assets/images/Number Guessing Duel Emblem.png'),
  SPEED_TAP:         require('../assets/images/Speed Tap Rush Game Badge.png'),
  COLOR_MATCH:       require('../assets/images/Color Match Reflex Game Badge.png'),
  MATH_BATTLE:       require('../assets/images/Speed Math Duel Game Emblem.png'),
  QUICK_DRAW:        require('../assets/images/Western Quick Draw Duel Emblem.png'),
  WORDLE_DUEL:       require('../assets/images/Glossy Word Scramble Battle Logo.png'),
  HANGMAN:           require('../assets/images/HANGMAN DUEL Game Emblem.png'),
  MEMORY_MATCH:      require('../assets/images/Glossy Corgi Memory Match Logo.png'),
  QUIZ_BATTLE:       require('../assets/images/Quiz Battle Arena Logo.png'),
  '2048_MULTIPLAYER':require('../assets/images/2048 Versus Race Showdown.png'),
  MINESWEEPER_DUEL:  require('../assets/images/Sudoku Duel_ Neon Puzzle Showdown.png'),
  PATTERN_MATCH:     require('../assets/images/Colorful Pattern Memory Matrix Game Logo.png'),
  MASTERMIND:        require('../assets/images/Glossy Mastermind Puzzle Board.png'),
  WORD_SCRAMBLE:     require('../assets/images/Anagram Scramble Game Logo.png'),
  TYPING_RACE:       require('../assets/images/Mobile Typing Race_ Neon Speed Challenge.png'),

  // Party / Social
  WOULD_YOU_RATHER:  require('../assets/images/Would You Rather_ Party Game.png'),
  TRUTH_OR_DARE:     require('../assets/images/Truth or Dare Social Game Logo.png'),
  CHARADES:          require('../assets/images/Glossy Charades Party Game Badge.png'),
  GUESS_PICTURE:     require('../assets/images/Pixel Reveal Guess_ Happy Dog Puzzle.png'),
  GUESS_WORD:        require('../assets/images/Word Guess Duel Badge.png'),
  GUESS_SONG:        require('../assets/images/Name That Tune_ Neon Sound Splash.png'),
  WHO_AM_I:          require('../assets/images/Trivia Duel Showdown.png'),
  IMPOSTER:          require("../assets/images/The Imposter's Secret Crew.png"),
  MAFIA:             require('../assets/images/Mafia vs Werewolf_ Moonlit Showdown.png'),
  DRAW_AND_GUESS:    require('../assets/images/Draw & Guess Live Game Logo.png'),
  PICTIONARY:        require('../assets/images/Pictionary Duel_ Colorful Sketch Showdown.png'),
  NEVER_HAVE_I_EVER: require('../assets/images/Never Have I Ever Party.png'),
  THIS_OR_THAT:      require('../assets/images/Beach or Mountains_ This or That.png'),
  TWO_TRUTHS_AND_A_LIE: require('../assets/images/2 Truths and a Lie Game Badge.png'),
  WORD_SEARCH:       require('../assets/images/Word Search Race Game Badge.png'),
  RPS_TOURNAMENT:    require('../assets/images/RPS Tournament Trophy Emblem.png'),
};

export function getGameImage(gameType: string): ReturnType<typeof require> | null {
  return GAME_IMAGES[gameType] ?? null;
}

export default GAME_IMAGES;
