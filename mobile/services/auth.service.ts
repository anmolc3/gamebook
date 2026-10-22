import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { API_BASE_URL } from './api';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_STORAGE_KEY = '@gameapp_jwt_token';

export interface AuthUserData {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  themePreference: string;
  appearanceMode: string;
  isOnline: boolean;
  createdAt: string;
  stats?: {
    friendsCount: number;
    winsCount: number;
  };
}

const USER_STORAGE_KEY = '@gameapp_auth_user';

export class MobileAuthService {
  static async setStoredToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  static async getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  }

  static async clearStoredToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  static async setStoredUser(user: AuthUserData): Promise<void> {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  static async getStoredUser(): Promise<AuthUserData | null> {
    try {
      const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static async clearStoredUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }

  static async register(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }): Promise<{ user: AuthUserData; token: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Registration failed');
    }

    return json.data;
  }

  static async login(data: {
    usernameOrEmail: string;
    password: string;
  }): Promise<{ user: AuthUserData; token: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Login failed');
    }

    return json.data;
  }

  static async googleSignIn(idToken: string): Promise<{ user: AuthUserData; token: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Google sign-in failed');
    }

    return json.data;
  }

  static async promptGoogleOAuth(): Promise<{ user: AuthUserData; token: string } | null> {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'socialgamingarena',
      path: 'google-callback',
    });

    const authUrl = `${API_BASE_URL}/auth/google/start?return_to=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type !== 'success' || !result.url) {
      return null;
    }

    const queryString = result.url.includes('?') ? result.url.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const token = params.get('token');
    const userJson = params.get('user');
    const error = params.get('error');

    if (error) {
      throw new Error(decodeURIComponent(error));
    }

    if (!token || !userJson) {
      throw new Error('Authentication succeeded but response was incomplete.');
    }

    const user: AuthUserData = JSON.parse(decodeURIComponent(userJson));
    await this.setStoredToken(token);

    return { user, token };
  }

  static async getMe(token: string): Promise<AuthUserData> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to verify session');
    }

    return json.data.user;
  }

  static async forgotPassword(emailOrUsername: string): Promise<{
    success: boolean;
    message: string;
    resetCode?: string;
    emailSent: boolean;
    maskedEmail: string;
    username: string;
    expiresInMinutes: number;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername }),
        signal: controller.signal,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to process request');
      }

      return json.data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet or server status.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  static async resetPassword(data: {
    emailOrUsername: string;
    resetCode: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to reset password');
      }

      return json.data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet or server status.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Permanently deletes the authenticated user account and all personal data
   */
  static async deleteAccount(data: {
    password?: string;
    googleToken?: string;
    confirm: boolean;
    reason?: string;
  }): Promise<{ success: boolean; message: string; deletedAt?: string; retainedDataNotice?: string }> {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in to proceed.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to delete account');
      }

      return json.data || json;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to process the deletion. Please retry.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
