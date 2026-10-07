import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

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
    resetCode: string;
    maskedEmail: string;
    username: string;
    expiresInMinutes: number;
  }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to process request');
    }

    return json.data;
  }

  static async resetPassword(data: {
    emailOrUsername: string;
    resetCode: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to reset password');
    }

    return json.data;
  }
}
