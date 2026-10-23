import { prisma } from '../database/prisma';
import { PresencePrivacy } from '@prisma/client';
import {
  SendMessageInput,
  CreateGroupInput,
  UpdateGroupInput,
  AddMembersInput,
  UpdateMemberRoleInput,
} from './chat.validation';
import {
  emitToUser,
  emitToConversation,
  isUserOnline,
  isUserInConversation,
  getUsersInConversation,
} from '../sockets/socket.server';
import { PushNotificationService } from '../notifications/push.service';

export class ChatService {
  /**
   * List all conversations (both 1-on-1 and groups) for the authenticated user
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
              include: {
                sender: {
                  include: { profile: true },
                },
              },
            },
          },
        },
      },
    });

    const convIds = userMemberships.map((m) => m.conversation.id);

    // Count unread incoming messages accurately using normalized per-user MessageReceipt in a single query
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: convIds },
        senderId: { not: userId },
        NOT: {
          receipts: {
            some: {
              userId,
              status: 'READ',
            },
          },
        },
      },
      select: {
        conversationId: true,
      },
    });

    const unreadCountMap = new Map<string, number>();
    for (const msg of unreadMessages) {
      unreadCountMap.set(msg.conversationId, (unreadCountMap.get(msg.conversationId) || 0) + 1);
    }

    const conversations = userMemberships.map((m) => {
      const conv = m.conversation;
      const unreadCount = unreadCountMap.get(conv.id) || 0;

        const lastMessage = conv.messages[0] || null;

        if (conv.isGroup) {
          const membersList = conv.members.map((mem) => {
            const u = mem.user;
            const p = u.profile;
            return {
              id: mem.id,
              userId: mem.userId,
              role: mem.role,
              username: u.username,
              displayName: p?.displayName || u.username,
              avatarUrl: p?.avatarUrl || null,
              isOnline: isUserOnline(u.id) || (p?.isOnline ?? false),
              lastSeen: p?.lastSeen || u.createdAt,
            };
          });

          return {
            id: conv.id,
            isGroup: true,
            updatedAt: lastMessage?.createdAt || conv.updatedAt,
            unreadCount,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  type: lastMessage.type,
                  status: lastMessage.status,
                  senderId: lastMessage.senderId,
                  senderName:
                    lastMessage.sender?.profile?.displayName ||
                    lastMessage.sender?.username ||
                    'Member',
                  createdAt: lastMessage.createdAt,
                }
              : null,
            group: {
              id: conv.id,
              title: conv.title || 'Group Chat',
              description: conv.description || '',
              avatarUrl: conv.avatarUrl || null,
              creatorId: conv.creatorId || '',
              memberCount: membersList.length,
              userRole: m.role,
              members: membersList,
            },
            peer: null,
          };
        }

        // Standard 1-on-1 Chat
        const peerMember = conv.members.find((mem) => mem.userId !== userId);
        const peerUser = peerMember?.user;
        const peerProfile = peerUser?.profile;

        return {
          id: conv.id,
          isGroup: false,
          updatedAt: lastMessage?.createdAt || conv.updatedAt,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                type: lastMessage.type,
                status: lastMessage.status,
                senderId: lastMessage.senderId,
                senderName:
                  lastMessage.sender?.profile?.displayName ||
                  lastMessage.sender?.username ||
                  'Player',
                createdAt: lastMessage.createdAt,
              }
            : null,
          group: null,
          peer: peerUser
            ? {
                id: peerUser.id,
                username: peerUser.username,
                displayName: peerProfile?.displayName || peerUser.username,
                avatarUrl: peerProfile?.avatarUrl || null,
                isOnline: isUserOnline(peerUser.id) || (peerProfile?.isOnline ?? false),
                lastSeen: peerProfile?.lastSeen || peerUser.createdAt,
              }
            : null,
        };
      });

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

    // Check if 1-on-1 conversation already exists between both users
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
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
        isGroup: false,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        peer: {
          id: recipient.id,
          username: recipient.username,
          displayName: recipient.profile?.displayName || recipient.username,
          avatarUrl: recipient.profile?.avatarUrl || null,
          isOnline: isUserOnline(recipient.id) || (recipient.profile?.isOnline ?? false),
          lastSeen: recipient.profile?.lastSeen || recipient.createdAt,
        },
        lastMessage: existing.messages[0] || null,
      };
    }

    // Create new 1-on-1 conversation
    const newConv = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [{ userId, role: 'MEMBER' }, { userId: recipientId, role: 'MEMBER' }],
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
      isGroup: false,
      createdAt: newConv.createdAt,
      updatedAt: newConv.updatedAt,
      peer: {
        id: recipient.id,
        username: recipient.username,
        displayName: recipient.profile?.displayName || recipient.username,
        avatarUrl: recipient.profile?.avatarUrl || null,
        isOnline: isUserOnline(recipient.id) || (recipient.profile?.isOnline ?? false),
        lastSeen: recipient.profile?.lastSeen || recipient.createdAt,
      },
      lastMessage: null,
    };
  }

  /**
   * Validates whether an actor has permission to add target users to a group
   * based on their individual groupAddPrivacy settings and block relationships.
   */
  static async validateGroupAddPermissions(
    actorId: string,
    targets: Array<{ id: string; username: string; profile: { displayName: string | null; groupAddPrivacy: PresencePrivacy } | null }>
  ): Promise<void> {
    const targetIds = targets.filter((t) => t.id !== actorId).map((t) => t.id);
    if (targetIds.length === 0) return;

    // 1. Check for blocks between actor and targets
    const blocks = await prisma.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: actorId, blockedId: { in: targetIds } },
          { blockerId: { in: targetIds }, blockedId: actorId },
        ],
      },
    });
    const blockedUserIds = new Set(
      blocks.flatMap((b) => (b.blockerId === actorId ? [b.blockedId] : [b.blockerId]))
    );

    // 2. Fetch friendships between actor and targets (for MY_FRIENDS check)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: actorId, friendId: { in: targetIds } },
          { userId: { in: targetIds }, friendId: actorId },
        ],
      },
      select: { userId: true, friendId: true },
    });
    const friendIds = new Set(
      friendships.map((f) => (f.userId === actorId ? f.friendId : f.userId))
    );

    // 3. Check each target
    const failedUsers: string[] = [];

    for (const target of targets) {
      if (target.id === actorId) continue;
      const name = target.profile?.displayName || target.username;

      if (blockedUserIds.has(target.id)) {
        failedUsers.push(name);
        continue;
      }

      const privacy = target.profile?.groupAddPrivacy || PresencePrivacy.EVERYONE;
      if (privacy === PresencePrivacy.NOBODY) {
        failedUsers.push(name);
      } else if (privacy === PresencePrivacy.MY_FRIENDS && !friendIds.has(target.id)) {
        failedUsers.push(name);
      }
    }

    if (failedUsers.length > 0) {
      if (failedUsers.length === 1) {
        throw new Error(`${failedUsers[0]}'s privacy settings do not allow you to add them to groups`);
      } else {
        throw new Error(
          `Cannot add ${failedUsers.join(', ')}: their privacy settings do not allow you to add them to groups`
        );
      }
    }
  }

  /**
   * Create a new group conversation with members and admin creator
   */
  static async createGroup(creatorId: string, input: CreateGroupInput) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { profile: true },
    });

    if (!creator) {
      throw new Error('Creator user not found');
    }

    const creatorName = creator.profile?.displayName || creator.username;

    // Filter and deduplicate member IDs, excluding creator
    const uniqueMemberIds = Array.from(
      new Set(input.memberIds.filter((id) => id !== creatorId))
    );

    if (uniqueMemberIds.length === 0) {
      throw new Error('Select at least one friend to create a group');
    }

    // Verify all members exist
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      include: { profile: true },
    });

    if (existingUsers.length === 0) {
      throw new Error('No valid friends found to add to group');
    }

    // Validate privacy permissions for all members being added
    await this.validateGroupAddPermissions(creatorId, existingUsers);

    // Create the group conversation atomically
    const newGroup = await prisma.conversation.create({
      data: {
        isGroup: true,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        avatarUrl: input.avatarUrl?.trim() || null,
        creatorId,
        members: {
          create: [
            { userId: creatorId, role: 'ADMIN' },
            ...existingUsers.map((u) => ({ userId: u.id, role: 'MEMBER' as const })),
          ],
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

    // Create initial SYSTEM welcome message
    const initialMsg = await prisma.message.create({
      data: {
        conversationId: newGroup.id,
        senderId: creatorId,
        content: `${creatorName} created group "${input.title.trim()}"`,
        type: 'SYSTEM',
        status: 'DELIVERED',
        metadata: {
          event: 'GROUP_CREATED',
          creatorId,
          creatorName,
        },
      },
    });

    const membersList = newGroup.members.map((mem) => ({
      id: mem.id,
      userId: mem.userId,
      role: mem.role,
      username: mem.user.username,
      displayName: mem.user.profile?.displayName || mem.user.username,
      avatarUrl: mem.user.profile?.avatarUrl || null,
      isOnline: isUserOnline(mem.userId) || (mem.user.profile?.isOnline ?? false),
      lastSeen: mem.user.profile?.lastSeen || mem.user.createdAt,
    }));

    const groupPayload = {
      id: newGroup.id,
      isGroup: true,
      updatedAt: initialMsg.createdAt,
      unreadCount: 0,
      lastMessage: {
        id: initialMsg.id,
        content: initialMsg.content,
        type: initialMsg.type,
        status: initialMsg.status,
        senderId: initialMsg.senderId,
        createdAt: initialMsg.createdAt,
      },
      group: {
        id: newGroup.id,
        title: newGroup.title,
        description: newGroup.description,
        avatarUrl: newGroup.avatarUrl,
        creatorId: newGroup.creatorId,
        memberCount: membersList.length,
        userRole: 'MEMBER',
        members: membersList,
      },
      peer: null,
    };

    // Emit real-time group created event to all members
    newGroup.members.forEach((mem) => {
      emitToUser(mem.userId, 'chat:group_created', {
        ...groupPayload,
        group: {
          ...groupPayload.group,
          userRole: mem.role,
        },
      });
    });

    return {
      ...groupPayload,
      group: {
        ...groupPayload.group,
        userRole: 'ADMIN',
      },
    };
  }

  /**
   * Get full details for a group
   */
  static async getGroupDetails(userId: string, groupId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new Error('You are not a member of this group');
    }

    const membersList = conv.members.map((mem) => ({
      id: mem.id,
      userId: mem.userId,
      role: mem.role,
      username: mem.user.username,
      displayName: mem.user.profile?.displayName || mem.user.username,
      avatarUrl: mem.user.profile?.avatarUrl || null,
      isOnline: isUserOnline(mem.userId) || (mem.user.profile?.isOnline ?? false),
      lastSeen: mem.user.profile?.lastSeen || mem.user.createdAt,
      joinedAt: mem.createdAt,
    }));

    return {
      id: conv.id,
      title: conv.title,
      description: conv.description,
      avatarUrl: conv.avatarUrl,
      creatorId: conv.creatorId,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      memberCount: membersList.length,
      userRole: currentMember.role,
      isAdmin: currentMember.role === 'ADMIN',
      members: membersList,
    };
  }

  /**
   * Update group details (title, description, avatarUrl) - Admin only
   */
  static async updateGroup(userId: string, groupId: string, input: UpdateGroupInput) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember || currentMember.role !== 'ADMIN') {
      throw new Error('Only group admins can update group details');
    }

    const updaterName = currentMember.user.profile?.displayName || currentMember.user.username;

    const updated = await prisma.conversation.update({
      where: { id: groupId },
      data: {
        title: input.title !== undefined ? input.title.trim() : conv.title,
        description: input.description !== undefined ? input.description?.trim() || null : conv.description,
        avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl?.trim() || null : conv.avatarUrl,
      },
    });

    // Create system message
    const sysMsg = await prisma.message.create({
      data: {
        conversationId: groupId,
        senderId: userId,
        content: `${updaterName} updated group details`,
        type: 'SYSTEM',
        status: 'DELIVERED',
        metadata: {
          event: 'GROUP_UPDATED',
          updatedBy: userId,
        },
      },
    });

    const updatePayload = {
      groupId,
      title: updated.title,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt,
    };

    // Emit event to all members
    conv.members.forEach((mem) => {
      emitToUser(mem.userId, 'chat:group_updated', updatePayload);
      emitToUser(mem.userId, 'chat:message_received', {
        id: sysMsg.id,
        conversationId: groupId,
        senderId: userId,
        senderName: 'System',
        content: sysMsg.content,
        type: sysMsg.type,
        status: sysMsg.status,
        metadata: sysMsg.metadata,
        createdAt: sysMsg.createdAt,
        isGroup: true,
      });
    });

    emitToConversation(groupId, 'chat:group_updated', updatePayload);

    return updated;
  }

  /**
   * Add new members to group - Admin only
   */
  static async addMembers(userId: string, groupId: string, input: AddMembersInput) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember || currentMember.role !== 'ADMIN') {
      throw new Error('Only group admins can add members');
    }

    const adminName = currentMember.user.profile?.displayName || currentMember.user.username;

    // Filter out users already in the group
    const existingMemberIds = new Set(conv.members.map((m) => m.userId));
    const newMemberIds = input.memberIds.filter((id) => !existingMemberIds.has(id));

    if (newMemberIds.length === 0) {
      throw new Error('Selected users are already members of this group');
    }

    // Verify users exist
    const usersToAdd = await prisma.user.findMany({
      where: { id: { in: newMemberIds } },
      include: { profile: true },
    });

    if (usersToAdd.length === 0) {
      throw new Error('No valid users found to add');
    }

    // Validate privacy permissions for all members being added
    await this.validateGroupAddPermissions(userId, usersToAdd);

    // Add them to ConversationMember
    await prisma.conversationMember.createMany({
      data: usersToAdd.map((u) => ({
        conversationId: groupId,
        userId: u.id,
        role: 'MEMBER' as const,
      })),
      skipDuplicates: true,
    });

    const addedNames = usersToAdd.map((u) => u.profile?.displayName || u.username).join(', ');

    // Post system message
    const sysMsg = await prisma.message.create({
      data: {
        conversationId: groupId,
        senderId: userId,
        content: `${adminName} added ${addedNames} to the group`,
        type: 'SYSTEM',
        status: 'DELIVERED',
        metadata: {
          event: 'MEMBERS_ADDED',
          addedBy: userId,
          addedUserIds: usersToAdd.map((u) => u.id),
        },
      },
    });

    // Fetch updated group details
    const updatedDetails = await this.getGroupDetails(userId, groupId);

    // Notify all members (existing and new)
    updatedDetails.members.forEach((mem) => {
      emitToUser(mem.userId, 'chat:group_members_updated', updatedDetails);
      emitToUser(mem.userId, 'chat:message_received', {
        id: sysMsg.id,
        conversationId: groupId,
        senderId: userId,
        senderName: 'System',
        content: sysMsg.content,
        type: sysMsg.type,
        status: sysMsg.status,
        metadata: sysMsg.metadata,
        createdAt: sysMsg.createdAt,
        isGroup: true,
      });
    });

    emitToConversation(groupId, 'chat:group_members_updated', updatedDetails);

    return updatedDetails;
  }

  /**
   * Remove member from group - Admin only
   */
  static async removeMember(userId: string, groupId: string, targetUserId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember || currentMember.role !== 'ADMIN') {
      throw new Error('Only group admins can remove members');
    }

    if (conv.creatorId === targetUserId) {
      throw new Error('The group creator cannot be removed from the group');
    }

    if (userId === targetUserId) {
      throw new Error('Use leave group to exit the group');
    }

    const targetMember = conv.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new Error('User is not a member of this group');
    }

    const adminName = currentMember.user.profile?.displayName || currentMember.user.username;
    const targetName = targetMember.user.profile?.displayName || targetMember.user.username;

    // Delete membership
    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId: groupId, userId: targetUserId },
      },
    });

    // Create system message
    const sysMsg = await prisma.message.create({
      data: {
        conversationId: groupId,
        senderId: userId,
        content: `${adminName} removed ${targetName} from the group`,
        type: 'SYSTEM',
        status: 'DELIVERED',
        metadata: {
          event: 'MEMBER_REMOVED',
          removedUserId: targetUserId,
          removedBy: userId,
        },
      },
    });

    // Notify removed user
    emitToUser(targetUserId, 'chat:group_removed', {
      groupId,
      groupTitle: conv.title,
    });

    // Notify remaining members
    const remainingMembers = conv.members.filter((m) => m.userId !== targetUserId);
    remainingMembers.forEach((mem) => {
      emitToUser(mem.userId, 'chat:group_member_removed', {
        groupId,
        removedUserId: targetUserId,
      });
      emitToUser(mem.userId, 'chat:message_received', {
        id: sysMsg.id,
        conversationId: groupId,
        senderId: userId,
        senderName: 'System',
        content: sysMsg.content,
        type: sysMsg.type,
        status: sysMsg.status,
        metadata: sysMsg.metadata,
        createdAt: sysMsg.createdAt,
        isGroup: true,
      });
    });

    emitToConversation(groupId, 'chat:group_member_removed', {
      groupId,
      removedUserId: targetUserId,
    });

    return { success: true, removedUserId: targetUserId };
  }

  /**
   * Leave group
   */
  static async leaveGroup(userId: string, groupId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new Error('You are not a member of this group');
    }

    const userName = currentMember.user.profile?.displayName || currentMember.user.username;
    const remainingMembers = conv.members.filter((m) => m.userId !== userId);

    // If leaving member was admin and is the only admin left, promote another member
    if (currentMember.role === 'ADMIN' && remainingMembers.length > 0) {
      const otherAdmins = remainingMembers.filter((m) => m.role === 'ADMIN');
      if (otherAdmins.length === 0) {
        // Promote first remaining member
        await prisma.conversationMember.update({
          where: { id: remainingMembers[0].id },
          data: { role: 'ADMIN' },
        });
      }
    }

    // Delete membership
    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId: groupId, userId },
      },
    });

    if (remainingMembers.length > 0) {
      // Create system message
      const sysMsg = await prisma.message.create({
        data: {
          conversationId: groupId,
          senderId: userId,
          content: `${userName} left the group`,
          type: 'SYSTEM',
          status: 'DELIVERED',
          metadata: {
            event: 'MEMBER_LEFT',
            leftUserId: userId,
          },
        },
      });

      remainingMembers.forEach((mem) => {
        emitToUser(mem.userId, 'chat:group_member_left', {
          groupId,
          leftUserId: userId,
        });
        emitToUser(mem.userId, 'chat:message_received', {
          id: sysMsg.id,
          conversationId: groupId,
          senderId: userId,
          senderName: 'System',
          content: sysMsg.content,
          type: sysMsg.type,
          status: sysMsg.status,
          metadata: sysMsg.metadata,
          createdAt: sysMsg.createdAt,
          isGroup: true,
        });
      });

      emitToConversation(groupId, 'chat:group_member_left', {
        groupId,
        leftUserId: userId,
      });
    }

    return { success: true, groupId };
  }

  /**
   * Update member role (assign or remove Admin) - Admin only
   */
  static async updateMemberRole(
    userId: string,
    groupId: string,
    targetUserId: string,
    input: UpdateMemberRoleInput
  ) {
    const conv = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!conv || !conv.isGroup) {
      throw new Error('Group not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember || currentMember.role !== 'ADMIN') {
      throw new Error('Only group admins can assign or dismiss admins');
    }

    if (conv.creatorId === targetUserId && input.role !== 'ADMIN') {
      throw new Error('The group creator must remain an admin');
    }

    const targetMember = conv.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new Error('User is not a member of this group');
    }

    const adminName = currentMember.user.profile?.displayName || currentMember.user.username;
    const targetName = targetMember.user.profile?.displayName || targetMember.user.username;

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId: groupId, userId: targetUserId },
      },
      data: { role: input.role },
    });

    const actionText =
      input.role === 'ADMIN'
        ? `${adminName} promoted ${targetName} to Group Admin`
        : `${adminName} dismissed ${targetName} as Admin`;

    // System message
    const sysMsg = await prisma.message.create({
      data: {
        conversationId: groupId,
        senderId: userId,
        content: actionText,
        type: 'SYSTEM',
        status: 'DELIVERED',
        metadata: {
          event: 'ROLE_UPDATED',
          targetUserId,
          newRole: input.role,
        },
      },
    });

    conv.members.forEach((mem) => {
      emitToUser(mem.userId, 'chat:group_role_updated', {
        groupId,
        targetUserId,
        role: input.role,
      });
      emitToUser(mem.userId, 'chat:message_received', {
        id: sysMsg.id,
        conversationId: groupId,
        senderId: userId,
        senderName: 'System',
        content: sysMsg.content,
        type: sysMsg.type,
        status: sysMsg.status,
        metadata: sysMsg.metadata,
        createdAt: sysMsg.createdAt,
        isGroup: true,
      });
    });

    emitToConversation(groupId, 'chat:group_role_updated', {
      groupId,
      targetUserId,
      role: input.role,
    });

    return { groupId, targetUserId, role: input.role };
  }

  /**
   * Fetch messages in a conversation
   */
  static async getMessages(userId: string, conversationId: string, limit = 50) {
    // Verify membership
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conv || !conv.members.some((m) => m.userId === userId)) {
      throw new Error('You are not a member of this conversation');
    }

    // Client retrieving messages confirms delivery to their device
    this.confirmDelivery(userId, conversationId).catch(() => null);

    // Fetch chronological messages with receipts
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          include: { profile: true },
        },
        receipts: {
          select: {
            userId: true,
            status: true,
            readAt: true,
            deliveredAt: true,
          },
        },
      },
    });

    const otherMembersCount = conv.isGroup
      ? Math.max(0, conv.members.filter((mem) => mem.userId !== userId).length)
      : 1;

    return messages.map((m) => {
      const readReceipts = m.receipts.filter((r) => r.status === 'READ');
      const readCount = readReceipts.length;
      const isAllRead = conv.isGroup
        ? (otherMembersCount > 0 && readCount >= otherMembersCount)
        : (m.status === 'READ');

      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender.profile?.displayName || m.sender.username,
        senderAvatarUrl: m.sender.profile?.avatarUrl || null,
        content: m.content,
        type: m.type,
        status: isAllRead ? 'READ' : m.status,
        metadata: m.metadata,
        createdAt: m.createdAt,
        isOwnMessage: m.senderId === userId,
        isGroup: conv.isGroup,
        readCount: conv.isGroup ? readCount : (m.status === 'READ' ? 1 : 0),
        totalRecipients: otherMembersCount,
        isAllRead,
      };
    });
  }

  /**
   * Send a message in a conversation and dispatch real-time events to all peers
   */
  static async sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
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

    const senderMember = conv.members.find((m) => m.userId === userId);
    if (!senderMember) {
      throw new Error('You are not a member of this conversation');
    }

    const senderProfile = senderMember.user.profile;
    const senderName = senderProfile?.displayName || senderMember.user.username || 'Player';

    if (conv.isGroup) {
      // ─── Group Messaging ──────────────────────────────────────
      const otherMembers = conv.members.filter((m) => m.userId !== userId);
      const activeUserIds = getUsersInConversation(conversationId);
      const inChatMembers = otherMembers.filter((m) => activeUserIds.has(m.userId));
      const onlineOtherMembers = otherMembers.filter((m) => activeUserIds.has(m.userId) || isUserOnline(m.userId));
      const isAllInChat = inChatMembers.length === otherMembers.length && otherMembers.length > 0;
      const isAllOnline = onlineOtherMembers.length === otherMembers.length && otherMembers.length > 0;
      const initialStatus = isAllInChat ? 'READ' : isAllOnline ? 'DELIVERED' : 'SENT';

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

      // Create initial receipts for members currently in chat or online
      if (onlineOtherMembers.length > 0) {
        const now = new Date();
        await prisma.messageReceipt.createMany({
          data: onlineOtherMembers.map((m) => {
            const inChat = activeUserIds.has(m.userId);
            return {
              messageId: message.id,
              conversationId,
              userId: m.userId,
              status: inChat ? ('READ' as const) : ('DELIVERED' as const),
              deliveredAt: now,
              readAt: inChat ? now : null,
            };
          }),
          skipDuplicates: true,
        }).catch(() => null);
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const messagePayload = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName,
        senderAvatarUrl: senderProfile?.avatarUrl || null,
        sender: {
          id: message.senderId,
          displayName: senderName,
          username: senderMember.user.username,
          avatarUrl: senderProfile?.avatarUrl || null,
        },
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        createdAt: message.createdAt,
        isGroup: true,
        groupTitle: conv.title || 'Group',
      };

      // Check for @username mentions in message content
      const mentionMatches = input.content.match(/@(\w+)/g);
      const mentionedUserIds = new Set<string>();
      if (mentionMatches && mentionMatches.length > 0) {
        const mentionedUsernames = mentionMatches.map((m) => m.slice(1).toLowerCase());
        for (const mUsername of mentionedUsernames) {
          const targetMember = conv.members.find(
            (m) => m.userId !== userId && m.user.username.toLowerCase() === mUsername
          );
          if (targetMember) {
            mentionedUserIds.add(targetMember.userId);
            PushNotificationService.notifyMention(
              targetMember.userId,
              senderName,
              input.content.trim(),
              {
                conversationId,
                senderId: userId,
                messageId: message.id,
                senderName,
              }
            ).catch(() => null);
          }
        }
      }

      // Real-time dispatch to every other group member and persist notifications
      conv.members.forEach((mem) => {
        if (mem.userId !== userId) {
          emitToUser(mem.userId, 'chat:message_received', messagePayload);

          // If member was not already notified via mention, notify of new message
          if (!mentionedUserIds.has(mem.userId) && !activeUserIds.has(mem.userId)) {
            PushNotificationService.notifyNewMessage(
              mem.userId,
              `${conv.title || 'Group'} • ${senderName}`,
              input.content.trim(),
              {
                conversationId,
                senderId: userId,
                messageId: message.id,
                senderName,
              }
            ).catch(() => null);
          }
        }
      });

      emitToConversation(conversationId, 'chat:message_received', messagePayload);

      return {
        ...messagePayload,
        isOwnMessage: true,
      };
    }

    // ─── 1-on-1 Messaging ──────────────────────────────────────
    const peerMember = conv.members.find((m) => m.userId !== userId);
    const peerId = peerMember?.userId;

    if (peerId) {
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

    const peerInConversation = peerId ? isUserInConversation(conversationId, peerId) : false;
    const recipientOnline = peerId ? (peerInConversation || isUserOnline(peerId)) : false;
    const initialStatus = peerInConversation ? 'READ' : recipientOnline ? 'DELIVERED' : 'SENT';

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

    if (recipientOnline && peerId) {
      const now = new Date();
      await prisma.messageReceipt.create({
        data: {
          messageId: message.id,
          conversationId,
          userId: peerId,
          status: peerInConversation ? 'READ' : 'DELIVERED',
          deliveredAt: now,
          readAt: peerInConversation ? now : null,
        },
      }).catch(() => null);
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const messagePayload = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName,
      senderAvatarUrl: senderProfile?.avatarUrl || null,
      sender: {
        id: message.senderId,
        displayName: senderName,
        username: senderMember.user.username,
        avatarUrl: senderProfile?.avatarUrl || null,
      },
      content: message.content,
      type: message.type,
      status: message.status,
      metadata: message.metadata,
      createdAt: message.createdAt,
      isGroup: false,
    };

    if (peerId) {
      emitToUser(peerId, 'chat:message_received', messagePayload);

      // Only dispatch push notifications if peer is not actively viewing this conversation
      if (!peerInConversation) {
        // Check for @mention in 1-on-1 chat
        const mentionMatches = input.content.match(/@(\w+)/g);
        const isMentioned =
          mentionMatches &&
          peerMember?.user?.username &&
          mentionMatches.some((m) => m.slice(1).toLowerCase() === peerMember.user.username.toLowerCase());

        if (isMentioned) {
          PushNotificationService.notifyMention(
            peerId,
            senderName,
            input.content.trim(),
            {
              conversationId,
              senderId: userId,
              messageId: message.id,
              senderName,
            }
          ).catch(() => null);
        } else if (input.type === 'GAME_INVITE' && input.metadata) {
          const meta = input.metadata as any;
          const roomCode = meta?.roomCode || '';
          const gameName = meta?.gameName || 'a game';
          PushNotificationService.notifyGameInvite(
            peerId,
            senderName,
            gameName,
            roomCode,
            {
              inviterId: userId,
              gameType: meta?.gameType,
              conversationId,
            }
          ).catch(() => null);
        } else {
          PushNotificationService.notifyNewMessage(
            peerId,
            senderName,
            input.content.trim(),
            {
              conversationId,
              senderId: userId,
              messageId: message.id,
              senderName,
            }
          ).catch(() => null);
        }
      }
    }

    emitToConversation(conversationId, 'chat:message_received', messagePayload);

    return {
      ...messagePayload,
      isOwnMessage: true,
    };
  }

  /**
   * Confirm delivery of messages to recipient device (2 grey ticks)
   */
  static async confirmDelivery(userId: string, conversationId: string, messageIds?: string[]) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) return { success: false, error: 'Conversation not found' };

    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) return { success: false, error: 'Not a member' };

    const whereClause: any = {
      conversationId,
      senderId: { not: userId },
    };
    if (messageIds && messageIds.length > 0) {
      whereClause.id = { in: messageIds };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      select: { id: true, senderId: true, status: true },
    });

    if (messages.length === 0) {
      return { success: true, count: 0 };
    }

    const now = new Date();
    const msgIds = messages.map((m) => m.id);

    // Batch create delivery receipts (skipping existing)
    await prisma.messageReceipt.createMany({
      data: msgIds.map((id) => ({
        messageId: id,
        conversationId,
        userId,
        status: 'DELIVERED' as const,
        deliveredAt: now,
      })),
      skipDuplicates: true,
    }).catch(() => null);

    if (!conv.isGroup) {
      // 1-on-1: update message status to DELIVERED in one single query
      const sentMsgIds = messages.filter((m) => m.status === 'SENT').map((m) => m.id);
      if (sentMsgIds.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: sentMsgIds } },
          data: { status: 'DELIVERED' },
        });
      }

      for (const msg of messages) {
        if (msg.status === 'SENT') {
          emitToUser(msg.senderId, 'chat:message_delivered', {
            conversationId,
            messageId: msg.id,
            deliveredTo: userId,
            deliveredAt: now.toISOString(),
            status: 'DELIVERED',
          });

          emitToConversation(conversationId, 'chat:message_delivered', {
            conversationId,
            messageId: msg.id,
            deliveredTo: userId,
            deliveredAt: now.toISOString(),
            status: 'DELIVERED',
          });
        }
      }
      return { success: true, count: messages.length };
    }

    // Group chat: Batch count existing receipts for these messages
    const existingReceipts = await prisma.messageReceipt.findMany({
      where: { messageId: { in: msgIds } },
      select: { messageId: true },
    });

    const receiptsCountByMsg = new Map<string, number>();
    for (const r of existingReceipts) {
      receiptsCountByMsg.set(r.messageId, (receiptsCountByMsg.get(r.messageId) || 0) + 1);
    }

    const allDeliveredIds: string[] = [];
    for (const msg of messages) {
      const otherMembersCount = Math.max(0, conv.members.filter((m) => m.userId !== msg.senderId).length);
      const count = receiptsCountByMsg.get(msg.id) || 0;
      const isAllDelivered = count >= otherMembersCount;

      if (isAllDelivered && msg.status === 'SENT') {
        allDeliveredIds.push(msg.id);
      }

      emitToUser(msg.senderId, 'chat:message_delivered', {
        conversationId,
        messageId: msg.id,
        deliveredTo: userId,
        deliveredAt: now.toISOString(),
        status: isAllDelivered ? 'DELIVERED' : msg.status,
        isAllDelivered,
      });

      emitToConversation(conversationId, 'chat:message_delivered', {
        conversationId,
        messageId: msg.id,
        deliveredTo: userId,
        deliveredAt: now.toISOString(),
        status: isAllDelivered ? 'DELIVERED' : msg.status,
        isAllDelivered,
      });
    }

    if (allDeliveredIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: allDeliveredIds } },
        data: { status: 'DELIVERED' },
      });
    }

    return { success: true, count: messages.length };
  }

  /**
   * Explicitly mark unread messages in conversation as READ (2 blue ticks)
   * Respects user's Read Receipts privacy toggle in 1-on-1 chats.
   * Group chats always track member read receipts.
   */
  static async markAsRead(userId: string, conversationId: string, messageIds?: string[]) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: {
                  select: { readReceipts: true, displayName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!conv) {
      throw new Error('Conversation not found');
    }

    const currentMember = conv.members.find((m) => m.userId === userId);
    if (!currentMember) {
      throw new Error('You are not a member of this conversation');
    }

    const readerReadReceipts = currentMember.user.profile?.readReceipts ?? true;

    // Build filter for incoming messages not yet read by this user
    const messageWhere: any = {
      conversationId,
      senderId: { not: userId },
      NOT: {
        receipts: {
          some: {
            userId,
            status: 'READ',
          },
        },
      },
    };

    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      messageWhere.id = { in: messageIds };
    }

    const incomingMessages = await prisma.message.findMany({
      where: messageWhere,
      select: {
        id: true,
        senderId: true,
        status: true,
      },
    });

    if (incomingMessages.length === 0) {
      return { conversationId, markedCount: 0, messageUpdates: [] };
    }

    const now = new Date();
    const readMessageIds = incomingMessages.map((m) => m.id);

    // 1. Batch upsert receipts: update existing to READ and create missing in 2 single queries
    await prisma.messageReceipt.updateMany({
      where: {
        messageId: { in: readMessageIds },
        userId,
      },
      data: {
        status: 'READ',
        readAt: now,
      },
    });

    await prisma.messageReceipt.createMany({
      data: readMessageIds.map((msgId) => ({
        messageId: msgId,
        conversationId,
        userId,
        status: 'READ' as const,
        deliveredAt: now,
        readAt: now,
      })),
      skipDuplicates: true,
    }).catch(() => null);

    if (!conv.isGroup) {
      // 1-on-1: Check privacy rules and batch update messages in 1 query
      const senderMember = conv.members.find((m) => m.userId !== userId);
      const senderReadReceipts = senderMember?.user.profile?.readReceipts ?? true;
      const targetStatus = (readerReadReceipts && senderReadReceipts) ? 'READ' : 'DELIVERED';

      await prisma.message.updateMany({
        where: { id: { in: readMessageIds } },
        data: { status: targetStatus },
      });

      const messageUpdates = incomingMessages.map((msg) => ({
        id: msg.id,
        messageId: msg.id,
        senderId: msg.senderId,
        readCount: 1,
        totalRecipients: 1,
        isAllRead: targetStatus === 'READ',
        status: targetStatus,
      }));

      const isAllReadBatch = targetStatus === 'READ';
      const readPayload = {
        conversationId,
        readBy: userId,
        readAt: now.toISOString(),
        messageIds: readMessageIds,
        status: targetStatus,
        isAllRead: isAllReadBatch,
        messageUpdates,
        isGroup: false,
      };

      emitToConversation(conversationId, 'chat:messages_read', readPayload);
      if (senderMember) {
        emitToUser(senderMember.userId, 'chat:messages_read', readPayload);
      }

      return { conversationId, markedCount: readMessageIds.length, messageUpdates };
    }

    // Group Chat: Query all existing READ receipts for these messages in 1 query
    const existingReadReceipts = await prisma.messageReceipt.findMany({
      where: {
        messageId: { in: readMessageIds },
        status: 'READ',
      },
      select: {
        messageId: true,
        userId: true,
      },
    });

    const receiptsByMsg = new Map<string, Set<string>>();
    for (const r of existingReadReceipts) {
      let set = receiptsByMsg.get(r.messageId);
      if (!set) {
        set = new Set();
        receiptsByMsg.set(r.messageId, set);
      }
      set.add(r.userId);
    }

    const messagesToMarkRead: string[] = [];
    const messagesToMarkDelivered: string[] = [];
    const messageUpdates = incomingMessages.map((msg) => {
      const otherMembersCount = Math.max(0, conv.members.filter((m) => m.userId !== msg.senderId).length);
      const readSet = receiptsByMsg.get(msg.id) || new Set();
      // Ensure current user is counted as read
      readSet.add(userId);
      const readCount = readSet.size;
      const isAllRead = otherMembersCount > 0 && readCount >= otherMembersCount;
      const finalStatus = isAllRead ? ('READ' as const) : msg.status === 'SENT' ? ('DELIVERED' as const) : msg.status;

      if (isAllRead && msg.status !== 'READ') {
        messagesToMarkRead.push(msg.id);
      } else if (!isAllRead && msg.status === 'SENT') {
        messagesToMarkDelivered.push(msg.id);
      }

      return {
        id: msg.id,
        messageId: msg.id,
        senderId: msg.senderId,
        readCount,
        totalRecipients: otherMembersCount,
        isAllRead,
        status: finalStatus,
      };
    });

    if (messagesToMarkRead.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: messagesToMarkRead } },
        data: { status: 'READ' },
      });
    }
    if (messagesToMarkDelivered.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: messagesToMarkDelivered } },
        data: { status: 'DELIVERED' },
      });
    }

    const isAllReadBatch = messageUpdates.length > 0 && messageUpdates.every((u) => u.isAllRead);
    const batchStatus = isAllReadBatch ? ('READ' as const) : ('DELIVERED' as const);

    const readPayload = {
      conversationId,
      readBy: userId,
      readAt: now.toISOString(),
      messageIds: readMessageIds,
      status: batchStatus,
      isAllRead: isAllReadBatch,
      messageUpdates,
      isGroup: conv.isGroup,
    };

    // Broadcast to conversation room (authoritative real-time sync for all members)
    emitToConversation(conversationId, 'chat:messages_read', readPayload);
    emitToConversation(conversationId, 'group:read_receipt', readPayload);

    // Notify individual senders who might not be inside the active conversation room
    const senders = new Set(incomingMessages.map((m) => m.senderId));
    senders.forEach((senderId) => {
      const senderUpdates = messageUpdates.filter((u) => u.senderId === senderId);
      const isSenderAllRead = senderUpdates.length > 0 && senderUpdates.every((u) => u.isAllRead);
      emitToUser(senderId, 'chat:messages_read', {
        ...readPayload,
        status: isSenderAllRead ? 'READ' : 'DELIVERED',
        isAllRead: isSenderAllRead,
        messageIds: senderUpdates.map((u) => u.id),
        messageUpdates: senderUpdates,
      });
    });

    return { conversationId, markedCount: readMessageIds.length, messageUpdates };
  }

  /**
   * Get detailed message receipts info (who delivered, who read, timestamps)
   */
  static async getMessageReceipts(userId: string, conversationId: string, messageId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!conv) throw new Error('Conversation not found');
    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) throw new Error('You are not a member of this conversation');

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        receipts: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new Error('Message not found');
    }

    const readBy = message.receipts
      .filter((r) => r.status === 'READ' && r.readAt)
      .map((r) => ({
        userId: r.userId,
        username: r.user.username,
        displayName: r.user.profile?.displayName || r.user.username,
        avatarUrl: r.user.profile?.avatarUrl || null,
        timestamp: r.readAt,
      }))
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

    const readUserIds = new Set(readBy.map((r) => r.userId));

    const deliveredTo = message.receipts
      .filter((r) => r.deliveredAt && !readUserIds.has(r.userId))
      .map((r) => ({
        userId: r.userId,
        username: r.user.username,
        displayName: r.user.profile?.displayName || r.user.username,
        avatarUrl: r.user.profile?.avatarUrl || null,
        timestamp: r.deliveredAt,
      }))
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

    const accountedUserIds = new Set([...readUserIds, ...deliveredTo.map((r) => r.userId)]);
    const pending = conv.members
      .filter((m) => m.userId !== message.senderId && !accountedUserIds.has(m.userId))
      .map((m) => ({
        userId: m.userId,
        username: m.user.username,
        displayName: m.user.profile?.displayName || m.user.username,
        avatarUrl: m.user.profile?.avatarUrl || null,
      }));

    return {
      messageId: message.id,
      content: message.content,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      senderId: message.senderId,
      isGroup: conv.isGroup,
      totalRecipients: Math.max(0, conv.members.length - 1),
      readBy,
      deliveredTo,
      pending,
    };
  }

  /**
   * Synchronize delivery for all messages sent to user while offline
   */
  static async syncUndeliveredMessagesForUser(userId: string) {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const convIds = memberships.map((m) => m.conversationId);
    if (convIds.length === 0) return;

    const pendingMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: convIds },
        senderId: { not: userId },
        receipts: {
          none: { userId },
        },
      },
      select: { id: true, conversationId: true, senderId: true, status: true },
    });

    if (pendingMessages.length === 0) return;

    const convMap = new Map<string, string[]>();
    for (const msg of pendingMessages) {
      const arr = convMap.get(msg.conversationId) || [];
      arr.push(msg.id);
      convMap.set(msg.conversationId, arr);
    }

    for (const [convId, msgIds] of convMap.entries()) {
      await this.confirmDelivery(userId, convId, msgIds);
    }
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
      emitToConversation(conversationId, 'chat:view_once_opened', {
        conversationId,
        messageId,
        openedAt: updatedMetadata.openedAt,
      });
    }

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      metadata: updated.metadata,
    };
  }
}
