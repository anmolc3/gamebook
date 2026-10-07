import { prisma } from '../database/prisma';

/**
 * Expo Push Notification ticket / receipt shapes
 */
interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  categoryId?: string;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * PushNotificationService
 *
 * Sends push notifications via the Expo Push API.
 * Tokens are stored in the User.pushToken column and registered
 * by the mobile client after every login / app launch.
 *
 * All methods are fire-and-forget (non-blocking) to avoid delaying
 * the real-time Socket.IO path.
 */
export class PushNotificationService {
  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Look up the stored Expo push token for a user.
   * Returns null if the user has no registered token or is currently online
   * (no need to send a push if they are actively connected via Socket.IO).
   */
  private static async getToken(
    userId: string,
    skipIfOnline = true
  ): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushToken: true,
        profile: { select: { isOnline: true } },
      },
    });

    if (!user?.pushToken) return null;
    if (skipIfOnline && user.profile?.isOnline) return null;
    if (!user.pushToken.startsWith('ExponentPushToken[')) return null;

    return user.pushToken;
  }

  /**
   * Post one or more messages to the Expo Push API.
   * Errors are swallowed — push is always best-effort.
   */
  private static async send(messages: ExpoPushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    try {
      const res = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      const errors = json.data?.filter((t) => t.status === 'error');
      if (errors?.length) {
        console.warn('[Push] Expo push errors:', JSON.stringify(errors));
      }
    } catch (err) {
      // Never let a push failure crash the caller
      console.warn('[Push] Failed to reach Expo push API:', err);
    }
  }

  // ─── Public notification methods ─────────────────────────────────────────────

  /**
   * Register or update an Expo push token for a user.
   * Called by the mobile client after every successful authentication.
   */
  static async registerToken(userId: string, pushToken: string): Promise<void> {
    if (!pushToken.startsWith('ExponentPushToken[')) {
      throw new Error('Invalid Expo push token format');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
  }

  /**
   * Clear the push token on logout so stale tokens don't accumulate.
   */
  static async clearToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: null },
    });
  }

  // ─── Notification triggers ───────────────────────────────────────────────────

  /**
   * Notify a user they received a new direct message.
   * Only fires if the recipient is OFFLINE (isOnline = false).
   */
  static async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    const token = await this.getToken(recipientId, true);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: `💬 ${senderName}`,
        body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + '…' : messagePreview,
        data: { type: 'CHAT_MESSAGE', recipientId },
        sound: 'default',
        channelId: 'messages',
      },
    ]);
  }

  /**
   * Notify a user they received a new friend request.
   */
  static async notifyFriendRequest(
    recipientId: string,
    senderName: string
  ): Promise<void> {
    const token = await this.getToken(recipientId, true);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: '👥 New Friend Request',
        body: `${senderName} wants to be your friend`,
        data: { type: 'FRIEND_REQUEST', recipientId },
        sound: 'default',
        channelId: 'social',
      },
    ]);
  }

  /**
   * Notify a user their friend request was accepted.
   */
  static async notifyFriendRequestAccepted(
    recipientId: string,
    acceptorName: string
  ): Promise<void> {
    const token = await this.getToken(recipientId, true);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: '🎉 Friend Request Accepted',
        body: `${acceptorName} accepted your friend request!`,
        data: { type: 'FRIEND_ACCEPTED', recipientId },
        sound: 'default',
        channelId: 'social',
      },
    ]);
  }

  /**
   * Notify a user they received a game invite via chat.
   */
  static async notifyGameInvite(
    recipientId: string,
    inviterName: string,
    gameName: string,
    roomCode: string
  ): Promise<void> {
    const token = await this.getToken(recipientId, true);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: `🎮 Game Invite from ${inviterName}`,
        body: `Join ${gameName} • Room ${roomCode}`,
        data: { type: 'GAME_INVITE', roomCode, recipientId },
        sound: 'default',
        channelId: 'games',
      },
    ]);
  }

  /**
   * Notify a user they unlocked an achievement.
   */
  static async notifyAchievementUnlocked(
    userId: string,
    achievementTitle: string,
    achievementDescription: string
  ): Promise<void> {
    // Achievements notify even when online (celebratory)
    const token = await this.getToken(userId, false);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: `🏆 Achievement Unlocked!`,
        body: `${achievementTitle} — ${achievementDescription}`,
        data: { type: 'ACHIEVEMENT', userId },
        sound: 'default',
        channelId: 'achievements',
      },
    ]);
  }

  /**
   * Notify a user it is their turn in a multiplayer game.
   * Only fires when the player is offline (they're actively watching if online).
   */
  static async notifyYourTurn(
    userId: string,
    gameName: string,
    roomCode: string
  ): Promise<void> {
    const token = await this.getToken(userId, true);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: `⏰ Your Turn in ${gameName}`,
        body: `Don't keep your opponent waiting! Room: ${roomCode}`,
        data: { type: 'YOUR_TURN', roomCode, userId },
        sound: 'default',
        channelId: 'games',
      },
    ]);
  }
}
