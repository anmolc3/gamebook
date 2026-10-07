import { prisma } from '../database/prisma';
import { emitToUser } from '../sockets/socket.server';
import { PushNotificationService } from '../notifications/push.service';

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  iconName: string;
}

export const PLATFORM_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: 'FIRST_WIN',
    title: 'First Victory',
    description: 'Win your first multiplayer match in any game.',
    iconName: 'TrophyIcon',
  },
  {
    key: 'STREAK_3',
    title: 'Hot Streak',
    description: 'Achieve a winning streak of 3 consecutive matches.',
    iconName: 'FlameIcon',
  },
  {
    key: 'STREAK_5',
    title: 'Unstoppable',
    description: 'Achieve a winning streak of 5 consecutive matches.',
    iconName: 'ZapIcon',
  },
  {
    key: 'GAMES_10',
    title: 'Veteran Challenger',
    description: 'Complete 10 multiplayer matches.',
    iconName: 'TargetIcon',
  },
  {
    key: 'GAMES_50',
    title: 'Arena Legend',
    description: 'Complete 50 multiplayer matches.',
    iconName: 'CrownIcon',
  },
  {
    key: 'BOARD_MASTER',
    title: 'Grandmaster Mind',
    description: 'Win 5 classic board game matches.',
    iconName: 'ChessKnightIcon',
  },
  {
    key: 'CARD_SHARK',
    title: 'Card Shark',
    description: 'Win 5 card table matches.',
    iconName: 'SpadeIcon',
  },
  {
    key: 'PUZZLE_GENIUS',
    title: 'Puzzle Genius',
    description: 'Win 5 puzzle, quiz, or word duel matches.',
    iconName: 'StarIcon',
  },
  {
    key: 'PARTY_STAR',
    title: 'Life of the Party',
    description: 'Participate in 5 party and social games.',
    iconName: 'UsersIcon',
  },
  {
    key: 'SPEED_DEMON',
    title: 'Speed Demon',
    description: 'Win a reflex or fast competitive duel.',
    iconName: 'ClockIcon',
  },
];

const BOARD_GAMES = new Set([
  'TICTACTOE', 'LUDO', 'CHESS', 'CHECKERS', 'CONNECT_FOUR', 'CARROM',
  'SNAKES_AND_LADDERS', 'BACKGAMMON', 'REVERSI', 'GOMOKU', 'BATTLESHIP',
  'DOMINOES', 'MANCALA', 'CHINESE_CHECKERS',
]);

const CARD_GAMES = new Set([
  'UNO_STYLE', 'HEARTS', 'SPADES', 'RUMMY', 'GIN_RUMMY', 'CRAZY_EIGHTS',
  'GO_FISH', 'WAR', 'DURAK', 'PRESIDENT', 'BLACKJACK', 'POKER', 'CARDS',
]);

const PUZZLE_GAMES = new Set([
  'WORDLE_DUEL', 'HANGMAN', 'MEMORY_MATCH', 'QUIZ_BATTLE', 'TRIVIA',
  'WORD_BATTLE', 'WORD_SEARCH', 'TWENTY_FORTY_EIGHT', 'MINESWEEPER_DUEL',
  'CROSSWORD_BATTLE', 'SEQUENCE', 'MASTERMIND', 'PATTERN_MATCH',
  'PUZZLE_DUEL', 'SUDOKU_BATTLE',
]);

const PARTY_GAMES = new Set([
  'WOULD_YOU_RATHER', 'TRUTH_OR_DARE', 'CHARADES', 'GUESS_PICTURE',
  'GUESS_WORD', 'GUESS_SONG', 'WHO_AM_I', 'IMPOSTER', 'MAFIA',
  'DRAW_AND_GUESS', 'PICTIONARY', 'NEVER_HAVE_I_EVER', 'THIS_OR_THAT',
  'TWO_TRUTHS_AND_A_LIE',
]);

const SPEED_GAMES = new Set([
  'REACTION_TEST', 'ROCK_PAPER_SCISSORS', 'RPS_TOURNAMENT', 'NUMBER_GUESS',
  'SPEED_TAP', 'COLOR_MATCH', 'MATH_BATTLE', 'QUICK_DRAW', 'WORD_SCRAMBLE',
  'TYPING_RACE',
]);

export class AchievementsService {
  private static seeded = false;

