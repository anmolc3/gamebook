import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { FriendsController } from './friends.controller';

const router = Router();

// Friend list, suggestions and search
router.get('/', authenticateToken, FriendsController.getFriends);
router.get('/suggestions', authenticateToken, FriendsController.getSuggestedUsers);
router.get('/search', authenticateToken, FriendsController.searchUsers);

// Friend requests
router.get('/requests', authenticateToken, FriendsController.getRequests);
router.post('/request/:targetUserId', authenticateToken, FriendsController.sendRequest);
router.post('/request/:requestId/accept', authenticateToken, FriendsController.acceptRequest);
router.post('/request/:requestId/reject', authenticateToken, FriendsController.rejectRequest);
router.delete('/request/:requestId/cancel', authenticateToken, FriendsController.cancelRequest);

// Friendship removal
router.delete('/:friendId', authenticateToken, FriendsController.removeFriend);

// Blocking
router.post('/block/:targetUserId', authenticateToken, FriendsController.blockUser);
router.delete('/block/:targetUserId', authenticateToken, FriendsController.unblockUser);
router.get('/blocked', authenticateToken, FriendsController.getBlocked);

export default router;
