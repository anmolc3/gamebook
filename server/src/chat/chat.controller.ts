import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatService } from './chat.service';
import { sendMessageSchema } from './chat.validation';

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

      const result = await ChatService.markAsRead(userId, conversationId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message || 'Failed to mark messages as read' },
      });
    }
  }
}
