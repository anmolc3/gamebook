import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { PushNotificationService } from './push.service';
import { prisma } from '../database/prisma';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

const registerTokenSchema = z.object({
  pushToken: z.string().min(1).startsWith('ExponentPushToken['),
});

/**
 * POST /api/v1/notifications/push-token
 * Register or refresh the Expo push token for the authenticated user.
 * Called by the mobile app after login and when the token changes.
 */
router.post('/push-token', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const parsed = registerTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid push token',
        },
      });
      return;
    }

    await PushNotificationService.registerToken(userId, parsed.data.pushToken);
    res.status(200).json({ success: true, message: 'Push token registered successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

/**
 * DELETE /api/v1/notifications/push-token
 * Clear the push token for this user (called on logout).
 */
router.delete('/push-token', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    await PushNotificationService.clearToken(userId);
    res.status(200).json({ success: true, message: 'Push token cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/v1/notifications
 * Fetch in-app notification history for the authenticated user.
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PUT /api/v1/notifications/mark-read
 * Mark all unread notifications as read.
 */
router.put('/mark-read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, data: { markedCount: result.count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
