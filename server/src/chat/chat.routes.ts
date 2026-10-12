import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { ChatController } from './chat.controller';

const router = Router();

router.get('/conversations', authenticateToken, ChatController.getConversations);
router.post('/conversations/:recipientId', authenticateToken, ChatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);
router.put('/conversations/:conversationId/read', authenticateToken, ChatController.markRead);
router.put('/conversations/:conversationId/deliver', authenticateToken, ChatController.markDelivered);
router.get('/conversations/:conversationId/messages/:messageId/receipts', authenticateToken, ChatController.getMessageReceipts);
router.put('/conversations/:conversationId/messages/:messageId/open-view-once', authenticateToken, ChatController.openViewOnce);

// Group Chat Management
router.post('/groups', authenticateToken, ChatController.createGroup);
router.get('/groups/:groupId', authenticateToken, ChatController.getGroupDetails);
router.put('/groups/:groupId', authenticateToken, ChatController.updateGroup);
router.post('/groups/:groupId/members', authenticateToken, ChatController.addMembers);
router.delete('/groups/:groupId/members/:memberId', authenticateToken, ChatController.removeMember);
router.post('/groups/:groupId/leave', authenticateToken, ChatController.leaveGroup);
router.put('/groups/:groupId/members/:memberId/role', authenticateToken, ChatController.updateMemberRole);

export default router;
