import { GameEngine, GamePlayerMeta } from './game.definition';
import { TicTacToeEngine } from './tictactoe/tictactoe.engine';
import { LudoEngine } from './ludo/ludo.engine';
import { ConnectFourEngine } from './board/connectfour.engine';
import { ReversiEngine } from './board/reversi.engine';
import { GomokuEngine } from './board/gomoku.engine';
import { CheckersEngine } from './board/checkers.engine';
import { ChessEngine } from './board/chess.engine';
import { CarromEngine } from './board2/carrom.engine';
import { SnakesAndLaddersEngine } from './board2/snakesandladders.engine';
import { BattleshipEngine } from './board2/battleship.engine';
import { DominoesEngine } from './board2/dominoes.engine';
import { BackgammonEngine } from './board2/backgammon.engine';
import { MancalaEngine } from './board2/mancala.engine';
import { ChineseCheckersEngine } from './board2/chinesecheckers.engine';
import { Pool8BallEngine } from './casual/pool8ball.engine';
import { MiniGolfEngine } from './casual/minigolf.engine';
import { AirHockeyEngine } from './casual/airhockey.engine';
import { DartsEngine } from './casual/darts.engine';
import { BowlingEngine } from './casual/bowling.engine';
import { TableTennisEngine } from './casual/tabletennis.engine';
import { UnoEngine } from './cards/uno.engine';
import { HeartsEngine } from './cards/hearts.engine';
import { SpadesEngine } from './cards/spades.engine';
import { RummyEngine } from './cards/rummy.engine';
import { GinRummyEngine } from './cards/ginrummy.engine';
import { CrazyEightsEngine } from './cards/crazyeights.engine';
import { GoFishEngine } from './cards/gofish.engine';
import { WarEngine } from './cards/war.engine';
import { DurakEngine } from './cards/durak.engine';
import { PresidentEngine } from './cards/president.engine';
import { BlackjackEngine } from './cards/blackjack.engine';
import { PokerEngine } from './cards/poker.engine';
import { RpsEngine } from './puzzle/rps.engine';
import { ReactionEngine } from './puzzle/reaction.engine';
import { NumberGuessEngine } from './puzzle/numberguess.engine';
import { SpeedTapEngine } from './puzzle/speedtap.engine';
import { ColorMatchEngine } from './puzzle/colormatch.engine';
import { MathBattleEngine } from './puzzle/math.engine';
import { QuickDrawEngine } from './puzzle/quickdraw.engine';
import { WordleEngine } from './puzzle/wordle.engine';
import { HangmanEngine } from './puzzle/hangman.engine';
import { MemoryMatchEngine } from './puzzle/memory.engine';
import { QuizBattleEngine } from './puzzle/quiz.engine';
import { Game2048Engine } from './puzzle/game2048.engine';
import { MinesweeperEngine } from './puzzle/minesweeper.engine';
import { PatternMatchEngine } from './puzzle/pattern.engine';
import { MastermindEngine } from './puzzle/mastermind.engine';
import { WordScrambleEngine } from './puzzle/scramble.engine';
import { TypingRaceEngine } from './puzzle/typing.engine';
import {
  WouldYouRatherEngine,
  TruthOrDareEngine,
  CharadesEngine,
  GuessPictureEngine,
  GuessWordEngine,
  GuessSongEngine,
  WhoAmIEngine,
  ImposterEngine,
  MafiaEngine,
  DrawAndGuessEngine,
  PictionaryEngine,
  NeverHaveIEverEngine,
  ThisOrThatEngine,
  TwoTruthsAndALieEngine,
} from './party';
import { prisma } from '../database/prisma';
import { GameType } from '../../../shared/game-types';
import { AchievementsService } from './achievements.service';

function emitRoom(roomCode: string, event: string, payload: any): void {
  try {
    const { emitToRoom } = require('../sockets/socket.server');
    if (typeof emitToRoom === 'function') {
      emitToRoom(roomCode, event, payload);
    }
  } catch (err) {
    console.error(`[MatchManager] emitRoom error:`, err);
  }
}

