import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RoomService } from './room.service';
import {
  createRoomSchema,
  joinRoomSchema,
  toggleReadySchema,
  matchmakeSchema,
} from './room.validation';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class RoomController {
  static async createRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parsed = createRoomSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid room creation data',
          },
        });
      }

      const room = await RoomService.createRoom(userId, parsed.data);
      return res.status(201).json({
        status: 'success',
        data: room,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'ROOM_CREATE_FAILED',
          message: err.message || 'Failed to create room',
        },
      });
    }
  }

  static async getRoom(req: AuthRequest, res: Response) {
    try {
      const code = getParam(req.params.code);
      const room = await RoomService.getRoom(code);
      return res.status(200).json({
        status: 'success',
        data: room,
      });
    } catch (err: any) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'ROOM_NOT_FOUND',
          message: err.message || 'Room not found',
        },
      });
    }
  }

  static async joinRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const code = getParam(req.params.code);
      const parsed = joinRoomSchema.safeParse({ code });
      if (!parsed.success) {
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'INVALID_CODE',
            message: parsed.error.issues[0]?.message || 'Invalid room code format',
          },
        });
      }

      const room = await RoomService.joinRoom(userId, parsed.data.code);
      return res.status(200).json({
        status: 'success',
        data: room,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'ROOM_JOIN_FAILED',
          message: err.message || 'Failed to join room',
        },
      });
    }
  }

  static async toggleReady(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const code = getParam(req.params.code);
      const parsed = toggleReadySchema.safeParse(req.body);
      const isReady = parsed.success ? parsed.data.isReady : undefined;

      const room = await RoomService.toggleReady(userId, code, isReady);
      return res.status(200).json({
        status: 'success',
        data: room,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'TOGGLE_READY_FAILED',
          message: err.message || 'Failed to toggle ready status',
        },
      });
    }
  }

  static async startGame(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const code = getParam(req.params.code);
      const room = await RoomService.startGame(userId, code);
      return res.status(200).json({
        status: 'success',
        data: room,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'START_GAME_FAILED',
          message: err.message || 'Failed to start game',
        },
      });
    }
  }

  static async leaveRoom(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const code = getParam(req.params.code);
      const result = await RoomService.leaveRoom(userId, code);
      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'LEAVE_ROOM_FAILED',
          message: err.message || 'Failed to leave room',
        },
      });
    }
  }

  static async matchmake(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parsed = matchmakeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid matchmaking payload',
          },
        });
      }

      const result = await RoomService.matchmake(userId, parsed.data.gameType);
      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'MATCHMAKE_FAILED',
          message: err.message || 'Matchmaking failed',
        },
      });
    }
  }
}
