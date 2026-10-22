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
  DeleteAccountInput,
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

    // Verify audience matches any configured Google OAuth client
    const allowedClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      '584037157308-6jortk40dk68qg2hiuam5pjqgrro0lam.apps.googleusercontent.com',
    ].filter(Boolean) as string[];

    if (allowedClientIds.length > 0 && !allowedClientIds.includes(payload.aud)) {
      if (!allowedClientIds.includes(payload.azp)) {
        throw new Error('Google token audience mismatch');
      }
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

  /**
   * Generates Google OAuth 2.0 redirect URL for mobile and web flows
   */
  static getGoogleAuthUrl(returnTo?: string): string {
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      '584037157308-6jortk40dk68qg2hiuam5pjqgrro0lam.apps.googleusercontent.com';
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      'https://gamebook-production.up.railway.app/api/v1/auth/google/callback';

    const statePayload = {
      returnTo: returnTo || 'socialgamingarena://google-callback',
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
      access_type: 'offline',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code from Google for tokens and signs in user
   */
  static async handleGoogleCallback(
    code: string,
    state?: string
  ): Promise<{ token: string; user: any; returnTo: string }> {
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      '584037157308-6jortk40dk68qg2hiuam5pjqgrro0lam.apps.googleusercontent.com';
    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      '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Pg';
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      'https://gamebook-production.up.railway.app/api/v1/auth/google/callback';

    let returnTo = 'socialgamingarena://google-callback';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded.returnTo) returnTo = decoded.returnTo;
      } catch {
        // use default fallback
      }
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      const errorMsg =
        tokenData.error_description ||
        tokenData.error ||
        'Failed to exchange authorization code with Google';
      throw new Error(errorMsg);
    }

    const authResult = await this.googleSignIn({ idToken: tokenData.id_token });
    return {
      token: authResult.token,
      user: authResult.user,
      returnTo,
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

  /**
   * Securely and permanently deletes a user account across all database tables,
   * cascades personal data, cleans up hosted/participating game rooms, anonymizes
   * historical game match statistics, disconnects real-time sockets, terminates calls,
   * and clears push tokens.
   */
  static async deleteAccount(
    userId: string,
    input: DeleteAccountInput
  ): Promise<{
    success: boolean;
    message: string;
    deletedAt: string;
    retainedDataNotice: string;
  }> {
    // 1. Fetch user to verify existence and credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('User account not found or already deleted');
    }

    // 2. Verification / Reauthentication
    let authenticated = false;

    if (input.password && input.password.trim().length > 0) {
      const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Incorrect password. Please verify your credentials and try again.');
      }
      authenticated = true;
    } else if (input.googleToken && input.googleToken.trim().length > 0) {
      try {
        const googleRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.googleToken)}`
        );
        const payload: any = await googleRes.json();
        if (
          googleRes.ok &&
          payload.email &&
          payload.email.toLowerCase() === user.email.toLowerCase()
        ) {
          authenticated = true;
        } else {
          throw new Error('Google authentication verification failed.');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Google token re-authentication failed.');
      }
    } else {
      // Verified via active JWT session token
      authenticated = true;
    }

    // 3. Clean up active Socket.IO connections, presence, active calls, and in-game rooms
    try {
      const { disconnectUserSockets } = require('../sockets/socket.server');
      if (typeof disconnectUserSockets === 'function') {
        disconnectUserSockets(userId, 'account_deleted');
      }
    } catch (socketErr) {
      console.warn('[AuthService] Socket cleanup warning:', socketErr);
    }

    // 4. Atomic database deletion and anonymization transaction
    await prisma.$transaction(
      async (tx) => {
        // (A) Handle GameRooms hosted by this user
        const hostedRooms = await tx.gameRoom.findMany({
          where: { hostId: userId },
          include: {
            players: {
              orderBy: { slotIndex: 'asc' },
            },
          },
        });

        for (const room of hostedRooms) {
          const remainingPlayers = room.players.filter((p) => p.userId !== userId);
          if (remainingPlayers.length === 0) {
            // Disband and delete the empty room
            await tx.gameRoom.delete({ where: { id: room.id } });
          } else {
            // Transfer host role to next lowest slotIndex player
            const nextHost = remainingPlayers[0];
            await tx.gameRoom.update({
              where: { id: room.id },
              data: { hostId: nextHost.userId },
            });
            await tx.gamePlayer.update({
              where: { id: nextHost.id },
              data: { isReady: true },
            });
          }
        }

        // (B) Remove player participation records from all rooms
        await tx.gamePlayer.deleteMany({
          where: { userId },
        });

        // (C) Anonymize historical GameResult records
        // Clear foreign key winnerId
        await tx.gameResult.updateMany({
          where: { winnerId: userId },
          data: { winnerId: null },
        });

        // Anonymize player personal identity in playersData JSON while preserving opponent's match history
        const userPattern = `%${userId}%`;
        const matchRecords: Array<{ id: string; playersData: any }> = await tx.$queryRaw`
          SELECT id, "playersData" FROM "GameResult"
          WHERE "playersData"::text LIKE ${userPattern}
        `;

        for (const record of matchRecords) {
          if (Array.isArray(record.playersData)) {
            const anonymized = record.playersData.map((p: any) => {
              if (p && p.userId === userId) {
                return {
                  ...p,
                  username: 'deleted_user',
                  displayName: 'Deleted Player',
                  avatarUrl: null,
                  isDeleted: true,
                };
              }
              return p;
            });

            await tx.gameResult.update({
              where: { id: record.id },
              data: { playersData: anonymized },
            });
          }
        }

        // (D) Handle Conversations: remove creatorId reference if user created group conversations
        await tx.conversation.updateMany({
          where: { creatorId: userId },
          data: { creatorId: null },
        });

        // (E) Delete User row (PostgreSQL cascades delete to Profile, Friendships, FriendRequests, Blocks, ConversationMember, Messages, MessageReceipts, Stories, StoryViews, StoryReplies, Notifications, GameStatistics, and UserAchievements)
        await tx.user.delete({
          where: { id: userId },
        });

        // (F) Clean up any 1-on-1 conversations that now have zero members left
        await tx.conversation.deleteMany({
          where: {
            members: {
              none: {},
            },
          },
        });
      },
      {
        timeout: 30000,
      }
    );

    // 5. Post-transaction external cleanups
    // (User row and pushToken column already completely erased by database transaction)

    // In-memory password reset token cleanup
    passwordResets.delete(userId);
    passwordResets.delete(user.email.toLowerCase());
    passwordResets.delete(user.username.toLowerCase());

    return {
      success: true,
      message: 'Account and associated personal data permanently deleted.',
      deletedAt: new Date().toISOString(),
      retainedDataNotice:
        'Personal data was permanently erased. Multiplayer match history was anonymized to protect other players’ match records.',
    };
  }
}
