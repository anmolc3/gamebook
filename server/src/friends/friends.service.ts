import { prisma } from '../database/prisma';
import { emitToUser } from '../sockets/socket.server';
import { PushNotificationService } from '../notifications/push.service';

export class FriendsService {
  /**
   * Fetch all accepted friends with online status and basic gaming stats
   */
  static async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          include: {
            profile: true,
            gameStats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => {
      const friend = f.friend;
      const profile = friend.profile;
      const totalMatches = friend.gameStats.reduce((acc, stat) => acc + stat.matchesPlayed, 0);
      const totalWins = friend.gameStats.reduce((acc, stat) => acc + stat.matchesWon, 0);
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

      return {
        id: friend.id,
        username: friend.username,
        displayName: profile?.displayName || friend.username,
        avatarUrl: profile?.avatarUrl || null,
        bio: profile?.bio || null,
        isOnline: profile?.isOnline || false,
        lastSeen: profile?.lastSeen || friend.createdAt,
        totalMatches,
        totalWins,
        winRate,
        friendSince: f.createdAt,
      };
    });
  }

  /**
   * Fetch incoming and outgoing pending friend requests
   */
  static async getFriendRequests(userId: string) {
    const [incomingRequests, outgoingRequests] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: {
          sender: {
            include: {
              profile: true,
              gameStats: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friendRequest.findMany({
        where: { senderId: userId, status: 'PENDING' },
        include: {
          receiver: {
            include: {
              profile: true,
              gameStats: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatRequest = (req: any, target: 'sender' | 'receiver') => {
      const user = req[target];
      const profile = user.profile;
      const totalMatches = user.gameStats.reduce((acc: number, stat: any) => acc + stat.matchesPlayed, 0);
      const totalWins = user.gameStats.reduce((acc: number, stat: any) => acc + stat.matchesWon, 0);
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

      return {
        requestId: req.id,
        createdAt: req.createdAt,
        user: {
          id: user.id,
          username: user.username,
          displayName: profile?.displayName || user.username,
          avatarUrl: profile?.avatarUrl || null,
          bio: profile?.bio || null,
          isOnline: profile?.isOnline || false,
          totalMatches,
          totalWins,
          winRate,
        },
      };
    };

    return {
      incoming: incomingRequests.map((r) => formatRequest(r, 'sender')),
      outgoing: outgoingRequests.map((r) => formatRequest(r, 'receiver')),
    };
  }

  /**
   * Send a friend request or auto-accept if recipient already sent one
   */
  static async sendFriendRequest(senderId: string, targetUserId: string) {
    if (senderId === targetUserId) {
      throw new Error('You cannot add yourself as a friend');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!targetUser) {
      throw new Error('Target player not found');
    }

    // Check if blocked in either direction
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: senderId },
        ],
      },
    });

    if (block) {
      throw new Error('Unable to send friend request to this user');
    }

    // Check if already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: { userId: senderId, friendId: targetUserId },
    });

    if (existingFriendship) {
      throw new Error('You are already friends with this player');
    }

    // Check if target already sent a request to sender (cross-request) -> auto accept!
    const inverseRequest = await prisma.friendRequest.findFirst({
      where: { senderId: targetUserId, receiverId: senderId, status: 'PENDING' },
    });

    if (inverseRequest) {
      return await this.acceptFriendRequest(senderId, inverseRequest.id);
    }

    // Check if sender already has a pending request to target
    const existingPending = await prisma.friendRequest.findFirst({
      where: { senderId, receiverId: targetUserId, status: 'PENDING' },
    });

    if (existingPending) {
      throw new Error('Friend request already sent');
    }

    // Upsert friend request
    const request = await prisma.friendRequest.upsert({
      where: {
        senderId_receiverId: { senderId, receiverId: targetUserId },
      },
      update: {
        status: 'PENDING',
        updatedAt: new Date(),
      },
      create: {
        senderId,
        receiverId: targetUserId,
        status: 'PENDING',
      },
      include: {
        sender: {
          include: { profile: true },
        },
      },
    });

    // Notify recipient in real-time
    emitToUser(targetUserId, 'friend:request_received', {
      requestId: request.id,
      sender: {
        id: request.sender.id,
        username: request.sender.username,
        displayName: request.sender.profile?.displayName || request.sender.username,
        avatarUrl: request.sender.profile?.avatarUrl || null,
      },
      createdAt: request.createdAt,
    });

    // Push notification to recipient if they're offline
    const senderDisplayName = request.sender.profile?.displayName || request.sender.username;
    PushNotificationService.notifyFriendRequest(targetUserId, senderDisplayName).catch(() => null);

    return {
      requestId: request.id,
      status: 'PENDING',
      targetUserId,
    };
  }

  /**
   * Accept an incoming friend request
   */
  static async acceptFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new Error('You are not authorized to accept this friend request');
    }

    if (request.status === 'ACCEPTED') {
      throw new Error('Friend request has already been accepted');
    }

    const senderId = request.senderId;

    // Create bidirectional friendships in transaction
    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.friendship.upsert({
        where: { userId_friendId: { userId, friendId: senderId } },
        update: {},
        create: { userId, friendId: senderId },
      }),
      prisma.friendship.upsert({
        where: { userId_friendId: { userId: senderId, friendId: userId } },
        update: {},
        create: { userId: senderId, friendId: userId },
      }),
    ]);

    // Real-time notification to the original sender
    emitToUser(senderId, 'friend:request_accepted', {
      requestId,
      friend: {
        id: request.receiver.id,
        username: request.receiver.username,
        displayName: request.receiver.profile?.displayName || request.receiver.username,
        avatarUrl: request.receiver.profile?.avatarUrl || null,
        isOnline: request.receiver.profile?.isOnline || false,
      },
    });

    // Push notification to original sender if they're offline
    const acceptorName = request.receiver.profile?.displayName || request.receiver.username;
    PushNotificationService.notifyFriendRequestAccepted(senderId, acceptorName).catch(() => null);

    return {
      requestId,
      status: 'ACCEPTED',
      friendId: senderId,
      displayName: request.sender.profile?.displayName || request.sender.username,
    };
  }

  /**
   * Reject an incoming friend request
   */
  static async rejectFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId) {
      throw new Error('Friend request not found');
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { requestId, status: 'REJECTED' };
  }

  /**
   * Cancel an outgoing pending friend request
   */
  static async cancelFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.senderId !== userId) {
      throw new Error('Friend request not found');
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return { requestId, status: 'CANCELLED' };
  }

  /**
   * Remove a mutual friendship
   */
  static async removeFriend(userId: string, friendId: string) {
    await prisma.$transaction([
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId },
          ],
        },
      }),
    ]);

    emitToUser(friendId, 'friend:removed', { friendId: userId });

    return { friendId, removed: true };
  }

  /**
   * Search users by prefix / substring matching on username or displayName
   */
  static async searchUsers(userId: string, rawQuery: string) {
    const query = rawQuery.trim();
    if (!query || query.length < 2) {
      return [];
    }

    // 1. Get blocked user IDs in both directions
    const blocks = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    const blockedIds = new Set(
      blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))
    );

    // 2. Query potential matching users
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { profile: { displayName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: 20,
      include: {
        profile: true,
        gameStats: true,
      },
    });

    const activeUsers = users.filter((u) => !blockedIds.has(u.id));
    if (activeUsers.length === 0) {
      return [];
    }

    const candidateIds = activeUsers.map((u) => u.id);

    // 3. Batch query friendships and pending requests
    const [friendships, sentRequests, receivedRequests] = await Promise.all([
      prisma.friendship.findMany({
        where: { userId, friendId: { in: candidateIds } },
      }),
      prisma.friendRequest.findMany({
        where: { senderId: userId, receiverId: { in: candidateIds }, status: 'PENDING' },
      }),
      prisma.friendRequest.findMany({
        where: { senderId: { in: candidateIds }, receiverId: userId, status: 'PENDING' },
      }),
    ]);

    const friendIdSet = new Set(friendships.map((f) => f.friendId));
    const sentReqMap = new Map(sentRequests.map((r) => [r.receiverId, r.id]));
    const recvReqMap = new Map(receivedRequests.map((r) => [r.senderId, r.id]));

    return activeUsers.map((user) => {
      let relationship: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' = 'NONE';
      let requestId: string | undefined;

      if (friendIdSet.has(user.id)) {
        relationship = 'FRIENDS';
      } else if (sentReqMap.has(user.id)) {
        relationship = 'REQUEST_SENT';
        requestId = sentReqMap.get(user.id);
      } else if (recvReqMap.has(user.id)) {
        relationship = 'REQUEST_RECEIVED';
        requestId = recvReqMap.get(user.id);
      }

      const totalMatches = user.gameStats.reduce((acc, stat) => acc + stat.matchesPlayed, 0);
      const totalWins = user.gameStats.reduce((acc, stat) => acc + stat.matchesWon, 0);
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

      return {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl || null,
        bio: user.profile?.bio || null,
        isOnline: user.profile?.isOnline || false,
        totalMatches,
        totalWins,
        winRate,
        relationship,
        requestId,
      };
    });
  }

  /**
   * Block a player and clean up relationships
   */
  static async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself');
    }

    await prisma.$transaction([
      prisma.blockedUser.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        update: {},
        create: { blockerId, blockedId },
      }),
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId: blockerId, friendId: blockedId },
            { userId: blockedId, friendId: blockerId },
          ],
        },
      }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
    ]);

    return { blockedId, blocked: true };
  }

  /**
   * Unblock a previously blocked player
   */
  static async unblockUser(blockerId: string, blockedId: string) {
    await prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });

    return { blockedId, unblocked: true };
  }

  /**
   * List all users blocked by the caller
   */
  static async getBlockedUsers(userId: string) {
    const blocks = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((b) => ({
      id: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.profile?.displayName || b.blocked.username,
      avatarUrl: b.blocked.profile?.avatarUrl || null,
      blockedAt: b.createdAt,
    }));
  }

  /**
   * Get suggested players for a user (e.g. newly registered or discovering local players)
   * Suggests existing players, players who live nearby, and active gamers in the arena
   */
  static async getSuggestedUsers(userId: string, limit = 15) {
    // 1. Get blocked users to exclude
    const blocks = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = new Set(
      blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))
    );
    blockedIds.add(userId);

    // 2. Get existing friends to exclude
    const existingFriendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });
    const friendIdSet = new Set(existingFriendships.map((f) => f.friendId));

    // 3. Find candidate users
    const candidates = await prisma.user.findMany({
      where: {
        id: {
          notIn: Array.from(new Set([...blockedIds, ...friendIdSet])),
        },
      },
      include: {
        profile: true,
        gameStats: true,
      },
      take: limit * 2,
      orderBy: [
        { profile: { isOnline: 'desc' } },
        { profile: { lastSeen: 'desc' } },
      ],
    });

    if (candidates.length === 0) {
      return [];
    }

    const candidateIds = candidates.map((u) => u.id);

    // 4. Batch query pending friend requests
    const [sentRequests, receivedRequests] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { senderId: userId, receiverId: { in: candidateIds }, status: 'PENDING' },
      }),
      prisma.friendRequest.findMany({
        where: { senderId: { in: candidateIds }, receiverId: userId, status: 'PENDING' },
      }),
    ]);

    const sentReqMap = new Map(sentRequests.map((r) => [r.receiverId, r.id]));
    const recvReqMap = new Map(receivedRequests.map((r) => [r.senderId, r.id]));

    // Proximity badges for nearby & community gamers
    const proximityBadges = [
      'Lives Around You 📍',
      'Nearby Gamer 📍',
      'Active In Your Area ⚡',
      'Plays In Your Region 🎮',
      'Popular Nearby Player 🏆',
    ];

    return candidates.slice(0, limit).map((user, index) => {
      let relationship: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' = 'NONE';
      let requestId: string | undefined;

      if (sentReqMap.has(user.id)) {
        relationship = 'REQUEST_SENT';
        requestId = sentReqMap.get(user.id);
      } else if (recvReqMap.has(user.id)) {
        relationship = 'REQUEST_RECEIVED';
        requestId = recvReqMap.get(user.id);
      }

      const totalMatches = user.gameStats.reduce((acc, stat) => acc + stat.matchesPlayed, 0);
      const totalWins = user.gameStats.reduce((acc, stat) => acc + stat.matchesWon, 0);
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

      let suggestionReason = proximityBadges[index % proximityBadges.length];
      if (user.profile?.isOnline) {
        suggestionReason = 'Lives Near You • Online Now ⚡';
      } else if (totalWins >= 5) {
        suggestionReason = `Lives Near You • ${totalWins} Wins 🏆`;
      }

      return {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl || null,
        bio: user.profile?.bio || null,
        isOnline: user.profile?.isOnline || false,
        totalMatches,
        totalWins,
        winRate,
        relationship,
        requestId,
        suggestionReason,
      };
    });
  }
}
