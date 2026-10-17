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

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  themePreference?: string;
  appearanceMode?: string;
  isOnline: boolean;
  lastSeen: string;
  onlinePrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  lastSeenPrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  groupAddPrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  readReceipts?: boolean;
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
  bannerUrl?: string | null;
  themePreference?: 'coralMarble' | 'moonViolet' | 'violetDusk' | 'midnightNeutral' | 'forestGold';
  appearanceMode?: 'system' | 'light' | 'dark';
  onlinePrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  lastSeenPrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  groupAddPrivacy?: 'EVERYONE' | 'MY_FRIENDS' | 'NOBODY';
  readReceipts?: boolean;
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

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 404
          ? 'Profile service not found'
          : `Server returned ${res.status}`
      );
    }

    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to fetch personal profile');
    }

    const profile: UserProfile = json.data;
    // Load local bannerUrl and avatarUrl if stored locally
    try {
      const localBanner = await AsyncStorage.getItem(`@gameapp:profile_banner_${profile.id}`);
      if (localBanner) {
        profile.bannerUrl = localBanner;
      }
      const localAvatar = await AsyncStorage.getItem(`@gameapp:profile_avatar_${profile.id}`);
      if (localAvatar) {
        profile.avatarUrl = localAvatar;
      }
    } catch {}

    return profile;
  }

  static async updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    // 1. Immediately cache custom photos in AsyncStorage for instant UI responsiveness & offline support
    let cachedUserId = 'me';
    try {
      const stored = await AsyncStorage.getItem('@gameapp_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id) cachedUserId = parsed.id;
      }
    } catch {}

    if (payload.bannerUrl !== undefined && payload.bannerUrl) {
      try {
        await AsyncStorage.setItem(`@gameapp:profile_banner_${cachedUserId}`, payload.bannerUrl);
      } catch {}
    }

    if (payload.avatarUrl !== undefined && payload.avatarUrl) {
      try {
        await AsyncStorage.setItem(`@gameapp:profile_avatar_${cachedUserId}`, payload.avatarUrl);
      } catch {}
    }

    const headers = await this.getAuthHeaders();
    // Exclude bannerUrl from API call in case server doesn't have column yet
    const { bannerUrl, ...apiPayload } = payload;

    let res: Response;
    let text = '';
    try {
      res = await fetch(`${API_BASE_URL}/profiles/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(apiPayload),
      });
      text = await res.text();
    } catch (networkErr: any) {
      // If network failed but we saved locally, construct fallback profile
      return {
        id: cachedUserId,
        username: 'user',
        displayName: payload.displayName || 'Player',
        bio: payload.bio || null,
        avatarUrl: payload.avatarUrl || null,
        bannerUrl: payload.bannerUrl || null,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        stats: {
          totalMatches: 0,
          matchesPlayed: 0,
          totalWins: 0,
          matchesWon: 0,
          totalLosses: 0,
          matchesLost: 0,
          winRate: 0,
          friendsCount: 0,
        },
        achievements: [],
        isOwnProfile: true,
        relationship: 'SELF',
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // If server returned non-JSON (like 413 HTML from proxy due to image payload size),
      // we gracefully fall back using the locally saved photo!
      console.warn(`[ProfileService] Server returned non-JSON (${res.status}): ${text.slice(0, 100)}`);
      return {
        id: cachedUserId,
        username: 'user',
        displayName: payload.displayName || 'Player',
        bio: payload.bio || null,
        avatarUrl: payload.avatarUrl || null,
        bannerUrl: payload.bannerUrl || null,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        stats: {
          totalMatches: 0,
          matchesPlayed: 0,
          totalWins: 0,
          matchesWon: 0,
          totalLosses: 0,
          matchesLost: 0,
          winRate: 0,
          friendsCount: 0,
        },
        achievements: [],
        isOwnProfile: true,
        relationship: 'SELF',
      };
    }

    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'Failed to update profile');
    }

    const updatedProfile: UserProfile = json.data;
    if (payload.bannerUrl !== undefined) {
      updatedProfile.bannerUrl = payload.bannerUrl;
    }
    if (payload.avatarUrl !== undefined && payload.avatarUrl) {
      updatedProfile.avatarUrl = payload.avatarUrl;
    }
    return updatedProfile;
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
