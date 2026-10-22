import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface GroupMemberItem {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: string;
  joinedAt?: string;
}

export interface GroupMetaItem {
  id: string;
  title: string;
  description?: string;
  avatarUrl?: string | null;
  creatorId: string;
  memberCount: number;
  userRole: 'ADMIN' | 'MEMBER';
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  members: GroupMemberItem[];
}

export type MessageType =
  | 'TEXT'
  | 'GAME_INVITE'
  | 'GAME_RESULT'
  | 'SYSTEM'
  | 'IMAGE'
  | 'VOICE'
  | 'AUDIO'
  | 'FILE';

export interface ConversationItem {
  id: string;
  isGroup?: boolean;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    type: MessageType;
    status: 'SENT' | 'DELIVERED' | 'READ';
    senderId: string;
    senderName?: string;
    createdAt: string;
    metadata?: Record<string, any>;
  } | null;
  group?: GroupMetaItem | null;
  peer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeen: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  content: string;
  type: MessageType;
  status: 'SENT' | 'DELIVERED' | 'READ';
  metadata?: Record<string, any>;
  createdAt: string;
  isOwnMessage: boolean;
  isGroup?: boolean;
  groupTitle?: string;
}

import { CacheService } from './cache.service';

const CACHE_CONVERSATIONS_KEY = '@gameapp:cache:conversations';

export class ChatService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getCachedConversations(): Promise<ConversationItem[] | null> {
    return await CacheService.get<ConversationItem[]>(CACHE_CONVERSATIONS_KEY);
  }

  static async getCachedMessages(conversationId: string): Promise<ChatMessage[] | null> {
    return await CacheService.get<ChatMessage[]>(`@gameapp:cache:messages_${conversationId}`);
  }

  static async setCachedMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    await CacheService.set(`@gameapp:cache:messages_${conversationId}`, messages, 1000 * 60 * 60 * 24);
  }

  static async fetchConversations(): Promise<ConversationItem[]> {
    return CacheService.dedupe('fetchConversations', async () => {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
        method: 'GET',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch conversations');
      }
      const data = json.data || [];
      await CacheService.set(CACHE_CONVERSATIONS_KEY, data, 1000 * 60 * 15);
      return data;
    });
  }

  static async getOrCreateConversation(recipientId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${recipientId}`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to start conversation');
    }
    return json.data;
  }

  static async createGroup(
    title: string,
    memberIds: string[],
    description?: string,
    avatarUrl?: string
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        memberIds,
        description: description || undefined,
        avatarUrl: avatarUrl || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to create group');
    }
    return json.data;
  }

  static async fetchGroupDetails(groupId: string): Promise<GroupMetaItem> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch group details');
    }
    return json.data;
  }

  static async updateGroup(
    groupId: string,
    data: { title?: string; description?: string; avatarUrl?: string }
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update group');
    }
    return json.data;
  }

  static async addGroupMembers(groupId: string, memberIds: string[]): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ memberIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to add members');
    }
    return json.data;
  }

  static async removeGroupMember(groupId: string, memberId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to remove member');
    }
    return json.data;
  }

  static async leaveGroup(groupId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/leave`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to leave group');
    }
    return json.data;
  }

  static async updateGroupMemberRole(
    groupId: string,
    memberId: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/groups/${groupId}/members/${memberId}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update member role');
    }
    return json.data;
  }

  static async fetchMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
    return CacheService.dedupe(`fetchMessages_${conversationId}`, async () => {
      const headers = await this.getAuthHeaders();
      const res = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}/messages?limit=${limit}`,
        {
          method: 'GET',
          headers,
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch messages');
      }
      const data = json.data || [];
      if (data.length > 0) {
        await this.setCachedMessages(conversationId, data);
      }
      return data;
    });
  }

  static async sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = 'TEXT',
    metadata?: Record<string, any>
  ): Promise<ChatMessage> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, type, metadata }),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 404
          ? 'Chat conversation endpoint not found (404)'
          : `Server error (${res.status})`
      );
    }
    if (!res.ok) {
      throw new Error(json.error?.message || json.error || 'Failed to send message');
    }
    return json.data;
  }

  static async markAsRead(conversationId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
      method: 'PUT',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to mark messages as read');
    }
    return json.data;
  }

  static async confirmDelivery(conversationId: string, messageIds?: string[]): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/deliver`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ messageIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to confirm message delivery');
    }
    return json.data;
  }

  static async fetchMessageReceipts(
    conversationId: string,
    messageId: string
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/chat/conversations/${conversationId}/messages/${messageId}/receipts`,
      {
        method: 'GET',
        headers,
      }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch message receipts');
    }
    return json.data;
  }

  static async openViewOnceMessage(conversationId: string, messageId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/chat/conversations/${conversationId}/messages/${messageId}/open-view-once`,
      {
        method: 'PUT',
        headers,
      }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to open view-once message');
    }
    return json.data;
  }
}
