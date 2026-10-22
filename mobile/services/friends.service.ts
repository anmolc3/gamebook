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
  groupAddPrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
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

export interface SuggestedPlayer extends SearchedPlayer {
  suggestionReason: string;
}

export interface BlockedPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

import { CacheService } from './cache.service';

const CACHE_FRIENDS_KEY = '@gameapp:cache:friends';
const CACHE_REQUESTS_KEY = '@gameapp:cache:requests';
const CACHE_SUGGESTED_KEY = '@gameapp:cache:suggested';

export class FriendsService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getCachedFriends(): Promise<FriendUser[] | null> {
    return await CacheService.get<FriendUser[]>(CACHE_FRIENDS_KEY);
  }

  static async getCachedRequests(): Promise<FriendRequestsPayload | null> {
    return await CacheService.get<FriendRequestsPayload>(CACHE_REQUESTS_KEY);
  }

  static async getCachedSuggestedFriends(): Promise<SuggestedPlayer[] | null> {
    return await CacheService.get<SuggestedPlayer[]>(CACHE_SUGGESTED_KEY);
  }

  static async fetchFriends(): Promise<FriendUser[]> {
    return CacheService.dedupe('fetchFriends', async () => {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/friends`, {
        method: 'GET',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch friends');
      }
      const data = json.data || [];
      await CacheService.set(CACHE_FRIENDS_KEY, data, 1000 * 60 * 10);
      return data;
    });
  }

  static async fetchSuggestedFriends(limit = 15): Promise<SuggestedPlayer[]> {
    return CacheService.dedupe(`fetchSuggestedFriends_${limit}`, async () => {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/friends/suggestions?limit=${limit}`, {
        method: 'GET',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch suggested players');
      }
      const data = json.data || [];
      await CacheService.set(CACHE_SUGGESTED_KEY, data, 1000 * 60 * 15);
      return data;
    });
  }

  static async fetchRequests(): Promise<FriendRequestsPayload> {
    return CacheService.dedupe('fetchRequests', async () => {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/friends/requests`, {
        method: 'GET',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch friend requests');
      }
      const data = json.data || { incoming: [], outgoing: [] };
      await CacheService.set(CACHE_REQUESTS_KEY, data, 1000 * 60 * 5);
      return data;
    });
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
