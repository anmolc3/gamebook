import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { ChatController } from './chat.controller';

const router = Router();

router.get('/conversations', authenticateToken, ChatController.getConversations);
router.post('/conversations/:recipientId', authenticateToken, ChatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);
router.put('/conversations/:conversationId/read', authenticateToken, ChatController.markRead);
router.put('/conversations/:conversationId/messages/:messageId/open-view-once', authenticateToken, ChatController.openViewOnce);

export default router;