  /**
   * Ensure default achievements exist in DB
   */
  static async ensureDefaultAchievements(): Promise<void> {
    if (this.seeded) return;
    try {
      for (const ach of PLATFORM_ACHIEVEMENTS) {
        await prisma.achievement.upsert({
          where: { key: ach.key },
          update: {
            title: ach.title,
            description: ach.description,
            iconName: ach.iconName,
          },
          create: ach,
        });
      }
      this.seeded = true;
    } catch (err) {
      console.error('[AchievementsService] Failed to seed achievements:', err);
    }
  }

  /**
   * List all platform achievements
   */
  static async getAllAchievements() {
    await this.ensureDefaultAchievements();
    return prisma.achievement.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get user achievements with unlock timestamps
   */
  static async getUserAchievements(userId: string) {
    await this.ensureDefaultAchievements();
    const userAchs = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const allAchs = await prisma.achievement.findMany();
    const unlockedMap = new Map(userAchs.map((ua) => [ua.achievement.key, ua]));

    return allAchs.map((ach) => {
      const unlocked = unlockedMap.get(ach.key);
      return {
        id: ach.id,
        key: ach.key,
        title: ach.title,
        description: ach.description,
        iconName: ach.iconName,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked ? unlocked.unlockedAt.toISOString() : null,
      };
    });
  }

  /**
   * Evaluates and awards achievements for a user following a match conclusion
   */
  static async evaluateAndAwardAchievements(
    userId: string,
    gameType: string,
    isWin: boolean
  ): Promise<string[]> {
    await this.ensureDefaultAchievements();

    const unlockedKeys: string[] = [];
    const normalizedType = gameType.toUpperCase();

    // Fetch existing unlocked achievements
    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
    const alreadyUnlocked = new Set(existing.map((e) => e.achievement.key));

    // Fetch all user game statistics
    const allStats = await prisma.gameStatistics.findMany({
      where: { userId },
    });

    const totalMatchesPlayed = allStats.reduce((sum, s) => sum + s.matchesPlayed, 0);
    const totalMatchesWon = allStats.reduce((sum, s) => sum + s.matchesWon, 0);
    const maxStreak = Math.max(0, ...allStats.map((s) => s.highestStreak));

    const boardWins = allStats
      .filter((s) => BOARD_GAMES.has(s.gameType))
      .reduce((sum, s) => sum + s.matchesWon, 0);

    const cardWins = allStats
      .filter((s) => CARD_GAMES.has(s.gameType))
      .reduce((sum, s) => sum + s.matchesWon, 0);

    const puzzleWins = allStats
      .filter((s) => PUZZLE_GAMES.has(s.gameType))
      .reduce((sum, s) => sum + s.matchesWon, 0);

    const partyPlays = allStats
      .filter((s) => PARTY_GAMES.has(s.gameType))
      .reduce((sum, s) => sum + s.matchesPlayed, 0);

    const speedWins = allStats
      .filter((s) => SPEED_GAMES.has(s.gameType))
      .reduce((sum, s) => sum + s.matchesWon, 0);

    const candidatesToCheck: { key: string; condition: boolean }[] = [
      { key: 'FIRST_WIN', condition: totalMatchesWon >= 1 },
      { key: 'STREAK_3', condition: maxStreak >= 3 },
      { key: 'STREAK_5', condition: maxStreak >= 5 },
      { key: 'GAMES_10', condition: totalMatchesPlayed >= 10 },
      { key: 'GAMES_50', condition: totalMatchesPlayed >= 50 },
      { key: 'BOARD_MASTER', condition: boardWins >= 5 },
      { key: 'CARD_SHARK', condition: cardWins >= 5 },
      { key: 'PUZZLE_GENIUS', condition: puzzleWins >= 5 },
      { key: 'PARTY_STAR', condition: partyPlays >= 5 },
      { key: 'SPEED_DEMON', condition: speedWins >= 1 },
    ];

    for (const cand of candidatesToCheck) {
      if (cand.condition && !alreadyUnlocked.has(cand.key)) {
        const achRecord = await prisma.achievement.findUnique({
          where: { key: cand.key },
        });

        if (achRecord) {
          try {
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achRecord.id,
              },
            });
            unlockedKeys.push(cand.key);

            // Real-time socket notification to player
            emitToUser(userId, 'achievement:unlocked', {
              key: achRecord.key,
              title: achRecord.title,
              description: achRecord.description,
              iconName: achRecord.iconName,
              unlockedAt: new Date().toISOString(),
            });

            // Push notification (fires even when app is closed)
            PushNotificationService.notifyAchievementUnlocked(
              userId,
              achRecord.title,
              achRecord.description
            ).catch(() => null);
          } catch {
            // Already created or concurrent duplicate
          }
        }
      }
    }

    return unlockedKeys;
  }
}
