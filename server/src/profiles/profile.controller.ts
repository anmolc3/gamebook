import { Response } from 'express';
import { ProfileService } from './profile.service';
import { updateProfileSchema } from './profile.validation';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfileController {
  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const profile = await ProfileService.getMyProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: { message: err.message || 'Profile not found' },
      });
    }
  }

  static async updateMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid input data',
            details: validation.error.issues,
          },
        });
        return;
      }

      const updated = await ProfileService.updateMyProfile(userId, validation.data);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Profile updated successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to update profile' },
      });
    }
  }

  static async getUserProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const viewerId = req.user?.userId;
      const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

      if (!viewerId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({ success: false, error: { message: 'User ID is required' } });
        return;
      }

      const profile = await ProfileService.getUserProfile(viewerId, targetUserId);
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: { message: err.message || 'Player profile not found' },
      });
    }
  }
}