function emitUser(userId: string, event: string, payload: any): void {
  try {
    const { emitToUser } = require('../sockets/socket.server');
    if (typeof emitToUser === 'function') {
      emitToUser(userId, event, payload);
    }
  } catch (err) {
    console.error(`[MatchManager] emitUser error:`, err);
  }
}

export interface ActiveMatch {
  matchId: string;
  roomCode: string;
  gameType: GameType;
  engine: GameEngine<any, any, any>;
  state: any;
  players: GamePlayerMeta[];
  sequenceNumber: number;
  round: number;
  scores: Record<string, number>;
  rematchOffers: Set<string>;
  turnTimer: NodeJS.Timeout | null;
  startedAt: Date;
  lastActionAt: Date;
  isConcluded: boolean;
  gameMode?: 'SOLO' | 'MULTIPLAYER';
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  aiPlayerId?: string;
  aiPlayerName?: string;
}

export class MatchManager {
  private static activeMatches = new Map<string, ActiveMatch>(); // roomCode -> ActiveMatch
  private static engines = new Map<string, () => GameEngine<any, any, any>>();

  static {
    // Register available game engines
    this.registerEngine('TICTACTOE', () => new TicTacToeEngine());
    this.registerEngine('LUDO', () => new LudoEngine());
    this.registerEngine('CONNECT_FOUR', () => new ConnectFourEngine());
    this.registerEngine('REVERSI', () => new ReversiEngine());
    this.registerEngine('GOMOKU', () => new GomokuEngine());
    this.registerEngine('CHECKERS', () => new CheckersEngine());
    this.registerEngine('CHESS', () => new ChessEngine());
    this.registerEngine('CARROM', () => new CarromEngine());
    this.registerEngine('SNAKES_AND_LADDERS', () => new SnakesAndLaddersEngine());
    this.registerEngine('BATTLESHIP', () => new BattleshipEngine());
    this.registerEngine('DOMINOES', () => new DominoesEngine());
    this.registerEngine('BACKGAMMON', () => new BackgammonEngine());
    this.registerEngine('MANCALA', () => new MancalaEngine());
    this.registerEngine('CHINESE_CHECKERS', () => new ChineseCheckersEngine());
    this.registerEngine('POOL_8_BALL', () => new Pool8BallEngine());
    this.registerEngine('MINI_GOLF', () => new MiniGolfEngine());
    this.registerEngine('AIR_HOCKEY', () => new AirHockeyEngine());
    this.registerEngine('DARTS', () => new DartsEngine());
    this.registerEngine('BOWLING', () => new BowlingEngine());
    this.registerEngine('TABLE_TENNIS', () => new TableTennisEngine());
    this.registerEngine('UNO_STYLE', () => new UnoEngine());
    this.registerEngine('HEARTS', () => new HeartsEngine());
    this.registerEngine('SPADES', () => new SpadesEngine());
    this.registerEngine('RUMMY', () => new RummyEngine());
    this.registerEngine('GIN_RUMMY', () => new GinRummyEngine());
    this.registerEngine('CRAZY_EIGHTS', () => new CrazyEightsEngine());
    this.registerEngine('GO_FISH', () => new GoFishEngine());
    this.registerEngine('WAR', () => new WarEngine());
    this.registerEngine('DURAK', () => new DurakEngine());
    this.registerEngine('PRESIDENT', () => new PresidentEngine());
    this.registerEngine('BLACKJACK', () => new BlackjackEngine());
    this.registerEngine('POKER', () => new PokerEngine());
    this.registerEngine('ROCK_PAPER_SCISSORS', () => new RpsEngine());
    this.registerEngine('REACTION_TEST', () => new ReactionEngine());
    this.registerEngine('NUMBER_GUESS', () => new NumberGuessEngine());
    this.registerEngine('SPEED_TAP', () => new SpeedTapEngine());
    this.registerEngine('COLOR_MATCH', () => new ColorMatchEngine());
    this.registerEngine('MATH_BATTLE', () => new MathBattleEngine());
    this.registerEngine('QUICK_DRAW', () => new QuickDrawEngine());
    this.registerEngine('WORDLE_DUEL', () => new WordleEngine());
    this.registerEngine('HANGMAN', () => new HangmanEngine());
    this.registerEngine('MEMORY_MATCH', () => new MemoryMatchEngine());
    this.registerEngine('QUIZ_BATTLE', () => new QuizBattleEngine());
    this.registerEngine('2048_MULTIPLAYER', () => new Game2048Engine());
    this.registerEngine('MINESWEEPER_DUEL', () => new MinesweeperEngine());
    this.registerEngine('PATTERN_MATCH', () => new PatternMatchEngine());
    this.registerEngine('MASTERMIND', () => new MastermindEngine());
    this.registerEngine('WORD_SCRAMBLE', () => new WordScrambleEngine());
    this.registerEngine('TYPING_RACE', () => new TypingRaceEngine());
    this.registerEngine('WOULD_YOU_RATHER', () => new WouldYouRatherEngine());
    this.registerEngine('TRUTH_OR_DARE', () => new TruthOrDareEngine());
    this.registerEngine('CHARADES', () => new CharadesEngine());
    this.registerEngine('GUESS_PICTURE', () => new GuessPictureEngine());
    this.registerEngine('GUESS_WORD', () => new GuessWordEngine());
    this.registerEngine('GUESS_SONG', () => new GuessSongEngine());
    this.registerEngine('WHO_AM_I', () => new WhoAmIEngine());
    this.registerEngine('IMPOSTER', () => new ImposterEngine());
    this.registerEngine('MAFIA', () => new MafiaEngine());
    this.registerEngine('DRAW_AND_GUESS', () => new DrawAndGuessEngine());
    this.registerEngine('PICTIONARY', () => new PictionaryEngine());
    this.registerEngine('NEVER_HAVE_I_EVER', () => new NeverHaveIEverEngine());
    this.registerEngine('THIS_OR_THAT', () => new ThisOrThatEngine());
    this.registerEngine('TWO_TRUTHS_AND_A_LIE', () => new TwoTruthsAndALieEngine());
  }

