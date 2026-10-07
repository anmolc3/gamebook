import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { FriendsService } from './friends.service';

export class FriendsController {
  static async getFriends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const friends = await FriendsService.getFriends(userId);
      res.status(200).json({ success: true, data: friends });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to fetch friends list' },
      });
    }
  }

  static async getRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const requests = await FriendsService.getFriendRequests(userId);
      res.status(200).json({ success: true, data: requests });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to fetch friend requests' },
      });
    }
  }

  static async sendRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const targetUserId = Array.isArray(req.params.targetUserId)
        ? req.params.targetUserId[0]
        : req.params.targetUserId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({ success: false, error: { message: 'Target user ID is required' } });
        return;
      }

      const result = await FriendsService.sendFriendRequest(userId, targetUserId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Friend request sent successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to send friend request' },
      });
    }
  }

  static async acceptRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!requestId) {
        res.status(400).json({ success: false, error: { message: 'Request ID is required' } });
        return;
      }

      const result = await FriendsService.acceptFriendRequest(userId, requestId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Friend request accepted',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to accept friend request' },
      });
    }
  }

  static async rejectRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!requestId) {
        res.status(400).json({ success: false, error: { message: 'Request ID is required' } });
        return;
      }

      const result = await FriendsService.rejectFriendRequest(userId, requestId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Friend request declined',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to decline friend request' },
      });
    }
  }

  static async cancelRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!requestId) {
        res.status(400).json({ success: false, error: { message: 'Request ID is required' } });
        return;
      }

      const result = await FriendsService.cancelFriendRequest(userId, requestId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Friend request cancelled',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to cancel friend request' },
      });
    }
  }

  static async removeFriend(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const friendId = Array.isArray(req.params.friendId)
        ? req.params.friendId[0]
        : req.params.friendId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!friendId) {
        res.status(400).json({ success: false, error: { message: 'Friend ID is required' } });
        return;
      }

      const result = await FriendsService.removeFriend(userId, friendId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Friend removed successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to remove friend' },
      });
    }
  }

  static async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const query = (req.query.q as string) || '';

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const results = await FriendsService.searchUsers(userId, query);
      res.status(200).json({ success: true, data: results });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Search failed' },
      });
    }
  }

  static async blockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const targetUserId = Array.isArray(req.params.targetUserId)
        ? req.params.targetUserId[0]
        : req.params.targetUserId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({ success: false, error: { message: 'Target user ID is required' } });
        return;
      }

      const result = await FriendsService.blockUser(userId, targetUserId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Player has been blocked',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to block user' },
      });
    }
  }

  static async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const targetUserId = Array.isArray(req.params.targetUserId)
        ? req.params.targetUserId[0]
        : req.params.targetUserId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({ success: false, error: { message: 'Target user ID is required' } });
        return;
      }

      const result = await FriendsService.unblockUser(userId, targetUserId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Player unblocked successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to unblock user' },
      });
    }
  }

  static async getBlocked(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const blocked = await FriendsService.getBlockedUsers(userId);
      res.status(200).json({ success: true, data: blocked });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to fetch blocked users' },
      });
    }
  }
}
