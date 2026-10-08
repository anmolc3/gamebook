import { prisma } from '../database/prisma';
import { SendMessageInput } from './chat.validation';
import { emitToUser, isUserOnline } from '../sockets/socket.server';
import { PushNotificationService } from '../notifications/push.service';

export class ChatService {
  /**
   * List all conversations for the authenticated user with unread counts and peer profile
   */
  static async getConversations(userId: string) {
    const userMemberships = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const conversations = await Promise.all(
      userMemberships.map(async (m) => {
        const conv = m.conversation;
        const peerMember = conv.members.find((mem) => mem.userId !== userId);
        const peerUser = peerMember?.user;
        const peerProfile = peerUser?.profile;

        // Count unread incoming messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            status: { in: ['SENT', 'DELIVERED'] },
          },
        });

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          updatedAt: lastMessage?.createdAt || conv.updatedAt,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                type: lastMessage.type,
                status: lastMessage.status,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          peer: peerUser
            ? {
                id: peerUser.id,
                username: peerUser.username,
                displayName: peerProfile?.displayName || peerUser.username,
                avatarUrl: peerProfile?.avatarUrl || null,
                isOnline: peerProfile?.isOnline || false,
                lastSeen: peerProfile?.lastSeen || peerUser.createdAt,
              }
            : null,
        };
      })
    );

    // Sort conversations with most recent activity first
    return conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Find an existing 1-on-1 conversation or create one
   */
  static async getOrCreateConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new Error('You cannot start a conversation with yourself');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });

    if (!recipient) {
      throw new Error('Player not found');
    }

    // Verify neither user has blocked the other
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: userId },
        ],
      },
    });

    if (block) {
      throw new Error('Cannot communicate with this player');
    }

    // Check if conversation already exists between both users
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      const peerMember = existing.members.find((m) => m.userId !== userId);
      return {
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        peer: {
          id: recipient.id,
          username: recipient.username,
          displayName: recipient.profile?.displayName || recipient.username,
          avatarUrl: recipient.profile?.avatarUrl || null,
          isOnline: recipient.profile?.isOnline || false,
          lastSeen: recipient.profile?.lastSeen || recipient.createdAt,
        },
        lastMessage: existing.messages[0] || null,
      };
    }

    // Create new conversation with members atomically
    const newConv = await prisma.conversation.create({
      data: {
        members: {
          create: [{ userId }, { userId: recipientId }],
        },
      },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    return {
      id: newConv.id,
      createdAt: newConv.createdAt,
      updatedAt: newConv.updatedAt,
      peer: {
        id: recipient.id,
        username: recipient.username,
        displayName: recipient.profile?.displayName || recipient.username,
        avatarUrl: recipient.profile?.avatarUrl || null,
        isOnline: recipient.profile?.isOnline || false,
        lastSeen: recipient.profile?.lastSeen || recipient.createdAt,
      },
      lastMessage: null,
    };
  }

  /**
   * Fetch messages in a conversation and automatically mark unread incoming messages as READ
   */
  static async getMessages(userId: string, conversationId: string, limit = 50) {
    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this conversation');
    }

    // Mark any incoming unread messages as READ
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      select: { id: true, senderId: true },
    });

    if (unreadMessages.length > 0) {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: { not: 'READ' },
        },
        data: { status: 'READ' },
      });

      // Notify the original sender that their messages were read
      const peerId = unreadMessages[0].senderId;
      emitToUser(peerId, 'chat:messages_read', {
        conversationId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    }

    // Fetch chronological messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          include: { profile: true },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.profile?.displayName || m.sender.username,
      content: m.content,
      type: m.type,
      status: m.status,
      metadata: m.metadata,
      createdAt: m.createdAt,
      isOwnMessage: m.senderId === userId,
    }));
  }

  /**
   * Send a message in a conversation and dispatch real-time events
   */
  static async sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
    // Verify membership
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv) {
      throw new Error('Conversation not found');
    }

    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this conversation');
    }

    const peerMember = conv.members.find((m) => m.userId !== userId);
    const peerId = peerMember?.userId;

    if (peerId) {
      // Check block
      const block = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: peerId },
            { blockerId: peerId, blockedId: userId },
          ],
        },
      });
      if (block) {
        throw new Error('Cannot send messages to a blocked player');
      }
    }

    // Determine initial delivery status
    const recipientOnline = peerId ? isUserOnline(peerId) : false;
    const initialStatus = recipientOnline ? 'DELIVERED' : 'SENT';

    const senderMember = conv.members.find((m) => m.userId === userId);
    const senderProfile = senderMember?.user.profile;
    const senderName = senderProfile?.displayName || senderMember?.user.username || 'Player';

    // Create message in database
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: input.content.trim(),
        type: input.type as any,
        status: initialStatus as any,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const messagePayload = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName,
      content: message.content,
      type: message.type,
      status: message.status,
      metadata: message.metadata,
      createdAt: message.createdAt,
    };

    // Real-time dispatch to peer's personal room
    if (peerId) {
      emitToUser(peerId, 'chat:message_received', messagePayload);

      // Push notification — only fires when recipient is offline
      if (!recipientOnline) {
        if (input.type === 'GAME_INVITE' && input.metadata) {
          // Extract room code and game name from invite metadata
          const meta = input.metadata as any;
          const roomCode: string = meta?.roomCode || '';
          const gameName: string = meta?.gameName || 'a game';
          PushNotificationService.notifyGameInvite(
            peerId,
            senderName,
            gameName,
            roomCode
          ).catch(() => null);
        } else {
          const preview = input.content.trim();
          PushNotificationService.notifyNewMessage(peerId, senderName, preview).catch(() => null);
        }
      }
    }

    return {
      ...messagePayload,
      isOwnMessage: true,
    };
  }

  /**
   * Explicitly mark all unread messages in conversation as READ
   */
  static async markAsRead(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new Error('Conversation not found');
    }

    const peerMember = conv.members.find((m) => m.userId !== userId);
    const peerId = peerMember?.userId;

    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    if (peerId && result.count > 0) {
      emitToUser(peerId, 'chat:messages_read', {
        conversationId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    }

    return { conversationId, markedCount: result.count };
  }

  /**
   * Open and mark a view-once message as opened
   */
  static async openViewOnceMessage(userId: string, conversationId: string, messageId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new Error('Message not found');
    }

    const currentMeta = (message.metadata as any) || {};
    if (!currentMeta.isViewOnce) {
      throw new Error('This message is not a view-once media');
    }

    const updatedMetadata = {
      ...currentMeta,
      opened: true,
      openedAt: new Date().toISOString(),
      openedBy: userId,
    };

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: updatedMetadata,
      },
    });

    // Notify peer in real time
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (conv) {
      conv.members.forEach((m) => {
        emitToUser(m.userId, 'chat:view_once_opened', {
          conversationId,
          messageId,
          openedAt: updatedMetadata.openedAt,
        });
      });
    }

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      metadata: updated.metadata,
    };
  }
}
