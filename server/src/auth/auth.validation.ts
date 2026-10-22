import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name must be at most 30 characters'),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
});

export const resetPasswordSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  resetCode: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(1, 'Google ID token or credential is required'),
});

export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  googleToken: z.string().optional(),
  confirm: z
    .boolean({
      message: 'Explicit confirmation is required to delete your account',
    })
    .refine((v) => v === true, {
      message: 'Explicit confirmation is required to delete your account',
    }),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

