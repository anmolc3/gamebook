import { Router } from 'express';
import { RoomController } from './room.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All room operations require authentication
router.use(authenticateToken);

router.post('/', RoomController.createRoom);
router.post('/matchmake', RoomController.matchmake);
router.get('/:code', RoomController.getRoom);
router.post('/:code/join', RoomController.joinRoom);
router.post('/:code/ready', RoomController.toggleReady);
router.post('/:code/start', RoomController.startGame);
router.post('/:code/leave', RoomController.leaveRoom);

export default router;
