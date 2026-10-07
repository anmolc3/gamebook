import { prisma } from '../database/prisma';
import { emitToUser } from '../sockets/socket.server';

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

    // Notify online friends via socket
    try {
      const friends = await prisma.friendship.findMany({
        where: { userId },
        select: { friendId: true },
      });

      friends.forEach((f) => {
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

    return story;
  }

  /**
   * Retrieve active stories feed for current user (friends + self)
   */
  static async getFeed(currentUserId: string) {
    const now = new Date();

    // 1. Get friend IDs
    const friendships = await prisma.friendship.findMany({
      where: { userId: currentUserId },
      select: { friendId: true },
    });
    const allowedUserIds = [currentUserId, ...friendships.map((f) => f.friendId)];

    // 2. Query unexpired stories
    const activeStories = await prisma.story.findMany({
      where: {
        userId: { in: allowedUserIds },
        expiresAt: { gt: now },
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

    // 3. Group stories by user for tray format
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
      select: { userId: true },
    });

    if (!story) {
      throw new Error('Story not found');
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

    // Notify story author in real-time
    emitToUser(story.userId, 'story:reply', {
      storyId,
      replyId: reply.id,
      senderId: userId,
      senderName: reply.user.profile?.displayName || reply.user.username,
      content,
      createdAt: reply.createdAt.toISOString(),
    });

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