  static registerEngine(gameType: string, factory: () => GameEngine<any, any, any>) {
    this.engines.set(gameType.toUpperCase(), factory);
  }

  /**
   * Initializes and starts a live authoritative game match
   */
  static startMatch(
    roomCode: string,
    gameType: GameType,
    players: GamePlayerMeta[],
    options?: {
      gameMode?: 'SOLO' | 'MULTIPLAYER';
      aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      aiPlayerId?: string;
      aiPlayerName?: string;
    }
  ): ActiveMatch {
    const normalizedCode = roomCode.trim().toUpperCase();

    // Clear any existing match in the same room
    this.clearMatch(normalizedCode);

    const factory = this.engines.get(gameType.toUpperCase());
    if (!factory) {
      throw new Error(`No game engine registered for game type "${gameType}"`);
    }

    const engine = factory();
    const initialState = engine.initialize(players);

    const initialScores: Record<string, number> = {};
    players.forEach((p) => {
      initialScores[p.userId] = 0;
    });

    const match: ActiveMatch = {
      matchId: `${normalizedCode}_${Date.now()}`,
      roomCode: normalizedCode,
      gameType,
      engine,
      state: initialState,
      players,
      sequenceNumber: 1,
      round: 1,
      scores: initialScores,
      rematchOffers: new Set<string>(),
      turnTimer: null,
      startedAt: new Date(),
      lastActionAt: new Date(),
      isConcluded: false,
      gameMode: options?.gameMode || 'MULTIPLAYER',
      aiDifficulty: options?.aiDifficulty,
      aiPlayerId: options?.aiPlayerId,
      aiPlayerName: options?.aiPlayerName,
    };

    this.activeMatches.set(normalizedCode, match);

    // Broadcast match start and initial state
    emitRoom(normalizedCode, 'game:started', {
      matchId: match.matchId,
      roomCode: normalizedCode,
      gameType,
      players: match.players,
      round: match.round,
      scores: match.scores,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
    });

    emitRoom(normalizedCode, 'game:state', {
      roomCode: normalizedCode,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
      round: match.round,
      scores: match.scores,
    });

    this.scheduleTurnTimer(normalizedCode);
    return match;
  }

