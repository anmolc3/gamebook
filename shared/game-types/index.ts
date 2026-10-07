export type GameCategory =
  | 'BOARD'
  | 'CARD'
  | 'CASUAL'
  | 'COMPETITIVE'
  | 'PUZZLE'
  | 'PARTY'
  | 'ADVANCED';

export type GameType =
  // Category A: Core Board Games
  | 'TICTACTOE'
  | 'LUDO'
  | 'CHESS'
  | 'CHECKERS'
  | 'CONNECT_FOUR'
  | 'CARROM'
  | 'SNAKES_AND_LADDERS'
  | 'BACKGAMMON'
  | 'REVERSI'
  | 'GOMOKU'
  | 'BATTLESHIP'
  | 'DOMINOES'
  | 'MANCALA'
  | 'CHINESE_CHECKERS'
  // Category B: Card Games (Virtual/Play-Money Only)
  | 'CARDS'
  | 'UNO_STYLE'
  | 'HEARTS'
  | 'SPADES'
  | 'RUMMY'
  | 'GIN_RUMMY'
  | 'CRAZY_EIGHTS'
  | 'GO_FISH'
  | 'WAR'
  | 'DURAK'
  | 'PRESIDENT'
  | 'BLACKJACK'
  | 'POKER'
  // Category C: Casual Multiplayer
  | 'POOL_8_BALL'
  | 'MINI_GOLF'
  | 'AIR_HOCKEY'
  | 'DARTS'
  | 'BOWLING'
  | 'TABLE_TENNIS'
  | 'WORD_SEARCH'
  | 'HANGMAN'
  | 'MEMORY_MATCH'
  | 'QUIZ_BATTLE'
  | 'TRIVIA'
  | 'WORD_BATTLE'
  // Category D: Fast Competitive Games
  | 'REACTION_TEST'
  | 'ROCK_PAPER_SCISSORS'
  | 'RPS_TOURNAMENT'
  | 'NUMBER_GUESS'
  | 'SPEED_TAP'
  | 'COLOR_MATCH'
  | 'MATH_BATTLE'
  | 'QUICK_DRAW'
  | 'WORD_SCRAMBLE'
  | 'TYPING_RACE'
  // Category E: Strategy & Puzzle Games
  | 'SUDOKU_BATTLE'
  | '2048_MULTIPLAYER'
  | 'MINESWEEPER_DUEL'
  | 'CROSSWORD_BATTLE'
  | 'WORDLE_DUEL'
  | 'SEQUENCE'
  | 'MASTERMIND'
  | 'PATTERN_MATCH'
  | 'PUZZLE_DUEL'
  // Category F: Party & Social Games
  | 'WOULD_YOU_RATHER'
  | 'TRUTH_OR_DARE'
  | 'CHARADES'
  | 'GUESS_PICTURE'
  | 'GUESS_WORD'
  | 'GUESS_SONG'
  | 'WHO_AM_I'
  | 'IMPOSTER'
  | 'MAFIA'
  | 'DRAW_AND_GUESS'
  | 'PICTIONARY'
  | 'NEVER_HAVE_I_EVER'
  | 'THIS_OR_THAT'
  | 'TWO_TRUTHS_AND_A_LIE'
  | (string & {});

export type RoomStatus = 'WAITING' | 'STARTING' | 'PLAYING' | 'FINISHED';

export interface GameDefinition {
  id: GameType;
  name: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  defaultPlayers: number;
  supportsSpectators: boolean;
  turnTimeSeconds: number;
  description: string;
  iconName: string;
  defaultSettings?: Record<string, any>;
}

export interface GamePlayerSlot {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  slotIndex: number;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
  score?: number;
}

