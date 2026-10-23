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
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * Safe helper to emit real-time notifications to a connected user's sockets
 * without introducing circular module dependencies.
 */
function sendSocketNotification(userId: string, notification: any): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { emitToUser } = require('../sockets/socket.server');
    if (typeof emitToUser === 'function') {
      const payload = {
        ...notification,
        message: notification.body || notification.message,
      };
      emitToUser(userId, 'notification:new', payload);

      prisma.notification
        .count({ where: { userId, isRead: false } })
        .then((unreadCount) => {
          emitToUser(userId, 'notifications:unread_count', { unreadCount });
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('[PushNotificationService] Failed to emit socket notification:', err);
  }
}

/**
 * Unified Push & In-App Notification Service
 *
 * Ensures full synchronization between Push Notifications and In-App Notifications:
 * 1. Persists notification record in database (id, userId, type, title, body, data, isRead: false, createdAt)
 * 2. Emits real-time 'notification:new' event via Socket.IO to connected client
 * 3. Delivers push notification to Expo Push API
 * 4. Deduplicates duplicate events within a sliding window to prevent spam
 * 5. Respects blocked users and user privacy
 * 6. Guarantees that push delivery failures do not block in-app notifications
 */
export class PushNotificationService {
  // In-memory sliding window for idempotency & deduplication
  private static recentEventMap = new Map<string, number>();

  private static isDuplicate(key: string, windowMs = 3500): boolean {
    const now = Date.now();
    const last = this.recentEventMap.get(key);
    if (last && now - last < windowMs) {
      return true;
    }
    this.recentEventMap.set(key, now);

    // Periodic cleanup of older keys
    if (this.recentEventMap.size > 200) {
      for (const [k, time] of this.recentEventMap.entries()) {
        if (now - time > 15000) this.recentEventMap.delete(k);
      }
    }
    return false;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Look up the stored Expo push token for a user.
   */
  private static async getToken(
    userId: string,
    skipIfOnline = false
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

    // Accept both standard ExponentPushToken[...] and ExpoPushToken[...] formats
    const isExpoToken =
      user.pushToken.startsWith('ExponentPushToken[') ||
      user.pushToken.startsWith('ExpoPushToken[');
    if (!isExpoToken) return null;

    return user.pushToken;
  }

  /**
   * Post one or more messages to the Expo Push API.
   * Errors are logged and swallowed — push is best-effort and does not break in-app flow.
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
      console.warn('[Push] Failed to reach Expo push API:', err);
    }
  }

  // ─── Core Unified Creation & Delivery ─────────────────────────────────────────

  /**
   * Creates a persistent notification in the database, emits it in real-time over
   * Socket.IO, and dispatches a matching push notification.
   */
  static async createAndDeliver(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
    idempotencyKey?: string;
    skipPush?: boolean;
  }) {
    const { userId, type, title, body, data, channelId, priority, idempotencyKey, skipPush } = params;

    // 1. Deduplication / Idempotency check
    const dedupKey = idempotencyKey || `${userId}:${type}:${title}:${body}`;
    if (this.isDuplicate(dedupKey)) {
      return null;
    }

    // 2. Block list check
    if (data?.senderId) {
      const isBlocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: data.senderId },
            { blockerId: data.senderId, blockedId: userId },
          ],
        },
      });
      if (isBlocked) {
        return null;
      }
    }

    // 3. Persist notification in database (In-App Notification)
    let notification: any = null;
    try {
      notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data ? (data as any) : {},
          isRead: false,
        },
      });
    } catch (err) {
      console.error('[PushNotificationService] Failed to persist notification in DB:', err);
    }

    // 4. Emit real-time notification to client via Socket.IO
    if (notification) {
      sendSocketNotification(userId, notification);
    }

    // 5. Deliver matching push notification (failure will not prevent in-app notification)
    if (!skipPush) {
      try {
        const token = await this.getToken(userId, false);
        if (token) {
          void this.send([
            {
              to: token,
              title,
              body,
              data: {
                ...data,
                type,
                notificationId: notification?.id,
              },
              sound: 'default',
              channelId: channelId || 'default',
              priority: priority || 'high',
            },
          ]);
        }
      } catch (err) {
        console.warn('[PushNotificationService] Push delivery attempt error:', err);
      }
    }

    return notification;
  }

  // ─── Public token management methods ──────────────────────────────────────────

  /**
   * Register or update an Expo push token for a user.
   */
  static async registerToken(userId: string, pushToken: string): Promise<void> {
    const isExpoToken =
      typeof pushToken === 'string' &&
      (pushToken.startsWith('ExponentPushToken[') || pushToken.startsWith('ExpoPushToken['));
    if (!isExpoToken) {
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

  // ─── Unified Notification Triggers ────────────────────────────────────────────

  /**
   * 1. Direct or Group Message notification
   */
  static async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    extraData?: { conversationId?: string; senderId?: string; messageId?: string; senderName?: string }
  ): Promise<any> {
    const cleanSender = (senderName || 'Player').replace(/^💬\s*/, '').trim() || 'Player';
    const cleanBody = (messagePreview || '').replace(/^💬\s*/, '').trim();
    const preview = cleanBody.length > 100 ? cleanBody.slice(0, 97) + '…' : cleanBody;
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'CHAT_MESSAGE',
      title: cleanSender,
      body: preview,
      data: {
        type: 'CHAT_MESSAGE',
        recipientId,
        senderName: cleanSender,
        senderId: extraData?.senderId,
        conversationId: extraData?.conversationId,
        messageId: extraData?.messageId,
      },
      channelId: 'messages',
      priority: 'high',
      idempotencyKey: extraData?.messageId ? `msg:${extraData.messageId}:${recipientId}` : undefined,
    });
  }

  /**
   * 2. Mentions Notification (@ Mention in chat or post)
   */
  static async notifyMention(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    extraData?: { conversationId?: string; senderId?: string; messageId?: string; senderName?: string; postId?: string }
  ): Promise<any> {
    const preview = messagePreview.length > 100 ? messagePreview.slice(0, 97) + '…' : messagePreview;
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'MENTION',
      title: 'Mentions',
      body: `${senderName} mentioned you: "${preview}"`,
      data: {
        type: 'MENTION',
        recipientId,
        senderName,
        senderId: extraData?.senderId,
        conversationId: extraData?.conversationId,
        messageId: extraData?.messageId,
        postId: extraData?.postId,
      },
      channelId: 'messages',
      priority: 'high',
      idempotencyKey: extraData?.messageId ? `mention:${extraData.messageId}:${recipientId}` : undefined,
    });
  }

  /**
   * 3. Missed Call Notification
   */
  static async notifyMissedCall(
    recipientId: string,
    callerName: string,
    callType: 'audio' | 'video',
    callId: string,
    extraData?: { callerId?: string; conversationId?: string }
  ): Promise<any> {
    const callTypeName = callType === 'video' ? 'video' : 'audio';
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'MISSED_CALL',
      title: 'Missed Call Notifications',
      body: `Missed ${callTypeName} call from ${callerName}`,
      data: {
        type: 'MISSED_CALL',
        callType,
        callId,
        recipientId,
        callerId: extraData?.callerId,
        callerName,
        conversationId: extraData?.conversationId,
      },
      channelId: 'messages',
      priority: 'high',
      idempotencyKey: `missed:${callId}:${recipientId}`,
    });
  }

  /**
   * 4. Friend Request Received
   */
  static async notifyFriendRequest(
    recipientId: string,
    senderName: string,
    senderId?: string
  ): Promise<any> {
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'FRIEND_REQUEST',
      title: '👥 New Friend Request',
      body: `${senderName} wants to be your friend`,
      data: {
        type: 'FRIEND_REQUEST',
        recipientId,
        senderName,
        senderId,
      },
      channelId: 'social',
      priority: 'high',
      idempotencyKey: senderId ? `freq:${senderId}:${recipientId}` : undefined,
    });
  }

  /**
   * 5. Friend Request Accepted
   */
  static async notifyFriendRequestAccepted(
    recipientId: string,
    acceptorName: string,
    acceptorId?: string
  ): Promise<any> {
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'FRIEND_ACCEPTED',
      title: '🎉 Friend Request Accepted',
      body: `${acceptorName} accepted your friend request!`,
      data: {
        type: 'FRIEND_ACCEPTED',
        recipientId,
        acceptorName,
        acceptorId,
      },
      channelId: 'social',
      priority: 'high',
      idempotencyKey: acceptorId ? `facc:${acceptorId}:${recipientId}` : undefined,
    });
  }

  /**
   * 6. Game Invite Received
   */
  static async notifyGameInvite(
    recipientId: string,
    inviterName: string,
    gameName: string,
    roomCode: string,
    extraData?: { inviterId?: string; gameType?: string; conversationId?: string }
  ): Promise<any> {
    return await this.createAndDeliver({
      userId: recipientId,
      type: 'GAME_INVITE',
      title: `🎮 Game Invite from ${inviterName}`,
      body: `Join ${gameName} • Room ${roomCode}`,
      data: {
        type: 'GAME_INVITE',
        recipientId,
        inviterName,
        inviterId: extraData?.inviterId,
        gameName,
        roomCode,
        gameType: extraData?.gameType,
        conversationId: extraData?.conversationId,
      },
      channelId: 'games',
      priority: 'high',
      idempotencyKey: `ginv:${roomCode}:${recipientId}`,
    });
  }

  /**
   * 7. Transient Incoming Call Notification (Push only while ringing)
   */
  static async notifyIncomingCall(
    recipientId: string,
    callerName: string,
    callType: 'audio' | 'video',
    callId: string
  ): Promise<void> {
    const token = await this.getToken(recipientId, false);
    if (!token) return;

    void this.send([
      {
        to: token,
        title: callType === 'video' ? `📹 Incoming Video Call` : `📞 Incoming Audio Call`,
        body: `${callerName} is calling you...`,
        data: { type: 'INCOMING_CALL', callType, callId, recipientId },
        sound: 'default',
        channelId: 'messages',
        priority: 'high',
      },
    ]);
  }

  /**
   * 8. Achievement Unlocked
   */
  static async notifyAchievementUnlocked(
    userId: string,
    achievementTitle: string,
    achievementDescription: string,
    achievementId?: string
  ): Promise<any> {
    return await this.createAndDeliver({
      userId,
      type: 'ACHIEVEMENT',
      title: '🏆 Achievement Unlocked!',
      body: `${achievementTitle} — ${achievementDescription}`,
      data: {
        type: 'ACHIEVEMENT',
        userId,
        achievementTitle,
        achievementDescription,
        achievementId,
      },
      channelId: 'achievements',
      priority: 'high',
      idempotencyKey: achievementId ? `ach:${userId}:${achievementId}` : undefined,
    });
  }

  /**
   * 9. Multiplayer Game Turn Reminder
   */
  static async notifyYourTurn(
    userId: string,
    gameName: string,
    roomCode: string
  ): Promise<any> {
    return await this.createAndDeliver({
      userId,
      type: 'YOUR_TURN',
      title: `⏰ Your Turn in ${gameName}`,
      body: `Don't keep your opponent waiting! Room: ${roomCode}`,
      data: {
        type: 'YOUR_TURN',
        userId,
        gameName,
        roomCode,
      },
      channelId: 'games',
      priority: 'high',
      idempotencyKey: `turn:${roomCode}:${userId}`,
    });
  }
}
