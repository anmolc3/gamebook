import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatService } from './chat.service';
import {
  sendMessageSchema,
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  updateMemberRoleSchema,
} from './chat.validation';

export class ChatController {
  static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const list = await ChatService.getConversations(userId);
      res.status(200).json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to fetch conversations' },
      });
    }
  }

  static async getOrCreateConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const recipientId = Array.isArray(req.params.recipientId)
        ? req.params.recipientId[0]
        : req.params.recipientId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!recipientId) {
        res.status(400).json({ success: false, error: { message: 'Recipient ID is required' } });
        return;
      }

      const conv = await ChatService.getOrCreateConversation(userId, recipientId);
      res.status(200).json({ success: true, data: conv });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to start conversation' },
      });
    }
  }

  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ success: false, error: { message: 'Conversation ID is required' } });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const messages = await ChatService.getMessages(userId, conversationId, limit);
      res.status(200).json({ success: true, data: messages });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: { message: err.message || 'Conversation not found' },
      });
    }
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ success: false, error: { message: 'Conversation ID is required' } });
        return;
      }

      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid message payload',
          },
        });
        return;
      }

      const message = await ChatService.sendMessage(userId, conversationId, validation.data);
      res.status(201).json({ success: true, data: message });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to send message' },
      });
    }
  }

  static async markRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ success: false, error: { message: 'Conversation ID is required' } });
        return;
      }

      const { messageIds } = req.body || {};

      const result = await ChatService.markAsRead(userId, conversationId, Array.isArray(messageIds) ? messageIds : undefined);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to mark messages as read' },
      });
    }
  }

  static async markDelivered(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const { messageIds } = req.body || {};

      if (!userId || !conversationId) {
        res.status(400).json({ success: false, error: { message: 'Missing parameters' } });
        return;
      }

      const result = await ChatService.confirmDelivery(userId, conversationId, messageIds);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to confirm delivery' },
      });
    }
  }

  static async getMessageReceipts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const messageId = Array.isArray(req.params.messageId)
        ? req.params.messageId[0]
        : req.params.messageId;

      if (!userId || !conversationId || !messageId) {
        res.status(400).json({ success: false, error: { message: 'Missing parameters' } });
        return;
      }

      const result = await ChatService.getMessageReceipts(userId, conversationId, messageId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to fetch message receipts' },
      });
    }
  }

  static async openViewOnce(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const messageId = Array.isArray(req.params.messageId)
        ? req.params.messageId[0]
        : req.params.messageId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!conversationId || !messageId) {
        res.status(400).json({ success: false, error: { message: 'Missing conversationId or messageId' } });
        return;
      }

      const result = await ChatService.openViewOnceMessage(userId, conversationId, messageId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to open view-once message' },
      });
    }
  }

  static async createGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const validation = createGroupSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid group creation payload',
          },
        });
        return;
      }

      const group = await ChatService.createGroup(userId, validation.data);
      res.status(201).json({ success: true, data: group });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to create group' },
      });
    }
  }

  static async getGroupDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId) {
        res.status(400).json({ success: false, error: { message: 'Group ID is required' } });
        return;
      }

      const details = await ChatService.getGroupDetails(userId, groupId);
      res.status(200).json({ success: true, data: details });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: { message: err.message || 'Group not found' },
      });
    }
  }

  static async updateGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId) {
        res.status(400).json({ success: false, error: { message: 'Group ID is required' } });
        return;
      }

      const validation = updateGroupSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid update payload',
          },
        });
        return;
      }

      const updated = await ChatService.updateGroup(userId, groupId, validation.data);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      const isForbidden = err.message?.includes('Only group admins') || err.message?.includes('permission');
      res.status(isForbidden ? 403 : 400).json({
        success: false,
        error: { message: err.message || 'Failed to update group' },
      });
    }
  }

  static async addMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId) {
        res.status(400).json({ success: false, error: { message: 'Group ID is required' } });
        return;
      }

      const validation = addMembersSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid add members payload',
          },
        });
        return;
      }

      const updated = await ChatService.addMembers(userId, groupId, validation.data);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      const isForbidden = err.message?.includes('Only group admins') || err.message?.includes('permission');
      res.status(isForbidden ? 403 : 400).json({
        success: false,
        error: { message: err.message || 'Failed to add members' },
      });
    }
  }

  static async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
      const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId || !memberId) {
        res.status(400).json({ success: false, error: { message: 'Missing groupId or memberId' } });
        return;
      }

      const result = await ChatService.removeMember(userId, groupId, memberId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const isForbidden = err.message?.includes('Only group admins') || err.message?.includes('permission');
      res.status(isForbidden ? 403 : 400).json({
        success: false,
        error: { message: err.message || 'Failed to remove member' },
      });
    }
  }

  static async leaveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId) {
        res.status(400).json({ success: false, error: { message: 'Group ID is required' } });
        return;
      }

      const result = await ChatService.leaveGroup(userId, groupId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to leave group' },
      });
    }
  }

  static async updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const groupId = Array.isArray(req.params.groupId) ? req.params.groupId[0] : req.params.groupId;
      const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      if (!groupId || !memberId) {
        res.status(400).json({ success: false, error: { message: 'Missing groupId or memberId' } });
        return;
      }

      const validation = updateMemberRoleSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid role payload',
          },
        });
        return;
      }

      const result = await ChatService.updateMemberRole(userId, groupId, memberId, validation.data);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      const isForbidden = err.message?.includes('Only group admins') || err.message?.includes('permission');
      res.status(isForbidden ? 403 : 400).json({
        success: false,
        error: { message: err.message || 'Failed to update member role' },
      });
    }
  }
}
