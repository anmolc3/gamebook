import { API_BASE_URL } from './api';
import { MobileAuthService } from './auth.service';

export interface ProfileStats {
  totalMatches: number;
  matchesPlayed: number;
  totalWins: number;
  matchesWon: number;
  totalLosses: number;
  matchesLost: number;
  winRate: number;
  highestStreak?: number;
  friendsCount: number;
  storiesCount?: number;
}

export interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt: string;
}

export type RelationshipState = 'SELF' | 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  themePreference?: string;
  appearanceMode?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  stats: ProfileStats;
  achievements: AchievementItem[];
  isOwnProfile: boolean;
  relationship: RelationshipState;
  relationshipState?: RelationshipState;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  themePreference?: 'coralMarble' | 'moonViolet' | 'violetDusk' | 'midnightNeutral' | 'forestGold';
  appearanceMode?: 'system' | 'light' | 'dark';
}

export class ProfileService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await MobileAuthService.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async fetchMyProfile(): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profiles/me`, {
      method: 'GET',
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch personal profile');
    }

    return json.data;
  }

  static async updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profiles/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to update profile');
    }

    return json.data;
  }

  static async fetchUserProfile(userId: string): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      method: 'GET',
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to fetch player profile');
    }

    return json.data;
  }
}
