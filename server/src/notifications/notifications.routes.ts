import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { PushNotificationService } from './push.service';
import { prisma } from '../database/prisma';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

const registerTokenSchema = z.object({
  pushToken: z.string().min(1).refine(
    (token) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['),
    { message: 'Invalid push token format' }
  ),
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

    const mapped = notifications.map((n) => ({
      ...n,
      message: n.body,
    }));

    res.status(200).json({ success: true, data: mapped });
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

    try {
      const { emitToUser } = require('../sockets/socket.server');
      if (typeof emitToUser === 'function') {
        emitToUser(userId, 'notifications:unread_count', { unreadCount: 0 });
      }
    } catch {}

    res.status(200).json({ success: true, data: { markedCount: result.count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const id = String(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    try {
      const { emitToUser } = require('../sockets/socket.server');
      if (typeof emitToUser === 'function') {
        const remainingUnread = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        emitToUser(userId, 'notifications:unread_count', { unreadCount: remainingUnread });
      }
    } catch {}

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for the authenticated user.
 */
router.delete('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    await prisma.notification.deleteMany({
      where: { userId },
    });

    try {
      const { emitToUser } = require('../sockets/socket.server');
      if (typeof emitToUser === 'function') {
        emitToUser(userId, 'notifications:cleared', {});
        emitToUser(userId, 'notifications:unread_count', { unreadCount: 0 });
      }
    } catch {}

    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification.
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const id = String(req.params.id);
    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    try {
      const { emitToUser } = require('../sockets/socket.server');
      if (typeof emitToUser === 'function') {
        const remainingUnread = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        emitToUser(userId, 'notifications:unread_count', { unreadCount: remainingUnread });
      }
    } catch {}

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * Get count of unread notifications for badge display.
 */
router.get('/unread-count', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
