import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';
import { GameRegistry } from './game.registry';
import { MatchManager } from './match.manager';

const router = Router();

/**
 * GET /api/v1/games/catalog
 * Rich game discovery endpoint with search, category filtering, and live room activity
 */
router.get('/catalog', async (req: Request, res: Response) => {
  try {
    const { category, search, players } = req.query;
    let allGames = GameRegistry.getAllGames();

    // 1. Fetch active room counts per gameType
    const activeRoomCounts = await prisma.gameRoom.groupBy({
      by: ['gameType'],
      where: {
        status: { in: ['WAITING', 'PLAYING'] },
      },
      _count: { id: true },
    });

    const roomCountMap = new Map<string, number>();
    activeRoomCounts.forEach((rc) => {
      roomCountMap.set(rc.gameType, rc._count.id);
    });

    // 2. Map games with live stats
    const enrichedGames = allGames.map((g) => ({
      ...g,
      activeRooms: roomCountMap.get(g.id) || 0,
    }));

    // 3. Apply filters
    let filteredGames = [...enrichedGames];

    if (category && typeof category === 'string' && category.toUpperCase() !== 'ALL') {
      const catNorm = category.toUpperCase();
      filteredGames = filteredGames.filter((g) => g.category.toUpperCase() === catNorm);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      filteredGames = filteredGames.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.id.toLowerCase().includes(q)
      );
    }

    if (players && !isNaN(Number(players))) {
      const p = Number(players);
      filteredGames = filteredGames.filter(
        (g) => g.minPlayers <= p && g.maxPlayers >= p
      );
    }

    // 4. Trending & Recommended lists
    const trending = [...enrichedGames]
      .sort((a, b) => b.activeRooms - a.activeRooms)
      .slice(0, 6);

    const recommended = [...enrichedGames]
      .filter((g) => ['TICTACTOE', 'CHESS', 'LUDO', 'WORDLE_DUEL', 'WOULD_YOU_RATHER', 'UNO_STYLE'].includes(g.id))
      .slice(0, 6);

    const categories = Array.from(new Set(allGames.map((g) => g.category)));

    res.status(200).json({
      total: filteredGames.length,
      categories: ['ALL', ...categories],
      games: filteredGames,
      trending,
      recommended,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch catalog' });
  }
});

/**
 * GET /api/v1/games/live-online
 * Fetches real active players currently in waiting rooms and matches per game
 */
router.get('/live-online', async (req: Request, res: Response) => {
  try {
    const activeRooms = await prisma.gameRoom.findMany({
      where: {
        status: { in: ['WAITING', 'PLAYING'] },
      },
      select: {
        gameType: true,
        players: {
          select: { userId: true },
        },
      },
    });

    const counts: Record<string, number> = {};

    activeRooms.forEach((r) => {
      const gType = r.gameType;
      const count = r.players?.length || 1;
      counts[gType] = (counts[gType] || 0) + count;
    });

    // Also include in-memory active matches from MatchManager
    const activeMatches = MatchManager.getActiveMatches();
    if (activeMatches && Array.isArray(activeMatches)) {
      activeMatches.forEach((m) => {
        const gType = m.gameType;
        const count = m.players?.length || 2;
        counts[gType] = Math.max(counts[gType] || 0, count);
      });
    }

    res.status(200).json({ counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch live online counts' });
  }
});

/**
 * GET /api/v1/games/leaderboard/global
 * Platform-wide global leaderboard (top players by total wins across all games)
 */
router.get('/leaderboard/global', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const statsByUser = await prisma.gameStatistics.groupBy({
      by: ['userId'],
      _sum: {
        matchesPlayed: true,
        matchesWon: true,
        matchesLost: true,
      },
      _max: {
        highestStreak: true,
      },
      orderBy: {
        _sum: {
          matchesWon: 'desc',
        },
      },
      take: limit,
    });

    const userIds = statsByUser.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            themePreference: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const leaderboard = statsByUser.map((entry, index) => {
      const user = userMap.get(entry.userId);
      const played = entry._sum.matchesPlayed || 0;
      const won = entry._sum.matchesWon || 0;
      const lost = entry._sum.matchesLost || 0;
      const streak = entry._max.highestStreak || 0;

      return {
        rank: index + 1,
        userId: entry.userId,
        username: user?.username || 'Unknown',
        displayName: user?.profile?.displayName || user?.username || 'Anonymous',
        avatarUrl: user?.profile?.avatarUrl || null,
        matchesPlayed: played,
        matchesWon: won,
        matchesLost: lost,
        winRate: played > 0 ? Math.round((won / played) * 100) : 0,
        highestStreak: streak,
      };
    });

    res.status(200).json({
      scope: 'global',
      total: leaderboard.length,
      leaderboard,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch global leaderboard' });
  }
});

/**
 * GET /api/v1/games/:gameType/leaderboard
 * Specific game leaderboard (global or friends scope)
 */
router.get('/:gameType/leaderboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const gameType = String(req.params.gameType).toUpperCase();
    const scope = (String(req.query.scope || 'global')).toLowerCase();
    const currentUserId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    let userFilter: any = {};

    if (scope === 'friends') {
      // Find friend IDs
      const friendships = await prisma.friendship.findMany({
        where: { userId: currentUserId },
        select: { friendId: true },
      });
      const friendIds = friendships.map((f) => f.friendId);
      friendIds.push(currentUserId); // include self in friends ranking
      userFilter = { userId: { in: friendIds } };
    }

    const stats = await prisma.gameStatistics.findMany({
      where: {
        gameType: gameType as any,
        ...userFilter,
      },
      orderBy: [
        { matchesWon: 'desc' },
        { highestStreak: 'desc' },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const leaderboard = stats.map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      username: item.user.username,
      displayName: item.user.profile?.displayName || item.user.username,
      avatarUrl: item.user.profile?.avatarUrl || null,
      matchesPlayed: item.matchesPlayed,
      matchesWon: item.matchesWon,
      matchesLost: item.matchesLost,
      winRate: item.matchesPlayed > 0 ? Math.round((item.matchesWon / item.matchesPlayed) * 100) : 0,
      currentStreak: item.currentStreak,
      highestStreak: item.highestStreak,
      isCurrentUser: item.userId === currentUserId,
    }));

    res.status(200).json({
      gameType,
      scope,
      total: leaderboard.length,
      leaderboard,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch game leaderboard' });
  }
});

/**
 * GET /api/v1/games/history
 * Returns user's overall past match history across all game types
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const results = await prisma.gameResult.findMany({
      where: {
        playersData: {
          array_contains: [{ userId }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        winner: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Fallback search if JSON query array_contains didn't match (Postgres json parsing)
    let finalResults = results;
    if (finalResults.length === 0) {
      const recentAll = await prisma.gameResult.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          winner: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      finalResults = recentAll.filter((r) => {
        const players = Array.isArray(r.playersData) ? (r.playersData as any[]) : [];
        return players.some((p) => p.userId === userId);
      }).slice(0, limit);
    }

    const formattedHistory = finalResults.map((r) => {
      const players = Array.isArray(r.playersData) ? (r.playersData as any[]) : [];
      const isWinner = r.winnerId === userId;
      const isDraw = !r.winnerId;

      return {
        id: r.id,
        gameType: r.gameType,
        gameName: GameRegistry.getGame(r.gameType)?.name || r.gameType,
        isWinner,
        isDraw,
        winner: r.winner,
        durationSeconds: r.durationSeconds,
        players,
        createdAt: r.createdAt.toISOString(),
      };
    });

    res.status(200).json({
      total: formattedHistory.length,
      history: formattedHistory,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch match history' });
  }
});

/**
 * GET /api/v1/games/portfolio
 * User's unified gaming portfolio across all titles
 */
router.get('/portfolio', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const allStats = await prisma.gameStatistics.findMany({
      where: { userId },
      orderBy: { matchesPlayed: 'desc' },
    });

    const totalMatchesPlayed = allStats.reduce((sum, s) => sum + s.matchesPlayed, 0);
    const totalMatchesWon = allStats.reduce((sum, s) => sum + s.matchesWon, 0);
    const totalMatchesLost = allStats.reduce((sum, s) => sum + s.matchesLost, 0);
    const peakStreak = Math.max(0, ...allStats.map((s) => s.highestStreak));
    const winRate = totalMatchesPlayed > 0 ? Math.round((totalMatchesWon / totalMatchesPlayed) * 100) : 0;

    const favoriteGame = allStats.length > 0 ? allStats[0].gameType : null;

    res.status(200).json({
      userId,
      totalMatchesPlayed,
      totalMatchesWon,
      totalMatchesLost,
      winRate,
      peakStreak,
      favoriteGame,
      gameBreakdown: allStats.map((s) => ({
        gameType: s.gameType,
        gameName: GameRegistry.getGame(s.gameType)?.name || s.gameType,
        matchesPlayed: s.matchesPlayed,
        matchesWon: s.matchesWon,
        matchesLost: s.matchesLost,
        highestStreak: s.highestStreak,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch portfolio' });
  }
});

/**
 * GET /api/v1/games/active/:roomCode
 * Returns active live match state in a room
 */
router.get('/active/:roomCode', authenticateToken, (req: AuthRequest, res: Response) => {
  const roomCode = String(req.params.roomCode).trim().toUpperCase();
  const match = MatchManager.getMatch(roomCode);

  if (!match) {
    res.status(404).json({ error: `No active match found for room code "${roomCode}"` });
    return;
  }

  res.status(200).json({
    matchId: match.matchId,
    roomCode: match.roomCode,
    gameType: match.gameType,
    players: match.players,
    round: match.round,
    scores: match.scores,
    sequenceNumber: match.sequenceNumber,
    state: match.state,
    isConcluded: match.isConcluded,
    startedAt: match.startedAt,
  });
});

/**
 * GET /api/v1/games/stats/:gameType
 * Returns user's statistics for a specific game (e.g. TICTACTOE)
 */
router.get('/stats/:gameType', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const gameType = String(req.params.gameType).toUpperCase();

    const stats = await prisma.gameStatistics.findUnique({
      where: {
        userId_gameType: {
          userId,
          gameType: gameType as any,
        },
      },
    });

    res.status(200).json({
      gameType,
      matchesPlayed: stats?.matchesPlayed || 0,
      matchesWon: stats?.matchesWon || 0,
      matchesLost: stats?.matchesLost || 0,
      currentStreak: stats?.currentStreak || 0,
      highestStreak: stats?.highestStreak || 0,
      winRate: stats && stats.matchesPlayed > 0
        ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
        : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch game statistics' });
  }
});

/**
 * GET /api/v1/games/solo/supported
 * Returns the list of games supporting Solo Mode (AI opponent or solo puzzle)
 */
router.get('/solo/supported', async (_req: Request, res: Response) => {
  try {
    const { AiRegistry } = require('../ai/ai.registry');
    const { BOT_PROFILES } = require('../ai/ai.config');
    const allGames = GameRegistry.getAllGames();

    const supported = allGames.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      hasAiOpponent: AiRegistry.isAiSupported(g.id),
      isSoloPuzzle: ['2048_MULTIPLAYER', 'MINESWEEPER_DUEL', 'WORDLE_DUEL', 'HANGMAN', 'MEMORY_MATCH', 'QUIZ_BATTLE', 'SPEED_TAP', 'REACTION_TEST', 'COLOR_MATCH', 'MATH_BATTLE', 'QUICK_DRAW', 'TYPING_RACE', 'MASTERMIND', 'PATTERN_MATCH', 'WORD_SCRAMBLE'].includes(g.id),
      difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    })).filter((g) => g.hasAiOpponent || g.isSoloPuzzle);

    res.status(200).json({
      supportedGames: supported,
      botProfiles: BOT_PROFILES,
      difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch solo games' });
  }
});

/**
 * POST /api/v1/games/solo/start
 * Starts a solo match session via HTTP
 */
router.post('/solo/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const username = req.user!.username || 'Player';
    const { gameType, difficulty, botId } = req.body;

    if (!gameType) {
      return res.status(400).json({ error: 'gameType is required' });
    }

    const { SoloManager } = require('../ai/solo.manager');
    const session = SoloManager.startSoloSession(
      userId,
      username,
      gameType.toUpperCase() as any,
      difficulty || 'MEDIUM',
      botId
    );

    res.status(200).json({
      success: true,
      roomCode: session.roomCode,
      matchId: session.match.matchId,
      gameType: session.match.gameType,
      players: session.match.players,
      aiProfile: session.botProfile,
      state: session.match.state,
      round: session.match.round,
      scores: session.match.scores,
      sequenceNumber: session.match.sequenceNumber,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start solo session' });
  }
});

/**
 * GET /api/v1/games/solo/history
 * Returns the user's Solo match history (separate from multiplayer)
 */
router.get('/solo/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const soloMatches = await prisma.gameResult.findMany({
      where: {
        gameMode: 'SOLO' as any,
        playersData: {
          string_contains: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        gameType: true,
        gameMode: true,
        winnerId: true,
        durationSeconds: true,
        aiDifficulty: true,
        aiPlayerName: true,
        soloScore: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      matches: soloMatches,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch solo match history' });
  }
});

export default router;
