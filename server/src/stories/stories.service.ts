import { prisma } from '../database/prisma';
import { emitToUser } from '../sockets/socket.server';
import { PushNotificationService } from '../notifications/push.service';

export interface CreateStoryDto {
  mediaUrl: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'TEXT';
  caption?: string;
  privacy?: 'FRIENDS' | 'SELECTED' | 'PRIVATE';
  gameResultId?: string;
}

export class StoriesService {
  /**
   * Create an ephemeral 24-hour story
   */
  static async createStory(userId: string, data: CreateStoryDto) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const story = await prisma.story.create({
      data: {
        userId,
        mediaUrl: data.mediaUrl || 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        mediaType: (data.mediaType as any) || 'IMAGE',
        caption: data.caption || null,
        privacy: (data.privacy as any) || 'FRIENDS',
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Notify online friends via socket (if privacy is not PRIVATE)
    if (data.privacy !== 'PRIVATE') {
      try {
        const friendships = await prisma.friendship.findMany({
          where: { userId },
          select: { friendId: true },
        });

        const blocks = await prisma.blockedUser.findMany({
          where: {
            OR: [{ blockerId: userId }, { blockedId: userId }],
          },
        });
        const blockedIds = new Set(
          blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))
        );

        const eligibleFriends = friendships.filter((f) => !blockedIds.has(f.friendId));

        eligibleFriends.forEach((f) => {
          emitToUser(f.friendId, 'story:new', {
            storyId: story.id,
            userId,
            username: story.user.username,
            displayName: story.user.profile?.displayName || story.user.username,
            avatarUrl: story.user.profile?.avatarUrl,
            createdAt: story.createdAt.toISOString(),
          });
        });
      } catch (err) {
        console.error('[StoriesService] Failed to emit friend story notifications:', err);
      }
    }

    return story;
  }

  /**
   * Retrieve active stories feed for current user (friends + self)
   */
  static async getFeed(currentUserId: string) {
    const now = new Date();

    // 1. Get blocked user IDs in either direction
    const blocks = await prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
    });
    const blockedIds = new Set(
      blocks.map((b) => (b.blockerId === currentUserId ? b.blockedId : b.blockerId))
    );

    // 2. Get friend IDs (excluding any blocked users)
    const friendships = await prisma.friendship.findMany({
      where: { userId: currentUserId },
      select: { friendId: true },
    });
    const allowedUserIds = [currentUserId, ...friendships.map((f) => f.friendId)].filter(
      (id) => !blockedIds.has(id)
    );

    // 3. Query unexpired stories (respecting privacy: PRIVATE only visible to self)
    const activeStories = await prisma.story.findMany({
      where: {
        userId: { in: allowedUserIds },
        expiresAt: { gt: now },
        OR: [
          { userId: currentUserId },
          { privacy: 'FRIENDS' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        views: {
          select: {
            viewerId: true,
            viewedAt: true,
          },
        },
        replies: {
          select: {
            id: true,
            userId: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    // 4. Group stories by user for tray format
    const userStoryMap = new Map<string, any>();

    for (const story of activeStories) {
      const uId = story.userId;
      const hasViewed = story.views.some((v) => v.viewerId === currentUserId);

      if (!userStoryMap.has(uId)) {
        userStoryMap.set(uId, {
          userId: uId,
          username: story.user.username,
          displayName: story.user.profile?.displayName || story.user.username,
          avatarUrl: story.user.profile?.avatarUrl || null,
          isSelf: uId === currentUserId,
          allViewed: true,
          stories: [],
        });
      }

      const userBucket = userStoryMap.get(uId);
      if (!hasViewed) {
        userBucket.allViewed = false;
      }

      userBucket.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
        viewsCount: story.views.length,
        hasViewed,
      });
    }

    const trays = Array.from(userStoryMap.values());

    // Sort: self first, then users with unviewed stories, then viewed
    trays.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (!a.allViewed && b.allViewed) return -1;
      if (a.allViewed && !b.allViewed) return 1;
      return 0;
    });

    return trays;
  }

  /**
   * Mark story as viewed
   */
  static async viewStory(viewerId: string, storyId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, userId: true, expiresAt: true, privacy: true },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    if (new Date(story.expiresAt) <= new Date()) {
      throw new Error('Story has expired');
    }

    if (story.userId !== viewerId) {
      if (story.privacy === 'PRIVATE') {
        throw new Error('Unauthorized to view private story');
      }

      const isBlocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: story.userId },
            { blockerId: story.userId, blockedId: viewerId },
          ],
        },
      });

      if (isBlocked) {
        throw new Error('Cannot view story of a blocked user');
      }
    }

    const existing = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
    });

    if (existing) {
      return { viewed: true, alreadyViewed: true };
    }

    const view = await prisma.storyView.create({
      data: {
        storyId,
        viewerId,
      },
    });

    return { viewed: true, viewId: view.id };
  }

  /**
   * Reply to a story
   */
  static async replyStory(userId: string, storyId: string, content: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true, expiresAt: true, privacy: true },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    if (new Date(story.expiresAt) <= new Date()) {
      throw new Error('Story has expired');
    }

    if (story.userId !== userId) {
      if (story.privacy === 'PRIVATE') {
        throw new Error('Cannot reply to private story');
      }

      const isBlocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: story.userId },
            { blockerId: story.userId, blockedId: userId },
          ],
        },
      });

      if (isBlocked) {
        throw new Error('Cannot reply to story of a blocked user');
      }
    }

    const reply = await prisma.storyReply.create({
      data: {
        storyId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            username: true,
            profile: {
              select: { displayName: true },
            },
          },
        },
      },
    });

    const senderName = reply.user.profile?.displayName || reply.user.username;

    // Notify story author in real-time
    emitToUser(story.userId, 'story:reply', {
      storyId,
      replyId: reply.id,
      senderId: userId,
      senderName,
      content,
      createdAt: reply.createdAt.toISOString(),
    });

    if (story.userId !== userId) {
      const preview = content.length > 80 ? content.slice(0, 77) + '…' : content;
      PushNotificationService.createAndDeliver({
        userId: story.userId,
        type: 'STORY_REPLY',
        title: '📖 Story Reply',
        body: `${senderName} replied to your story: "${preview}"`,
        data: {
          type: 'STORY_REPLY',
          storyId,
          senderId: userId,
          senderName,
          content,
        },
        channelId: 'social',
        priority: 'high',
        idempotencyKey: `sreply:${reply.id}:${story.userId}`,
      }).catch(() => null);
    }

    return reply;
  }

  /**
   * Delete user's own story
   */
  static async deleteStory(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    if (story.userId !== userId) {
      throw new Error('Unauthorized to delete this story');
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return { success: true };
  }
}
