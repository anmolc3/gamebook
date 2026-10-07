import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  lastSeen: string;
  totalMatches: number;
  totalWins: number;
  winRate: number;
  friendSince: string;
}

export interface FriendRequestItem {
  requestId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    isOnline: boolean;
    totalMatches: number;
    totalWins: number;
    winRate: number;
  };
}

export interface FriendRequestsPayload {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface SearchedPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  totalMatches: number;
  totalWins: number;
  winRate: number;
  relationship: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS';
  requestId?: string;
}

export interface BlockedPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export class FriendsService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async fetchFriends(): Promise<FriendUser[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch friends');
    }
    return json.data || [];
  }

  static async fetchRequests(): Promise<FriendRequestsPayload> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/requests`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch friend requests');
    }
    return json.data || { incoming: [], outgoing: [] };
  }

  static async sendRequest(targetUserId: string): Promise<{ requestId: string; status: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/request/${targetUserId}`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to send friend request');
    }
    return json.data;
  }

  static async acceptRequest(requestId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/request/${requestId}/accept`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to accept friend request');
    }
    return json.data;
  }

  static async rejectRequest(requestId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/request/${requestId}/reject`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to decline friend request');
    }
    return json.data;
  }

  static async cancelRequest(requestId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/request/${requestId}/cancel`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to cancel friend request');
    }
    return json.data;
  }

  static async removeFriend(friendId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to remove friend');
    }
    return json.data;
  }

  static async searchUsers(query: string): Promise<SearchedPlayer[]> {
    if (!query.trim() || query.trim().length < 2) {
      return [];
    }
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(query.trim())}`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to search users');
    }
    return json.data || [];
  }

  static async blockUser(targetUserId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/block/${targetUserId}`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to block user');
    }
    return json.data;
  }

  static async unblockUser(targetUserId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/block/${targetUserId}`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to unblock user');
    }
    return json.data;
  }

  static async fetchBlocked(): Promise<BlockedPlayer[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/friends/blocked`, {
      method: 'GET',
      headers,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch blocked players');
    }
    return json.data || [];
  }
}
