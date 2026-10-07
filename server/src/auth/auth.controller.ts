import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid input data',
            details: validation.error.issues,
          },
        });
        return;
      }

      const result = await AuthService.register(validation.data);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Account created successfully',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: err.message || 'Registration failed',
        },
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid credentials provided',
            details: validation.error.issues,
          },
        });
        return;
      }

      const result = await AuthService.login(validation.data);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: err.message || 'Authentication failed',
        },
      });
    }
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }

      const profile = await AuthService.getProfileById(req.user.userId);
      res.status(200).json({
        success: true,
        data: { user: profile },
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: err.message || 'User not found',
        },
      });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validation = forgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Email or username is required',
          },
        });
        return;
      }

      const result = await AuthService.forgotPassword(validation.data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FORGOT_PASSWORD_FAILED',
          message: err.message || 'Failed to process forgot password request',
        },
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validation = resetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid input data',
          },
        });
        return;
      }

      const result = await AuthService.resetPassword(validation.data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'RESET_PASSWORD_FAILED',
          message: err.message || 'Failed to reset password',
        },
      });
    }
  }
}
