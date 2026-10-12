import { Socket } from 'socket.io';
import { prisma } from '../database/prisma';
import { PresencePrivacy } from '@prisma/client';

export class PresenceService {
  // Multi-device connection tracking: userId -> Set of active socket IDs
  private static activeSockets: Map<string, Set<string>> = new Map();

  // Debounced disconnect timers for mobile reconnection resilience
  private static disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Disconnect grace period in milliseconds (4 seconds)
  private static readonly DISCONNECT_GRACE_MS = 4000;

  /**
   * Check if a user is currently connected on at least one device
   */
  static isUserOnline(userId: string): boolean {
    const sockets = this.activeSockets.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  /**
   * Register a new socket connection for a user
   * Returns true if this is the user's first connection (transitioned to ONLINE)
   */
  static handleSocketConnect(userId: string, socketId: string): boolean {
    // If a disconnect timer was pending for this user, cancel it immediately
    const existingTimer = this.disconnectTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(userId);
    }

    let sockets = this.activeSockets.get(userId);
    const isFirstConnection = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set();
      this.activeSockets.set(userId, sockets);
    }
    sockets.add(socketId);

    return isFirstConnection;
  }

  /**
   * Handle socket disconnection
   * Schedules a debounced offline transition if all connections from this user have closed
   */
  static handleSocketDisconnect(
    userId: string,
    socketId: string,
    onOfflineTransition: (now: Date) => Promise<void>
  ): void {
    const sockets = this.activeSockets.get(userId);
    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.activeSockets.delete(userId);

      // Debounce offline transition to account for transient network drops / app lifecycle
      const timer = setTimeout(async () => {
        this.disconnectTimers.delete(userId);

        // Verify user didn't reconnect during grace period
        if (!this.isUserOnline(userId)) {
          const now = new Date();
          await prisma.profile.updateMany({
            where: { userId },
            data: { isOnline: false, lastSeen: now },
          }).catch(() => null);

          await onOfflineTransition(now);
        }
      }, this.DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(userId, timer);
    }
  }

  /**
   * Verify if viewer is blocked by target or blocked target
   */
  static async isBlocked(viewerId: string, targetUserId: string): Promise<boolean> {
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    });
    return !!block;
  }

  /**
   * Verify if viewer and target are accepted friends
   */
  static async isFriend(viewerId: string, targetUserId: string): Promise<boolean> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: viewerId, friendId: targetUserId },
          { userId: targetUserId, friendId: viewerId },
        ],
      },
      select: { id: true },
    });
    return !!friendship;
  }

  /**
   * Authoritative check: Can viewerId see targetUserId's online status?
   */
  static async canViewOnline(
    viewerId: string,
    targetUserId: string,
    targetPrivacy?: PresencePrivacy
  ): Promise<boolean> {
    if (viewerId === targetUserId) return true;

    // Blocked users can NEVER see online status
    if (await this.isBlocked(viewerId, targetUserId)) return false;

    // Fetch privacy setting if not provided
    let privacy = targetPrivacy;
    if (!privacy) {
      const profile = await prisma.profile.findUnique({
        where: { userId: targetUserId },
        select: { onlinePrivacy: true },
      });
      privacy = profile?.onlinePrivacy || PresencePrivacy.EVERYONE;
    }

    if (privacy === PresencePrivacy.NOBODY) return false;
    if (privacy === PresencePrivacy.EVERYONE) return true;
    if (privacy === PresencePrivacy.MY_FRIENDS) {
      return await this.isFriend(viewerId, targetUserId);
    }

    return false;
  }

  /**
   * Authoritative check: Can viewerId see targetUserId's last-seen timestamp?
   */
  static async canViewLastSeen(
    viewerId: string,
    targetUserId: string,
    targetPrivacy?: PresencePrivacy
  ): Promise<boolean> {
    if (viewerId === targetUserId) return true;

    // Blocked users can NEVER see last-seen timestamp
    if (await this.isBlocked(viewerId, targetUserId)) return false;

    let privacy = targetPrivacy;
    if (!privacy) {
      const profile = await prisma.profile.findUnique({
        where: { userId: targetUserId },
        select: { lastSeenPrivacy: true },
      });
      privacy = profile?.lastSeenPrivacy || PresencePrivacy.EVERYONE;
    }

    if (privacy === PresencePrivacy.NOBODY) return false;
    if (privacy === PresencePrivacy.EVERYONE) return true;
    if (privacy === PresencePrivacy.MY_FRIENDS) {
      return await this.isFriend(viewerId, targetUserId);
    }

    return false;
  }

  /**
   * Filters presence fields for a specific viewer based on privacy and blocks
   */
  static async filterPresenceForViewer(
    viewerId: string,
    target: {
      id: string;
      profile?: {
        onlinePrivacy?: PresencePrivacy;
        lastSeenPrivacy?: PresencePrivacy;
        isOnline?: boolean;
        lastSeen?: Date | null;
      } | null;
    }
  ): Promise<{ isOnline: boolean; lastSeen: string | null }> {
    const targetUserId = target.id;
    if (viewerId === targetUserId) {
      const isOnline = this.isUserOnline(targetUserId) || (target.profile?.isOnline ?? false);
      const lastSeen = target.profile?.lastSeen ? target.profile.lastSeen.toISOString() : null;
      return { isOnline, lastSeen };
    }

    const onlinePrivacy = target.profile?.onlinePrivacy || PresencePrivacy.EVERYONE;
    const lastSeenPrivacy = target.profile?.lastSeenPrivacy || PresencePrivacy.EVERYONE;

    const [canSeeOnline, canSeeLastSeen] = await Promise.all([
      this.canViewOnline(viewerId, targetUserId, onlinePrivacy),
      this.canViewLastSeen(viewerId, targetUserId, lastSeenPrivacy),
    ]);

    const actualOnline = this.isUserOnline(targetUserId) || (target.profile?.isOnline ?? false);
    const actualLastSeen = target.profile?.lastSeen ? target.profile.lastSeen.toISOString() : null;

    return {
      isOnline: canSeeOnline ? actualOnline : false,
      lastSeen: canSeeLastSeen ? actualLastSeen : null,
    };
  }

  /**
   * Broadcast targeted presence updates to authorized friends and chat peers
   */
  static async notifyAuthorizedRecipients(
    userId: string,
    isOnline: boolean,
    lastSeen: Date,
    emitToUser: (recipientId: string, event: string, payload: any) => void
  ): Promise<void> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { onlinePrivacy: true, lastSeenPrivacy: true },
      });

      const onlinePrivacy = profile?.onlinePrivacy || PresencePrivacy.EVERYONE;
      const lastSeenPrivacy = profile?.lastSeenPrivacy || PresencePrivacy.EVERYONE;

      // If set to NOBODY for both, no presence details are shared
      if (onlinePrivacy === PresencePrivacy.NOBODY && lastSeenPrivacy === PresencePrivacy.NOBODY) {
        // Send hidden presence to friends so they know user is not broadcasting
        const friendships = await prisma.friendship.findMany({
          where: { userId },
          select: { friendId: true },
        });

        for (const item of friendships) {
          emitToUser(item.friendId, 'presence:update', {
            userId,
            isOnline: false,
            lastSeen: null,
          });
        }
        return;
      }

      // Collect all potential subscribers: friends + active conversation partners
      const [friendships, conversations] = await Promise.all([
        prisma.friendship.findMany({
          where: { userId },
          select: { friendId: true },
        }),
        prisma.conversationMember.findMany({
          where: {
            conversation: {
              members: { some: { userId } },
            },
            userId: { not: userId },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      const subscriberIds = new Set<string>();
      friendships.forEach((f) => subscriberIds.add(f.friendId));
      conversations.forEach((c) => subscriberIds.add(c.userId));

      for (const subscriberId of subscriberIds) {
        const [canSeeOnline, canSeeLastSeen] = await Promise.all([
          this.canViewOnline(subscriberId, userId, onlinePrivacy),
          this.canViewLastSeen(subscriberId, userId, lastSeenPrivacy),
        ]);

        emitToUser(subscriberId, 'presence:update', {
          userId,
          isOnline: canSeeOnline ? isOnline : false,
          lastSeen: canSeeLastSeen ? lastSeen.toISOString() : null,
        });
      }
    } catch (err) {
      console.error('[PresenceService] Failed to dispatch presence updates:', err);
    }
  }

  /**
   * Initial sync of friends' presence to a newly connected user
   */
  static async syncFriendsPresenceToUser(userId: string, targetSocket: Socket): Promise<void> {
    try {
      const friendships = await prisma.friendship.findMany({
        where: { userId },
        select: {
          friendId: true,
          friend: {
            select: {
              profile: {
                select: {
                  isOnline: true,
                  lastSeen: true,
                  onlinePrivacy: true,
                  lastSeenPrivacy: true,
                },
              },
            },
          },
        },
      });

      for (const item of friendships) {
        const friendId = item.friendId;
        const profile = item.friend.profile;

        const filtered = await this.filterPresenceForViewer(userId, {
          id: friendId,
          profile,
        });

        targetSocket.emit('presence:update', {
          userId: friendId,
          isOnline: filtered.isOnline,
          lastSeen: filtered.lastSeen,
        });
      }
    } catch (err) {
      console.error('[PresenceService] Failed to sync friends presence:', err);
    }
  }

  /**
   * Responds to an on-demand presence query for a specific user
   */
  static async queryUserPresence(viewerId: string, targetUserId: string): Promise<{ isOnline: boolean; lastSeen: string | null }> {
    const profile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: {
        isOnline: true,
        lastSeen: true,
        onlinePrivacy: true,
        lastSeenPrivacy: true,
      },
    });

    return await this.filterPresenceForViewer(viewerId, {
      id: targetUserId,
      profile,
    });
  }
}
