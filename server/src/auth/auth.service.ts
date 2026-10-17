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
  GoogleSignInInput,
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

  static async googleSignIn(input: GoogleSignInInput): Promise<AuthResponse> {
    const { idToken } = input;

    // Validate Google ID token securely using Google's tokeninfo API
    let payload: any;
    try {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      payload = await googleRes.json();
      if (!googleRes.ok || payload.error_description || !payload.email) {
        throw new Error(payload.error_description || 'Invalid Google ID token');
      }
    } catch (err: any) {
      throw new Error(`Google authentication failed: ${err.message}`);
    }

    // Verify token validity
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
      throw new Error('Google account email is not verified');
    }

    // If GOOGLE_CLIENT_ID is configured in environment, verify audience
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && payload.aud !== configuredClientId) {
      throw new Error('Google token audience mismatch');
    }

    const email = payload.email.toLowerCase().trim();
    const googleName = payload.name || payload.given_name || 'Player';
    const avatarUrl = payload.picture || null;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      // Safe account linking: Existing account found with this verified email
      // Update avatar if profile does not have one, and set presence online
      if (user.profile) {
        await prisma.profile.update({
          where: { id: user.profile.id },
          data: {
            isOnline: true,
            lastSeen: new Date(),
            avatarUrl: user.profile.avatarUrl || avatarUrl,
          },
        });
      }
    } else {
      // New user registration via Google
      // Generate clean unique username
      let baseUsername = (payload.given_name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 15);
      if (baseUsername.length < 3) baseUsername = 'player';

      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Generate secure random password hash for account
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 12);

      user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          profile: {
            create: {
              displayName: googleName.slice(0, 30),
              avatarUrl,
              themePreference: 'coralMarble',
              appearanceMode: 'dark',
              isOnline: true,
            },
          },
        },
        include: { profile: true },
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
        : `Verification code generated. (Email notice: ${emailResult.message})`,
      resetCode: emailResult.sent ? undefined : resetCode,
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