export interface GameRoomSummary {
  id: string;
  code: string;
  gameType: GameType;
  status: RoomStatus;
  hostId: string;
  isPrivate: boolean;
  maxPlayers: number;
  players: GamePlayerSlot[];
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Shared Authoritative Game Engine Types
// ----------------------------------------------------------------------------

export interface GameActionPayload {
  type: string;
  payload: any;
  sequenceNumber?: number;
}

export interface GameActionResult<TState = any> {
  success: boolean;
  error?: string;
  state?: TState;
  events?: GameEventPayload[];
}

export interface GameEventPayload {
  type: string;
  data: any;
  target?: 'ALL' | 'ROOM' | string; // 'ALL' or specific userId
}

// Tic-Tac-Toe Specific Types
export type TicTacToeCell = 'X' | 'O' | null;

export interface TicTacToeState {
  board: TicTacToeCell[]; // 9 elements (indices 0 to 8)
  turnPlayerId: string;
  players: {
    X: string; // userId
    O: string; // userId
  };
  winnerId: string | null; // userId or null
  isDraw: boolean;
  winningLine: number[] | null; // e.g. [0, 1, 2]
  turnExpiresAt: number; // Unix timestamp ms
}

export interface TicTacToeAction {
  cellIndex: number; // 0..8
}

// Ludo Specific Types
export type LudoColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export interface LudoToken {
  id: number; // 0..3
  color: LudoColor;
  step: number; // -1 for home yard, 0..50 on track, 51..55 home stretch, 56 finished
}

export type LudoActionType = 'ROLL_DICE' | 'MOVE_TOKEN';

export interface LudoAction {
  type: LudoActionType;
  tokenId?: number; // 0..3 (required for MOVE_TOKEN)
}

export interface LudoLastMove {
  playerId: string;
  color: LudoColor;
  tokenId: number;
  fromStep: number;
  toStep: number;
  capturedToken?: {
    playerId: string;
    color: LudoColor;
    tokenId: number;
  };
  reachedHome?: boolean;
}

export interface LudoPlayerState {
  userId: string;
  username: string;
  color: LudoColor;
  tokens: LudoToken[];
  rank?: number; // 1, 2, 3, 4
}

export interface LudoState {
  players: LudoPlayerState[];
  turnColor: LudoColor;
  turnPlayerId: string;
  currentDiceRoll: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  validMoves: number[]; // IDs of tokens that can legally be moved
  winnerIds: string[]; // Order of finishing
  lastMove?: LudoLastMove;
  turnExpiresAt: number;
}

export interface LudoResult {
  winnerId: string | null;
  winnerIds: string[];
  rankings: { userId: string; color: LudoColor; rank: number }[];
  isComplete: boolean;
}

// ----------------------------------------------------------------------------
// Board Game Expansion I Types
// ----------------------------------------------------------------------------

// 1. Connect Four
export type ConnectFourCell = 'R' | 'Y' | null;

export interface ConnectFourState {
  board: ConnectFourCell[][]; // 6 rows x 7 cols
  turnPlayerId: string;
  players: {
    R: string;
    Y: string;
  };
  winnerId: string | null;
  isDraw: boolean;
  winningLine: [number, number][] | null;
  turnExpiresAt: number;
}

export interface ConnectFourAction {
  column: number; // 0..6
}

export interface ConnectFourResult {
  winnerId: string | null;
  isDraw: boolean;
  winningLine: [number, number][] | null;
}

// 2. Reversi / Othello
export type ReversiCell = 'B' | 'W' | null;

export interface ReversiState {
  board: ReversiCell[][]; // 8x8
  turnPlayerId: string;
  players: {
    B: string; // Black
    W: string; // White
  };
  counts: { B: number; W: number };
  validMoves: [number, number][]; // [r, c]
  consecutivePasses: number;
  winnerId: string | null;
  isDraw: boolean;
  turnExpiresAt: number;
}

export interface ReversiAction {
  row: number; // 0..7
  col: number; // 0..7
}

export interface ReversiResult {
  winnerId: string | null;
  isDraw: boolean;
  counts: { B: number; W: number };
}

// 3. Gomoku
export type GomokuCell = 'B' | 'W' | null;

export interface GomokuState {
  board: GomokuCell[][]; // 15x15
  turnPlayerId: string;
  players: {
    B: string;
    W: string;
  };
  winnerId: string | null;
  isDraw: boolean;
  winningLine: [number, number][] | null;
  lastMove: [number, number] | null;
  turnExpiresAt: number;
}

export interface GomokuAction {
  row: number; // 0..14
  col: number; // 0..14
}

export interface GomokuResult {
  winnerId: string | null;
  isDraw: boolean;
  winningLine: [number, number][] | null;
}

// 4. Checkers / Draughts
export type CheckersPiece = 'R' | 'B' | 'RK' | 'BK' | null;

export interface CheckersValidMove {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}

export interface CheckersState {
  board: CheckersPiece[][]; // 8x8
  turnPlayerId: string;
  turnColor: 'R' | 'B';
  players: {
    R: string; // Red (bottom)
    B: string; // Black (top)
  };
  counts: { R: number; B: number };
  validMoves: CheckersValidMove[];
  winnerId: string | null;
  isDraw: boolean;
  turnExpiresAt: number;
}

export interface CheckersAction {
  from: [number, number];
  to: [number, number];
}

export interface CheckersResult {
  winnerId: string | null;
  isDraw: boolean;
}

// 5. Chess Grandmaster
export type ChessPieceColor = 'W' | 'B';
export type ChessPieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessPieceColor;
  hasMoved?: boolean;
}

export type ChessCell = ChessPiece | null;

export interface ChessState {
  board: ChessCell[][]; // 8x8
  turnPlayerId: string;
  turnColor: ChessPieceColor;
  players: {
    W: string; // White
    B: string; // Black
  };
  inCheck: boolean;
  winnerId: string | null;
  isDraw: boolean;
  drawReason?: string;
  lastMove?: { from: [number, number]; to: [number, number] };
  turnExpiresAt: number;
}

export interface ChessAction {
  from: [number, number];
  to: [number, number];
  promotion?: ChessPieceType;
}

export interface ChessResult {
  winnerId: string | null;
  isDraw: boolean;
  drawReason?: string;
}

// ----------------------------------------------------------------------------
// Board Game Expansion II Types (Phase 11)
// ----------------------------------------------------------------------------

// 1. Carrom Board
export type CarromPieceType = 'WHITE' | 'BLACK' | 'QUEEN';

export interface CarromPiece {
  id: string;
  type: CarromPieceType;
  x: number; // 0..100 (percentage coordinates)
  y: number; // 0..100
  isPocketed: boolean;
}

export interface CarromPlayerState {
  userId: string;
  color: 'WHITE' | 'BLACK';
  score: number;
  pocketedCount: number;
}

export interface CarromState {
  pieces: CarromPiece[];
  players: CarromPlayerState[];
  turnPlayerId: string;
  queenCoverPending: boolean;
  queenPocketedBy: string | null;
  strikerFoul: boolean;
  winnerId: string | null;
  isDraw: boolean;
  turnExpiresAt: number;
}

export interface CarromAction {
  type: 'STRIKE';
  strikerX: number; // 20..80 along baseline
  angle: number; // in radians or degrees
  power: number; // 1..100
  targetPieceId?: string; // target piece hit by striker
}

export interface CarromResult {
  winnerId: string | null;
  isDraw: boolean;
  finalScores: Record<string, number>;
}

// 2. Snakes & Ladders
export interface SnakesAndLaddersPlayerState {
  userId: string;
  position: number; // 1..100 (0 before entering or starting at 1)
  rank?: number;
}

export interface SnakesAndLaddersState {
  players: SnakesAndLaddersPlayerState[];
  turnPlayerId: string;
  currentDiceRoll: number | null;
  lastMoveType: 'NORMAL' | 'LADDER' | 'SNAKE' | null;
  winnerId: string | null;
  winnerIds: string[];
  isComplete: boolean;
  turnExpiresAt: number;
}

export interface SnakesAndLaddersAction {
  type: 'ROLL_DICE';
}

export interface SnakesAndLaddersResult {
  winnerId: string | null;
  rankings: { userId: string; rank: number }[];
  isComplete: boolean;
}

