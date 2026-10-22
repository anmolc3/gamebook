import type * as NotificationsType from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api';
import { MobileSocketService } from './socket.service';

// Detect whether running inside Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Dynamically require expo-notifications only outside Expo Go (or non-Android)
// to prevent Expo SDK 53+ fatal error:
// "expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go"
let Notifications: typeof NotificationsType | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (err) {
    console.warn('[Notifications] Could not load expo-notifications module:', err);
  }
}

// ─── Configure foreground notification behaviour ───────────────────────────────
// Show alerts even when the app is in the foreground
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Notification channel IDs ─────────────────────────────────────────────────
export const CHANNELS = {
  DEFAULT: 'default',
  MESSAGES: 'messages',
  SOCIAL: 'social',
  GAMES: 'games',
  ACHIEVEMENTS: 'achievements',
} as const;

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'MENTION'
  | 'MISSED_CALL'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'GAME_INVITE'
  | 'ACHIEVEMENT'
  | 'YOUR_TURN'
  | string;

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationData {
  type: NotificationType;
  roomCode?: string;
  recipientId?: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  callerId?: string;
  messageId?: string;
}

/**
 * NotificationService
 *
 * Handles:
 *  1. Requesting notification permissions
 *  2. Registering Expo push token with the backend
 *  3. Setting up Android notification channels
 *  4. Providing listener helpers for in-app handling
 */
export class NotificationService {
  private static _expoPushToken: string | null = null;

  // ─── Initialise (call once after login) ──────────────────────────────────────

