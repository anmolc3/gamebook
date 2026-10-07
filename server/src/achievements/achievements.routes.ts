import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { AchievementsService } from '../games/achievements.service';

const router = Router();

/**
 * GET /api/v1/achievements
 * Returns all platform achievements
 */
router.get('/', async (_req, res: Response) => {
  try {
    const list = await AchievementsService.getAllAchievements();
    res.status(200).json({ achievements: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/v1/achievements/my
 * Returns authenticated user's unlocked and locked achievements
 */
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userAchs = await AchievementsService.getUserAchievements(userId);
    const unlockedCount = userAchs.filter((a) => a.isUnlocked).length;

    res.status(200).json({
      total: userAchs.length,
      unlockedCount,
      progressPercent: Math.round((unlockedCount / Math.max(userAchs.length, 1)) * 100),
      achievements: userAchs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user achievements' });
  }
});

/**
 * GET /api/v1/achievements/user/:userId
 * Returns specific user's public achievements
 */
router.get('/user/:userId', async (req, res: Response) => {
  try {
    const userId = req.params.userId;
    const userAchs = await AchievementsService.getUserAchievements(userId);
    const unlockedCount = userAchs.filter((a) => a.isUnlocked).length;

    res.status(200).json({
      userId,
      total: userAchs.length,
      unlockedCount,
      achievements: userAchs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user achievements' });
  }
});

export default router;
