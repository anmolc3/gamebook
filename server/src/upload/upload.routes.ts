import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/v1/upload
 * Handles base64 data URIs or image uploads for profile avatars, covers, chat media, and feed posts
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { image, base64, mimeType } = req.body;

    if (!image && !base64) {
      res.status(400).json({
        success: false,
        error: { message: 'Image data or base64 string is required' },
      });
      return;
    }

    let finalUrl: string;
    if (image && typeof image === 'string') {
      finalUrl = image;
    } else if (base64 && typeof base64 === 'string') {
      const mime = mimeType || 'image/jpeg';
      finalUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
    } else {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid image format provided' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        url: finalUrl,
        mediaUrl: finalUrl,
        sizeBytes: finalUrl.length,
        createdAt: new Date().toISOString(),
      },
      url: finalUrl,
      mediaUrl: finalUrl,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Image processing failed' },
    });
  }
});

// Alias for /api/v1/upload/image
router.post('/image', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { image, base64, mimeType } = req.body;
    let finalUrl: string = image || '';

    if (!finalUrl && base64) {
      const mime = mimeType || 'image/jpeg';
      finalUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
    }

    if (!finalUrl) {
      res.status(400).json({ success: false, error: { message: 'Image is required' } });
      return;
    }

    res.status(200).json({
      success: true,
      data: { url: finalUrl, mediaUrl: finalUrl },
      url: finalUrl,
      mediaUrl: finalUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Image upload failed' } });
  }
});

export default router;
