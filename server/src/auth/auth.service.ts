import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { ENV } from '../config/env';
import { EmailService } from '../email/email.service';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

interface PasswordResetEntry {
  userId: string;
  email: string;
  code: string;
  expiresAt: number;
}

const passwordResets = new Map<string, PasswordResetEntry>();

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    themePreference: string;
    appearanceMode: string;
    isOnline: boolean;
    createdAt: Date;
  };
  token: string;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email.toLowerCase() },
          { username: input.username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === input.email.toLowerCase()) {
        throw new Error('An account with this email address already exists');
      }
      throw new Error('This username is already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username.toLowerCase(),
        passwordHash,
        profile: {
          create: {
            displayName: input.displayName.trim(),
            themePreference: 'coralMarble',
            appearanceMode: 'dark',
            isOnline: true,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl || null,
        bio: user.profile?.bio || null,
        themePreference: user.profile?.themePreference || 'coralMarble',
        appearanceMode: user.profile?.appearanceMode || 'dark',
        isOnline: user.profile?.isOnline || true,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async login(input: LoginInput): Promise<AuthResponse> {
    const identifier = input.usernameOrEmail.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update presence status to online
    if (user.profile) {
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { isOnline: true, lastSeen: new Date() },
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl || null,
        bio: user.profile?.bio || null,
        themePreference: user.profile?.themePreference || 'coralMarble',
        appearanceMode: user.profile?.appearanceMode || 'dark',
        isOnline: true,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async getProfileById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            friendships: true,
            wonGames: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      bio: user.profile.bio,
      themePreference: user.profile.themePreference,
      appearanceMode: user.profile.appearanceMode,
      isOnline: user.profile.isOnline,
      lastSeen: user.profile.lastSeen,
      createdAt: user.createdAt,
      stats: {
        friendsCount: user._count.friendships,
        winsCount: user._count.wonGames,
      },
    };
  }

  static async forgotPassword(input: ForgotPasswordInput) {
    const identifier = input.emailOrUsername.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new Error('No user account found with that email or username');
    }

    // Generate secure 6-digit CSPRNG reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Store by user.id and identifiers
    passwordResets.set(user.id, {
      userId: user.id,
      email: user.email,
      code: resetCode,
      expiresAt,
    });
    passwordResets.set(user.email.toLowerCase(), {
      userId: user.id,
      email: user.email,
      code: resetCode,
      expiresAt,
    });
    passwordResets.set(user.username.toLowerCase(), {
      userId: user.id,
      email: user.email,
      code: resetCode,
      expiresAt,
    });

    // Mask email for privacy
    const atIndex = user.email.indexOf('@');
    const maskedEmail =
      atIndex > 2
        ? user.email.slice(0, 2) + '***' + user.email.slice(atIndex)
        : user.email;

    // Send email via Gmail / configured email provider
    const emailResult = await EmailService.sendPasswordResetCode({
      toEmail: user.email,
      username: user.username,
      code: resetCode,
      expiresInMinutes: 15,
    });

    return {
      success: true,
      message: emailResult.sent
        ? `Verification code sent to ${maskedEmail}`
        : 'Verification code generated successfully',
      resetCode: emailResult.sent && process.env.NODE_ENV === 'production' ? undefined : resetCode,
      emailSent: emailResult.sent,
      maskedEmail,
      username: user.username,
      expiresInMinutes: 15,
    };
  }

  static async resetPassword(input: ResetPasswordInput) {
    const identifier = input.emailOrUsername.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new Error('No user account found with that email or username');
    }

    const resetEntry = passwordResets.get(user.id) || passwordResets.get(identifier);
    if (!resetEntry) {
      throw new Error('No active password reset request found. Please request a new code.');
    }

    if (Date.now() > resetEntry.expiresAt) {
      passwordResets.delete(user.id);
      passwordResets.delete(user.email.toLowerCase());
      passwordResets.delete(user.username.toLowerCase());
      throw new Error('The verification code has expired. Please request a new one.');
    }

    if (resetEntry.code !== input.resetCode.trim()) {
      throw new Error('Incorrect verification code. Please check and try again.');
    }

    if (input.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate reset tokens
    passwordResets.delete(user.id);
    passwordResets.delete(user.email.toLowerCase());
    passwordResets.delete(user.username.toLowerCase());

    return {
      success: true,
      message: 'Your password has been reset successfully. You can now sign in.',
    };
  }
}
