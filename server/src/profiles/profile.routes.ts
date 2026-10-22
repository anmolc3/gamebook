import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { AuthController } from '../auth/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All profile endpoints require authentication
router.use(authenticateToken);

router.get('/me', ProfileController.getMe);
router.put('/me', ProfileController.updateMe);
router.delete('/me', AuthController.deleteAccount);
router.get('/:userId', ProfileController.getUserProfile);

export default router;
