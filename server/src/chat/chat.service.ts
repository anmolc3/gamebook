import { prisma } from '../database/prisma';
import { PresencePrivacy } from '@prisma/client';
import {
  SendMessageInput,
  CreateGroupInput,
  UpdateGroupInput,
  AddMembersInput,
  UpdateMemberRoleInput,
} from './chat.validation';
import { emitToUser, emitToConversation, isUserOnline } from '../sockets/socket.server';
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

    const conversations = await Promise.all(
      userMemberships.map(async (m) => {
        const conv = m.conversation;

        // Count unread incoming messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            status: { in: ['SENT', 'DELIVERED'] },
          },
        });

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
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this conversation');
    }

    // Client retrieving messages confirms delivery to their device
    this.confirmDelivery(userId, conversationId).catch(() => null);

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
      senderAvatarUrl: m.sender.profile?.avatarUrl || null,
      content: m.content,
      type: m.type,
      status: m.status,
      metadata: m.metadata,
      createdAt: m.createdAt,
      isOwnMessage: m.senderId === userId,
    }));
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
      const onlineOtherMembers = otherMembers.filter((m) => isUserOnline(m.userId));
      const isAllOnline = onlineOtherMembers.length === otherMembers.length && otherMembers.length > 0;
      const initialStatus = isAllOnline ? 'DELIVERED' : 'SENT';

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

      // Create initial receipts for members currently online
      if (onlineOtherMembers.length > 0) {
        await prisma.messageReceipt.createMany({
          data: onlineOtherMembers.map((m) => ({
            messageId: message.id,
            conversationId,
            userId: m.userId,
            status: 'DELIVERED' as const,
            deliveredAt: new Date(),
          })),
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
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        createdAt: message.createdAt,
        isGroup: true,
        groupTitle: conv.title || 'Group',
      };

      // Real-time dispatch to every other group member
      conv.members.forEach((mem) => {
        if (mem.userId !== userId) {
          emitToUser(mem.userId, 'chat:message_received', messagePayload);

          // Push notifications to offline members
          if (!isUserOnline(mem.userId)) {
            PushNotificationService.notifyNewMessage(
              mem.userId,
              `${conv.title || 'Group'} • ${senderName}`,
              input.content.trim()
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

    const recipientOnline = peerId ? isUserOnline(peerId) : false;
    const initialStatus = recipientOnline ? 'DELIVERED' : 'SENT';

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
      await prisma.messageReceipt.create({
        data: {
          messageId: message.id,
          conversationId,
          userId: peerId,
          status: 'DELIVERED',
          deliveredAt: new Date(),
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
      content: message.content,
      type: message.type,
      status: message.status,
      metadata: message.metadata,
      createdAt: message.createdAt,
      isGroup: false,
    };

    if (peerId) {
      emitToUser(peerId, 'chat:message_received', messagePayload);

      if (!recipientOnline) {
        if (input.type === 'GAME_INVITE' && input.metadata) {
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
          PushNotificationService.notifyNewMessage(peerId, senderName, input.content.trim()).catch(() => null);
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

    const now = new Date();

    for (const msg of messages) {
      // Upsert receipt record for this user
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId },
        },
        create: {
          messageId: msg.id,
          conversationId,
          userId,
          status: 'DELIVERED',
          deliveredAt: now,
        },
        update: {},
      });

      if (!conv.isGroup) {
        // 1-on-1: update message status to DELIVERED if it was SENT
        if (msg.status === 'SENT') {
          await prisma.message.update({
            where: { id: msg.id },
            data: { status: 'DELIVERED' },
          });

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
      } else {
        // Group: check if all other members have received it
        const otherMembersCount = conv.members.filter((m) => m.userId !== msg.senderId).length;
        const receiptsCount = await prisma.messageReceipt.count({
          where: { messageId: msg.id },
        });

        const isAllDelivered = receiptsCount >= otherMembersCount;
        if (isAllDelivered && msg.status === 'SENT') {
          await prisma.message.update({
            where: { id: msg.id },
            data: { status: 'DELIVERED' },
          });
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
    }

    return { success: true, count: messages.length };
  }

  /**
   * Explicitly mark unread messages in conversation as READ (2 blue ticks)
   * Respects user's Read Receipts privacy toggle in 1-on-1 chats.
   * Group chats always track member read receipts.
   */
  static async markAsRead(userId: string, conversationId: string) {
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

    // Find all incoming messages not yet read by this user
    const incomingMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
      },
      select: {
        id: true,
        senderId: true,
        status: true,
      },
    });

    const now = new Date();
    const readMessageIds: string[] = [];

    for (const msg of incomingMessages) {
      // Upsert receipt with READ status
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId },
        },
        create: {
          messageId: msg.id,
          conversationId,
          userId,
          status: 'READ',
          deliveredAt: now,
          readAt: now,
        },
        update: {
          status: 'READ',
          readAt: now,
        },
      });

      readMessageIds.push(msg.id);

      if (!conv.isGroup) {
        // 1-on-1 Chat: check privacy rules
        const senderMember = conv.members.find((m) => m.userId === msg.senderId);
        const senderReadReceipts = senderMember?.user.profile?.readReceipts ?? true;

        if (readerReadReceipts && senderReadReceipts) {
          // Both have read receipts enabled -> Update to READ (2 Blue Ticks)
          await prisma.message.update({
            where: { id: msg.id },
            data: { status: 'READ' },
          });

          emitToUser(msg.senderId, 'chat:messages_read', {
            conversationId,
            messageId: msg.id,
            readBy: userId,
            readAt: now.toISOString(),
            status: 'READ',
          });
        } else {
          // Privacy enabled (turned off): ensure message status is at least DELIVERED (2 Grey Ticks)
          if (msg.status === 'SENT') {
            await prisma.message.update({
              where: { id: msg.id },
              data: { status: 'DELIVERED' },
            });
            emitToUser(msg.senderId, 'chat:message_delivered', {
              conversationId,
              messageId: msg.id,
              deliveredTo: userId,
              deliveredAt: now.toISOString(),
              status: 'DELIVERED',
            });
          }
        }
      } else {
        // Group Chat: always track receipts
        const otherMembersCount = conv.members.filter((m) => m.userId !== msg.senderId).length;
        const readReceiptsCount = await prisma.messageReceipt.count({
          where: { messageId: msg.id, status: 'READ' },
        });

        const isAllRead = readReceiptsCount >= otherMembersCount;
        if (isAllRead) {
          await prisma.message.update({
            where: { id: msg.id },
            data: { status: 'READ' },
          });
        } else if (msg.status === 'SENT') {
          await prisma.message.update({
            where: { id: msg.id },
            data: { status: 'DELIVERED' },
          });
        }

        emitToUser(msg.senderId, 'chat:messages_read', {
          conversationId,
          messageId: msg.id,
          readBy: userId,
          readAt: now.toISOString(),
          status: isAllRead ? 'READ' : (msg.status === 'SENT' ? 'DELIVERED' : msg.status),
          isAllRead,
        });
      }
    }

    emitToConversation(conversationId, 'chat:messages_read', {
      conversationId,
      readBy: userId,
      readAt: now.toISOString(),
      messageIds: readMessageIds,
    });

    return { conversationId, markedCount: readMessageIds.length };
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

    const deliveredTo = message.receipts
      .filter((r) => r.deliveredAt)
      .map((r) => ({
        userId: r.userId,
        username: r.user.username,
        displayName: r.user.profile?.displayName || r.user.username,
        avatarUrl: r.user.profile?.avatarUrl || null,
        timestamp: r.deliveredAt,
      }))
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

    const deliveredUserIds = new Set(message.receipts.map((r) => r.userId));
    const pending = conv.members
      .filter((m) => m.userId !== message.senderId && !deliveredUserIds.has(m.userId))
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
