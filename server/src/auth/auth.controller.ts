import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleSignInSchema,
  deleteAccountSchema,
} from './auth.validation';
import { AuthRequest } from '../middleware/auth.middleware';

// Rate limiter for account deletion attempts (max 5 failed attempts per 15 mins per user)
const deleteRateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

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

  static async googleSignIn(req: Request, res: Response): Promise<void> {
    try {
      const validation = googleSignInSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Google token is required',
          },
        });
        return;
      }

      const result = await AuthService.googleSignIn(validation.data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_FAILED',
          message: err.message || 'Google authentication failed',
        },
      });
    }
  }

  static googleAuthStart(req: Request, res: Response): void {
    const returnTo = req.query.return_to as string | undefined;
    const authUrl = AuthService.getGoogleAuthUrl(returnTo);
    res.redirect(authUrl);
  }

  static async googleAuthCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    let fallbackReturnTo = 'socialgamingarena://google-callback';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded.returnTo) fallbackReturnTo = decoded.returnTo;
      } catch {}
    }

    if (error || !code) {
      const errMessage = error || 'Google sign-in was cancelled or denied';
      const separator = fallbackReturnTo.includes('?') ? '&' : '?';
      res.redirect(`${fallbackReturnTo}${separator}error=${encodeURIComponent(errMessage)}`);
      return;
    }

    try {
      const { token, user, returnTo } = await AuthService.handleGoogleCallback(code, state);
      const separator = returnTo.includes('?') ? '&' : '?';
      const userParam = encodeURIComponent(JSON.stringify(user));
      res.redirect(`${returnTo}${separator}token=${encodeURIComponent(token)}&user=${userParam}`);
    } catch (err: any) {
      const separator = fallbackReturnTo.includes('?') ? '&' : '?';
      res.redirect(
        `${fallbackReturnTo}${separator}error=${encodeURIComponent(
          err.message || 'Google authentication failed'
        )}`
      );
    }
  }

  /**
   * DELETE /api/v1/auth/delete-account
   * Permanently deletes the authenticated user's account and personal data
   */
  static async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication is required to perform account deletion',
          },
        });
        return;
      }

      // Check brute-force deletion rate limit
      const now = Date.now();
      const rlKey = `${userId}:${req.ip || 'ip'}`;
      const record = deleteRateLimitMap.get(rlKey);
      if (record) {
        if (now < record.resetAt) {
          if (record.attempts >= 5) {
            const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
            res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many failed account deletion attempts. Please wait ${minutesLeft} minute(s) before trying again.`,
              },
            });
            return;
          }
        } else {
          deleteRateLimitMap.delete(rlKey);
        }
      }

      const validation = deleteAccountSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.issues[0]?.message || 'Invalid deletion request parameters',
            details: validation.error.issues,
          },
        });
        return;
      }

      const result = await AuthService.deleteAccount(userId, validation.data);

      // Clean up rate limit record on successful deletion
      deleteRateLimitMap.delete(rlKey);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (err: any) {
      // Record failed attempt for rate limiting
      const userId = req.user?.userId || 'anon';
      const rlKey = `${userId}:${req.ip || 'ip'}`;
      const current = deleteRateLimitMap.get(rlKey) || { attempts: 0, resetAt: Date.now() + 15 * 60 * 1000 };
      current.attempts++;
      deleteRateLimitMap.set(rlKey, current);

      const isAuthErr =
        err.message?.toLowerCase().includes('password') ||
        err.message?.toLowerCase().includes('credential') ||
        err.message?.toLowerCase().includes('google') ||
        err.message?.toLowerCase().includes('token');

      res.status(isAuthErr ? 401 : 400).json({
        success: false,
        error: {
          code: isAuthErr ? 'INVALID_CREDENTIALS' : 'DELETE_FAILED',
          message: err.message || 'Account deletion failed',
        },
      });
    }
  }
}