  /**
   * Executes a validated player action
   */
  static async handleAction(roomCode: string, userId: string, action: any) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match) {
      throw new Error(`No active match found in room "${normalizedCode}"`);
    }

    if (match.isConcluded) {
      throw new Error('This match has already ended');
    }

    // Security Check: Verify that user is a registered participant in this match
    const isParticipant = match.players.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new Error('Unauthorized: You are not an active participant in this match');
    }

    // Clear active turn timer
    if (match.turnTimer) {
      clearTimeout(match.turnTimer);
      match.turnTimer = null;
    }

    // Apply action through engine
    const result = match.engine.applyAction(match.state, userId, action);
    if (!result.success || !result.state) {
      throw new Error(result.error || 'Failed to apply game action');
    }

    match.state = result.state;
    match.sequenceNumber += 1;
    match.lastActionAt = new Date();

    // Broadcast updated state to room
    emitRoom(normalizedCode, 'game:state', {
      roomCode: normalizedCode,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
      round: match.round,
      scores: match.scores,
      lastAction: { userId, action },
      events: result.events || [],
    });

    // Check for win/draw
    const outcome = match.engine.checkWinner(match.state);
    if (outcome) {
      await this.handleMatchConcluded(match, outcome);
    } else {
      // Schedule timer for next player's turn
      this.scheduleTurnTimer(normalizedCode);

      // Trigger AI turn if this is a Solo match
      if (match.gameMode === 'SOLO') {
        const { SoloManager } = require('../ai/solo.manager');
        SoloManager.onPlayerActionCompleted(match);
      }
    }

    return {
      success: true,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
      outcome,
    };
  }

  /**
   * Internal scheduler for turn timeout countdowns
   */
  private static scheduleTurnTimer(roomCode: string) {
    const match = this.activeMatches.get(roomCode);
    if (!match || match.isConcluded) return;

    if (match.turnTimer) {
      clearTimeout(match.turnTimer);
      match.turnTimer = null;
    }

    // Default turn timeout 15 seconds
    const timeoutDurationMs = (match.engine.definition.turnTimeSeconds || 15) * 1000;

    match.turnTimer = setTimeout(async () => {
      try {
        await MatchManager.handleTurnTimeout(roomCode);
      } catch (err) {
        console.error(`[MatchManager] Error on turn timeout in room ${roomCode}:`, err);
      }
    }, timeoutDurationMs);
  }

  /**
   * Handles turn timeout expiration by auto-playing
   */
  static async handleTurnTimeout(roomCode: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match || match.isConcluded) return;

    if (match.engine.handleTurnTimeout) {
      const result = match.engine.handleTurnTimeout(match.state);
      if (result.success && result.state) {
        match.state = result.state;
        match.sequenceNumber += 1;
        match.lastActionAt = new Date();

        emitRoom(normalizedCode, 'game:state', {
          roomCode: normalizedCode,
          sequenceNumber: match.sequenceNumber,
          state: match.state,
          round: match.round,
          scores: match.scores,
          isAutoMove: true,
        });

        const outcome = match.engine.checkWinner(match.state);
        if (outcome) {
          await this.handleMatchConcluded(match, outcome);
        } else {
          this.scheduleTurnTimer(normalizedCode);
        }
      }
    }
  }

  /**
   * Concludes match, persists results, and updates player statistics
   */
  private static async handleMatchConcluded(match: ActiveMatch, outcome: any) {
    match.isConcluded = true;
    if (match.turnTimer) {
      clearTimeout(match.turnTimer);
      match.turnTimer = null;
    }

    const { winnerId, isDraw, winningLine } = outcome;

    if (winnerId) {
      match.scores[winnerId] = (match.scores[winnerId] || 0) + 1;
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - match.startedAt.getTime()) / 1000)
    );

    // Emit game:over to all clients in room
    emitRoom(match.roomCode, 'game:over', {
      roomCode: match.roomCode,
      winnerId: winnerId || null,
      winnerIds: outcome.winnerIds || (winnerId ? [winnerId] : []),
      rankings: outcome.rankings || null,
      isDraw: !!isDraw,
      winningLine: winningLine || null,
      scores: match.scores,
      round: match.round,
      durationSeconds,
    });

    // Asynchronously record match persistence to database
    try {
      let validWinnerId: string | null = null;
      if (winnerId) {
        const userExists = await prisma.user.findUnique({
          where: { id: winnerId },
          select: { id: true },
        }).catch(() => null);
        if (userExists) validWinnerId = winnerId;
      }

      await prisma.gameResult.create({
        data: {
          gameType: match.gameType as any,
          gameMode: (match.gameMode || 'MULTIPLAYER') as any,
          winnerId: validWinnerId,
          durationSeconds,
          playersData: match.players as any,
          finalState: match.state as any,
          aiDifficulty: (match.aiDifficulty as any) || null,
          aiPlayerName: match.aiPlayerName || null,
        },
      });

      // Update GameStatistics for each player
      for (const player of match.players) {
        if (player.userId.startsWith('BOT_')) continue; // Skip bot personas
        const userExists = await prisma.user.findUnique({
          where: { id: player.userId },
          select: { id: true },
        }).catch(() => null);
        if (!userExists) continue;

        const isWin = player.userId === winnerId;
        const isLoss = !isDraw && !isWin;

        if (match.gameMode === 'SOLO') {
          // Record Solo stats separately
          await prisma.gameStatistics.upsert({
            where: {
              userId_gameType: {
                userId: player.userId,
                gameType: match.gameType as any,
              },
            },
            update: {
              soloMatchesPlayed: { increment: 1 },
              soloMatchesWon: isWin ? { increment: 1 } : undefined,
            },
            create: {
              userId: player.userId,
              gameType: match.gameType as any,
              soloMatchesPlayed: 1,
              soloMatchesWon: isWin ? 1 : 0,
            },
          });
        } else {
          // Record Multiplayer stats
          const existing = await prisma.gameStatistics.findUnique({
            where: {
              userId_gameType: {
                userId: player.userId,
                gameType: match.gameType as any,
              },
            },
          });

          const currentStreak = isWin ? (existing?.currentStreak || 0) + 1 : 0;
          const highestStreak = Math.max(
            existing?.highestStreak || 0,
            currentStreak
          );

          await prisma.gameStatistics.upsert({
            where: {
              userId_gameType: {
                userId: player.userId,
                gameType: match.gameType as any,
              },
            },
            update: {
              matchesPlayed: { increment: 1 },
              matchesWon: isWin ? { increment: 1 } : undefined,
              matchesLost: isLoss ? { increment: 1 } : undefined,
              currentStreak,
              highestStreak,
            },
            create: {
              userId: player.userId,
              gameType: match.gameType as any,
              matchesPlayed: 1,
              matchesWon: isWin ? 1 : 0,
              matchesLost: isLoss ? 1 : 0,
              currentStreak,
              highestStreak,
            },
          });
        }

        // Evaluate and award achievements for this player
        await AchievementsService.evaluateAndAwardAchievements(
          player.userId,
          match.gameType,
          isWin
        ).catch((err) => {
          console.error(`[MatchManager] Failed to evaluate achievements for user ${player.userId}:`, err);
        });
      }
    } catch (err) {
      console.error('[MatchManager] Failed to persist game results:', err);
    }
  }

  /**
   * Request instant rematch
   */
  static requestRematch(roomCode: string, userId: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match) {
      throw new Error(`No match found in room "${normalizedCode}"`);
    }

    match.rematchOffers.add(userId);

    emitRoom(normalizedCode, 'game:rematch_offered', {
      roomCode: normalizedCode,
      offeredByUserId: userId,
      pendingCount: match.rematchOffers.size,
      requiredCount: match.players.length,
    });

    // Check if all players agreed to rematch
    if (match.rematchOffers.size >= match.players.length) {
      this.startRematchRound(match);
    }

    return {
      rematchOffered: true,
      pendingCount: match.rematchOffers.size,
    };
  }

  /**
   * Responds to a rematch offer
   */
  static respondRematch(roomCode: string, userId: string, accept: boolean) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match) {
      throw new Error(`No match found in room "${normalizedCode}"`);
    }

    if (!accept) {
      match.rematchOffers.clear();
      emitRoom(normalizedCode, 'game:rematch_declined', {
        roomCode: normalizedCode,
        declinedByUserId: userId,
      });
      return { accepted: false };
    }

    return this.requestRematch(roomCode, userId);
  }

  /**
   * Starts a new round of rematch with inverted player marks for fairness
   */
  private static startRematchRound(match: ActiveMatch) {
    match.rematchOffers.clear();
    match.isConcluded = false;
    match.round += 1;
    match.startedAt = new Date();
    match.lastActionAt = new Date();

    // Rotate players for fairness so first turn passes to the next player
    if (match.players.length > 1) {
      match.players = [...match.players.slice(1), match.players[0]];
    }

    match.state = match.engine.initialize(match.players);
    match.sequenceNumber += 1;

    emitRoom(match.roomCode, 'game:rematch_started', {
      roomCode: match.roomCode,
      round: match.round,
      players: match.players,
      scores: match.scores,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
    });

    emitRoom(match.roomCode, 'game:state', {
      roomCode: match.roomCode,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
      round: match.round,
      scores: match.scores,
    });

    this.scheduleTurnTimer(match.roomCode);
  }

  /**
   * Forfeits match if a player leaves or abandons
   */
  static async handleForfeit(roomCode: string, forfeitingUserId: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match || match.isConcluded) return;

    const remainingPlayer = match.players.find((p) => p.userId !== forfeitingUserId);
    const winnerId = remainingPlayer?.userId || null;

    await this.handleMatchConcluded(match, {
      winnerId,
      isDraw: false,
      winningLine: null,
    });
  }

  /**
   * Reconnection handling
   */
  static handlePlayerReconnect(roomCode: string, userId: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match) return;

    if (match.engine.handlePlayerReconnect) {
      match.state = match.engine.handlePlayerReconnect(match.state, userId);
    }

    // Send full state to reconnected user
    emitUser(userId, 'game:state', {
      roomCode: normalizedCode,
      sequenceNumber: match.sequenceNumber,
      state: match.state,
      round: match.round,
      scores: match.scores,
      isReconnect: true,
    });

    emitRoom(normalizedCode, 'game:player_reconnected', {
      roomCode: normalizedCode,
      userId,
    });

    if (!match.isConcluded && !match.turnTimer) {
      this.scheduleTurnTimer(normalizedCode);
    }
  }

  /**
   * Disconnection handling
   */
  static handlePlayerDisconnect(roomCode: string, userId: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);

    if (!match) return;

    if (match.engine.handlePlayerDisconnect) {
      match.state = match.engine.handlePlayerDisconnect(match.state, userId);
    }

    emitRoom(normalizedCode, 'game:player_disconnected', {
      roomCode: normalizedCode,
      userId,
    });
  }

  /**
   * Retrieves active match details
   */
  static getMatch(roomCode: string): ActiveMatch | null {
    return this.activeMatches.get(roomCode.trim().toUpperCase()) || null;
  }

  /**
   * Cleans up match in room
   */
  static clearMatch(roomCode: string) {
    const normalizedCode = roomCode.trim().toUpperCase();
    const match = this.activeMatches.get(normalizedCode);
    if (match) {
      if (match.turnTimer) {
        clearTimeout(match.turnTimer);
        match.turnTimer = null;
      }
      this.activeMatches.delete(normalizedCode);
    }
  }
}
