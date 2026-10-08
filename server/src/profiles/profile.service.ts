import { prisma } from '../database/prisma';
import { isUserOnline } from '../sockets/socket.server';
import { UpdateProfileInput } from './profile.validation';

export class ProfileService {
  static async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        gameStats: true,
        achievements: {
          include: {
            achievement: true,
          },
        },
        _count: {
          select: {
            friendships: true,
            wonGames: true,
            stories: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new Error('Profile not found');
    }

    // Aggregate lifetime gaming statistics
    const totalMatches = user.gameStats.reduce((acc, stat) => acc + stat.matchesPlayed, 0);
    const totalWins = user.gameStats.reduce((acc, stat) => acc + stat.matchesWon, 0);
    const totalLosses = user.gameStats.reduce((acc, stat) => acc + stat.matchesLost, 0);
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
    const highestStreak = user.gameStats.reduce((acc, stat) => Math.max(acc, stat.highestStreak), 0);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.profile.displayName,
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      themePreference: user.profile.themePreference,
      appearanceMode: user.profile.appearanceMode,
      isOnline: isUserOnline(user.id) || user.profile.isOnline,
      lastSeen: user.profile.lastSeen,
      createdAt: user.createdAt,
      stats: {
        totalMatches,
        matchesPlayed: totalMatches,
        totalWins,
        matchesWon: totalWins,
        totalLosses,
        matchesLost: totalLosses,
        winRate,
        highestStreak,
        friendsCount: user._count.friendships,
        storiesCount: user._count.stories,
      },
      achievements: user.achievements.map((ua) => ({
        id: ua.achievement.id,
        key: ua.achievement.key,
        title: ua.achievement.title,
        description: ua.achievement.description,
        iconName: ua.achievement.iconName,
        unlockedAt: ua.unlockedAt,
      })),
      isOwnProfile: true,
      relationship: 'SELF',
      relationshipState: 'SELF',
    };
  }

  static async updateMyProfile(userId: string, data: UpdateProfileInput) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName ? { displayName: data.displayName.trim() } : {}),
        ...(data.bio !== undefined ? { bio: data.bio ? data.bio.trim() : null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.themePreference ? { themePreference: data.themePreference } : {}),
        ...(data.appearanceMode ? { appearanceMode: data.appearanceMode } : {}),
      },
    });

    return updated;
  }

  static async getUserProfile(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      return await this.getMyProfile(viewerId);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        gameStats: true,
        achievements: {
          include: {
            achievement: true,
          },
        },
        _count: {
          select: {
            friendships: true,
            wonGames: true,
          },
        },
      },
    });

    if (!targetUser || !targetUser.profile) {
      throw new Error('Player not found');
    }

    // Determine Relationship State
    let relationshipState: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED' = 'NONE';

    // 1. Check if blocked
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
    });

    if (block) {
      relationshipState = 'BLOCKED';
    } else {
      // 2. Check friendship
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: viewerId, friendId: targetUserId },
            { userId: targetUserId, friendId: viewerId },
          ],
        },
      });

      if (friendship) {
        relationshipState = 'FRIENDS';
      } else {
        // 3. Check pending friend requests
        const sentRequest = await prisma.friendRequest.findFirst({
          where: { senderId: viewerId, receiverId: targetUserId, status: 'PENDING' },
        });

        if (sentRequest) {
          relationshipState = 'REQUEST_SENT';
        } else {
          const receivedRequest = await prisma.friendRequest.findFirst({
            where: { senderId: targetUserId, receiverId: viewerId, status: 'PENDING' },
          });

          if (receivedRequest) {
            relationshipState = 'REQUEST_RECEIVED';
          }
        }
      }
    }

    // Aggregate stats
    const totalMatches = targetUser.gameStats.reduce((acc, stat) => acc + stat.matchesPlayed, 0);
    const totalWins = targetUser.gameStats.reduce((acc, stat) => acc + stat.matchesWon, 0);
    const totalLosses = targetUser.gameStats.reduce((acc, stat) => acc + stat.matchesLost, 0);
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    return {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.profile.displayName,
      bio: targetUser.profile.bio,
      avatarUrl: targetUser.profile.avatarUrl,
      isOnline: isUserOnline(targetUser.id) || targetUser.profile.isOnline,
      lastSeen: targetUser.profile.lastSeen,
      createdAt: targetUser.createdAt,
      stats: {
        totalMatches,
        matchesPlayed: totalMatches,
        totalWins,
        matchesWon: totalWins,
        totalLosses,
        matchesLost: totalLosses,
        winRate,
        friendsCount: targetUser._count.friendships,
      },
      achievements: targetUser.achievements.map((ua) => ({
        id: ua.achievement.id,
        key: ua.achievement.key,
        title: ua.achievement.title,
        description: ua.achievement.description,
        iconName: ua.achievement.iconName,
        unlockedAt: ua.unlockedAt,
      })),
      isOwnProfile: false,
      relationship: relationshipState,
      relationshipState,
    };
  }
}
