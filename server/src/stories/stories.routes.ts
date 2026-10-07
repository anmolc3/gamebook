import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { StoriesService } from './stories.service';

const router = Router();

/**
 * POST /api/v1/stories
 * Create a new 24-hour ephemeral story
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { mediaUrl, mediaType, caption, privacy, gameResultId } = req.body;

    const story = await StoriesService.createStory(userId, {
      mediaUrl,
      mediaType,
      caption,
      privacy,
      gameResultId,
    });

    res.status(201).json({
      message: 'Story created successfully',
      story,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create story' });
  }
});

/**
 * GET /api/v1/stories/feed
 * Retrieve 24h stories from friends and self
 */
router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const trays = await StoriesService.getFeed(userId);

    res.status(200).json({
      totalTrays: trays.length,
      trays,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stories feed' });
  }
});

/**
 * POST /api/v1/stories/:id/view
 * Mark story as viewed
 */
router.post('/:id/view', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const viewerId = req.user!.userId;
    const storyId = String(req.params.id);

    const result = await StoriesService.viewStory(viewerId, storyId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record story view' });
  }
});

/**
 * POST /api/v1/stories/:id/reply
 * Reply to a story
 */
router.post('/:id/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const storyId = String(req.params.id);
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Reply content is required' });
      return;
    }

    const reply = await StoriesService.replyStory(userId, storyId, content.trim());
    res.status(201).json({
      message: 'Reply sent',
      reply,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send reply' });
  }
});

/**
 * DELETE /api/v1/stories/:id
 * Delete user's own story
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const storyId = String(req.params.id);

    await StoriesService.deleteStory(userId, storyId);
    res.status(200).json({ message: 'Story deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete story' });
  }
});

export default router;