  /**
   * Request permissions, create Android channels, obtain push token,
   * and register it with the server. Safe to call multiple times.
   */
  static async initialize(): Promise<string | null> {
    if (isExpoGo) {
      console.log('[Notifications] Push notifications are not supported in Expo Go (SDK 53+). Use an EAS development build for push testing.');
      return null;
    }

    if (!Notifications) {
      return null;
    }

    // Create Android notification channels first
    if (Platform.OS === 'android') {
      await this.createAndroidChannels();
    }

    // Push token registration only works on physical devices
    if (!Device.isDevice) {
      console.log('[Notifications] Push token registration skipped on simulator/emulator.');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push notification permission was denied.');
      return null;
    }

    // Get the Expo push token
    try {
      const resolvedProjectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        resolvedProjectId && resolvedProjectId !== 'REPLACE_WITH_YOUR_EAS_PROJECT_ID'
          ? { projectId: resolvedProjectId }
          : undefined
      );
      this._expoPushToken = tokenData.data;
      console.log('[Notifications] Expo push token:', this._expoPushToken);

      // Register with backend
      await this.registerTokenWithServer(this._expoPushToken);
      return this._expoPushToken;
    } catch (err) {
      console.warn('[Notifications] Failed to obtain push token:', err);
      return null;
    }
  }

  /**
   * Unregister push token from the server (called on logout).
   */
  static async unregister(): Promise<void> {
    try {
      await apiPost('/notifications/push-token', undefined);
      // Use DELETE via direct fetch since apiPost only does POST
      const { MobileAuthService } = await import('./auth.service');
      const token = await MobileAuthService.getStoredToken();
      if (!token) return;

      const { API_BASE_URL } = await import('./api');
      await fetch(`${API_BASE_URL}/notifications/push-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      this._expoPushToken = null;
    } catch (err) {
      console.warn('[Notifications] Failed to unregister push token:', err);
    }
  }

  // ─── Android channel setup ────────────────────────────────────────────────────

  static async createAndroidChannels(): Promise<void> {
    if (!Notifications) return;

    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
        name: 'Otter General',
        description: 'Otter general updates and notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.MESSAGES, {
        name: 'Otter Messages',
        description: 'New chat messages in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 200, 100],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.SOCIAL, {
        name: 'Otter Social',
        description: 'Friend requests and social updates in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#60A5FA',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.GAMES, {
        name: 'Otter Games',
        description: 'Game invites and turn reminders in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 300],
        lightColor: '#F59E0B',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.ACHIEVEMENTS, {
        name: 'Otter Achievements',
        description: 'Otter achievement unlocks and milestones',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        lightColor: '#FFD700',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
    ]);
  }

  private static recentNotifMap = new Map<string, number>();

  /**
   * Immediately present a notification in the device notification area / drawer.
   * Debounces duplicate notifications within 3.5 seconds to prevent multi-notification spam.
   */
  static async displayLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId: string = CHANNELS.MESSAGES
  ): Promise<void> {
    if (!Notifications) return;
    const cleanTitle = (title || 'New Message').replace(/^💬\s*/, '').trim() || 'New Message';
    const cleanBody = (body || '').replace(/^💬\s*/, '').trim();
    const notifKey = `${cleanTitle}:::${cleanBody}:::${data?.messageId || data?.conversationId || ''}`;
    const now = Date.now();
    const lastTimestamp = this.recentNotifMap.get(notifKey);
    if (lastTimestamp && now - lastTimestamp < 3500) {
      return; // Suppress duplicate notification
    }
    this.recentNotifMap.set(notifKey, now);

    // Garbage-collect old keys
    if (this.recentNotifMap.size > 50) {
      for (const [k, t] of this.recentNotifMap.entries()) {
        if (now - t > 10000) this.recentNotifMap.delete(k);
      }
    }

    try {
      if (Platform.OS === 'android') {
        await this.createAndroidChannels();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: cleanTitle,
          body: cleanBody,
          data,
          sound: 'default',
          color: '#3ED598',
          ...(channelId ? { channelId } : {}),
        } as any,
        trigger: null,
      });
    } catch (err) {
      console.warn('[Notifications] Failed to display local notification:', err);
    }
  }

  // ─── Token registration ───────────────────────────────────────────────────────

  private static async registerTokenWithServer(pushToken: string): Promise<void> {
    try {
      await apiPost('/notifications/push-token', { pushToken });
      console.log('[Notifications] Push token registered with server.');
    } catch (err) {
      console.warn('[Notifications] Failed to register token with server:', err);
    }
  }

  // ─── Listener helpers (for use in App.tsx) ───────────────────────────────────

  /**
   * Add a listener for notifications received while the app is in the foreground.
   * Returns a cleanup function.
   */
  static addForegroundListener(
    handler: (notification: NotificationsType.Notification) => void
  ): () => void {
    if (!Notifications) return () => {};
    const subscription = Notifications.addNotificationReceivedListener(handler);
    return () => subscription.remove();
  }

  /**
   * Add a listener for when the user taps a notification (app in background or killed).
   * Returns a cleanup function.
   */
  static addResponseListener(
    handler: (response: NotificationsType.NotificationResponse) => void
  ): () => void {
    if (!Notifications) return () => {};
    const subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return () => subscription.remove();
  }

  /**
   * Get the last notification response (app opened via notification tap).
   * Useful on initial mount to handle cold-start taps.
   */
  static async getLastNotificationResponse(): Promise<NotificationsType.NotificationResponse | null> {
    if (!Notifications) return null;
    return Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Clear the badge count (iOS / Android badge).
   */
  static async clearBadge(): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Schedule a local notification (for offline reminders, etc.)
   */
  static async scheduleLocal(
    title: string,
    body: string,
    data?: NotificationData,
    delaySeconds = 0
  ): Promise<string> {
    if (!Notifications) return '';
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as any,
        sound: 'default',
      },
      trigger:
        delaySeconds > 0
          ? { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
          : null,
    });
  }

  static get expoPushToken(): string | null {
    return this._expoPushToken;
  }

  // ─── Unified In-App Notifications & Real-Time Syncing ───────────────────────

  private static notifListeners = new Set<(notif: AppNotification) => void>();
  private static unreadListeners = new Set<(count: number) => void>();
  private static cachedNotifications: AppNotification[] = [];
  private static cachedUnreadCount: number = 0;
  private static socketSubscribed = false;

  static initRealtimeListeners(): void {
    if (this.socketSubscribed) return;
    this.socketSubscribed = true;

    MobileSocketService.onNotificationReceived((newNotif: any) => {
      if (!newNotif || !newNotif.id) return;

      const existsIndex = this.cachedNotifications.findIndex((n) => n.id === newNotif.id);
      if (existsIndex >= 0) {
        this.cachedNotifications[existsIndex] = { ...this.cachedNotifications[existsIndex], ...newNotif };
      } else {
        this.cachedNotifications = [newNotif, ...this.cachedNotifications];
        if (!newNotif.isRead) {
          this.cachedUnreadCount += 1;
          this.notifyUnreadListeners(this.cachedUnreadCount);
        }
      }

      this.notifListeners.forEach((cb) => {
        try {
          cb(newNotif);
        } catch (e) {
          console.warn('[NotificationService] Error in notif listener:', e);
        }
      });
    });

    MobileSocketService.onUnreadNotificationCount((data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === 'number') {
        this.cachedUnreadCount = data.unreadCount;
        this.notifyUnreadListeners(this.cachedUnreadCount);
      }
    });
  }

  static addNotificationListener(listener: (notif: AppNotification) => void): () => void {
    this.initRealtimeListeners();
    this.notifListeners.add(listener);
    return () => {
      this.notifListeners.delete(listener);
    };
  }

  static addUnreadCountListener(listener: (count: number) => void): () => void {
    this.initRealtimeListeners();
    this.unreadListeners.add(listener);
    listener(this.cachedUnreadCount);
    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  private static notifyUnreadListeners(count: number): void {
    this.unreadListeners.forEach((cb) => {
      try {
        cb(count);
      } catch (e) {
        console.warn('[NotificationService] Error in unread listener:', e);
      }
    });
  }

  /**
   * Load existing notifications from the backend API.
   */
  static async fetchNotifications(limit: number = 40): Promise<AppNotification[]> {
    try {
      this.initRealtimeListeners();
      const res = await apiGet<{ success: boolean; data: AppNotification[] }>(
        `/notifications?limit=${limit}`
      );
      if (res && res.data && Array.isArray(res.data)) {
        this.cachedNotifications = res.data;
        this.cachedUnreadCount = res.data.filter((n) => !n.isRead).length;
        this.notifyUnreadListeners(this.cachedUnreadCount);
        return res.data;
      }
      return [];
    } catch (err) {
      console.warn('[NotificationService] fetchNotifications failed:', err);
      throw err;
    }
  }

  /**
   * Fetch unread notification count.
   */
  static async fetchUnreadCount(): Promise<number> {
    try {
      this.initRealtimeListeners();
      const res = await apiGet<{ success: boolean; data: { unreadCount: number } }>(
        '/notifications/unread-count'
      );
      if (res && res.data && typeof res.data.unreadCount === 'number') {
        this.cachedUnreadCount = res.data.unreadCount;
        this.notifyUnreadListeners(this.cachedUnreadCount);
        return this.cachedUnreadCount;
      }
      return this.cachedUnreadCount;
    } catch (err) {
      console.warn('[NotificationService] fetchUnreadCount failed:', err);
      return this.cachedUnreadCount;
    }
  }

  /**
   * Mark all unread notifications as read.
   */
  static async markAllAsRead(): Promise<void> {
    try {
      await apiPut('/notifications/mark-read');
      this.cachedNotifications = this.cachedNotifications.map((n) => ({ ...n, isRead: true }));
      this.cachedUnreadCount = 0;
      this.notifyUnreadListeners(0);
    } catch (err) {
      console.warn('[NotificationService] markAllAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(id: string): Promise<void> {
    try {
      await apiPatch(`/notifications/${id}/read`);
      this.cachedNotifications = this.cachedNotifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      this.cachedUnreadCount = Math.max(0, this.cachedNotifications.filter((n) => !n.isRead).length);
      this.notifyUnreadListeners(this.cachedUnreadCount);
    } catch (err) {
      console.warn('[NotificationService] markAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Clear all notifications.
   */
  static async clearAll(): Promise<void> {
    try {
      await apiDelete('/notifications');
      this.cachedNotifications = [];
      this.cachedUnreadCount = 0;
      this.notifyUnreadListeners(0);
    } catch (err) {
      console.warn('[NotificationService] clearAll failed:', err);
      throw err;
    }
  }

  /**
   * Delete a single notification.
   */
  static async deleteNotification(id: string): Promise<void> {
    try {
      await apiDelete(`/notifications/${id}`);
      this.cachedNotifications = this.cachedNotifications.filter((n) => n.id !== id);
      this.cachedUnreadCount = this.cachedNotifications.filter((n) => !n.isRead).length;
      this.notifyUnreadListeners(this.cachedUnreadCount);
    } catch (err) {
      console.warn('[NotificationService] deleteNotification failed:', err);
      throw err;
    }
  }

  /**
   * Human readable time ago formatting.
   */
  static formatTimeAgo(dateString: string): string {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';

    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 45) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
