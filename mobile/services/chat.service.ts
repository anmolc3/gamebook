import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface ConversationItem {
  id: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    type: 'TEXT' | 'GAME_INVITE' | 'GAME_RESULT';
    status: 'SENT' | 'DELIVERED' | 'READ';
    senderId: string;
    createdAt: string;
  } | null;
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
  content: string;
  type: 'TEXT' | 'GAME_INVITE' | 'GAME_RESULT';
  status: 'SENT' | 'DELIVERED' | 'READ';
  metadata?: Record<string, any>;
  createdAt: string;
  isOwnMessage: boolean;
}

export class ChatService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async fetchConversations(): Promise<ConversationItem[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch conversations');
    }
    return json.data || [];
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

  static async fetchMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
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
    return json.data || [];
  }

  static async sendMessage(
    conversationId: string,
    content: string,
    type: 'TEXT' | 'GAME_INVITE' | 'GAME_RESULT' = 'TEXT',
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
      throw new Error(res.status === 404 ? 'Chat conversation endpoint not found (404)' : `Server error (${res.status})`);
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
