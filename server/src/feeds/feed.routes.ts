import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { FeedService } from './feed.service';

const router = Router();

/**
 * GET /api/v1/feeds
 * Retrieve real-time feed posts
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let viewerId: string | undefined = undefined;

    // Optional auth token extraction
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const { ENV } = require('../config/env');
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        viewerId = decoded.userId;
      } catch {}
    }

    const posts = await FeedService.getFeed(viewerId);
    res.status(200).json({
      success: true,
      total: posts.length,
      posts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch feeds' });
  }
});

/**
 * POST /api/v1/feeds
 * Publish a new post (authenticated)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { content, imageUrl, gameTag } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Post content cannot be empty' });
      return;
    }

    const post = await FeedService.createPost(userId, {
      content,
      imageUrl,
      gameTag,
    });

    res.status(201).json({
      success: true,
      message: 'Post published successfully',
      post,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to publish post' });
  }
});

/**
 * POST /api/v1/feeds/:id/like
 * Toggle like on a post (authenticated)
 */
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = String(req.params.id);

    const result = await FeedService.toggleLike(userId, postId);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to toggle like' });
  }
});

/**
 * POST /api/v1/feeds/:id/comment
 * Add a comment to a post (authenticated)
 */
router.post('/:id/comment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = String(req.params.id);
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Comment text cannot be empty' });
      return;
    }

    const comment = await FeedService.addComment(userId, postId, text);
    res.status(201).json({
      success: true,
      comment,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add comment' });
  }
});

/**
 * DELETE /api/v1/feeds/:id
 * Delete a post (authenticated)
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = String(req.params.id);

    const deleted = await FeedService.deletePost(userId, postId);
    if (!deleted) {
      res.status(404).json({ error: 'Post not found or already deleted' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
      postId,
    });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Failed to delete post' });
  }
});

export default router;
