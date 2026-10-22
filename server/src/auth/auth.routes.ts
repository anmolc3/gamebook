import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleSignIn);
router.get('/google/start', AuthController.googleAuthStart);
router.get('/google/callback', AuthController.googleAuthCallback);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Protected routes
router.get('/me', authenticateToken, AuthController.me);
router.delete('/delete-account', authenticateToken, AuthController.deleteAccount);
router.delete('/account', authenticateToken, AuthController.deleteAccount);

export default router;