// 3. Battleship Fleet Command
export type ShipType = 'CARRIER' | 'BATTLESHIP' | 'CRUISER' | 'SUBMARINE' | 'DESTROYER';

export interface ShipPlacement {
  type: ShipType;
  size: number;
  row: number; // 0..9
  col: number; // 0..9
  orientation: 'H' | 'V';
  hits: number;
  isSunk: boolean;
}

export type BattleCellStatus = 'EMPTY' | 'SHIP' | 'HIT' | 'MISS';

export interface BattleshipPlayerGrid {
  userId: string;
  ships: ShipPlacement[];
  shotsReceived: { row: number; col: number; status: 'HIT' | 'MISS' }[];
  isReady: boolean; // Done placing ships
}

export interface BattleshipState {
  stage: 'PLACEMENT' | 'BATTLE' | 'FINISHED';
  players: Record<string, BattleshipPlayerGrid>;
  turnPlayerId: string;
  lastShot?: {
    firedBy: string;
    row: number;
    col: number;
    result: 'HIT' | 'MISS' | 'SUNK';
    sunkShipType?: ShipType;
  };
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface BattleshipAction {
  type: 'PLACE_SHIPS' | 'FIRE';
  ships?: ShipPlacement[];
  row?: number; // 0..9
  col?: number; // 0..9
}

export interface BattleshipResult {
  winnerId: string | null;
  shotsCount: Record<string, number>;
}

// 4. Dominoes Duel
export type DominoTile = [number, number]; // e.g. [3, 5]

export interface DominoesState {
  boardChain: DominoTile[];
  openEnds: [number, number]; // [leftEnd, rightEnd]
  playerHands: Record<string, DominoTile[]>;
  boneyard: DominoTile[];
  players: string[];
  turnPlayerId: string;
  consecutivePasses: number;
  winnerId: string | null;
  isBlocked: boolean;
  turnExpiresAt: number;
}

export interface DominoesAction {
  type: 'PLAY_TILE' | 'DRAW_TILE' | 'PASS';
  tile?: DominoTile;
  end?: 'LEFT' | 'RIGHT';
}

export interface DominoesResult {
  winnerId: string | null;
  isBlocked: boolean;
  finalHandPips: Record<string, number>;
}

// 5. Backgammon
export interface BackgammonState {
  points: { white: number; black: number }[]; // 24 points (indices 0..23)
  bar: { white: number; black: number };
  borneOff: { white: number; black: number };
  dice: number[]; // e.g. [3, 5] or [4, 4, 4, 4] on doubles
  diceRemaining: number[];
  turnColor: 'WHITE' | 'BLACK';
  turnPlayerId: string;
  players: {
    WHITE: string;
    BLACK: string;
  };
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface BackgammonAction {
  type: 'ROLL_DICE' | 'MOVE_CHECKER';
  from?: number | 'BAR'; // 0..23 or 'BAR'
  die?: number;
}

export interface BackgammonResult {
  winnerId: string | null;
  isGammon: boolean;
  isBackgammon: boolean;
}

// 6. Mancala (Kalah)
export interface MancalaState {
  // Pits 0..5 (Player 1), Pit 6 (Player 1 Store)
  // Pits 7..12 (Player 2), Pit 13 (Player 2 Store)
  board: number[]; // 14 slots
  turnPlayerId: string;
  players: [string, string]; // [Player 1, Player 2]
  winnerId: string | null;
  isDraw: boolean;
  freeTurnAwarded: boolean;
  turnExpiresAt: number;
}

export interface MancalaAction {
  type: 'SOW_PIT';
  pitIndex: number; // 0..5 for P1, 7..12 for P2
}

export interface MancalaResult {
  winnerId: string | null;
  isDraw: boolean;
  finalStores: [number, number];
}

// 7. Chinese Checkers
export interface ChineseCheckersMarble {
  id: string;
  ownerId: string;
  color: 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
  coord: [number, number]; // [row, col] on hexagram grid
}

export interface ChineseCheckersState {
  marbles: ChineseCheckersMarble[];
  players: { userId: string; color: 'RED' | 'BLUE' }[];
  turnPlayerId: string;
  winnerId: string | null;
  lastMove?: { from: [number, number]; to: [number, number] };
  turnExpiresAt: number;
}

export interface ChineseCheckersAction {
  type: 'MOVE_MARBLE';
  marbleId: string;
  to: [number, number];
}

export interface ChineseCheckersResult {
  winnerId: string | null;
  rankings: { userId: string; rank: number }[];
}

// ----------------------------------------------------------------------------
// Category C: Casual & Arcade Games (Phase 12)
// ----------------------------------------------------------------------------

// 1. 8 Ball Pool Arena
export type PoolBallType = 'CUE' | 'SOLID' | 'STRIPE' | 'EIGHT';
export type PoolSuit = 'SOLIDS' | 'STRIPES';

export interface PoolBall {
  id: number; // 0: Cue, 1..7: Solids, 8: Eight Ball, 9..15: Stripes
  type: PoolBallType;
  x: number; // 0..1000
  y: number; // 0..500
  isPocketed: boolean;
}

export interface PoolPlayerState {
  userId: string;
  suit: PoolSuit | null;
  pocketedCount: number;
}

export interface Pool8BallState {
  balls: PoolBall[];
  players: [PoolPlayerState, PoolPlayerState];
  turnPlayerId: string;
  isBreakShot: boolean;
  ballInHand: boolean;
  lastShotFoul: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface Pool8BallAction {
  type: 'STRIKE' | 'PLACE_CUE';
  angle?: number; // 0..360 degrees
  power?: number; // 1..100%
  spin?: { x: number; y: number };
  cuePosition?: { x: number; y: number };
  simulatedPocketed?: number[];
  firstBallHitId?: number;
}

export interface Pool8BallResult {
  winnerId: string | null;
  reason: 'EIGHT_BALL_POCKETED' | 'EARLY_EIGHT_BALL_FOUL' | 'EIGHT_BALL_SCRATCH' | 'RESIGNATION';
}

// 2. Mini Golf Battle
export interface MiniGolfHole {
  holeNumber: number;
  par: number;
  tee: { x: number; y: number };
  cup: { x: number; y: number };
  obstacles: { x: number; y: number; width: number; height: number; type: 'WALL' | 'WATER' | 'SAND' }[];
}

export interface MiniGolfPlayerState {
  userId: string;
  ballPosition: { x: number; y: number };
  currentHoleStrokes: number;
  totalStrokes: number;
  holeScores: number[];
  isHoleCompleted: boolean;
}

export interface MiniGolfState {
  currentHoleIndex: number;
  holes: MiniGolfHole[];
  players: MiniGolfPlayerState[];
  turnPlayerId: string;
  isRoundOver: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface MiniGolfAction {
  type: 'PUTT';
  angle: number; // 0..360 degrees
  power: number; // 1..100%
}

export interface MiniGolfResult {
  winnerId: string | null;
  rankings: { userId: string; totalStrokes: number; rank: number }[];
}

// 3. Air Hockey
export interface AirHockeyMallet {
  x: number;
  y: number;
}

export interface AirHockeyPuck {
  x: number; // 0..800
  y: number; // 0..1200
  vx: number;
  vy: number;
}

export interface AirHockeyState {
  puck: AirHockeyPuck;
  mallets: {
    player1: AirHockeyMallet; // 600..1200 (bottom half)
    player2: AirHockeyMallet; // 0..600 (top half)
  };
  scores: {
    player1: number;
    player2: number;
  };
  targetScore: number;
  players: [string, string]; // [player1Id, player2Id]
  turnPlayerId: string;
  lastScorerId: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface AirHockeyAction {
  type: 'MOVE_MALLET' | 'STRIKE_PUCK';
  x: number;
  y: number;
  strikeAngle?: number;
  strikePower?: number;
}

export interface AirHockeyResult {
  winnerId: string | null;
  finalScores: { player1: number; player2: number };
}

// 4. Darts 501
export type DartMultiplier = 0 | 1 | 2 | 3; // 0: Miss, 1: Single, 2: Double, 3: Triple

export interface DartThrow {
  dartIndex: number; // 0, 1, 2
  sector: number; // 0..20, 25 (outer bull), 50 (bullseye)
  multiplier: DartMultiplier;
  points: number;
}

export interface DartsPlayerState {
  userId: string;
  scoreRemaining: number;
  dartsThrown: number;
  roundThrows: DartThrow[];
}

export interface DartsState {
  startingScore: number;
  players: [DartsPlayerState, DartsPlayerState];
  turnPlayerId: string;
  dartsRemainingInTurn: number;
  currentTurnScore: number;
  isBust: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface DartsAction {
  type: 'THROW_DART';
  x: number; // -100..100 from center
  y: number; // -100..100 from center
  targetSector?: number;
  targetMultiplier?: DartMultiplier;
}

export interface DartsResult {
  winnerId: string | null;
  checkoutDart: DartThrow | null;
  totalTurns: number;
}

// 5. Bowling Strike
export interface BowlingFrame {
  rolls: number[];
  pinsStanding: number[]; // 1..10
  score: number | null;
  isStrike: boolean;
  isSpare: boolean;
}

export interface BowlingPlayerState {
  userId: string;
  frames: BowlingFrame[];
  totalScore: number;
  isCompleted: boolean;
}

export interface BowlingState {
  players: BowlingPlayerState[];
  turnPlayerId: string;
  currentFrameIndex: number; // 0..9
  currentRollIndex: number; // 0..2
  standingPins: number[]; // [1..10]
  winnerId: string | null;
  isGameOver: boolean;
  turnExpiresAt: number;
}

export interface BowlingAction {
  type: 'ROLL_BALL';
  lanePosition: number; // -50..50
  angle: number; // -15..15
  speed: number; // 10..100
  spin: number; // -10..10
}

export interface BowlingResult {
  winnerId: string | null;
  rankings: { userId: string; score: number; rank: number }[];
}

// 6. Table Tennis Duel
export type TableTennisShotType = 'TOPSPIN' | 'BACKSPIN' | 'FLAT' | 'SMASH' | 'DROP';

export interface TableTennisBall {
  x: number; // -100..100
  y: number; // 0..200
  z: number; // 0..50 (height)
  vx: number;
  vy: number;
  tableSide: 'PLAYER1' | 'PLAYER2' | 'NET' | 'OUT';
}

export interface TableTennisState {
  scores: { player1: number; player2: number };
  targetScore: number;
  players: [string, string];
  serverPlayerId: string;
  turnPlayerId: string;
  rallyCount: number;
  ball: TableTennisBall;
  serviceCount: number;
  isDeuce: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}

export interface TableTennisAction {
  type: 'SERVE' | 'RETURN';
  shotType: TableTennisShotType;
  targetX: number; // -100..100
  targetY: number; // 0..100
  power: number; // 10..100
}

export interface TableTennisResult {
  winnerId: string | null;
  finalScore: { player1: number; player2: number };
  longestRally: number;
}

// ----------------------------------------------------------------------------
// Category B: Card Game Engine & Suite (Phase 13)
// ----------------------------------------------------------------------------

export type StandardSuit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type UnoColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE' | 'WILD';

export interface PlayingCard {
  id: string; // unique ID
  suit: StandardSuit | UnoColor;
  rank: number; // 2..14 for standard, 0..14 for Uno
  label: string; // e.g. "A♠", "10♥", "Red 7", "Skip"
  isFaceUp?: boolean;
}

// 1. Uno-Style (Color Match Clash)
export interface UnoState {
  hands: Record<string, PlayingCard[]>;
  drawPileCount: number;
  discardPile: PlayingCard[];
  currentColor: UnoColor;
  currentRank: number;
  turnPlayerId: string;
  turnDirection: 1 | -1;
  drawPenalty: number;
  calledUno: string[];
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface UnoAction {
  type: 'PLAY_CARD' | 'DRAW_CARD' | 'CALL_UNO';
  cardId?: string;
  chosenColor?: UnoColor;
}
export interface UnoResult {
  winnerId: string | null;
  rankings: { userId: string; score: number }[];
}

// 2. Hearts
export interface HeartsTrickCard {
  playerId: string;
  card: PlayingCard;
}
export interface HeartsState {
  hands: Record<string, PlayingCard[]>;
  currentTrick: HeartsTrickCard[];
  tricksWon: Record<string, PlayingCard[][]>;
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
  leadSuit: StandardSuit | null;
  heartsBroken: boolean;
  passPhase: boolean;
  turnPlayerId: string;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface HeartsAction {
  type: 'PLAY_CARD' | 'PASS_CARDS';
  cardId?: string;
  passedCardIds?: string[];
}
export interface HeartsResult {
  winnerId: string | null;
  scores: Record<string, number>;
  shotTheMoon: boolean;
}

// 3. Spades
export interface SpadesState {
  hands: Record<string, PlayingCard[]>;
  bids: Record<string, number | null>;
  tricksWon: Record<string, number>;
  currentTrick: HeartsTrickCard[];
  leadSuit: StandardSuit | null;
  spadesBroken: boolean;
  scores: Record<string, number>;
  bags: Record<string, number>;
  turnPlayerId: string;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface SpadesAction {
  type: 'BID' | 'PLAY_CARD';
  bidAmount?: number;
  cardId?: string;
}
export interface SpadesResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 4. Indian Rummy
export interface CardMeld {
  type: 'PURE_SEQUENCE' | 'IMPURE_SEQUENCE' | 'SET';
  cards: PlayingCard[];
  isValid: boolean;
}
export interface RummyPlayerState {
  userId: string;
  hand: PlayingCard[];
  melds: CardMeld[];
  score: number;
  hasDeclared: boolean;
}
export interface RummyState {
  players: RummyPlayerState[];
  stockCount: number;
  discardPile: PlayingCard[];
  jokerCard: PlayingCard;
  turnPlayerId: string;
  hasDrawn: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface RummyAction {
  type: 'DRAW_STOCK' | 'DRAW_DISCARD' | 'DISCARD' | 'DECLARE';
  cardId?: string;
  melds?: PlayingCard[][];
}
export interface RummyResult {
  winnerId: string | null;
  playerScores: Record<string, number>;
}

// 5. Gin Rummy
export interface GinRummyState {
  hands: Record<string, PlayingCard[]>;
  stockCount: number;
  discardPile: PlayingCard[];
  turnPlayerId: string;
  hasDrawn: boolean;
  winnerId: string | null;
  knockedBy: string | null;
  isGin: boolean;
  turnExpiresAt: number;
}
export interface GinRummyAction {
  type: 'DRAW_STOCK' | 'DRAW_DISCARD' | 'DISCARD' | 'KNOCK';
  cardId?: string;
}
export interface GinRummyResult {
  winnerId: string | null;
  deadwoodScores: Record<string, number>;
  isGin: boolean;
  isUndercut: boolean;
}

// 6. Crazy Eights
export interface CrazyEightsState {
  hands: Record<string, PlayingCard[]>;
  stockCount: number;
  topCard: PlayingCard;
  currentSuit: StandardSuit;
  currentRank: number;
  turnPlayerId: string;
  drawCount: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface CrazyEightsAction {
  type: 'PLAY_CARD' | 'DRAW_CARD';
  cardId?: string;
  declaredSuit?: StandardSuit;
}
export interface CrazyEightsResult {
  winnerId: string | null;
}

// 7. Go Fish
export interface GoFishState {
  hands: Record<string, PlayingCard[]>;
  books: Record<string, number[]>;
  oceanCount: number;
  turnPlayerId: string;
  lastAskResult: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface GoFishAction {
  type: 'ASK_RANK';
  targetUserId: string;
  rank: number;
}
export interface GoFishResult {
  winnerId: string | null;
  bookCounts: Record<string, number>;
}

// 8. War
export interface WarState {
  decks: Record<string, PlayingCard[]>;
  wonPiles: Record<string, PlayingCard[]>;
  currentBattle: Record<string, PlayingCard | null>;
  warWarChest: PlayingCard[];
  isWar: boolean;
  turnPlayerId: string;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface WarAction {
  type: 'FLIP_CARD';
}
export interface WarResult {
  winnerId: string | null;
  finalCardCounts: Record<string, number>;
}

// 9. Durak
export interface DurakTableAttack {
  attackCard: PlayingCard;
  defendCard?: PlayingCard;
}
export interface DurakState {
  hands: Record<string, PlayingCard[]>;
  deckCount: number;
  trumpCard: PlayingCard;
  trumpSuit: StandardSuit;
  attackerId: string;
  defenderId: string;
  turnPlayerId: string;
  table: DurakTableAttack[];
  discardCount: number;
  winnerId: string | null;
  loserId: string | null;
  turnExpiresAt: number;
}
export interface DurakAction {
  type: 'ATTACK' | 'DEFEND' | 'TAKE' | 'PASS_ATTACK';
  cardId?: string;
  defendAgainstIndex?: number;
}
export interface DurakResult {
  durakUserId: string | null;
  winnerId: string | null;
}

// 10. President
export interface PresidentState {
  hands: Record<string, PlayingCard[]>;
  currentTrick: PlayingCard[];
  lastPlayUserId: string | null;
  passedPlayers: string[];
  activeCardRank: number | null;
  activeCardCount: number;
  turnPlayerId: string;
  finishOrder: string[];
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface PresidentAction {
  type: 'PLAY_CARDS' | 'PASS';
  cardIds?: string[];
}
export interface PresidentResult {
  winnerId: string | null;
  ranks: { userId: string; role: 'PRESIDENT' | 'VICE_PRESIDENT' | 'NEUTRAL' | 'SCUM' }[];
}

// 11. Blackjack (Recreational Play-Money Only)
export interface BlackjackHand {
  cards: PlayingCard[];
  value: number;
  isBust: boolean;
  isBlackjack: boolean;
  status: 'ACTIVE' | 'STAND' | 'BUST';
}
export interface BlackjackState {
  playerHands: Record<string, BlackjackHand>;
  dealerHand: BlackjackHand;
  bets: Record<string, number>;
  chips: Record<string, number>;
  turnPlayerId: string;
  isDealerTurn: boolean;
  isRoundComplete: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface BlackjackAction {
  type: 'BET' | 'HIT' | 'STAND' | 'DOUBLE_DOWN';
  amount?: number;
}
export interface BlackjackResult {
  winnerId: string | null;
  payouts: Record<string, number>;
}

// 12. Texas Hold’em Social Poker (Play-Money Only)
export type PokerStage = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
export interface PokerPlayerState {
  userId: string;
  chips: number;
  currentBet: number;
  holeCards: PlayingCard[];
  folded: boolean;
  isAllIn: boolean;
  handRank?: string;
}
export interface PokerState {
  players: PokerPlayerState[];
  communityCards: PlayingCard[];
  pot: number;
  currentBet: number;
  stage: PokerStage;
  dealerIndex: number;
  turnPlayerId: string;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface PokerAction {
  type: 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'FOLD' | 'ALL_IN';
  amount?: number;
}
export interface PokerResult {
  winnerId: string | null;
  winningHandRank?: string;
  potWon: number;
}

// ----------------------------------------------------------------------------
// Category D & E: Word, Quiz & Fast Puzzle Games (Phase 14)
// ----------------------------------------------------------------------------

// 1. Rock Paper Scissors
export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';
export interface RpsState {
  players: [string, string];
  currentRound: number;
  targetWins: number;
  choices: Record<string, RpsChoice | null>;
  roundScores: Record<string, number>;
  lastRoundWinner: string | 'TIE' | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface RpsAction {
  type: 'CHOICE';
  choice: RpsChoice;
}
export interface RpsResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 2. Reaction Speed Test
export interface ReactionState {
  players: string[];
  stage: 'WAITING' | 'READY' | 'TRIGGERED' | 'FINISHED';
  signalTriggerAt: number | null;
  reactionTimes: Record<string, number | null>; // in ms
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface ReactionAction {
  type: 'TAP';
  timestamp?: number;
}
export interface ReactionResult {
  winnerId: string | null;
  reactionTimes: Record<string, number>;
}

// 3. Number Guessing Duel
export interface NumberGuessState {
  targetNumber: number; // 1..100
  players: [string, string];
  turnPlayerId: string;
  attempts: Record<string, { guess: number; hint: 'HIGHER' | 'LOWER' | 'CORRECT' }[]>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface NumberGuessAction {
  type: 'GUESS';
  number: number;
}
export interface NumberGuessResult {
  winnerId: string | null;
  targetNumber: number;
  totalGuesses: Record<string, number>;
}

// 4. Speed Tap Rush
export interface SpeedTapTarget {
  id: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
}
export interface SpeedTapState {
  players: string[];
  tapCounts: Record<string, number>;
  activeTarget: SpeedTapTarget;
  timeRemainingSeconds: number;
  isComplete: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface SpeedTapAction {
  type: 'TAP_TARGET';
  targetId?: string;
}
export interface SpeedTapResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 5. Color Match Reflex (Stroop Effect)
export interface ColorMatchItem {
  word: string; // e.g. "RED"
  displayColor: string; // e.g. "#3B82F6" (Blue)
  isMatching: boolean;
}
export interface ColorMatchState {
  players: string[];
  currentRound: number;
  totalRounds: number;
  currentItem: ColorMatchItem;
  scores: Record<string, number>;
  playerAnswers: Record<string, boolean | null>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface ColorMatchAction {
  type: 'ANSWER';
  matches: boolean;
}
export interface ColorMatchResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 6. Speed Math Duel
export interface MathEquation {
  num1: number;
  num2: number;
  operator: '+' | '-' | '×';
  answer: number;
  options: number[]; // 4 choices
}
export interface MathBattleState {
  players: [string, string];
  currentRound: number;
  totalRounds: number;
  equation: MathEquation;
  scores: Record<string, number>;
  answered: Record<string, number | null>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface MathBattleAction {
  type: 'SUBMIT_ANSWER';
  answer: number;
}
export interface MathBattleResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 7. Quick Draw Western
export interface QuickDrawState {
  players: [string, string];
  stage: 'STANDBY' | 'DRAW_NOW' | 'RESOLVED';
  bellTime: number | null;
  drawTimes: Record<string, number | null>;
  earlyDrawFouls: Record<string, boolean>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface QuickDrawAction {
  type: 'DRAW';
}
export interface QuickDrawResult {
  winnerId: string | null;
  drawTimes: Record<string, number>;
}

// 8. Word Guess Duel (Wordle)
export type WordleLetterStatus = 'CORRECT' | 'PRESENT' | 'ABSENT';
export interface WordleGuess {
  word: string;
  feedback: WordleLetterStatus[];
}
export interface WordleState {
  targetWord: string;
  players: [string, string];
  guesses: Record<string, WordleGuess[]>;
  isFinished: Record<string, boolean>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface WordleAction {
  type: 'GUESS_WORD';
  word: string;
}
export interface WordleResult {
  winnerId: string | null;
  targetWord: string;
  attemptsUsed: Record<string, number>;
}

// 9. Hangman Duel
export interface HangmanState {
  secretWord: string;
  category: string;
  players: [string, string];
  guessedLetters: string[];
  wrongGuessesCount: number;
  maxWrongGuesses: number;
  turnPlayerId: string;
  winnerId: string | null;
  isWordGuessed: boolean;
  turnExpiresAt: number;
}
export interface HangmanAction {
  type: 'GUESS_LETTER' | 'SOLVE_WORD';
  letter?: string;
  word?: string;
}
export interface HangmanResult {
  winnerId: string | null;
  secretWord: string;
  isWon: boolean;
}

// 10. Memory Card Match
export interface MemoryCard {
  id: number;
  iconName: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: string;
}
export interface MemoryMatchState {
  cards: MemoryCard[];
  players: string[];
  turnPlayerId: string;
  flippedCardIds: number[];
  scores: Record<string, number>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface MemoryMatchAction {
  type: 'FLIP_CARD';
  cardId: number;
}
export interface MemoryMatchResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 11. Quiz Battle Arena
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}
export interface QuizBattleState {
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  players: string[];
  scores: Record<string, number>;
  playerAnswers: Record<string, number | null>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface QuizBattleAction {
  type: 'SELECT_OPTION';
  optionIndex: number;
}
export interface QuizBattleResult {
  winnerId: string | null;
  finalScores: Record<string, number>;
}

// 12. 2048 Versus Race
export interface Game2048State {
  playerBoards: Record<string, number[][]>; // 4x4 matrix
  scores: Record<string, number>;
  highestTiles: Record<string, number>;
  gameOver: Record<string, boolean>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface Game2048Action {
  type: 'MOVE';
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}
export interface Game2048Result {
  winnerId: string | null;
  finalScores: Record<string, number>;
  highestTiles: Record<string, number>;
}

// 13. Minesweeper Battle
export interface MinesweeperCell {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  isRevealed: boolean;
  isFlagged: boolean;
  flaggedBy?: string;
  revealedBy?: string;
}
export interface MinesweeperState {
  grid: MinesweeperCell[][];
  players: [string, string];
  turnPlayerId: string;
  scores: Record<string, number>;
  mineCount: number;
  remainingMines: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface MinesweeperAction {
  type: 'REVEAL' | 'FLAG';
  row: number;
  col: number;
}
export interface MinesweeperResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 14. Pattern Memory Matrix
export interface PatternMatchState {
  pattern: number[]; // 0..8 indices on 3x3 grid
  currentStep: number;
  players: string[];
  turnPlayerId: string;
  playerInputs: number[];
  round: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface PatternMatchAction {
  type: 'PRESS_PAD';
  index: number;
}
export interface PatternMatchResult {
  winnerId: string | null;
  maxRounds: Record<string, number>;
}

// 15. Code Breaker Mastermind
export interface MastermindGuess {
  guess: string[]; // 4 colors
  exactHits: number; // black pegs
  colorHits: number; // white pegs
}
export interface MastermindState {
  secretCode: string[]; // 4 colors
  players: [string, string];
  guesses: Record<string, MastermindGuess[]>;
  maxAttempts: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface MastermindAction {
  type: 'SUBMIT_GUESS';
  colors: string[];
}
export interface MastermindResult {
  winnerId: string | null;
  secretCode: string[];
  attempts: Record<string, number>;
}

// 16. Anagram Scramble
export interface WordScrambleState {
  originalWord: string;
  scrambledWord: string;
  players: string[];
  solvedBy: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface WordScrambleAction {
  type: 'SUBMIT_WORD';
  word: string;
}
export interface WordScrambleResult {
  winnerId: string | null;
  originalWord: string;
}

// 17. Mobile Typing Race
export interface TypingRaceState {
  promptText: string;
  players: string[];
  progress: Record<string, number>; // character index
  wpm: Record<string, number>;
  finishedOrder: string[];
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface TypingRaceAction {
  type: 'TYPE_UPDATE';
  typedText: string;
}
export interface TypingRaceResult {
  winnerId: string | null;
  wpmScores: Record<string, number>;
}

// ============================================================================
// Phase 15: Party & Social Games (Category F)
// ============================================================================

// 1. Would You Rather?
export interface WouldYouRatherDilemma {
  id: string;
  optionA: string;
  optionB: string;
  globalVotesA?: number;
  globalVotesB?: number;
}
export interface WouldYouRatherState {
  players: string[];
  currentRound: number;
  totalRounds: number;
  currentDilemma: WouldYouRatherDilemma;
  votes: Record<string, 'A' | 'B' | null>;
  scores: Record<string, number>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface WouldYouRatherAction {
  type: 'VOTE';
  choice: 'A' | 'B';
}
export interface WouldYouRatherResult {
  winnerId: string | null;
  finalScores: Record<string, number>;
}

// 2. Truth or Dare Social
export interface TruthOrDareItem {
  id: string;
  type: 'TRUTH' | 'DARE';
  prompt: string;
}
export interface TruthOrDareState {
  players: string[];
  turnPlayerId: string;
  selectedType: 'TRUTH' | 'DARE' | null;
  currentPrompt: string | null;
  isCompleted: boolean | null;
  scores: Record<string, number>;
  round: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface TruthOrDareAction {
  type: 'CHOOSE_CATEGORY' | 'VERIFY_COMPLETION';
  category?: 'TRUTH' | 'DARE';
  completed?: boolean;
}
export interface TruthOrDareResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 3. Charades Party
export interface CharadesState {
  players: string[];
  actorId: string;
  secretWord: string;
  category: string;
  guesses: { userId: string; text: string; timestamp: number }[];
  isSolved: boolean;
  scores: Record<string, number>;
  round: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface CharadesAction {
  type: 'GUESS' | 'CONFIRM_SOLVE';
  guess?: string;
}
export interface CharadesResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 4. Pixel Reveal Guess
export interface GuessPictureState {
  players: string[];
  targetWord: string;
  category: string;
  clueHint: string;
  pixelationLevel: number; // 10 down to 1
  scores: Record<string, number>;
  solvedPlayerId: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface GuessPictureAction {
  type: 'SUBMIT_GUESS';
  guess: string;
}
export interface GuessPictureResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 5. Taboo Word Clue
export interface TabooCard {
  targetWord: string;
  tabooWords: string[];
}
export interface GuessWordState {
  players: string[];
  clueGiverId: string;
  currentCard: TabooCard;
  cluesGiven: string[];
  guesses: { userId: string; guess: string }[];
  penaltyCount: number;
  isGuessed: boolean;
  scores: Record<string, number>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface GuessWordAction {
  type: 'GIVE_CLUE' | 'SUBMIT_GUESS';
  clue?: string;
  guess?: string;
}
export interface GuessWordResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 6. Name That Tune
export interface SongRiddle {
  title: string;
  artist: string;
  snippetLyrics: string;
  options: string[];
}
export interface GuessSongState {
  players: string[];
  currentRiddle: SongRiddle;
  answers: Record<string, string | null>;
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface GuessSongAction {
  type: 'ANSWER_SONG';
  selectedTitle: string;
}
export interface GuessSongResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 7. Who Am I?
export interface WhoAmIQuestion {
  askerId: string;
  question: string;
  answers: Record<string, boolean>;
}
export interface WhoAmIState {
  players: string[];
  targetIdentity: Record<string, string>;
  turnPlayerId: string;
  questionHistory: WhoAmIQuestion[];
  solved: Record<string, boolean>;
  scores: Record<string, number>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface WhoAmIAction {
  type: 'ASK_QUESTION' | 'ANSWER_QUESTION' | 'GUESS_IDENTITY';
  question?: string;
  yes?: boolean;
  identity?: string;
}
export interface WhoAmIResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 8. The Imposter
export interface ImposterState {
  players: string[];
  secretLocation: string;
  imposterId: string;
  phase: 'DISCUSSION' | 'VOTING' | 'REVEAL';
  clues: { userId: string; clueText: string }[];
  votes: Record<string, string | null>;
  accusedId: string | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface ImposterAction {
  type: 'SUBMIT_CLUE' | 'VOTE_IMPOSTER' | 'GUESS_LOCATION';
  clue?: string;
  targetUserId?: string;
  location?: string;
}
export interface ImposterResult {
  winnerId: string | null;
  imposterWon: boolean;
}

// 9. Mafia / Werewolf
export type MafiaRole = 'MAFIA' | 'DETECTIVE' | 'DOCTOR' | 'VILLAGER';
export interface MafiaState {
  players: string[];
  phase: 'NIGHT' | 'DAY_DISCUSSION' | 'DAY_VOTING';
  dayNumber: number;
  playerRoles: Record<string, MafiaRole>;
  alivePlayers: string[];
  nightTargetMafia: string | null;
  nightTargetDoctor: string | null;
  nightCheckedDetective: { targetId: string; isMafia: boolean } | null;
  dayVotes: Record<string, string | null>;
  eliminatedLastNight: string | null;
  eliminatedLastDay: string | null;
  winnerSide: 'MAFIA' | 'VILLAGERS' | null;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface MafiaAction {
  type: 'MAFIA_KILL' | 'DOCTOR_SAVE' | 'DETECTIVE_INVESTIGATE' | 'DAY_VOTE';
  targetUserId: string;
}
export interface MafiaResult {
  winnerId: string | null;
  winnerSide: 'MAFIA' | 'VILLAGERS';
}

// 10. Draw & Guess Live
export interface DrawStrokePoint {
  x: number;
  y: number;
  color: string;
  width: number;
  isStart?: boolean;
}
export interface DrawAndGuessState {
  players: string[];
  drawerId: string;
  secretPrompt: string;
  strokes: DrawStrokePoint[];
  chatGuesses: { userId: string; guess: string; isCorrect: boolean; timestamp: number }[];
  solvedPlayerIds: string[];
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  turnExpiresAt: number;
  winnerId: string | null;
}
export interface DrawAndGuessAction {
  type: 'DRAW_STROKE' | 'CLEAR_CANVAS' | 'SUBMIT_GUESS';
  point?: DrawStrokePoint;
  guess?: string;
}
export interface DrawAndGuessResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 11. Pictionary Duel
export interface PictionaryState {
  players: string[];
  drawerId: string;
  targetWord: string;
  category: string;
  strokes: DrawStrokePoint[];
  guesses: { userId: string; guess: string }[];
  isSolved: boolean;
  scores: Record<string, number>;
  turnExpiresAt: number;
  winnerId: string | null;
}
export interface PictionaryAction {
  type: 'DRAW_STROKE' | 'CLEAR_CANVAS' | 'SUBMIT_GUESS';
  point?: DrawStrokePoint;
  guess?: string;
}
export interface PictionaryResult {
  winnerId: string | null;
  scores: Record<string, number>;
}

// 12. Never Have I Ever
export interface NeverHaveIEverState {
  players: string[];
  currentPrompt: string;
  lives: Record<string, number>; // 10 fingers/lives
  confessions: Record<string, boolean | null>;
  round: number;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface NeverHaveIEverAction {
  type: 'CONFESS';
  iHaveDoneThis: boolean;
}
export interface NeverHaveIEverResult {
  winnerId: string | null;
  finalLives: Record<string, number>;
}

// 13. This or That
export interface ThisOrThatPair {
  id: string;
  optionA: string;
  optionB: string;
}
export interface ThisOrThatState {
  players: string[];
  currentPair: ThisOrThatPair;
  round: number;
  totalRounds: number;
  selections: Record<string, 'A' | 'B' | null>;
  matchScores: Record<string, number>;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface ThisOrThatAction {
  type: 'CHOOSE';
  choice: 'A' | 'B';
}
export interface ThisOrThatResult {
  winnerId: string | null;
  matchPercentage: number;
}

// 14. 2 Truths and a Lie
export interface TwoTruthsAndALieState {
  players: string[];
  speakerId: string;
  statements: string[];
  lieIndex: number;
  votes: Record<string, number | null>;
  scores: Record<string, number>;
  isRevealed: boolean;
  winnerId: string | null;
  turnExpiresAt: number;
}
export interface TwoTruthsAndALieAction {
  type: 'SUBMIT_STATEMENTS' | 'VOTE_LIE';
  statements?: [string, string, string];
  lieIndex?: number;
  statementIndex?: number;
}
export interface TwoTruthsAndALieResult {
  winnerId: string | null;
  scores: Record<string, number>;
}






